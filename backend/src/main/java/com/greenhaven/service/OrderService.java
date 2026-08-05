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

    /** Matches the frontend's rule so the customer is never surprised. */
    private static final BigDecimal FREE_DELIVERY_OVER = BigDecimal.valueOf(999);
    private static final BigDecimal DELIVERY_FEE = BigDecimal.valueOf(99);

    private final OrderRepository orders;
    private final PlantRepository plants;
    private final AppUserRepository users;
    private final PaymentService payments;
    private final PaymentRepository paymentRecords;
    private final DocumentNumberService documents;

    public OrderService(OrderRepository orders, PlantRepository plants,
                        AppUserRepository users, PaymentService payments,
                        PaymentRepository paymentRecords, DocumentNumberService documents) {
        this.orders = orders;
        this.plants = plants;
        this.users = users;
        this.payments = payments;
        this.paymentRecords = paymentRecords;
        this.documents = documents;
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

        BigDecimal shipping = subtotal.compareTo(FREE_DELIVERY_OVER) >= 0
                ? BigDecimal.ZERO : DELIVERY_FEE;

        order.setSubtotal(subtotal);
        order.setShipping(shipping);
        order.setTotal(subtotal.add(shipping));
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
        return OrderDto.from(saved, payments.getKeyId());
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
            return OrderDto.from(order, payments.getKeyId());
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
            throw new IllegalArgumentException(
                    "Payment could not be verified. You have not been charged.");
        }

        order.setRazorpayPaymentId(request.razorpayPaymentId());
        order.setStatus("PAID");
        // The invoice number is allocated HERE, not at checkout: an invoice is a financial document, and issuing one for an order nobody paid for would leave numbered gaps against nothing.
        if (order.getInvoiceNumber() == null) {
            order.setInvoiceNumber(documents.nextInvoiceNumber());
        }
        recordAttempt(order, request, Payment.CAPTURED, Payment.VERIFIED, null);

        // Only now is stock committed — never on an unpaid order.
        //
        // Each plant is re-read under a write lock. The check in
        // startCheckout ran before the customer even opened the payment
        // sheet, so it is a courtesy rather than a guarantee: without the
        // lock, two buyers of the last plant both pass it and the
        // read-modify-write below silently loses one of the two decrements.
        //
        // Deliberately no Math.max(0, ...) clamp. Clamping hid the oversell:
        // the books read a tidy zero while stock we never had was sold.
        for (OrderItem item : order.getItems()) {
            Plant plant = plants.findByIdForUpdate(item.getPlant().getId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "That product no longer exists."));

            if (plant.getStock() == null) continue;   // nothing to decrement

            int remaining = plant.getStock() - item.getQuantity();
            if (remaining < 0) {
                // The money is already captured, so rejecting the order now would be worse than recording the shortfall.
                remaining = 0;
                order.setStatus("PAID_SHORT");
            }
            plant.setStock(remaining);
            plants.save(plant);
        }

        return OrderDto.from(orders.save(order), payments.getKeyId());
    }

    /** Cancels an abandoned checkout. */
    /** Writes the outcome of one attempt. */
    private void recordAttempt(Order order, PaymentVerificationRequest request,
                               String status, String verification, String failureReason) {
        Payment record = paymentRecords
                .findByRazorpayOrderIdOrderByIdDesc(request.razorpayOrderId()).stream()
                .filter(p -> Payment.CREATED.equals(p.getStatus()))
                .findFirst()
                .orElseGet(Payment::new);

        record.setOrder(order);
        record.setRazorpayOrderId(request.razorpayOrderId());
        record.setRazorpayPaymentId(request.razorpayPaymentId());
        record.setRazorpaySignature(request.razorpaySignature());
        record.setAmount(order.getTotal());
        record.setStatus(status);
        record.setVerificationStatus(verification);
        record.setFailureReason(failureReason);
        if (Payment.VERIFIED.equals(verification)) {
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
