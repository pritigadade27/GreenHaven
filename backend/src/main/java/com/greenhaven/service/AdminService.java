package com.greenhaven.service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.greenhaven.dto.AdminDtos;
import com.greenhaven.exception.ResourceNotFoundException;
import com.greenhaven.model.AppUser;
import com.greenhaven.model.Order;
import com.greenhaven.model.OrderItem;
import com.greenhaven.model.Payment;
import com.greenhaven.model.Plant;
import com.greenhaven.model.Review;
import com.greenhaven.repository.AppUserRepository;
import com.greenhaven.repository.CategoryRepository;
import com.greenhaven.repository.NewsletterSubscriberRepository;
import com.greenhaven.repository.OrderRepository;
import com.greenhaven.repository.PaymentRepository;
import com.greenhaven.repository.PlantRepository;
import com.greenhaven.repository.ReviewRepository;

/** Everything the admin dashboard reads and writes. */
@Service
public class AdminService {

    /** At or below this, a product is flagged for restocking. */
    public static final int LOW_STOCK_AT = 5;

    /** The fulfilment states an order may be moved between. */
    public static final Set<String> DELIVERY_STATUSES = Set.of(
            "PENDING", "CONFIRMED", "PROCESSING", "PACKED",
            "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED");

    private final OrderRepository orders;
    private final PaymentRepository payments;
    private final PlantRepository plants;
    private final CategoryRepository categories;
    private final AppUserRepository users;
    private final ReviewRepository reviews;
    private final NewsletterSubscriberRepository subscribers;

    public AdminService(OrderRepository orders, PaymentRepository payments, PlantRepository plants,
                        CategoryRepository categories, AppUserRepository users,
                        ReviewRepository reviews, NewsletterSubscriberRepository subscribers) {
        this.orders = orders;
        this.payments = payments;
        this.plants = plants;
        this.categories = categories;
        this.users = users;
        this.reviews = reviews;
        this.subscribers = subscribers;
    }

    /* ------------------------------------------------------------- stats */

    @Transactional(readOnly = true)
    public AdminDtos.Stats stats() {
        return new AdminDtos.Stats(
                plants.count(),
                categories.count(),
                users.count(),
                orders.count(),
                // Revenue is the sum of CAPTURED payments, not of order totals: an unpaid order is not money, and counting it would overstate takings by every abandoned checkout.
                payments.sumAmountByStatus(Payment.CAPTURED),
                payments.countByStatus(Payment.CAPTURED),
                payments.countByStatus(Payment.FAILED),
                orders.countByStatus("PENDING"),
                orders.countByStatus("CANCELLED"),
                plants.countByStockBetween(1, LOW_STOCK_AT),
                plants.countByStockLessThanEqual(0),
                reviews.count(),
                subscribers.count());
    }

    /* ------------------------------------------------------------ orders */

