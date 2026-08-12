-- ===========================================================================
--  Green Haven — migration 016
--  Restore orders.phone to the migration history
--
--  The Order entity has mapped `phone` since checkout was written, and the
--  column exists in the development database — but nothing in this directory
--  ever created it, so it must have been added by hand. The consequence only
--  shows up on a fresh install: schema.sql plus migrations 001-015 produce an
--  orders table without phone, and because ddl-auto=validate compares the
--  entities against the real schema, the application refuses to start rather
--  than failing later on the first checkout.
--
--  Deploying to a new database is what exposed it. This migration closes the
--  gap so the SQL in this repository reproduces a working database on its own.
--
--  Idempotent, because the development database already has the column.
--    mysql --default-character-set=utf8mb4 -u priti green_haven < migration-016-orders-phone.sql
-- ===========================================================================

SET NAMES utf8mb4;

-- Nullable and VARCHAR(20), matching the entity and the column that already
-- exists in development. AFTER address_line keeps the delivery fields
-- together, which is where it sits there.
SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders'
      AND COLUMN_NAME = 'phone') = 0,
  'ALTER TABLE orders ADD COLUMN phone VARCHAR(20) NULL AFTER address_line',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
