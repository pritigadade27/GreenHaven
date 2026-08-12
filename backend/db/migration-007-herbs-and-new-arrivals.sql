SET NAMES utf8mb4;

INSERT IGNORE INTO category (slug, name, blurb, sort_order)
SELECT 'herbs', 'Herbs',
       'Kitchen herbs that earn their windowsill — pick, cook, repeat.',
       COALESCE(MAX(sort_order), 0) + 1
  FROM category;

UPDATE plant
   SET category_id = (SELECT id FROM category WHERE slug = 'herbs')
 WHERE slug IN ('tulsi', 'basil', 'mint', 'coriander', 'lemongrass', 'curry-leaf');

UPDATE plant SET is_new_arrival = 0;
UPDATE plant SET is_new_arrival = 1
 WHERE id IN (SELECT id FROM (SELECT id FROM plant ORDER BY id DESC LIMIT 12) newest);
