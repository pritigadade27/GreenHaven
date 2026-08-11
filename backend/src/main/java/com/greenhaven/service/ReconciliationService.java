package com.greenhaven.service;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.greenhaven.model.Order;
import com.greenhaven.repository.OrderRepository;

/**
 * Finds orders the payment flow lost track of.
 *
 * `payment_capture: 1` means Razorpay takes the money the instant the customer
 * authorises. Everything after that — the browser callback, the webhook — is a
 * message that may not arrive. An order left at PENDING with a real captured
 * payment behind it is money taken for goods nobody will ever pack, and
 * nothing else in the system will notice.
 *
 * So this asks the only party that actually knows: Razorpay. Anything it
 * confirms as captured is settled properly, through the same path a browser
 * callback uses. Anything still unpaid after a day is closed off so the books
 * are not carrying stale rows for ever.
 */
@Service
public class ReconciliationService {

    private static final Logger log = LoggerFactory.getLogger(ReconciliationService.class);

    private final OrderRepository orders;
    private final PaymentService payments;
    private final OrderService orderService;

    private final boolean enabled;
    private final int afterMinutes;
    private final int abandonAfterHours;

    public ReconciliationService(OrderRepository orders, PaymentService payments,
                                 OrderService orderService,
                                 @Value("${greenhaven.reconcile.enabled:true}") boolean enabled,
                                 @Value("${greenhaven.reconcile.after-minutes:30}") int afterMinutes,
                                 @Value("${greenhaven.reconcile.abandon-after-hours:24}") int abandonAfterHours) {
        this.orders = orders;
        this.payments = payments;
        this.orderService = orderService;
        this.enabled = enabled;
        this.afterMinutes = afterMinutes;
        this.abandonAfterHours = abandonAfterHours;
    }

    /**
     * Every ten minutes, with a one-minute delay after boot so startup is not
     * competing with a database sweep.
     */
    @Scheduled(initialDelayString = "PT1M", fixedDelayString = "PT10M")
    public void sweep() {
        if (!enabled) return;
        try {
            reconcile();
        } catch (RuntimeException e) {
            // A scheduled task that throws is silently unscheduled by Spring in
            // some configurations. Swallow, log, and live to run again.
            log.error("Reconciliation sweep failed: {}", e.getMessage());
        }
    }

    /** Exposed so an admin can run it on demand, and so it can be tested. */
    @Transactional
    public Result reconcile() {
        Instant staleBefore = Instant.now().minus(Duration.ofMinutes(afterMinutes));
        Instant abandonBefore = Instant.now().minus(Duration.ofHours(abandonAfterHours));

        List<Order> stranded = orders.findStrandedPending(staleBefore);
        int settled = 0;
        int abandoned = 0;

        for (Order order : stranded) {
            String paymentId = payments.capturedPaymentIdFor(order.getRazorpayOrderId());

            if (paymentId != null) {
                // Real money really was taken. Settle it exactly as a callback
                // would have — invoice, stock, notification and all.
                orderService.settleFromWebhook(order.getRazorpayOrderId(), paymentId);
                settled++;
                log.warn("Reconciled {}: Razorpay had a captured payment the callback never reported.",
                        order.getOrderNumber());
                continue;
            }

            // Nothing was captured. Once it is old enough there is no prospect
            // of the customer completing it, so it stops sitting in the books
            // as though it might.
            if (order.getPlacedAt() != null && order.getPlacedAt().isBefore(abandonBefore)) {
                order.setStatus("CANCELLED");
                order.setCancelledAt(Instant.now());
                order.setCancelledBy("SYSTEM");
                order.setCancelReason("Abandoned at checkout — no payment was ever received.");
                orders.save(order);
                abandoned++;
            }
        }

        if (settled > 0 || abandoned > 0) {
            log.info("Reconciliation: {} settled, {} abandoned, {} examined.",
                    settled, abandoned, stranded.size());
        }
        return new Result(stranded.size(), settled, abandoned);
    }

    public record Result(int examined, int settled, int abandoned) {
    }
}
