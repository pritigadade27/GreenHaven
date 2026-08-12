package com.greenhaven.controller;

import java.security.Principal;
import java.util.List;
import java.util.Map;

import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.greenhaven.dto.ApiMessage;
import com.greenhaven.dto.BasketDto;
import com.greenhaven.dto.ProfileDtos;
import com.greenhaven.entity.Order;
import com.greenhaven.service.InvoicePdfService;
import com.greenhaven.service.NotificationService;
import com.greenhaven.service.ProfileService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {
    private final ProfileService profile;
    private final NotificationService notifications;
    private final InvoicePdfService invoices;

    public ProfileController(ProfileService profile, NotificationService notifications,
                             InvoicePdfService invoices) {
        this.profile = profile;
        this.notifications = notifications;
        this.invoices = invoices;
    }

    @GetMapping
    public ProfileDtos.Profile me(Principal principal) {
        return profile.profile(principal.getName());
    }

    @PatchMapping
    public ProfileDtos.Profile update(Principal principal,
                                      @Valid @RequestBody ProfileDtos.UpdateProfileRequest body) {
        return profile.updateProfile(principal.getName(), body);
    }

    // Issue email change token
    @PostMapping("/email")
    public Map<String, String> requestEmailChange(
            Principal principal, @Valid @RequestBody ProfileDtos.ChangeEmailRequest body) {
        String token = profile.requestEmailChange(principal.getName(), body);
        return Map.of("message",
                "Confirm " + body.email() + " to finish the change. "
                        + "You can keep signing in with your current address until then.",
                "token", token);
    }

    @PostMapping("/email/confirm")
    public com.greenhaven.dto.AuthResponse confirmEmailChange(Principal principal,
                                                              @RequestParam String token) {
        return profile.confirmEmailChange(principal.getName(), token);
    }

    @DeleteMapping("/email")
    public ApiMessage cancelEmailChange(Principal principal) {
        profile.cancelEmailChange(principal.getName());
        return new ApiMessage("That email change has been dropped.");
    }

    // Change account password
    @PostMapping("/password")
    public ApiMessage changePassword(Principal principal,
                                     @Valid @RequestBody ProfileDtos.ChangePasswordRequest body) {
        profile.changePassword(principal.getName(), body);
        return new ApiMessage("Your password has been changed.");
    }

    @GetMapping("/orders")
    public List<ProfileDtos.OrderSummary> orders(Principal principal) {
        return profile.myOrders(principal.getName());
    }

    @GetMapping("/orders/{orderNumber}")
    public ProfileDtos.OrderDetail order(Principal principal, @PathVariable String orderNumber) {
        return profile.orderDetail(principal.getName(), orderNumber);
    }

    @PostMapping("/orders/{orderNumber}/cancel")
    public ProfileDtos.OrderDetail cancel(Principal principal, @PathVariable String orderNumber,
                                          @RequestBody(required = false)
                                          ProfileDtos.CancelOrderRequest body) {
        return profile.cancelOrder(principal.getName(), orderNumber,
                body == null ? null : body.reason());
    }

    @GetMapping("/orders/{orderNumber}/reorder")
    public List<BasketDto.Line> reorder(Principal principal, @PathVariable String orderNumber) {
        return profile.reorderLines(principal.getName(), orderNumber);
    }

    // Owner-only invoice PDF
    @GetMapping(value = "/orders/{orderNumber}/invoice", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> invoice(Principal principal, @PathVariable String orderNumber) {
        Order order = profile.invoiceSource(principal.getName(), orderNumber);
        byte[] pdf = invoices.render(order);

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename(order.getInvoiceNumber() + ".pdf").build().toString())
                .header(HttpHeaders.CACHE_CONTROL, "private, max-age=0, no-store")
                .body(pdf);
    }

    @GetMapping(value = "/documents/{number}", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> document(Principal principal, @PathVariable String number) {
        com.greenhaven.entity.Invoice doc = profile.ownedDocument(principal.getName(), number);
        byte[] pdf = invoices.render(doc.getOrder(), doc);

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename(doc.getNumber() + ".pdf").build().toString())
                .header(HttpHeaders.CACHE_CONTROL, "private, max-age=0, no-store")
                .body(pdf);
    }

    @GetMapping("/payments")
    public List<ProfileDtos.PaymentRow> payments(Principal principal) {
        return profile.myPayments(principal.getName());
    }

    @GetMapping("/invoices")
    public List<ProfileDtos.InvoiceRow> invoices(Principal principal) {
        return profile.myInvoices(principal.getName());
    }

    @GetMapping("/notifications")
    public List<ProfileDtos.NotificationDto> notifications(Principal principal) {
        return notifications.recent(principal.getName());
    }

    @PostMapping("/notifications/read")
    public ApiMessage markRead(Principal principal) {
        int marked = notifications.markAllRead(principal.getName());
        return new ApiMessage(marked == 0 ? "Nothing new." : "Marked " + marked + " as read.");
    }
}
