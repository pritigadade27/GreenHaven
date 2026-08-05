package com.greenhaven.exception;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
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

    /** A constraint the database enforces and we did not check first — a duplicate email registered in the same instant, or a value too long for its column. */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, Object>> conflict(DataIntegrityViolationException ex) {
        return build(HttpStatus.CONFLICT,
                "That could not be saved — it may already exist, or a field is too long.", null);
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
