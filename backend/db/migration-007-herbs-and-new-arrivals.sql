-- ===========================================================================
--  Green Haven — migration 007
--  A Herbs category, and honest New Arrivals
--
--  Additive and reversible. Only the six plants that are unambiguously
--  culinary herbs move; Aloe Vera stays in Succulents (it is a succulent that
--  happens to be medicinal) and the seed packets stay in Seeds.
--    mysql --default-character-set=utf8mb4 -u priti green_haven < migration-007-herbs-and-new-arrivals.sql
-- ===========================================================================

SET NAMES utf8mb4;

-- INSERT IGNORE rather than a NOT EXISTS guard: the guard has an aggregate in
-- its SELECT, so it always yields one row and the second run collides on the
-- unique slug. The unique key is the guard.
INSERT IGNORE INTO category (slug, name, blurb, sort_order)
SELECT 'herbs', 'Herbs',
       'Kitchen herbs that earn their windowsill — pick, cook, repeat.',
       COALESCE(MAX(sort_order), 0) + 1
  FROM category;

UPDATE plant
   SET category_id = (SELECT id FROM category WHERE slug = 'herbs')
 WHERE slug IN ('tulsi', 'basil', 'mint', 'coriander', 'lemongrass', 'curry-leaf');

-- New Arrivals had a column and a badge in the admin but nothing ever set it,
-- so the storefront had nothing to show. The twelve most recently added
-- products are the honest answer to "what is new" for a catalogue that has
-- never had a restock date.
UPDATE plant SET is_new_arrival = 0;
UPDATE plant SET is_new_arrival = 1
 WHERE id IN (SELECT id FROM (SELECT id FROM plant ORDER BY id DESC LIMIT 12) newest);
