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
import com.greenhaven.entity.AppUser;
import com.greenhaven.entity.Coupon;
import com.greenhaven.entity.Order;
import com.greenhaven.entity.OrderItem;
import com.greenhaven.entity.Plant;
import com.greenhaven.repository.AppUserRepository;
import com.greenhaven.repository.OrderRepository;
import com.greenhaven.entity.Payment;
import com.greenhaven.repository.PaymentRepository;
import com.greenhaven.repository.PlantRepository;
import com.greenhaven.payment.PaymentService;

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
            if (plant.getStock() == null || plant.getStock() < qty) {
                throw new IllegalArgumentException(plant.getStock() == null
                        ? plant.getName() + " is not available right now."
                        : "Only " + plant.getStock() + " left of " + plant.getName() + ".");
            }

            OrderItem item = new OrderItem();
            item.setPlant(plant);
            item.setQuantity(qty);
            item.setUnitPrice(plant.getPrice());
            item.setProductName(plant.getName());
            item.setProductImage(plant.getImage());
            item.setProductCategory(
                    plant.getCategory() != null ? plant.getCategory().getName() : null);
            order.addItem(item);

            subtotal = subtotal.add(plant.getPrice().multiply(BigDecimal.valueOf(qty)));
        }

        Coupon coupon = couponService.claim(user, request.couponCode(), subtotal);

        PricingService.Totals totals = pricing.price(subtotal, coupon);

        order.setSubtotal(totals.subtotal());
        order.setDiscount(totals.discount());
        order.setCouponCode(coupon == null ? null : coupon.getCode());
        order.setShipping(totals.shipping());
        order.setTax(totals.tax());
        order.setTotal(totals.total());
        order.setEstimatedDelivery(java.time.LocalDate.now(java.time.ZoneId.of("Asia/Kolkata"))
                .plusDays(5));
        order.setRazorpayOrderId(payments.createOrder(order.getTotal(), order.getOrderNumber()));

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

    @Transactional(readOnly = true)
    public PaymentVerificationRequest simulateGateway(String email, String razorpayOrderId,
                                                      boolean succeed) {
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

    @Transactional(noRollbackFor = IllegalArgumentException.class)
    public OrderDto confirmPayment(String email, PaymentVerificationRequest request) {
        Order order = orders.findByRazorpayOrderId(request.razorpayOrderId())
                .orElseThrow(() -> new ResourceNotFoundException("Unknown payment order."));

        if (!order.getUser().getEmail().equalsIgnoreCase(email)) {
            throw new IllegalArgumentException("This order does not belong to you.");
        }

        if ("PAID".equals(order.getStatus())) {
            return OrderDto.from(order, payments.getKeyId(), payments.isSimulated());
        }

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

    @Transactional
    public Order markPaid(Order order, String razorpayPaymentId, String signature, String source) {
        return markPaid(order, razorpayPaymentId, signature, source, null);
    }

    @Transactional
    public Order markPaid(Order order, String razorpayPaymentId, String signature, String source,
                          String methodHint) {
        if ("PAID".equals(order.getStatus()) || "PAID_SHORT".equals(order.getStatus())) {
            return order;
        }

        order.setRazorpayPaymentId(razorpayPaymentId);
        order.setStatus("PAID");
        if (order.getInvoiceNumber() == null) {
            order.setInvoiceNumber(documents.nextInvoiceNumber());
        }
        order.setPaymentMethod(methodHint != null && !methodHint.isBlank()
                ? methodHint : payments.methodOf(razorpayPaymentId));
        recordAttempt(order,
                new PaymentVerificationRequest(order.getRazorpayOrderId(), razorpayPaymentId,
                        signature == null ? "webhook" : signature),
                Payment.CAPTURED, Payment.VERIFIED, null, source);

        for (OrderItem item : order.getItems()) {
            Plant plant = plants.findByIdForUpdate(item.getPlant().getId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "That product no longer exists."));

            if (plant.getStock() == null) continue;

            int remaining = plant.getStock() - item.getQuantity();
            if (remaining < 0) {
                remaining = 0;
                order.setStatus("PAID_SHORT");
            }
            plant.setStock(remaining);
            plants.save(plant);
        }

        Order settled = orders.saveAndFlush(order);

        invoiceService.issueFor(settled, settled.getInvoiceNumber());
        baskets.clearCartQuietly(settled.getUser().getId());
        notifier.paymentSuccessful(settled);
        return settled;
    }

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
            return false;
        }
        if ("CANCELLED".equals(order.getStatus())) return false;

        markPaid(order, razorpayPaymentId, null, Payment.SOURCE_WEBHOOK, methodHint);
        return true;
    }

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
