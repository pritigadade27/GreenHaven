package com.greenhaven.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.greenhaven.entity.AdminActivityLog;
import com.greenhaven.entity.AppUser;
import com.greenhaven.repository.AdminActivityLogRepository;
import com.greenhaven.repository.AppUserRepository;

import jakarta.servlet.http.HttpServletRequest;

@Service
public class AdminAuditService {
    public static final String LOGIN = "LOGIN";
    public static final String LOGIN_FAILED = "LOGIN_FAILED";
    public static final String LOGOUT = "LOGOUT";
    public static final String PRODUCT_ADDED = "PRODUCT_ADDED";
    public static final String PRODUCT_UPDATED = "PRODUCT_UPDATED";
    public static final String PRODUCT_DELETED = "PRODUCT_DELETED";
    public static final String CATEGORY_CHANGED = "CATEGORY_CHANGED";
    public static final String INVENTORY_UPDATED = "INVENTORY_UPDATED";
    public static final String ORDER_STATUS_CHANGED = "ORDER_STATUS_CHANGED";
    public static final String PAYMENT_STATUS_CHANGED = "PAYMENT_STATUS_CHANGED";
    public static final String USER_BLOCKED = "USER_BLOCKED";
    public static final String USER_UNBLOCKED = "USER_UNBLOCKED";
    public static final String REVIEW_MODERATED = "REVIEW_MODERATED";
    public static final String REVIEW_DELETED = "REVIEW_DELETED";
    public static final String COUPON_ADDED = "COUPON_ADDED";
    public static final String COUPON_UPDATED = "COUPON_UPDATED";
    public static final String RECONCILED = "PAYMENTS_RECONCILED";

    private final AdminActivityLogRepository logs;
    private final AppUserRepository users;

    public AdminAuditService(AdminActivityLogRepository logs, AppUserRepository users) {
        this.logs = logs;
        this.users = users;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(String adminEmail, String action, String entityType,
                       String entityId, String detail, HttpServletRequest request) {
        AppUser admin = adminEmail == null ? null : users.findByEmail(adminEmail).orElse(null);

        AdminActivityLog entry = new AdminActivityLog();
        entry.setAdminId(admin == null ? null : admin.getId());
        entry.setAdminName(admin == null ? "(unknown)" : admin.getFullName());
        entry.setAdminEmail(adminEmail == null ? "(unknown)" : adminEmail);
        entry.setAction(action);
        entry.setEntityType(entityType);
        entry.setEntityId(entityId);
        entry.setDetail(cut(detail, 500));
        entry.setIpAddress(AdminSessionService.clientIp(request));
        logs.save(entry);
    }

    @Transactional(readOnly = true)
    public Page<AdminActivityLog> recent(String action, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.min(Math.max(1, size), 100));
        return action == null || action.isBlank()
                ? logs.findAllByOrderByIdDesc(pageable)
                : logs.findByActionOrderByIdDesc(action.trim().toUpperCase(), pageable);
    }

    private static String cut(String value, int max) {
        if (value == null) return null;
        return value.length() <= max ? value : value.substring(0, max - 1) + "…";
    }
}
