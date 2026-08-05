package com.greenhaven.controller;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.greenhaven.dto.ApiMessage;
import com.greenhaven.dto.ContactRequest;
import com.greenhaven.dto.NewsletterRequest;
import com.greenhaven.service.ContactService;

import jakarta.validation.Valid;

/**
 *   POST /api/contact
 *   POST /api/newsletter
 */
@RestController
public class ContactController {

    private final ContactService contact;

    public ContactController(ContactService contact) {
        this.contact = contact;
    }

    @PostMapping("/api/contact")
    public ApiMessage send(@Valid @RequestBody ContactRequest request) {
        contact.save(request);
        return new ApiMessage("Thank you — we will reply within one working day.");
    }

    @PostMapping("/api/newsletter")
    public ApiMessage subscribe(@Valid @RequestBody NewsletterRequest request) {
        contact.subscribe(request);
        return new ApiMessage("You are on the list. The first letter arrives next month.");
    }
}
