-- Allows half-star review ratings
SET NAMES utf8mb4;

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
