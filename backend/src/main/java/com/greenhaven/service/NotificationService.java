package com.greenhaven.service;

import java.time.Instant;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.greenhaven.dto.ProfileDtos;
import com.greenhaven.entity.AppUser;
import com.greenhaven.entity.Notification;
import com.greenhaven.entity.Order;
import com.greenhaven.repository.AppUserRepository;
import com.greenhaven.repository.NotificationRepository;

@Service
public class NotificationService {
    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    private final NotificationRepository notifications;
    private final AppUserRepository users;

    public NotificationService(NotificationRepository notifications, AppUserRepository users) {
        this.notifications = notifications;
        this.users = users;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void notify(AppUser user, Order order, String type, String title, String body) {
        try {
            Notification row = new Notification();
            row.setUser(user);
            row.setOrder(order);
            row.setType(type);
            row.setTitle(title);
            row.setBody(body);
            notifications.save(row);
        } catch (RuntimeException e) {
            log.warn("Could not record a {} notification for user {}: {}",
                    type, user == null ? null : user.getId(), e.getMessage());
        }
    }

    public void orderPlaced(Order order) {
        notify(order.getUser(), order, Notification.ORDER_PLACED,
                "Order " + order.getOrderNumber() + " placed",
                "We have your order. It will be confirmed as soon as the payment clears.");
    }

    public void paymentSuccessful(Order order) {
        notify(order.getUser(), order, Notification.PAYMENT_SUCCESSFUL,
                "Payment received for " + order.getOrderNumber(),
                "Invoice " + order.getInvoiceNumber() + " is ready to download. "
                        + "Your plants are being potted up for despatch.");
    }

    public void paymentFailed(Order order) {
        notify(order.getUser(), order, Notification.PAYMENT_FAILED,
                "Payment could not be verified",
                "Order " + order.getOrderNumber() + " was not paid, and you have not been "
                        + "charged. Your basket is still there if you would like to retry.");
    }

    public void deliveryChanged(Order order, String deliveryStatus) {
        switch (deliveryStatus) {
            case "SHIPPED" -> notify(order.getUser(), order, Notification.ORDER_SHIPPED,
                    "Order " + order.getOrderNumber() + " has shipped",
                    "It has left the nursery" + estimate(order) + ".");
            case "OUT_FOR_DELIVERY" -> notify(order.getUser(), order, Notification.OUT_FOR_DELIVERY,
                    "Out for delivery",
                    "Order " + order.getOrderNumber() + " is with the courier today. "
                            + "Please keep your phone to hand.");
            case "DELIVERED" -> notify(order.getUser(), order, Notification.ORDER_DELIVERED,
                    "Delivered",
                    "Order " + order.getOrderNumber() + " has arrived. Unpack the plants soon "
                            + "and give them a drink.");
            case "CANCELLED" -> notify(order.getUser(), order, Notification.ORDER_CANCELLED,
                    "Order " + order.getOrderNumber() + " cancelled",
                    "This order will not be delivered. Any payment taken will be refunded.");
            default -> { }
        }
    }

    private static String estimate(Order order) {
        return order.getEstimatedDelivery() == null ? ""
                : ", and should reach you by " + order.getEstimatedDelivery();
    }

    @Transactional(readOnly = true)
    public List<ProfileDtos.NotificationDto> recent(String email) {
        AppUser user = user(email);
        return notifications.findTop20ByUserIdOrderByIdDesc(user.getId()).stream()
                .map(NotificationService::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public long unread(String email) {
        return notifications.countByUserIdAndReadAtIsNull(user(email).getId());
    }

    @Transactional
    public int markAllRead(String email) {
        return notifications.markAllRead(user(email).getId(), Instant.now());
    }

    private static ProfileDtos.NotificationDto toDto(Notification n) {
        return new ProfileDtos.NotificationDto(
                n.getId(), n.getType(), n.getTitle(), n.getBody(),
                n.getOrder() == null ? null : n.getOrder().getOrderNumber(),
                n.getReadAt() != null, n.getCreatedAt());
    }

    private AppUser user(String email) {
        return users.findByEmail(email)
                .orElseThrow(() -> new com.greenhaven.exception.ResourceNotFoundException(
                        "Not signed in."));
    }
}
