-- ===========================================================================
--  Green Haven — migration 015
--  Half stars
--
--  review.rating becomes DECIMAL(2,1) so 3.5 can be stored. Displaying half
--  stars already worked — the average has always been rendered to the nearest
--  half — but a reviewer could only ever GIVE a whole one.
--
--  The CHECK does two jobs: it keeps the range at 0.5–5, and it refuses
--  anything that is not a multiple of 0.5. Without the second half, 3.7 is a
--  perfectly valid DECIMAL(2,1) and would sit in the table forever, drawn as
--  three and a half and counted as four.
--
--  Widening INT to DECIMAL(2,1) preserves every existing value exactly: 4
--  becomes 4.0, which is the same rating.
--
--    mysql --default-character-set=utf8mb4 -u priti green_haven < migration-015-half-star-ratings.sql
-- ===========================================================================

SET NAMES utf8mb4;

-- The old constraint names a column that is about to change type.
SET @c := (SELECT COUNT(*) FROM information_schema.table_constraints
            WHERE table_schema = DATABASE() AND table_name = 'review'
              AND constraint_name = 'chk_review_rating');
SET @s := IF(@c > 0, 'ALTER TABLE review DROP CHECK chk_review_rating', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

ALTER TABLE review MODIFY COLUMN rating DECIMAL(2,1) NOT NULL;

SET @c := (SELECT COUNT(*) FROM information_schema.table_constraints
            WHERE table_schema = DATABASE() AND table_name = 'review'
              AND constraint_name = 'chk_review_rating_half');
SET @s := IF(@c = 0,
  'ALTER TABLE review ADD CONSTRAINT chk_review_rating_half
     CHECK (rating >= 0.5 AND rating <= 5.0 AND rating * 10 % 5 = 0)',
  'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;
