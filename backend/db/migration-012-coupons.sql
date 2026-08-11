-- ===========================================================================
--  Green Haven — migration 012
--  Discount codes
--
--  Two tables. `coupon` is what the shop offers; `coupon_redemption` is what
--  was actually taken, one row per order, which is what makes both the
--  per-customer limit and the overall limit answerable by counting rather
--  than by keeping a running total that can drift.
--
--    mysql --default-character-set=utf8mb4 -u priti green_haven < migration-012-coupons.sql
-- ===========================================================================

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS coupon (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  code            VARCHAR(40)   NOT NULL,
  description     VARCHAR(200),

  -- PERCENT takes a share of the goods; FLAT takes a fixed number of rupees.
  discount_type   VARCHAR(10)   NOT NULL,
  discount_value  DECIMAL(10,2) NOT NULL,
  -- Caps a percentage: "20% off, up to ₹500". Null means uncapped.
  max_discount    DECIMAL(10,2),
  min_order_value DECIMAL(10,2) NOT NULL DEFAULT 0.00,

  free_shipping   BOOLEAN       NOT NULL DEFAULT FALSE,

  -- DATETIME, not TIMESTAMP: these are dates an admin chooses, and TIMESTAMP
  -- cannot hold anything after 2038-01-19. See migration 013.
  starts_at       DATETIME      NULL,
  expires_at      DATETIME      NULL,

  -- Null means no ceiling. per_user_limit is never null: an unlimited
  -- per-person coupon is a mistake far more often than an intention.
  usage_limit     INT,
  per_user_limit  INT           NOT NULL DEFAULT 1,

  active          BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Codes are stored and compared uppercase, so this is genuinely unique
  -- rather than unique-per-capitalisation.
  UNIQUE KEY uq_coupon_code (code),
  KEY idx_coupon_active (active, expires_at),
  CONSTRAINT ck_coupon_type  CHECK (discount_type IN ('PERCENT','FLAT')),
  CONSTRAINT ck_coupon_value CHECK (discount_value > 0),
  CONSTRAINT ck_coupon_pct   CHECK (discount_type <> 'PERCENT' OR discount_value <= 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS coupon_redemption (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  coupon_id   BIGINT        NOT NULL,
  user_id     BIGINT        NOT NULL,
  order_id    BIGINT        NOT NULL,
  discount    DECIMAL(10,2) NOT NULL,
  redeemed_at TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_redemption_coupon FOREIGN KEY (coupon_id) REFERENCES coupon (id),
  CONSTRAINT fk_redemption_user   FOREIGN KEY (user_id)   REFERENCES app_user (id),
  -- The order owns the redemption: delete the order and the record of what it
  -- used goes with it. One coupon per order, enforced here and not only in code.
  CONSTRAINT fk_redemption_order  FOREIGN KEY (order_id)  REFERENCES orders (id)
    ON DELETE CASCADE,
  UNIQUE KEY uq_redemption_order (order_id),
  KEY idx_redemption_user (coupon_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- The order carries what was taken off it. Denormalised on purpose: an invoice
-- must still read correctly years later, after the coupon has been edited,
-- deactivated or deleted.
SET @c := (SELECT COUNT(*) FROM information_schema.columns
            WHERE table_schema = DATABASE() AND table_name = 'orders'
              AND column_name = 'discount');
SET @s := IF(@c = 0,
  'ALTER TABLE orders ADD COLUMN discount DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER subtotal',
  'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @c := (SELECT COUNT(*) FROM information_schema.columns
            WHERE table_schema = DATABASE() AND table_name = 'orders'
              AND column_name = 'coupon_code');
SET @s := IF(@c = 0,
  'ALTER TABLE orders ADD COLUMN coupon_code VARCHAR(40) NULL AFTER discount',
  'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;
