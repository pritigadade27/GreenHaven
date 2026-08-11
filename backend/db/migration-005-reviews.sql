-- ===========================================================================
--  Green Haven — migration 005
--  Product ratings and reviews
--
--  Additive only. The review table already existed for admin moderation; this
--  ties each review to the order that earns the right to write it, and adds
--  the columns the storefront needs.
--    mysql --default-character-set=utf8mb4 -u priti green_haven < migration-005-reviews.sql
-- ===========================================================================

SET NAMES utf8mb4;

-- --------------------------------------------------------------- review ---
-- order_id is the purchase the review was written against. ON DELETE SET NULL
-- rather than CASCADE: orders are never deleted, and if one somehow were, the
-- customer's words should not vanish with it.
SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'review'
      AND COLUMN_NAME = 'order_id') = 0,
  'ALTER TABLE review ADD COLUMN order_id BIGINT NULL AFTER user_id',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'review'
      AND CONSTRAINT_NAME = 'fk_review_order') = 0,
  'ALTER TABLE review ADD CONSTRAINT fk_review_order FOREIGN KEY (order_id)
     REFERENCES orders (id) ON DELETE SET NULL',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Recorded on the row rather than recomputed at read time: whether the writer
-- had really bought the plant is a fact about the moment they wrote, and it
-- must keep reading true even if the order is later archived.
SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'review'
      AND COLUMN_NAME = 'verified_purchase') = 0,
  'ALTER TABLE review ADD COLUMN verified_purchase TINYINT(1) NOT NULL DEFAULT 0 AFTER order_id',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- An edited review says so, rather than quietly presenting new words under the
-- original date.
SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'review'
      AND COLUMN_NAME = 'updated_at') = 0,
  'ALTER TABLE review ADD COLUMN updated_at DATETIME NULL AFTER created_at',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Who hid it and why, so moderation is answerable rather than silent.
SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'review'
      AND COLUMN_NAME = 'hidden_reason') = 0,
  'ALTER TABLE review ADD COLUMN hidden_reason VARCHAR(255) NULL AFTER status',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- The storefront reads one plant's visible reviews, newest first, over and
-- over — that is the query worth an index.
SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'review'
      AND INDEX_NAME = 'idx_review_plant_status') = 0,
  'CREATE INDEX idx_review_plant_status ON review (plant_id, status, id)',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- The UNIQUE (user_id, plant_id) key already on this table is deliberate and
-- stays: one voice per customer per plant. Keyed on the order instead, someone
-- could buy the same plant five times and rate it five times, and the average
-- would stop meaning anything.

-- Reviews written before moderation existed default to PENDING, which the
-- storefront does not show. Nothing to backfill today — the table is empty —
-- but if that changes, approve them explicitly rather than by default.
