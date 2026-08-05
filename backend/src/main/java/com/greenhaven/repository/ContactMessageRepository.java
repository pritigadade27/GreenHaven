package com.greenhaven.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.greenhaven.model.ContactMessage;

public interface ContactMessageRepository extends JpaRepository<ContactMessage, Long> {
}
