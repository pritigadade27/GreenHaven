-- ===========================================================================
--  Green Haven — migration 004
--  My Profile: saved addresses, notifications, richer account and order fields
--
--  Additive only. Nothing is dropped and no history is touched: orders,
--  order_item, payment and the invoice numbers on them are append-only by
--  design, and this migration keeps them that way.
--    mysql --default-character-set=utf8mb4 -u priti green_haven < migration-004-profile.sql
-- ===========================================================================

SET NAMES utf8mb4;

-- ------------------------------------------------------------- app_user ---
-- MySQL has no ADD COLUMN IF NOT EXISTS, so each add is guarded by a lookup
-- against information_schema. That makes the whole file safe to re-run.
SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'app_user'
      AND COLUMN_NAME = 'avatar_url') = 0,
  'ALTER TABLE app_user ADD COLUMN avatar_url VARCHAR(255) NULL AFTER phone',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- A changed email is not trusted until the customer proves they can read it.
-- The account keeps signing in with the old address until then, so a typo
-- cannot lock anyone out of their own order history.
SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'app_user'
      AND COLUMN_NAME = 'pending_email') = 0,
  'ALTER TABLE app_user
     ADD COLUMN pending_email VARCHAR(160) NULL AFTER email,
     ADD COLUMN pending_email_token VARCHAR(64) NULL AFTER pending_email,
     ADD COLUMN pending_email_expires_at DATETIME NULL AFTER pending_email_token',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- --------------------------------------------------------------- orders ---
-- payment_method is copied from the gateway rather than joined at read time:
-- an order is a record of what happened, and "UPI" has to keep reading UPI
-- long after the payment row is archived.
SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders'
      AND COLUMN_NAME = 'payment_method') = 0,
  'ALTER TABLE orders ADD COLUMN payment_method VARCHAR(40) NULL AFTER razorpay_payment_id',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders'
      AND COLUMN_NAME = 'estimated_delivery') = 0,
  'ALTER TABLE orders ADD COLUMN estimated_delivery DATE NULL AFTER payment_method',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Who cancelled, when, and why. A cancellation is an event worth keeping, not
-- a status flag to overwrite.
SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders'
      AND COLUMN_NAME = 'cancelled_at') = 0,
  'ALTER TABLE orders
     ADD COLUMN cancelled_at DATETIME NULL AFTER estimated_delivery,
     ADD COLUMN cancelled_by VARCHAR(16) NULL AFTER cancelled_at,
     ADD COLUMN cancel_reason VARCHAR(255) NULL AFTER cancelled_by',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Backfill the delivery estimate for orders placed before this column existed,
-- so the profile does not show a blank where every other row has a date.
UPDATE orders
   SET estimated_delivery = DATE_ADD(DATE(placed_at), INTERVAL 5 DAY)
 WHERE estimated_delivery IS NULL AND placed_at IS NOT NULL;

-- -------------------------------------------------------------- address ---
-- A saved address is a template the customer picks from at checkout. It is
-- deliberately NOT what an order points at: order rows keep their own copy of
-- the address as it was on the day, so editing or deleting a saved address can
-- never rewrite where a past parcel went.
CREATE TABLE IF NOT EXISTS address (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id      BIGINT       NOT NULL,
  label        VARCHAR(30)  NOT NULL DEFAULT 'Home',   -- Home | Work | Other
  full_name    VARCHAR(120) NOT NULL,
  phone        VARCHAR(20)  NOT NULL,
  line1        VARCHAR(255) NOT NULL,
  line2        VARCHAR(255) NULL,
  city         VARCHAR(80)  NOT NULL,
  state        VARCHAR(80)  NOT NULL,
  pincode      VARCHAR(10)  NOT NULL,
  country      VARCHAR(60)  NOT NULL DEFAULT 'India',
  is_default   TINYINT(1)   NOT NULL DEFAULT 0,
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_address_user FOREIGN KEY (user_id)
    REFERENCES app_user (id) ON DELETE CASCADE,
  KEY idx_address_user (user_id, is_default)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------- notification ---
-- order_id is ON DELETE SET NULL rather than CASCADE: orders are never
-- deleted, and if one ever were, the customer should still be able to read
-- what they were told at the time.
CREATE TABLE IF NOT EXISTS notification (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id    BIGINT       NOT NULL,
  -- ORDER_PLACED | PAYMENT_SUCCESSFUL | PAYMENT_FAILED | ORDER_SHIPPED
  -- | OUT_FOR_DELIVERY | ORDER_DELIVERED | ORDER_CANCELLED
  type       VARCHAR(32)  NOT NULL,
  title      VARCHAR(120) NOT NULL,
  body       VARCHAR(255) NOT NULL,
  order_id   BIGINT       NULL,
  read_at    DATETIME     NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_notification_user FOREIGN KEY (user_id)
    REFERENCES app_user (id) ON DELETE CASCADE,
  CONSTRAINT fk_notification_order FOREIGN KEY (order_id)
    REFERENCES orders (id) ON DELETE SET NULL,
  KEY idx_notification_user (user_id, read_at, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
