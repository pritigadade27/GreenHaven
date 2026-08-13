-- Adds discontinued product flag
SET NAMES utf8mb4;

SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'plant'
      AND COLUMN_NAME = 'discontinued') = 0,
  'ALTER TABLE plant ADD COLUMN discontinued TINYINT(1) NOT NULL DEFAULT 0',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'plant'
      AND INDEX_NAME = 'idx_plant_listed') = 0,
  'CREATE INDEX idx_plant_listed ON plant (discontinued, id)',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
