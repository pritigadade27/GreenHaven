package com.greenhaven.payment;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.UUID;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.razorpay.RazorpayClient;
import com.razorpay.Utils;

import jakarta.annotation.PostConstruct;

@Service
public class PaymentService {
    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);

    public static final String SIMULATED = "simulated";

    private final String keyId;
    private final String keySecret;
    private final String currency;
    private final String mode;
    private final String simulationSecret;
    private final String webhookSecret;

    private volatile RazorpayClient client;

    public PaymentService(@Value("${razorpay.key-id}") String keyId,
                          @Value("${razorpay.key-secret}") String keySecret,
                          @Value("${razorpay.currency:INR}") String currency,
                          @Value("${razorpay.mode:live}") String mode,
                          @Value("${razorpay.simulation-secret:}") String simulationSecret,
                          @Value("${razorpay.webhook-secret:}") String webhookSecret) {
        this.keyId = keyId;
        this.keySecret = keySecret;
        this.currency = currency;
        this.mode = mode == null ? "live" : mode.trim().toLowerCase();
        this.simulationSecret = simulationSecret == null || simulationSecret.isBlank()
                ? UUID.randomUUID().toString()
                : simulationSecret;
        this.webhookSecret = webhookSecret;
    }

    public boolean isSimulated() {
        return SIMULATED.equals(mode) && !hasLiveKeys();
    }

    private boolean hasLiveKeys() {
        return keyId != null && keyId.startsWith("rzp_live_");
    }

    @PostConstruct
    void announceMode() {
        if (SIMULATED.equals(mode) && hasLiveKeys()) {
            log.error("RAZORPAY_MODE=simulated ignored: a live key is configured. Using the real gateway.");
        } else if (isSimulated()) {
            log.warn("Razorpay is SIMULATED. Payments are fake and no money moves. "
                    + "Set RAZORPAY_MODE=live with real keys before taking orders.");
        }
    }

    public String getKeyId() {
        return isSimulated() ? "rzp_test_simulated" : keyId;
    }

    public boolean isConfigured() {
        return isSimulated()
                || (keyId != null && !keyId.isBlank() && !keyId.contains("REPLACE_ME")
                    && keySecret != null && !keySecret.isBlank() && !keySecret.contains("REPLACE_ME"));
    }

    public String createOrder(BigDecimal rupees, String receipt) throws Exception {
        if (isSimulated()) {
            return "order_SIM" + UUID.randomUUID().toString().replace("-", "").substring(0, 14);
        }
        if (!isConfigured()) {
            throw new IllegalStateException(
                    "Razorpay keys are not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.");
        }

        // Convert rupees to paise
        long paise = rupees.setScale(2, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100))
                .longValueExact();

        JSONObject request = new JSONObject();
        request.put("amount", paise);
        request.put("currency", currency);
        request.put("receipt", receipt);
        request.put("payment_capture", 1);

        return client().orders.create(request).get("id").toString();
    }

    // Lazy thread-safe client
    private RazorpayClient client() throws Exception {
        RazorpayClient local = client;
        if (local == null) {
            synchronized (this) {
                local = client;
                if (local == null) {
                    local = new RazorpayClient(keyId, keySecret);
                    client = local;
                }
            }
        }
        return local;
    }

    // Verify payment signature
    public boolean isSignatureValid(String razorpayOrderId, String razorpayPaymentId,
                                    String signature) {
        try {
            if (isSimulated()) {
                return constantTimeEquals(
                        sign(razorpayOrderId + "|" + razorpayPaymentId, simulationSecret),
                        signature);
            }
            JSONObject payload = new JSONObject();
            payload.put("razorpay_order_id", razorpayOrderId);
            payload.put("razorpay_payment_id", razorpayPaymentId);
            payload.put("razorpay_signature", signature);
            return Utils.verifyPaymentSignature(payload, keySecret);
        } catch (Exception e) {
            return false;
        }
    }

    // Verify webhook signature
    public boolean isWebhookSignatureValid(String rawBody, String headerSignature) {
        if (webhookSecret == null || webhookSecret.isBlank()) return false;
        if (rawBody == null || headerSignature == null || headerSignature.isBlank()) return false;
        return constantTimeEquals(sign(rawBody, webhookSecret), headerSignature.trim());
    }

    public boolean isWebhookConfigured() {
        return webhookSecret != null && !webhookSecret.isBlank();
    }

    public String methodOf(String razorpayPaymentId) {
        if (isSimulated()) return "SIMULATED";
        if (razorpayPaymentId == null || razorpayPaymentId.isBlank()) return null;
        try {
            Object method = client().payments.fetch(razorpayPaymentId).get("method");
            return method == null ? null : method.toString();
        } catch (Exception e) {
            log.warn("Could not read the payment method for {}: {}",
                    razorpayPaymentId, e.getMessage());
            return null;
        }
    }

    public String capturedPaymentIdFor(String razorpayOrderId) {
        if (isSimulated() || razorpayOrderId == null || razorpayOrderId.isBlank()) return null;
        try {
            var list = client().orders.fetchPayments(razorpayOrderId);
            for (int i = 0; i < list.size(); i++) {
                var payment = list.get(i);
                if ("captured".equalsIgnoreCase(String.valueOf(payment.get("status")))) {
                    return String.valueOf(payment.get("id"));
                }
            }
            return null;
        } catch (Exception e) {
            log.warn("Could not ask Razorpay about {}: {}", razorpayOrderId, e.getMessage());
            return null;
        }
    }

    public String[] simulateGatewayResponse(String razorpayOrderId, boolean succeed) {
        if (!isSimulated()) {
            throw new IllegalStateException("Payment simulation is off. Payments go through Razorpay.");
        }
        String paymentId = "pay_SIM" + UUID.randomUUID().toString().replace("-", "").substring(0, 14);
        String signature = succeed
                ? sign(razorpayOrderId + "|" + paymentId, simulationSecret)
                : sign(razorpayOrderId + "|" + paymentId, "wrong-secret");
        return new String[] { paymentId, signature };
    }

    private static String sign(String data, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(java.nio.charset.StandardCharsets.UTF_8),
                    "HmacSHA256"));
            return HexFormat.of().formatHex(
                    mac.doFinal(data.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("Could not sign the simulated payment.", e);
        }
    }

    private static boolean constantTimeEquals(String a, String b) {
        if (a == null || b == null) return false;
        return MessageDigest.isEqual(
                a.getBytes(java.nio.charset.StandardCharsets.UTF_8),
                b.getBytes(java.nio.charset.StandardCharsets.UTF_8));
    }
}
