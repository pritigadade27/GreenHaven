package com.greenhaven.service;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.greenhaven.dto.CheckoutRequest;
import com.greenhaven.dto.OrderDto;
import com.greenhaven.dto.PaymentVerificationRequest;
import com.greenhaven.exception.ResourceNotFoundException;
import com.greenhaven.model.AppUser;
import com.greenhaven.model.Coupon;
import com.greenhaven.model.Order;
import com.greenhaven.model.OrderItem;
import com.greenhaven.model.Plant;
import com.greenhaven.repository.AppUserRepository;
import com.greenhaven.repository.OrderRepository;
import com.greenhaven.model.Payment;
import com.greenhaven.repository.PaymentRepository;
import com.greenhaven.repository.PlantRepository;

@Service
public class OrderService {

    private final OrderRepository orders;
    private final PlantRepository plants;
    private final AppUserRepository users;
    private final PaymentService payments;
    private final PaymentRepository paymentRecords;
    private final DocumentNumberService documents;
    private final NotificationService notifier;
    private final BasketService baskets;

    private final InvoiceService invoiceService;
    private final PricingService pricing;
    private final CouponService couponService;

    public OrderService(OrderRepository orders, PlantRepository plants,
                        AppUserRepository users, PaymentService payments,
                        PaymentRepository paymentRecords, DocumentNumberService documents,
                        NotificationService notifier, BasketService baskets,
                        PricingService pricing, CouponService couponService,
                        InvoiceService invoiceService) {
        this.invoiceService = invoiceService;
        this.pricing = pricing;
        this.couponService = couponService;
        this.orders = orders;
        this.plants = plants;
        this.users = users;
        this.payments = payments;
        this.paymentRecords = paymentRecords;
        this.documents = documents;
        this.notifier = notifier;
        this.baskets = baskets;
    }

    /**
     * Builds a PENDING order and asks Razorpay for a payment order id.
     *
     * Prices come from the database, never from the request. The client sends
     * only slugs and quantities — it cannot dictate what anything costs.
     */
    @Transactional
    public OrderDto startCheckout(String email, CheckoutRequest request) throws Exception {
        AppUser user = users.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Not signed in."));

        if (request.items() == null || request.items().isEmpty()) {
            throw new IllegalArgumentException("Your cart is empty.");
        }

        Order order = new Order();
        order.setUser(user);
        order.setOrderNumber(documents.nextOrderNumber());
        order.setAddressLine(request.addressLine());
        order.setPhone(request.phone());
        order.setCity(request.city());
        order.setState(request.state());
        order.setPincode(request.pincode());

        // Collapse duplicate slugs first.
        Map<String, Integer> wanted = new LinkedHashMap<>();
        for (CheckoutRequest.Line line : request.items()) {
            wanted.merge(line.slug(), Math.max(1, line.quantity()), Integer::sum);
        }

        BigDecimal subtotal = BigDecimal.ZERO;
        for (Map.Entry<String, Integer> entry : wanted.entrySet()) {
            String slug = entry.getKey();
            Plant plant = plants.findBySlug(slug)
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "No product with slug '" + slug + "'"));

            int qty = entry.getValue();
            // Unknown stock is not infinite stock — treat null as none.
            if (plant.getStock() == null || plant.getStock() < qty) {
                throw new IllegalArgumentException(plant.getStock() == null
                        ? plant.getName() + " is not available right now."
                        : "Only " + plant.getStock() + " left of " + plant.getName() + ".");
            }

            OrderItem item = new OrderItem();
            item.setPlant(plant);
            item.setQuantity(qty);
            item.setUnitPrice(plant.getPrice());
            // Copy the product as it is NOW. The invoice must still read
            // correctly after the catalogue is edited or the plant delisted.
            item.setProductName(plant.getName());
            item.setProductImage(plant.getImage());
            item.setProductCategory(
                    plant.getCategory() != null ? plant.getCategory().getName() : null);
            order.addItem(item);

