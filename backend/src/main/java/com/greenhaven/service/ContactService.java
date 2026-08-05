package com.greenhaven.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.greenhaven.dto.ContactRequest;
import com.greenhaven.dto.NewsletterRequest;
import com.greenhaven.model.ContactMessage;
import com.greenhaven.model.NewsletterSubscriber;
import com.greenhaven.repository.ContactMessageRepository;
import com.greenhaven.repository.NewsletterSubscriberRepository;

@Service
@Transactional
public class ContactService {

    private final ContactMessageRepository messages;
    private final NewsletterSubscriberRepository subscribers;

    public ContactService(ContactMessageRepository messages,
                          NewsletterSubscriberRepository subscribers) {
        this.messages = messages;
        this.subscribers = subscribers;
    }

    public void save(ContactRequest request) {
        ContactMessage message = new ContactMessage();
        message.setName(request.name().trim());
        message.setEmail(request.email().trim().toLowerCase());
        message.setSubject(request.subject());
        message.setMessage(request.message().trim());
        messages.save(message);
    }

    /** Subscribing twice is not an error — it is the same outcome. */
    public void subscribe(NewsletterRequest request) {
        String email = request.email().trim().toLowerCase();
        if (subscribers.findByEmail(email).isPresent()) {
            return;
        }
        NewsletterSubscriber subscriber = new NewsletterSubscriber();
        subscriber.setEmail(email);
        subscribers.save(subscriber);
    }
}
