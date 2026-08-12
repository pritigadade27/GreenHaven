package com.greenhaven.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.greenhaven.entity.ContactMessage;

public interface ContactMessageRepository extends JpaRepository<ContactMessage, Long> {
}
