package com.greenhaven.service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.greenhaven.dto.AuthResponse;
import com.greenhaven.dto.ProfileDtos;
import com.greenhaven.dto.UserDto;
import com.greenhaven.exception.ResourceNotFoundException;
import com.greenhaven.model.AppUser;
import com.greenhaven.model.Order;
import com.greenhaven.model.OrderItem;
import com.greenhaven.model.Payment;
import com.greenhaven.repository.AddressRepository;
import com.greenhaven.repository.AppUserRepository;
import com.greenhaven.repository.NotificationRepository;
import com.greenhaven.repository.OrderRepository;
import com.greenhaven.repository.PaymentRepository;
import com.greenhaven.repository.WishlistItemRepository;

/** Everything behind My Profile, for the signed-in customer only. */
@Service
public class ProfileService {

    /**
     * The fulfilment steps, in the order they happen. CONFIRMED is not shown
     * as its own stop — payment confirmation already covers it — but it is
     * listed so an order sitting at CONFIRMED still resolves to a position.
     */
    private static final List<String[]> STEPS = List.of(
            new String[] { "PLACED",           "Order placed" },
            new String[] { "PAID",             "Payment confirmed" },
            new String[] { "PROCESSING",       "Processing" },
            new String[] { "PACKED",           "Packed" },
            new String[] { "SHIPPED",          "Shipped" },
            new String[] { "OUT_FOR_DELIVERY", "Out for delivery" },
            new String[] { "DELIVERED",        "Delivered" });

    /**
     * Which step is happening now, for a paid order.
     *
     * A freshly paid order sits at PENDING or CONFIRMED, which is the nursery
     * about to start work — so it points at Processing rather than at the
     * payment step, and the strip always has exactly one live position.
     * DELIVERED runs past the end deliberately: nothing is in progress once it
     * has arrived, so every step reads as done.
     */
    private static int reached(String deliveryStatus) {
        return switch (deliveryStatus) {
            case "PENDING", "CONFIRMED", "PROCESSING" -> 2;
            case "PACKED" -> 3;
            case "SHIPPED" -> 4;
            case "OUT_FOR_DELIVERY" -> 5;
            case "DELIVERED" -> STEPS.size();
            default -> 0;
        };
    }

    /** Once it is with the courier it is too late for the customer to stop it. */
    private static final List<String> TOO_LATE_TO_CANCEL =
            List.of("SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED");

    private final AppUserRepository users;
    private final OrderRepository orders;
    private final PaymentRepository payments;
    private final AddressRepository addresses;
    private final WishlistItemRepository wishlists;
    private final NotificationRepository notifications;
    private final NotificationService notifier;
    private final PasswordEncoder encoder;
    private final com.greenhaven.security.JwtService jwt;
    private final InvoiceService invoiceService;

    public ProfileService(AppUserRepository users, OrderRepository orders,
                          PaymentRepository payments, AddressRepository addresses,
                          WishlistItemRepository wishlists, NotificationRepository notifications,
                          NotificationService notifier, PasswordEncoder encoder,
                          com.greenhaven.security.JwtService jwt,
                          InvoiceService invoiceService) {
        this.invoiceService = invoiceService;
        this.users = users;
        this.orders = orders;
        this.payments = payments;
        this.addresses = addresses;
        this.wishlists = wishlists;
        this.notifications = notifications;
        this.notifier = notifier;
        this.encoder = encoder;
        this.jwt = jwt;
    }

    @Transactional(readOnly = true)
    public ProfileDtos.Profile profile(String email) {
        AppUser user = user(email);
        return new ProfileDtos.Profile(
                user.getId(), user.getFullName(), user.getEmail(), user.getPendingEmail(),
                user.getPhone(), user.getAvatarUrl(), user.getCreatedAt(),
                orders.countByUserId(user.getId()),
                orders.sumPaidTotalByUserId(user.getId()),
                addresses.countByUserId(user.getId()),
                wishlists.findByUserId(user.getId()).size(),
                notifications.countByUserIdAndReadAtIsNull(user.getId()));
    }

    @Transactional
    public ProfileDtos.Profile updateProfile(String email, ProfileDtos.UpdateProfileRequest r) {
        AppUser user = user(email);
        user.setFullName(r.fullName().trim());
        user.setPhone(blankToNull(r.phone()));
        user.setAvatarUrl(blankToNull(r.avatarUrl()));
        users.save(user);
        return profile(email);
    }

