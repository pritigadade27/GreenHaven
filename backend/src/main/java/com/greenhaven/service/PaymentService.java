package com.greenhaven.service;

import java.math.BigDecimal;
import java.math.RoundingMode;

import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.razorpay.RazorpayClient;
import com.razorpay.Utils;

/** Everything that talks to Razorpay. */
@Service
public class PaymentService {

    private final String keyId;
    private final String keySecret;
    private final String currency;

    /** Built once, lazily. */
    private volatile RazorpayClient client;

    public PaymentService(@Value("${razorpay.key-id}") String keyId,
                          @Value("${razorpay.key-secret}") String keySecret,
                          @Value("${razorpay.currency:INR}") String currency) {
        this.keyId = keyId;
        this.keySecret = keySecret;
        this.currency = currency;
    }

    public String getKeyId() {
        return keyId;
    }

    /** True when real keys are configured — lets the API fail loudly, early. */
    public boolean isConfigured() {
        return keyId != null && !keyId.isBlank() && !keyId.contains("REPLACE_ME")
                && keySecret != null && !keySecret.isBlank() && !keySecret.contains("REPLACE_ME");
    }

    /** Creates the order on Razorpay's side and returns its id. */
    public String createOrder(BigDecimal rupees, String receipt) throws Exception {
        if (!isConfigured()) {
            throw new IllegalStateException(
                    "Razorpay keys are not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.");
        }

        long paise = rupees.setScale(2, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100))
                .longValueExact();

        JSONObject request = new JSONObject();
        request.put("amount", paise);
        request.put("currency", currency);
        request.put("receipt", receipt);
        // Let Razorpay capture automatically; a manual capture step is one more
        // place for a paid-but-uncaptured order to get stranded.
        request.put("payment_capture", 1);

        return client().orders.create(request).get("id").toString();
    }

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

    /**
     * Verifies the HMAC-SHA256 signature Razorpay returns with a payment.
     *
     * This is the only thing standing between the shop and a forged
     * "payment successful" request. It must be called server-side, on every
     * payment, before an order is marked PAID.
     */
    public boolean isSignatureValid(String razorpayOrderId, String razorpayPaymentId,
                                    String signature) {
        try {
            JSONObject payload = new JSONObject();
            payload.put("razorpay_order_id", razorpayOrderId);
            payload.put("razorpay_payment_id", razorpayPaymentId);
            payload.put("razorpay_signature", signature);
            return Utils.verifyPaymentSignature(payload, keySecret);
        } catch (Exception e) {
            // A malformed signature is a failed verification, never an error
            // the caller has to handle differently.
            return false;
        }
    }
}
