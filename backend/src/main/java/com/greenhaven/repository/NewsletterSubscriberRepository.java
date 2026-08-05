package com.greenhaven.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.greenhaven.model.NewsletterSubscriber;

public interface NewsletterSubscriberRepository extends JpaRepository<NewsletterSubscriber, Long> {

    /** See AppUserRepository: the collation already ignores case. */
    Optional<NewsletterSubscriber> findByEmail(String email);
}
