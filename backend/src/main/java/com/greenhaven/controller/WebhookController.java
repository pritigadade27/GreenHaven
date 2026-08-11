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
import com.greenhaven.service.PaymentService;

/**
 * Razorpay's own notification of what happened to a payment.
 *
 * This exists because the browser callback cannot be trusted to arrive. The
 * money is captured the moment the customer pays; if they then close the tab,
 * lose signal, or the redirect fails, nothing tells the shop. The webhook is
 * Razorpay telling us directly, and it retries until we answer 2xx.
 *
 * Unauthenticated on purpose — Razorpay has no bearer token. The HMAC over the
 * raw body IS the authentication, and an unsigned or wrongly signed call is
 * refused. Point the dashboard at:
 *
 *     POST https://your-host/api/webhooks/razorpay
 *     events: payment.captured, payment.failed
 */
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

    /**
     * Takes the body as a String, not a parsed object: the signature covers the
     * exact bytes Razorpay sent, and letting Jackson parse and re-serialise
     * would change whitespace and key order and break the digest.
     */
    @PostMapping("/razorpay")
    public ResponseEntity<String> razorpay(
            @RequestBody String rawBody,
            @RequestHeader(value = "X-Razorpay-Signature", required = false) String signature) {

        if (!payments.isWebhookConfigured()) {
            // Refusing beats accepting unsigned calls: an open endpoint that
            // marks orders paid is worse than no endpoint at all.
            log.warn("Webhook received but RAZORPAY_WEBHOOK_SECRET is not set — refused.");
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body("not configured");
        }

        if (!payments.isWebhookSignatureValid(rawBody, signature)) {
            log.warn("Webhook signature did not verify — refused.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("bad signature");
        }

        String event;
        JSONObject entity;
        try {
            JSONObject payload = new JSONObject(rawBody);
            event = payload.optString("event", "");
            entity = payload.getJSONObject("payload").getJSONObject("payment").getJSONObject("entity");
        } catch (RuntimeException e) {
            // Signed but unreadable. 200 anyway: Razorpay would retry forever,
            // and a retry cannot fix a payload we do not understand.
            log.warn("Webhook payload could not be read: {}", e.getMessage());
            return ResponseEntity.ok("ignored");
        }

        String razorpayOrderId = entity.optString("order_id", null);
        String razorpayPaymentId = entity.optString("id", null);

        if (razorpayOrderId == null || razorpayOrderId.isBlank()) {
            return ResponseEntity.ok("no order id");
        }

        // Idempotency lives in the service: a webhook is retried until it is
        // acknowledged, and Razorpay may well send the same event twice.
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
