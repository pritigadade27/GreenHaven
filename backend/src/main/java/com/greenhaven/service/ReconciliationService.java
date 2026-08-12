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

import com.greenhaven.entity.Order;
import com.greenhaven.repository.OrderRepository;
import com.greenhaven.payment.PaymentService;

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

    @Scheduled(initialDelayString = "PT1M", fixedDelayString = "PT10M")
    public void sweep() {
        if (!enabled) return;
        try {
            reconcile();
        } catch (RuntimeException e) {
            log.error("Reconciliation sweep failed: {}", e.getMessage());
        }
    }

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
                orderService.settleFromWebhook(order.getRazorpayOrderId(), paymentId);
                settled++;
                log.warn("Reconciled {}: Razorpay had a captured payment the callback never reported.",
                        order.getOrderNumber());
                continue;
            }

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
