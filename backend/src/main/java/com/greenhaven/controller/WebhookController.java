package com.greenhaven.controller;

import org.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.greenhaven.service.OrderService;
import com.greenhaven.payment.PaymentService;

@RestController
@RequestMapping("/api/webhooks")
public class WebhookController {
    private static final Logger log = LoggerFactory.getLogger(WebhookController.class);

    private final PaymentService payments;
    private final OrderService orders;

    public WebhookController(PaymentService payments, OrderService orders) {
        this.payments = payments;
        this.orders = orders;
    }

    @PostMapping("/razorpay")
    public ResponseEntity<String> razorpay(
            @RequestBody String rawBody,
            @RequestHeader(value = "X-Razorpay-Signature", required = false) String signature) {
        if (!payments.isWebhookConfigured()) {
            log.warn("Webhook received but RAZORPAY_WEBHOOK_SECRET is not set — refused.");
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body("not configured");
        }

        // Verify Razorpay signature
        if (!payments.isWebhookSignatureValid(rawBody, signature)) {
            log.warn("Webhook signature did not verify — refused.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("bad signature");
        }

        // Read payment entity from payload
        String event;
        JSONObject entity;
        try {
            JSONObject payload = new JSONObject(rawBody);
            event = payload.optString("event", "");
            entity = payload.getJSONObject("payload").getJSONObject("payment").getJSONObject("entity");
        } catch (RuntimeException e) {
            log.warn("Webhook payload could not be read: {}", e.getMessage());
            return ResponseEntity.ok("ignored");
        }

        String razorpayOrderId = entity.optString("order_id", null);
        String razorpayPaymentId = entity.optString("id", null);

        if (razorpayOrderId == null || razorpayOrderId.isBlank()) {
            return ResponseEntity.ok("no order id");
        }

        // Settle or fail the order
        String result = switch (event) {
            case "payment.captured" ->
                    orders.settleFromWebhook(razorpayOrderId, razorpayPaymentId,
                            entity.optString("method", null))
                            ? "settled" : "already settled";
            case "payment.failed" ->
                    orders.failFromWebhook(razorpayOrderId, razorpayPaymentId,
                            entity.optString("error_description", null))
                            ? "marked failed" : "no change";
            default -> "ignored";
        };

        log.info("Webhook {} for {} -> {}", event, razorpayOrderId, result);
        return ResponseEntity.ok(result);
    }
}
