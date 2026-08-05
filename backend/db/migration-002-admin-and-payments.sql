-- ===========================================================================
--  Green Haven — migration 002
--  Admin dashboard + first-class payments
--
--  Additive only. No table is dropped and no column is removed, so running
--  this against a database with live orders is safe.
--
--    mysql --default-character-set=utf8mb4 -u priti green_haven < migration-002-admin-and-payments.sql
-- ===========================================================================

SET NAMES utf8mb4;

-- ---------------------------------------------------------------- orders ---
-- `status` was VARCHAR(12). "Out for Delivery" is 16 characters and would have
-- been silently truncated to "Out for Deli" — MySQL in non-strict mode does not
-- complain. Widened before any status work depends on it.
ALTER TABLE orders
  MODIFY COLUMN status VARCHAR(24) NOT NULL DEFAULT 'PENDING';

-- Fulfilment is a separate axis from payment. An order can be PAID and still
-- be PACKED; collapsing both into one column loses that.
ALTER TABLE orders
  ADD COLUMN delivery_status VARCHAR(24) NOT NULL DEFAULT 'PENDING' AFTER status;

ALTER TABLE orders
  ADD COLUMN invoice_number VARCHAR(32) NULL UNIQUE AFTER order_number,
  ADD COLUMN country        VARCHAR(60) NOT NULL DEFAULT 'India' AFTER pincode,
  ADD COLUMN tax            DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER shipping,
  ADD COLUMN discount       DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER tax;

CREATE INDEX idx_orders_delivery ON orders (delivery_status, placed_at);

-- ------------------------------------------------------------ order_item ---
-- An invoice must not change when the catalogue does. unit_price was already
-- snapshotted; the rest of the line was still read live through plant_id, so
-- renaming a plant silently rewrote every historical invoice.
ALTER TABLE order_item
  ADD COLUMN product_name     VARCHAR(150) NULL AFTER plant_id,
  ADD COLUMN product_image    VARCHAR(255) NULL AFTER product_name,
  ADD COLUMN product_category VARCHAR(120) NULL AFTER product_image;

-- Backfill the rows that already exist, so history is complete rather than half
-- populated. New rows are written with these values at purchase time.
UPDATE order_item oi
  JOIN plant p ON p.id = oi.plant_id
  JOIN category c ON c.id = p.category_id
   SET oi.product_name     = p.name,
       oi.product_image    = p.image,
       oi.product_category = c.name
 WHERE oi.product_name IS NULL;

-- ----------------------------------------------------------------- plant ---
ALTER TABLE plant
  ADD COLUMN is_new_arrival TINYINT(1) NOT NULL DEFAULT 0 AFTER is_best_seller;

CREATE INDEX idx_plant_stock ON plant (stock);

-- --------------------------------------------------------------- payment ---
-- Payments were two columns on `orders`. They are their own thing: an order can
-- have a failed attempt and then a successful one, and each attempt has its own
-- signature, method and timestamp worth keeping.
CREATE TABLE IF NOT EXISTS payment (
  id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_id            BIGINT       NOT NULL,
  razorpay_order_id   VARCHAR(64)  NOT NULL,
  razorpay_payment_id VARCHAR(64)  NULL,
  -- Kept for dispute resolution: it is the proof the payment was genuine.
  razorpay_signature  VARCHAR(255) NULL,
  method              VARCHAR(40)  NULL,          -- upi / card / netbanking
  currency            VARCHAR(8)   NOT NULL DEFAULT 'INR',
  amount              DECIMAL(10,2) NOT NULL,
  -- CREATED -> AUTHORISED -> CAPTURED, or FAILED
  status              VARCHAR(24)  NOT NULL DEFAULT 'CREATED',
  -- Whether OUR server verified the HMAC. Distinct from status: Razorpay may
  -- say captured while our verification failed, and that gap is the fraud case.
  verification_status VARCHAR(24)  NOT NULL DEFAULT 'UNVERIFIED',
  failure_reason      VARCHAR(255) NULL,
  refund_status       VARCHAR(24)  NOT NULL DEFAULT 'NONE',
  refund_amount       DECIMAL(10,2) NULL,
  -- How we found out: BROWSER (the customer's callback) or WEBHOOK.
  source              VARCHAR(16)  NOT NULL DEFAULT 'BROWSER',
  created_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  verified_at         TIMESTAMP    NULL,

  CONSTRAINT fk_payment_order FOREIGN KEY (order_id)
    REFERENCES orders (id) ON DELETE RESTRICT,
  -- One row per Razorpay payment id, so a repeated webhook cannot duplicate it.
  UNIQUE KEY uq_payment_rzp_payment (razorpay_payment_id),
  KEY idx_payment_status (status, created_at),
  KEY idx_payment_rzp_order (razorpay_order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Carry the payments already recorded on `orders` across, so payment history
-- does not start empty for customers who have already bought something.
INSERT INTO payment (order_id, razorpay_order_id, razorpay_payment_id, amount,
                     status, verification_status, verified_at, created_at)
SELECT o.id, o.razorpay_order_id, o.razorpay_payment_id, o.total,
       CASE WHEN o.status = 'PAID' THEN 'CAPTURED' ELSE 'FAILED' END,
       CASE WHEN o.status = 'PAID' THEN 'VERIFIED' ELSE 'FAILED' END,
       CASE WHEN o.status = 'PAID' THEN o.placed_at ELSE NULL END,
       o.placed_at
  FROM orders o
 WHERE o.razorpay_order_id IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM payment p WHERE p.order_id = o.id);

-- ----------------------------------------------------- document_sequence ---
-- Order and invoice numbers must be gapless-ish, per year, and unique under
-- concurrency. MAX(id)+1 collides the moment two checkouts overlap; a row we
-- can lock with SELECT ... FOR UPDATE does not.
CREATE TABLE IF NOT EXISTS document_sequence (
  name      VARCHAR(32) NOT NULL,   -- 'ORDER' | 'INVOICE'
  year      INT         NOT NULL,
  next_value BIGINT     NOT NULL DEFAULT 1,
  PRIMARY KEY (name, year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------ user ---
ALTER TABLE app_user
  ADD COLUMN is_blocked TINYINT(1) NOT NULL DEFAULT 0 AFTER role;

CREATE INDEX idx_user_role ON app_user (role);

-- ---------------------------------------------------------------- review ---
-- Products carry a rating and a review count in the seed data, but no customer
-- has ever written one. This is where real ones will live.
CREATE TABLE IF NOT EXISTS review (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  plant_id   BIGINT       NOT NULL,
  user_id    BIGINT       NOT NULL,
  -- INT, not TINYINT: Hibernate maps a Java Integer to INTEGER and
  -- ddl-auto=validate rejects the narrower column at startup.
  rating     INT          NOT NULL,
  title      VARCHAR(150) NULL,
  body       VARCHAR(2000) NULL,
  -- PENDING until an admin approves it, so the shop cannot be defaced.
  status     VARCHAR(16)  NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_review_plant FOREIGN KEY (plant_id) REFERENCES plant (id) ON DELETE CASCADE,
  CONSTRAINT fk_review_user  FOREIGN KEY (user_id)  REFERENCES app_user (id) ON DELETE CASCADE,
  CONSTRAINT chk_review_rating CHECK (rating BETWEEN 1 AND 5),
  -- One review per person per product.
  UNIQUE KEY uq_review_user_plant (user_id, plant_id),
  KEY idx_review_status (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
