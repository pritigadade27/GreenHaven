-- ===========================================================================
--  Green Haven — migration 008
--  Product management: discontinuing rather than deleting
--
--  order_item.plant_id is ON DELETE NO ACTION, so a product that has ever been
--  bought cannot be removed — and should not be. An invoice that loses the
--  thing it was for is not an invoice. So a sold product is discontinued: it
--  leaves the shop, keeps its history, and can be brought back.
--    mysql --default-character-set=utf8mb4 -u priti green_haven < migration-008-product-management.sql
-- ===========================================================================

SET NAMES utf8mb4;

SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'plant'
      AND COLUMN_NAME = 'discontinued') = 0,
  'ALTER TABLE plant ADD COLUMN discontinued TINYINT(1) NOT NULL DEFAULT 0',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- The storefront filters on it constantly; the index keeps that free.
SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'plant'
      AND INDEX_NAME = 'idx_plant_listed') = 0,
  'CREATE INDEX idx_plant_listed ON plant (discontinued, id)',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
