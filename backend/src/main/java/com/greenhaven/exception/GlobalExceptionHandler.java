package com.greenhaven.exception;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartException;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Turns exceptions into a consistent JSON shape so the React side always knows
 * where to look for a message, rather than parsing whatever Spring defaults to.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<Map<String, Object>> notFound(ResourceNotFoundException ex) {
        return build(HttpStatus.NOT_FOUND, ex.getMessage(), null);
    }

    /** Messages we are willing to show a customer. */
    private static String safeMessage(Throwable ex, String fallback) {
        String message = ex.getMessage();
        if (message == null || message.isBlank() || message.length() > 200) return fallback;

        StackTraceElement[] trace = ex.getStackTrace();
        boolean ours = trace.length > 0 && trace[0].getClassName().startsWith("com.greenhaven");
        return ours ? message : fallback;
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> badRequest(IllegalArgumentException ex) {
        return build(HttpStatus.BAD_REQUEST,
                safeMessage(ex, "That request could not be processed. Please check and retry."),
                null);
    }

    /**
     * A dependency the server needs is not set up — currently only the
     * Razorpay keys. 503 rather than 500: the request was fine, the service
     * behind it is not ready, and the message says exactly which.
     */
    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, Object>> notReady(IllegalStateException ex) {
        return build(HttpStatus.SERVICE_UNAVAILABLE,
                safeMessage(ex, "That service is not available right now."), null);
    }

    /**
     * Razorpay refused or could not be reached — a wrong key, a rejected order,
     * a network fault. 502, because the failure is upstream and nothing about
     * the customer's request was wrong. The gateway's own wording can name
     * internal state, so it goes to the log and never to the browser.
     */
    @ExceptionHandler(com.razorpay.RazorpayException.class)
    public ResponseEntity<Map<String, Object>> gatewayFailed(com.razorpay.RazorpayException ex) {
        LoggerFactory.getLogger(GlobalExceptionHandler.class)
                .error("Razorpay call failed: {}", ex.getMessage());
        return build(HttpStatus.BAD_GATEWAY,
                "The payment gateway could not be reached. Nothing has been charged — please try again.",
                null);
    }

    /** A constraint the database enforces and we did not check first — a duplicate email registered in the same instant, or a value too long for its column. */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, Object>> conflict(DataIntegrityViolationException ex) {
        return build(HttpStatus.CONFLICT,
                "That could not be saved — it may already exist, or a field is too long.", null);
    }

    /**
     * A body Jackson could not read at all — truncated JSON, a wrong content
     * type, text in an encoding that is not UTF-8. Without this it escapes as
     * Spring's own error page, which has no `message` field, so the React side
     * shows "Request failed (400)" instead of something a person can act on.
     */
    @ExceptionHandler(org.springframework.http.converter.HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, Object>> unreadable(
            org.springframework.http.converter.HttpMessageNotReadableException ex) {
        return build(HttpStatus.BAD_REQUEST,
                "That request could not be read. Please check and retry.", null);
    }

    /**
     * A file larger than spring.servlet.multipart.max-file-size.
     *
     * Needed explicitly because the container rejects the upload while parsing
     * the request, before any controller runs — so UploadService's own 5 MB
     * check never gets the chance to produce its message. Without this the
     * failure surfaced as 503 "that service is not available", which reads as
     * our fault and invites a retry that cannot possibly work.
     *
     * 413, and the limit is named, because the only useful thing a customer can
     * do about it is send a smaller picture.
     */
    @ExceptionHandler({MaxUploadSizeExceededException.class, MultipartException.class})
    public ResponseEntity<Map<String, Object>> tooLarge(Exception ex) {
        return build(HttpStatus.PAYLOAD_TOO_LARGE,
                "That file is too large. Images must be 5 MB or smaller.", null);
    }

    /** Bean-validation failures, returned field by field. */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> invalid(MethodArgumentNotValidException ex) {
        Map<String, String> fields = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors()
                .forEach(err -> fields.putIfAbsent(err.getField(), err.getDefaultMessage()));
        return build(HttpStatus.BAD_REQUEST, "Please check the highlighted fields.", fields);
    }

    private ResponseEntity<Map<String, Object>> build(HttpStatus status, String message, Object fields) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", Instant.now().toString());
        body.put("status", status.value());
        body.put("message", message);
        if (fields != null) {
            body.put("fields", fields);
        }
        return ResponseEntity.status(status).body(body);
    }
}
