-- ===========================================================================
--  Green Haven — migration 013
--  Coupon windows must reach past 2038
--
--  starts_at and expires_at were TIMESTAMP, which MySQL stores as a 32-bit
--  offset from the epoch and cannot hold a date after 2038-01-19. Every other
--  timestamp in this schema records when something happened, so the limit is
--  academic for them — but these two are dates an admin CHOOSES, and a shop
--  setting a long-dated code got "that could not be saved" with nothing to
--  suggest the year was the problem.
--
--  DATETIME has no such ceiling. The session runs in UTC (see the JDBC url),
--  so the values written are unchanged.
--
--    mysql --default-character-set=utf8mb4 -u priti green_haven < migration-013-coupon-dates.sql
-- ===========================================================================

SET NAMES utf8mb4;

ALTER TABLE coupon
  MODIFY COLUMN starts_at  DATETIME NULL,
  MODIFY COLUMN expires_at DATETIME NULL;
