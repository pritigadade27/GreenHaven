SET NAMES utf8mb4;

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

SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'review'
      AND COLUMN_NAME = 'verified_purchase') = 0,
  'ALTER TABLE review ADD COLUMN verified_purchase TINYINT(1) NOT NULL DEFAULT 0 AFTER order_id',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'review'
      AND COLUMN_NAME = 'updated_at') = 0,
  'ALTER TABLE review ADD COLUMN updated_at DATETIME NULL AFTER created_at',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'review'
      AND COLUMN_NAME = 'hidden_reason') = 0,
  'ALTER TABLE review ADD COLUMN hidden_reason VARCHAR(255) NULL AFTER status',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'review'
      AND INDEX_NAME = 'idx_review_plant_status') = 0,
  'CREATE INDEX idx_review_plant_status ON review (plant_id, status, id)',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
