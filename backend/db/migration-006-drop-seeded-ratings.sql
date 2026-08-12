SET NAMES utf8mb4;

UPDATE plant p
   SET p.rating = NULL,
       p.review_count = 0
 WHERE NOT EXISTS (
       SELECT 1 FROM review r
        WHERE r.plant_id = p.id AND r.status = 'APPROVED');