    @Transactional(readOnly = true)
    public Page<AdminDtos.OrderRow> orders(String status, String delivery, String q,
                                           int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.min(Math.max(1, size), 100));
        return orders.searchForAdmin(blank(status), blank(delivery), blank(q), pageable)
                .map(this::toRow);
    }

    @Transactional(readOnly = true)
    public AdminDtos.OrderDetail order(Long id) {
        Order order = orders.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("No order with id " + id));

        List<AdminDtos.OrderDetail.Line> lines = order.getItems().stream()
                .map(this::toLine)
                .toList();

        List<AdminDtos.PaymentRow> attempts =
                payments.findByRazorpayOrderIdOrderByIdDesc(order.getRazorpayOrderId()).stream()
                        .map(this::toPaymentRow)
                        .toList();

        return new AdminDtos.OrderDetail(
                toRow(order), order.getAddressLine(), order.getCity(), order.getState(),
                order.getPincode(), order.getCountry(), order.getSubtotal(), order.getShipping(),
                order.getTax(), order.getDiscount(), lines, attempts);
    }

    /**
     * Moves an order along the fulfilment track.
     *
     * Only `delivery_status` is writable from here. Payment status is decided by
     * the signature check and nothing else — letting an admin set an order to
     * PAID by hand would make the whole verification chain decorative.
     */
    @Transactional
    public AdminDtos.OrderRow updateDeliveryStatus(Long id, String status) {
        String next = status == null ? "" : status.trim().toUpperCase().replace(' ', '_');
        if (!DELIVERY_STATUSES.contains(next)) {
            throw new IllegalArgumentException("Unknown delivery status: " + status);
        }

        Order order = orders.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("No order with id " + id));

        if (!"PAID".equals(order.getStatus()) && !"CANCELLED".equals(next)) {
            throw new IllegalArgumentException(
                    "This order has not been paid for, so it cannot be marked " + next + ".");
        }

        order.setDeliveryStatus(next);
        return toRow(orders.save(order));
    }

    /* ---------------------------------------------------------- payments */

    @Transactional(readOnly = true)
    public Page<AdminDtos.PaymentRow> payments(String status, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.min(Math.max(1, size), 100));
        Page<Payment> found = blank(status) == null
                ? payments.findAllByOrderByIdDesc(pageable)
                : payments.findByStatusOrderByIdDesc(status.trim().toUpperCase(), pageable);
        return found.map(this::toPaymentRow);
    }

    /* ------------------------------------------------------------- users */

    @Transactional(readOnly = true)
    public Page<AdminDtos.UserRow> users(String q, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.min(Math.max(1, size), 100));
        return users.searchForAdmin(blank(q), pageable).map(user -> {
            // Per-user totals are two aggregates rather than loading their orders.
            long count = orders.countByUserId(user.getId());
            BigDecimal spent = orders.sumPaidTotalByUserId(user.getId());
            return new AdminDtos.UserRow(user.getId(), user.getFullName(), user.getEmail(),
                    user.getPhone(), user.getRole(), user.isBlocked(), user.getCreatedAt(),
                    count, spent == null ? BigDecimal.ZERO : spent);
        });
    }

    @Transactional
    public AdminDtos.UserRow setBlocked(Long id, boolean blocked) {
        AppUser user = users.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("No user with id " + id));
        if ("ADMIN".equals(user.getRole()) && blocked) {
            // Locking the last admin out of the dashboard is not recoverable
            // from inside the dashboard.
            throw new IllegalArgumentException("An admin account cannot be blocked.");
        }
        user.setBlocked(blocked);
        users.save(user);
        return new AdminDtos.UserRow(user.getId(), user.getFullName(), user.getEmail(),
                user.getPhone(), user.getRole(), user.isBlocked(), user.getCreatedAt(),
                orders.countByUserId(id), BigDecimal.ZERO);
    }

    /* --------------------------------------------------------- inventory */

    @Transactional(readOnly = true)
    public Page<AdminDtos.InventoryRow> inventory(String filter, String q, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.min(Math.max(1, size), 100));
        Page<Plant> found = switch (filter == null ? "" : filter.toLowerCase()) {
            case "out" -> plants.findByStockLessThanEqualOrderByNameAsc(0, pageable);
            case "low" -> plants.findByStockBetweenOrderByStockAsc(1, LOW_STOCK_AT, pageable);
            case "recent" -> plants.findAllByOrderByIdDesc(pageable);
            default -> plants.searchForAdmin(blank(q), pageable);
        };
        return found.map(this::toInventoryRow);
    }

    @Transactional
    public AdminDtos.InventoryRow updateStock(Long id, Integer stock) {
        if (stock == null || stock < 0) {
            throw new IllegalArgumentException("Stock cannot be negative.");
        }
        Plant plant = plants.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("No product with id " + id));
        plant.setStock(stock);
        return toInventoryRow(plants.save(plant));
    }

    /* ----------------------------------------------------------- reviews */

    @Transactional(readOnly = true)
    public Page<AdminDtos.ReviewRow> reviews(String status, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.min(Math.max(1, size), 100));
        Page<Review> found = blank(status) == null
                ? reviews.findAllByOrderByIdDesc(pageable)
                : reviews.findByStatusOrderByIdDesc(status.trim().toUpperCase(), pageable);
        return found.map(r -> new AdminDtos.ReviewRow(r.getId(), r.getPlant().getName(),
                r.getUser().getFullName(), r.getRating(), r.getTitle(), r.getBody(),
                r.getStatus(), r.getCreatedAt()));
    }

    @Transactional
    public void setReviewStatus(Long id, String status) {
        String next = status == null ? "" : status.trim().toUpperCase();
        if (!Set.of(Review.PENDING, Review.APPROVED, Review.REJECTED).contains(next)) {
            throw new IllegalArgumentException("Unknown review status: " + status);
        }
        Review review = reviews.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("No review with id " + id));
        review.setStatus(next);
        reviews.save(review);
    }

    @Transactional
    public void deleteReview(Long id) {
        if (!reviews.existsById(id)) {
            throw new ResourceNotFoundException("No review with id " + id);
        }
        reviews.deleteById(id);
    }

    /* --------------------------------------------------------- analytics */

    @Transactional(readOnly = true)
    public AdminDtos.Analytics analytics() {
        List<AdminDtos.MonthlyPoint> monthly = payments.monthlyRevenue().stream()
                .map(row -> new AdminDtos.MonthlyPoint(
                        (String) row[0],
                        ((Number) row[1]).longValue(),
                        (BigDecimal) row[2]))
                .toList();

        List<AdminDtos.TopProduct> topProducts = orders.topProducts().stream()
                .map(row -> new AdminDtos.TopProduct(
                        (String) row[0], (String) row[1],
                        ((Number) row[2]).longValue(), (BigDecimal) row[3]))
                .toList();

        List<AdminDtos.TopProduct> topCategories = orders.topCategories().stream()
                .map(row -> new AdminDtos.TopProduct(
                        (String) row[0], (String) row[0],
                        ((Number) row[1]).longValue(), (BigDecimal) row[2]))
                .toList();

        return new AdminDtos.Analytics(monthly, topProducts, topCategories);
    }

    /* ----------------------------------------------------------- mapping */

    private AdminDtos.OrderRow toRow(Order o) {
        AppUser u = o.getUser();
        return new AdminDtos.OrderRow(o.getId(), o.getOrderNumber(), o.getInvoiceNumber(),
                u == null ? null : u.getFullName(), u == null ? null : u.getEmail(),
                o.getPhone(), o.getStatus(), o.getDeliveryStatus(), o.getTotal(),
                o.getPlacedAt(), o.getItems().size());
    }

    private AdminDtos.OrderDetail.Line toLine(OrderItem i) {
        // Prefer the snapshot taken at purchase time; fall back to the live
        // product only for rows written before snapshots existed.
        String name = i.getProductName() != null ? i.getProductName()
                : i.getPlant() != null ? i.getPlant().getName() : "(removed)";
        String image = i.getProductImage() != null ? i.getProductImage()
                : i.getPlant() != null ? i.getPlant().getImage() : null;
        return new AdminDtos.OrderDetail.Line(name, image, i.getProductCategory(),
                i.getQuantity(), i.getUnitPrice(),
                i.getUnitPrice().multiply(BigDecimal.valueOf(i.getQuantity())));
    }

    private AdminDtos.PaymentRow toPaymentRow(Payment p) {
        Order o = p.getOrder();
        AppUser u = o == null ? null : o.getUser();
        return new AdminDtos.PaymentRow(p.getId(),
                o == null ? null : o.getOrderNumber(),
                o == null ? null : o.getInvoiceNumber(),
                u == null ? null : u.getFullName(),
                p.getRazorpayOrderId(), p.getRazorpayPaymentId(), p.getMethod(), p.getCurrency(),
                p.getAmount(), p.getStatus(), p.getVerificationStatus(), p.getRefundStatus(),
                p.getFailureReason(), p.getCreatedAt());
    }

    private AdminDtos.InventoryRow toInventoryRow(Plant p) {
        int stock = p.getStock() == null ? 0 : p.getStock();
        String status = stock <= 0 ? "OUT_OF_STOCK" : stock <= LOW_STOCK_AT ? "LOW_STOCK" : "IN_STOCK";
        return new AdminDtos.InventoryRow(p.getId(), p.getCode(), p.getSlug(), p.getName(),
                p.getImage(),
                p.getCategory() == null ? null : p.getCategory().getName(),
                p.getPrice(), p.getStock(), status,
                Boolean.TRUE.equals(p.getFeatured()), Boolean.TRUE.equals(p.getBestSeller()),
                Boolean.TRUE.equals(p.getNewArrival()));
    }

    /** Treats an empty filter as absent, so "" does not become a literal match. */
    private static String blank(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