    /**
     * Starts an email change.
     *
     * The new address is parked in pending_email and the account keeps signing
     * in with the old one until it is confirmed. Changing the sign-in address
     * on an unproven typo would lock someone out of their own order history,
     * and orders are the one thing here that cannot be re-created.
     *
     * Re-authentication is required: a borrowed, still-open session must not be
     * able to move the account to an attacker's inbox.
     */
    @Transactional
    public String requestEmailChange(String email, ProfileDtos.ChangeEmailRequest r) {
        AppUser user = user(email);
        if (!encoder.matches(r.password(), user.getPasswordHash())) {
            throw new IllegalArgumentException("That password is not right.");
        }

        String wanted = r.email().trim().toLowerCase();
        if (wanted.equalsIgnoreCase(user.getEmail())) {
            throw new IllegalArgumentException("That is already your email address.");
        }
        if (users.findByEmail(wanted).isPresent()) {
            throw new IllegalArgumentException("That email address is already registered.");
        }

        user.setPendingEmail(wanted);
        user.setPendingEmailToken(java.util.UUID.randomUUID().toString().replace("-", ""));
        user.setPendingEmailExpiresAt(Instant.now().plus(java.time.Duration.ofHours(24)));
        users.save(user);

        // No mail server is configured yet, so the token is returned to the
        // caller instead of being sent. Swap this for a mailed link and the
        // confirm step below is unchanged.
        return user.getPendingEmailToken();
    }

    /**
     * Confirms the change and reissues the token.
     *
     * A JWT names its subject by email. Move the address without minting a new
     * one and the customer is left holding a token for an account that no
     * longer answers to that name — every profile call 404s until they sign in
     * again. The new token is returned so the browser can swap it in place.
     */
    @Transactional
    public AuthResponse confirmEmailChange(String email, String token) {
        AppUser user = user(email);
        if (user.getPendingEmail() == null || user.getPendingEmailToken() == null) {
            throw new IllegalArgumentException("There is no email change waiting.");
        }
        if (user.getPendingEmailExpiresAt() == null
                || user.getPendingEmailExpiresAt().isBefore(Instant.now())) {
            clearPendingEmail(user);
            throw new IllegalArgumentException("That confirmation link has expired. Start again.");
        }
        if (!user.getPendingEmailToken().equals(token)) {
            throw new IllegalArgumentException("That confirmation link is not valid.");
        }
        // Checked again at the last moment: someone else may have registered
        // the address during the 24 hours this was pending.
        if (users.findByEmail(user.getPendingEmail()).isPresent()) {
            clearPendingEmail(user);
            throw new IllegalArgumentException("That email address has since been registered.");
        }

        String confirmed = user.getPendingEmail();
        user.setEmail(confirmed);
        clearPendingEmail(user);
        AppUser saved = users.save(user);
        return new AuthResponse(jwt.issue(saved.getEmail(), saved.getRole()),
                jwt.getExpirationMs(),
                new UserDto(saved.getId(), saved.getFullName(), saved.getEmail(), saved.getRole()));
    }

    @Transactional
    public void cancelEmailChange(String email) {
        AppUser user = user(email);
        clearPendingEmail(user);
        users.save(user);
    }

    private static void clearPendingEmail(AppUser user) {
        user.setPendingEmail(null);
        user.setPendingEmailToken(null);
        user.setPendingEmailExpiresAt(null);
    }

