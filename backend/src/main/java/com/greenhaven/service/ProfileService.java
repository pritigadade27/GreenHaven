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
import com.greenhaven.entity.AppUser;
import com.greenhaven.entity.Order;
import com.greenhaven.entity.OrderItem;
import com.greenhaven.entity.Payment;
import com.greenhaven.repository.AddressRepository;
import com.greenhaven.repository.AppUserRepository;
import com.greenhaven.repository.NotificationRepository;
import com.greenhaven.repository.OrderRepository;
import com.greenhaven.repository.PaymentRepository;
import com.greenhaven.repository.WishlistItemRepository;

@Service
public class ProfileService {
    private static final List<String[]> STEPS = List.of(
            new String[] { "PLACED",           "Order placed" },
            new String[] { "PAID",             "Payment confirmed" },
            new String[] { "PROCESSING",       "Processing" },
            new String[] { "PACKED",           "Packed" },
            new String[] { "SHIPPED",          "Shipped" },
            new String[] { "OUT_FOR_DELIVERY", "Out for delivery" },
            new String[] { "DELIVERED",        "Delivered" });

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

        return user.getPendingEmailToken();
    }

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
        if ("PENDING".equals(order.getStatus())) {
            order.setStatus("CANCELLED");
        }
        orders.save(order);

        invoiceService.creditNoteFor(order,
                blankToNull(reason) == null ? "Cancelled by the customer" : reason.trim());

        notifier.deliveryChanged(order, "CANCELLED");
        return orderDetail(email, orderNumber);
    }

    @Transactional(readOnly = true)
    public List<com.greenhaven.dto.BasketDto.Line> reorderLines(String email, String orderNumber) {
        return ownedOrder(email, orderNumber).getItems().stream()
                .filter(i -> i.getPlant() != null)
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
                state = "DONE";
            } else if (i == 1) {
                state = paid ? "DONE" : "CURRENT";
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

    @Transactional(readOnly = true)
    public com.greenhaven.entity.Invoice ownedDocument(String email, String number) {
        com.greenhaven.entity.Invoice doc = invoiceService.byNumber(number)
                .orElseThrow(() -> new ResourceNotFoundException("No document with that number."));
        if (!doc.getOrder().getUser().getEmail().equalsIgnoreCase(email)) {
            throw new ResourceNotFoundException("No document with that number.");
        }
        return doc;
    }

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