            subtotal = subtotal.add(plant.getPrice().multiply(BigDecimal.valueOf(qty)));
        }

        // Claimed under a row lock, and re-validated here even though the page
        // already previewed it: the basket may have changed since, the code may
        // have run out in the meantime, and a preview is not a promise.
        Coupon coupon = couponService.claim(user, request.couponCode(), subtotal);

        // The same arithmetic the preview used — one implementation, so the
        // figure quoted and the figure charged cannot drift apart.
        PricingService.Totals totals = pricing.price(subtotal, coupon);

        order.setSubtotal(totals.subtotal());
        order.setDiscount(totals.discount());
        order.setCouponCode(coupon == null ? null : coupon.getCode());
        order.setShipping(totals.shipping());
        order.setTax(totals.tax());
        order.setTotal(totals.total());
        // Set at checkout rather than on despatch, so the customer has a date
        // to plan around from the moment they pay.
        order.setEstimatedDelivery(java.time.LocalDate.now(java.time.ZoneId.of("Asia/Kolkata"))
                .plusDays(5));
        order.setRazorpayOrderId(payments.createOrder(order.getTotal(), order.getOrderNumber()));

        // A payment row from the moment Razorpay has an order, not just on
        // success. An attempt that is never completed is exactly what has to
        // be visible when reconciling a captured payment against the books.
        Payment attempt = new Payment();
        attempt.setOrder(order);
        attempt.setRazorpayOrderId(order.getRazorpayOrderId());
        attempt.setAmount(order.getTotal());
        attempt.setStatus(Payment.CREATED);
        attempt.setVerificationStatus(Payment.UNVERIFIED);

        Order saved = orders.saveAndFlush(order);
        attempt.setOrder(saved);
        paymentRecords.save(attempt);
        if (coupon != null) {
            couponService.recordRedemption(coupon, user, saved, totals.discount());
        }
        notifier.orderPlaced(saved);
        return OrderDto.from(saved, payments.getKeyId(), payments.isSimulated());
    }

    /**
     * Stands in for the gateway callback while no Razorpay account is connected.
     * It only signs a response — the order still has to survive confirmPayment,
     * signature check included, so this exercises the real path rather than a
     * shortcut around it.
     */
    @Transactional(readOnly = true)
    public PaymentVerificationRequest simulateGateway(String email, String razorpayOrderId,
                                                      boolean succeed) {
        // Mode first, before anything about this particular order is looked up
        // or reported. Once a live key is set the endpoint says only that it is
        // off, whoever asks.
        if (!payments.isSimulated()) {
            throw new IllegalStateException("Payment simulation is off. Payments go through Razorpay.");
        }
        Order order = orders.findByRazorpayOrderId(razorpayOrderId)
                .orElseThrow(() -> new ResourceNotFoundException("Unknown payment order."));
        if (!order.getUser().getEmail().equalsIgnoreCase(email)) {
            throw new IllegalArgumentException("This order does not belong to you.");
        }
        String[] response = payments.simulateGatewayResponse(razorpayOrderId, succeed);
        return new PaymentVerificationRequest(razorpayOrderId, response[0], response[1]);
    }

    /** Confirms a payment. */
    @Transactional(noRollbackFor = IllegalArgumentException.class)
    public OrderDto confirmPayment(String email, PaymentVerificationRequest request) {
        Order order = orders.findByRazorpayOrderId(request.razorpayOrderId())
                .orElseThrow(() -> new ResourceNotFoundException("Unknown payment order."));

        if (!order.getUser().getEmail().equalsIgnoreCase(email)) {
            // Someone confirming another account's order.
            throw new IllegalArgumentException("This order does not belong to you.");
        }

        // Idempotency: Razorpay can fire a callback more than once, and a user
        // can refresh the confirmation page. Paying twice must be impossible.
        if ("PAID".equals(order.getStatus())) {
            return OrderDto.from(order, payments.getKeyId(), payments.isSimulated());
        }

        // Only a PENDING order may become PAID.
        if (!"PENDING".equals(order.getStatus())) {
            throw new IllegalArgumentException(
                    "This order is " + order.getStatus().toLowerCase()
                            + " and can no longer be paid.");
        }

        boolean valid = payments.isSignatureValid(
                request.razorpayOrderId(), request.razorpayPaymentId(), request.razorpaySignature());

        if (!valid) {
            order.setStatus("FAILED");
            orders.save(order);
            recordAttempt(order, request, Payment.FAILED, Payment.VERIFICATION_FAILED,
                    "HMAC signature did not match");
            notifier.paymentFailed(order);
            throw new IllegalArgumentException(
                    "Payment could not be verified. You have not been charged.");
        }

        Order settled = markPaid(order, request.razorpayPaymentId(),
                request.razorpaySignature(), Payment.SOURCE_BROWSER);

        return OrderDto.from(settled, payments.getKeyId(), payments.isSimulated());
    }

    /**
     * Marks an order paid, once.
     *
     * Both the browser callback and the Razorpay webhook end up here, because
     * either can arrive first and neither can be relied on alone: the customer
     * may close the tab before the callback fires, and a webhook may be
     * delayed or retried. Whichever arrives first does the work; the second
     * finds the order already PAID and changes nothing.
     */
    @Transactional
    public Order markPaid(Order order, String razorpayPaymentId, String signature, String source) {
        return markPaid(order, razorpayPaymentId, signature, source, null);
    }

    /** methodHint: what the caller already knows, saving a gateway round trip. */
    @Transactional
    public Order markPaid(Order order, String razorpayPaymentId, String signature, String source,
                          String methodHint) {
        if ("PAID".equals(order.getStatus()) || "PAID_SHORT".equals(order.getStatus())) {
            return order;
        }

        order.setRazorpayPaymentId(razorpayPaymentId);
        order.setStatus("PAID");
        // The invoice number is allocated HERE, not at checkout: an invoice is
        // a financial document, and issuing one for an order nobody paid for
        // would leave numbered gaps against nothing.
        if (order.getInvoiceNumber() == null) {
            order.setInvoiceNumber(documents.nextInvoiceNumber());
        }
        // The webhook payload already names the method; only ask the gateway
        // when nobody has told us.
        order.setPaymentMethod(methodHint != null && !methodHint.isBlank()
                ? methodHint : payments.methodOf(razorpayPaymentId));
        recordAttempt(order,
                new PaymentVerificationRequest(order.getRazorpayOrderId(), razorpayPaymentId,
                        signature == null ? "webhook" : signature),
                Payment.CAPTURED, Payment.VERIFIED, null, source);

        // Only now is stock committed — never on an unpaid order.
        // Each plant is re-read under a write lock. The check in startCheckout
        // ran before the customer even opened the payment sheet, so it is a
        // courtesy rather than a guarantee: without the lock, two buyers of the
        // last plant both pass it and the read-modify-write below silently
        // loses one of the two decrements.
        // Deliberately no Math.max(0, ...) clamp. Clamping hid the oversell:
        // the books read a tidy zero while stock we never had was sold.
        for (OrderItem item : order.getItems()) {
            Plant plant = plants.findByIdForUpdate(item.getPlant().getId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "That product no longer exists."));

            if (plant.getStock() == null) continue;   // nothing to decrement

            int remaining = plant.getStock() - item.getQuantity();
            if (remaining < 0) {
                // The money is already captured, so rejecting the order now
                // would be worse than recording the shortfall.
                remaining = 0;
                order.setStatus("PAID_SHORT");
            }
            plant.setStock(remaining);
            plants.save(plant);
        }

        Order settled = orders.saveAndFlush(order);

        // The document ledger entry, once the order is definitely saved and
        // has an id. Idempotent, because the browser callback and the webhook
        // race by design and only one invoice may exist for one payment.
        invoiceService.issueFor(settled, settled.getInvoiceNumber());
        // Emptied server-side rather than trusting the browser to do it. A tab
        // closed on the payment screen used to leave the paid items sitting in
        // the saved cart, ready to be bought twice.
        baskets.clearCartQuietly(settled.getUser().getId());
        notifier.paymentSuccessful(settled);
        return settled;
    }

    /**
     * Settles from the webhook. There is no signed-in caller, so ownership is
     * not checked here — Razorpay's signature over the payload is the
     * authority, and it is verified before this is reached.
     */
    @Transactional
    public boolean settleFromWebhook(String razorpayOrderId, String razorpayPaymentId) {
        return settleFromWebhook(razorpayOrderId, razorpayPaymentId, null);
    }

    @Transactional
    public boolean settleFromWebhook(String razorpayOrderId, String razorpayPaymentId,
                                     String methodHint) {
        Order order = orders.findByRazorpayOrderId(razorpayOrderId).orElse(null);
        if (order == null) return false;
        if ("PAID".equals(order.getStatus()) || "PAID_SHORT".equals(order.getStatus())) {
            return false;   // the browser callback got here first
        }
        if ("CANCELLED".equals(order.getStatus())) return false;

        markPaid(order, razorpayPaymentId, null, Payment.SOURCE_WEBHOOK, methodHint);
        return true;
    }

    /** Records a gateway-reported failure arriving by webhook. */
    @Transactional
    public boolean failFromWebhook(String razorpayOrderId, String razorpayPaymentId, String reason) {
        Order order = orders.findByRazorpayOrderId(razorpayOrderId).orElse(null);
        if (order == null || !"PENDING".equals(order.getStatus())) return false;

        order.setStatus("FAILED");
        orders.save(order);
        recordAttempt(order,
                new PaymentVerificationRequest(razorpayOrderId, razorpayPaymentId, "webhook"),
                Payment.FAILED, Payment.VERIFICATION_FAILED,
                reason == null ? "Reported failed by Razorpay" : reason,
                Payment.SOURCE_WEBHOOK);
        notifier.paymentFailed(order);
        return true;
    }

    /** Writes the outcome of one attempt. */
    private void recordAttempt(Order order, PaymentVerificationRequest request,
                               String status, String verification, String failureReason) {
        recordAttempt(order, request, status, verification, failureReason,
                Payment.SOURCE_BROWSER);
    }

    private void recordAttempt(Order order, PaymentVerificationRequest request,
                               String status, String verification, String failureReason,
                               String source) {
        Payment record = paymentRecords
                .findByRazorpayOrderIdOrderByIdDesc(request.razorpayOrderId()).stream()
                .filter(p -> Payment.CREATED.equals(p.getStatus()))
                .findFirst()
                .orElseGet(Payment::new);

        record.setOrder(order);
        record.setRazorpayOrderId(request.razorpayOrderId());
        // razorpay_payment_id is UNIQUE, which is right for a real payment but
        // wrong for a claimed one: the same forged id posted against two orders
        // would raise a constraint violation, and that rolls back the very
        // transaction marking the order FAILED. An unverified id is evidence,
        // not an identifier, so it is kept as text instead.
        boolean verified = Payment.VERIFIED.equals(verification);
        record.setRazorpayPaymentId(verified ? request.razorpayPaymentId() : null);
        record.setRazorpaySignature(request.razorpaySignature());
        record.setAmount(order.getTotal());
        record.setStatus(status);
        record.setSource(source);
        record.setMethod(order.getPaymentMethod());
        record.setVerificationStatus(verification);
        record.setFailureReason(verified || failureReason == null ? failureReason
                : failureReason + " (claimed payment id " + request.razorpayPaymentId() + ")");
        if (verified) {
            record.setVerifiedAt(java.time.Instant.now());
        }
        paymentRecords.save(record);
    }

    @Transactional
    public boolean markCancelled(String email, String razorpayOrderId) {
        Order order = orders.findByRazorpayOrderId(razorpayOrderId).orElse(null);
        if (order == null
                || !order.getUser().getEmail().equalsIgnoreCase(email)
                || !"PENDING".equals(order.getStatus())) {
            return false;
        }
        order.setStatus("CANCELLED");
        orders.save(order);
        return true;
    }

    @Transactional(readOnly = true)
    public List<OrderDto> myOrders(String email) {
        return orders.findByUserEmailOrderByIdDesc(email).stream()
                .map(o -> OrderDto.from(o, null)).toList();
    }

}