    @Transactional
    public void changePassword(String email, ProfileDtos.ChangePasswordRequest r) {
        AppUser user = user(email);
        if (!encoder.matches(r.currentPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Your current password is not right.");
        }
        if (!r.newPassword().equals(r.confirmPassword())) {
            throw new IllegalArgumentException("The two new passwords do not match.");
        }
        if (r.newPassword().equals(r.currentPassword())) {
            throw new IllegalArgumentException("The new password must be different.");
        }
        user.setPasswordHash(encoder.encode(r.newPassword()));
        users.save(user);
    }

    @Transactional(readOnly = true)
    public List<ProfileDtos.OrderSummary> myOrders(String email) {
        return orders.findByUserEmailOrderByIdDesc(email).stream()
                .map(ProfileService::toSummary)
                .toList();
    }

    @Transactional(readOnly = true)
    public ProfileDtos.OrderDetail orderDetail(String email, String orderNumber) {
        Order order = ownedOrder(email, orderNumber);
        Payment payment = latestPaymentFor(order);

        List<ProfileDtos.OrderDetail.Line> lines = order.getItems().stream()
                .map(i -> new ProfileDtos.OrderDetail.Line(
                        slugOf(i), nameOf(i), imageOf(i), i.getProductCategory(),
                        i.getQuantity(), i.getUnitPrice(),
                        i.getUnitPrice().multiply(BigDecimal.valueOf(i.getQuantity()))))
                .toList();

        return new ProfileDtos.OrderDetail(
                order.getOrderNumber(), order.getInvoiceNumber(),
                order.getUser().getFullName(), order.getUser().getEmail(),
                order.getPlacedAt(), order.getStatus(), order.getDeliveryStatus(),
                order.getEstimatedDelivery(), order.getCancelledAt(), order.getCancelReason(),
                cancellable(order), order.getInvoiceNumber() != null,
                new ProfileDtos.OrderDetail.Address(
                        order.getUser().getFullName(), order.getAddressLine(), order.getCity(),
                        order.getState(), order.getPincode(), order.getCountry(), order.getPhone()),
                lines,
                order.getSubtotal(), order.getTax(), order.getShipping(), order.getDiscount(),
                order.getTotal(),
                payment == null ? null : toPaymentRow(payment),
                timeline(order));
    }

    /**
     * Cancels an order the customer no longer wants.
     *
     * Only before it is with the courier, and only on their own order. A PAID
     * order that is cancelled keeps its payment row and invoice untouched —
     * the refund is a separate movement of money, and rubbing out the record
     * of what was taken is not how a refund is done. What is added instead is
     * a credit note, so the ledger shows both the charge and what is owed back.
     */
    @Transactional
    public ProfileDtos.OrderDetail cancelOrder(String email, String orderNumber, String reason) {
        Order order = ownedOrder(email, orderNumber);
        if (!cancellable(order)) {
            throw new IllegalArgumentException(order.getCancelledAt() != null
                    ? "This order is already cancelled."
                    : "This order has already left the nursery and can no longer be cancelled.");
        }

        order.setDeliveryStatus("CANCELLED");
        order.setCancelledAt(Instant.now());
        order.setCancelledBy("CUSTOMER");
        order.setCancelReason(blankToNull(reason));
        // An unpaid order is simply abandoned. A paid one keeps status PAID:
        // the money really was taken, and the books have to keep saying so.
        if ("PENDING".equals(order.getStatus())) {
            order.setStatus("CANCELLED");
        }
        orders.save(order);

        // A paid order that is cancelled leaves the shop owing money. The
        // invoice stands — it records what really was taken — and a credit note
        // is issued to offset it. Nothing is issued for an unpaid order,
        // because nothing was ever charged.
        invoiceService.creditNoteFor(order,
                blankToNull(reason) == null ? "Cancelled by the customer" : reason.trim());

        notifier.deliveryChanged(order, "CANCELLED");
        return orderDetail(email, orderNumber);
    }

    /** The lines of a past order, for putting straight back in the basket. */
    @Transactional(readOnly = true)
    public List<com.greenhaven.dto.BasketDto.Line> reorderLines(String email, String orderNumber) {
        return ownedOrder(email, orderNumber).getItems().stream()
                .filter(i -> i.getPlant() != null)   // a delisted product cannot be re-bought
                .map(i -> new com.greenhaven.dto.BasketDto.Line(
                        i.getPlant().getSlug(), i.getQuantity()))
                .toList();
    }

    private static boolean cancellable(Order order) {
        return !TOO_LATE_TO_CANCEL.contains(order.getDeliveryStatus())
                && !"CANCELLED".equals(order.getStatus())
                && order.getCancelledAt() == null;
    }

    private static List<ProfileDtos.TimelineStep> timeline(Order order) {
        List<ProfileDtos.TimelineStep> strip = new ArrayList<>();

        if (order.getCancelledAt() != null || "CANCELLED".equals(order.getDeliveryStatus())) {
            strip.add(new ProfileDtos.TimelineStep("PLACED", "Order placed", "DONE",
                    order.getPlacedAt()));
            strip.add(new ProfileDtos.TimelineStep("CANCELLED", "Cancelled", "CANCELLED",
                    order.getCancelledAt()));
            return strip;
        }

        boolean paid = "PAID".equals(order.getStatus()) || "PAID_SHORT".equals(order.getStatus());
        int at = paid ? reached(order.getDeliveryStatus()) : 0;

        for (int i = 0; i < STEPS.size(); i++) {
            String state;
            if (i == 0) {
                state = "DONE";                       // it exists, so it was placed
            } else if (i == 1) {
                state = paid ? "DONE" : "CURRENT";    // waiting on payment
            } else if (i < at) {
                state = "DONE";
            } else if (i == at) {
                state = "CURRENT";
            } else {
                state = "PENDING";
            }
            Instant at0 = i == 0 ? order.getPlacedAt() : null;
            strip.add(new ProfileDtos.TimelineStep(STEPS.get(i)[0], STEPS.get(i)[1], state, at0));
        }
        return strip;
    }

    @Transactional(readOnly = true)
    public List<ProfileDtos.PaymentRow> myPayments(String email) {
        return payments.findByOrderUserIdOrderByIdDesc(user(email).getId()).stream()
                .map(ProfileService::toPaymentRow)
                .toList();
    }

    /**
     * Every document issued to this customer — invoices and the credit notes
     * offsetting them, newest first.
     *
     * Read from the ledger rather than derived from orders: a credit note is a
     * document in its own right and has no order column of its own to be
     * inferred from.
     */
    @Transactional(readOnly = true)
    public List<ProfileDtos.InvoiceRow> myInvoices(String email) {
        return invoiceService.forUser(user(email).getId()).stream()
                .map(i -> new ProfileDtos.InvoiceRow(
                        i.getNumber(), i.getOrder().getOrderNumber(), i.getIssuedAt(),
                        i.getAmount(),
                        i.getOrder().getItems().stream().mapToInt(OrderItem::getQuantity).sum(),
                        i.getDocType(), i.getReason()))
                .toList();
    }

    /**
     * One document by its number, checked to belong to the caller.
     *
     * The ownership check is the load-bearing part: invoice numbers run in
     * sequence, so without it anyone could walk the series and read every
     * customer's name, address and order.
     */
    @Transactional(readOnly = true)
    public com.greenhaven.model.Invoice ownedDocument(String email, String number) {
        com.greenhaven.model.Invoice doc = invoiceService.byNumber(number)
                .orElseThrow(() -> new ResourceNotFoundException("No document with that number."));
        if (!doc.getOrder().getUser().getEmail().equalsIgnoreCase(email)) {
            // Deliberately the same message as a genuinely missing document, so
            // this cannot be used to discover which numbers exist.
            throw new ResourceNotFoundException("No document with that number.");
        }
        return doc;
    }

    /** The order behind an invoice, checked to belong to the caller. */
    @Transactional(readOnly = true)
    public Order invoiceSource(String email, String orderNumber) {
        Order order = ownedOrder(email, orderNumber);
        if (order.getInvoiceNumber() == null) {
            throw new IllegalArgumentException(
                    "No invoice has been issued for this order — it has not been paid.");
        }
        return order;
    }

    private static ProfileDtos.OrderSummary toSummary(Order o) {
        List<ProfileDtos.OrderSummary.Thumb> preview = o.getItems().stream()
                .limit(4)
                .map(i -> new ProfileDtos.OrderSummary.Thumb(
                        slugOf(i), nameOf(i), imageOf(i), i.getQuantity()))
                .toList();

        return new ProfileDtos.OrderSummary(
                o.getOrderNumber(), o.getInvoiceNumber(), o.getPlacedAt(),
                o.getStatus(), o.getDeliveryStatus(), o.getStatus(),
                o.getPaymentMethod(), o.getTotal(),
                o.getItems().stream().mapToInt(OrderItem::getQuantity).sum(),
                addressOf(o), o.getEstimatedDelivery(), cancellable(o), preview);
    }

    private static ProfileDtos.PaymentRow toPaymentRow(Payment p) {
        Order o = p.getOrder();
        return new ProfileDtos.PaymentRow(
                p.getId(), p.getRazorpayPaymentId(), p.getRazorpayOrderId(),
                o == null ? null : o.getOrderNumber(),
                o == null ? null : o.getInvoiceNumber(),
                p.getAmount(), p.getMethod(), p.getStatus(), p.getVerificationStatus(),
                p.getFailureReason(),
                p.getVerifiedAt() != null ? p.getVerifiedAt() : p.getCreatedAt(),
                o != null && o.getInvoiceNumber() != null);
    }

    /**
     * The product as it was on the day, falling back to the live catalogue only
     * where the snapshot is missing — orders placed before those columns
     * existed have nothing else to show.
     */
    private static String nameOf(OrderItem i) {
        if (i.getProductName() != null) return i.getProductName();
        return i.getPlant() == null ? "Product" : i.getPlant().getName();
    }

    private static String imageOf(OrderItem i) {
        if (i.getProductImage() != null) return i.getProductImage();
        return i.getPlant() == null ? null : i.getPlant().getImage();
    }

    private static String slugOf(OrderItem i) {
        return i.getPlant() == null ? null : i.getPlant().getSlug();
    }

    private static String addressOf(Order o) {
        if (o.getAddressLine() == null) return null;
        return o.getAddressLine() + ", " + o.getCity() + " " + o.getPincode();
    }

    private Payment latestPaymentFor(Order order) {
        if (order.getRazorpayOrderId() == null) return null;
        return payments.findByRazorpayOrderIdOrderByIdDesc(order.getRazorpayOrderId())
                .stream().findFirst().orElse(null);
    }

    private Order ownedOrder(String email, String orderNumber) {
        return orders.findByOrderNumberAndUserId(orderNumber, user(email).getId())
                .orElseThrow(() -> new ResourceNotFoundException("No such order."));
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    private AppUser user(String email) {
        return users.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Not signed in."));
    }
}
