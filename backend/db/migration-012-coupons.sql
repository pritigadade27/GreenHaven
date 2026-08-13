-- Adds coupon support
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS coupon (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  code            VARCHAR(40)   NOT NULL,
  description     VARCHAR(200),

  discount_type   VARCHAR(10)   NOT NULL,
  discount_value  DECIMAL(10,2) NOT NULL,
  max_discount    DECIMAL(10,2),
  min_order_value DECIMAL(10,2) NOT NULL DEFAULT 0.00,

  free_shipping   BOOLEAN       NOT NULL DEFAULT FALSE,

  starts_at       DATETIME      NULL,
  expires_at      DATETIME      NULL,

  usage_limit     INT,
  per_user_limit  INT           NOT NULL DEFAULT 1,

  active          BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

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
  CONSTRAINT fk_redemption_order  FOREIGN KEY (order_id)  REFERENCES orders (id)
    ON DELETE CASCADE,
  UNIQUE KEY uq_redemption_order (order_id),
  KEY idx_redemption_user (coupon_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Adds order columns only if missing
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
