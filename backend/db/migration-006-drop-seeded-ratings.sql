-- ===========================================================================
--  Green Haven — migration 006
--  Retire the seeded ratings
--
--  The catalogue shipped with invented ratings (4.1–4.9) and invented review
--  counts totalling 28,223, while not one review had been written. Now that
--  customers can review what they have received, a product's stars have to
--  come from those reviews or not exist at all — a number that means nothing
--  is worse on a shop than no number.
--
--  Only products with no real reviews are cleared: anything already reviewed
--  is carrying a computed figure and must keep it.
--
--  To undo: backend/db/backups/seeded-ratings-restore.sql
--    mysql --default-character-set=utf8mb4 -u priti green_haven < migration-006-drop-seeded-ratings.sql
-- ===========================================================================

SET NAMES utf8mb4;

UPDATE plant p
   SET p.rating = NULL,
       p.review_count = 0
 WHERE NOT EXISTS (
       SELECT 1 FROM review r
        WHERE r.plant_id = p.id AND r.status = 'APPROVED');
