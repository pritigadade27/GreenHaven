-- ===========================================================================
--  Green Haven — migration 009
--  More than one photograph per product
--
--  A separate table rather than image2/image3 columns: the number of shots a
--  product needs is not knowable in advance, and ordering them matters.
--  plant.image stays as the primary shot so every existing query, card and
--  order snapshot keeps working untouched.
--    mysql --default-character-set=utf8mb4 -u priti green_haven < migration-009-product-gallery.sql
-- ===========================================================================

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS plant_image (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  plant_id   BIGINT       NOT NULL,
  url        VARCHAR(255) NOT NULL,
  sort_order INT          NOT NULL DEFAULT 0,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_plant_image_plant FOREIGN KEY (plant_id)
    REFERENCES plant (id) ON DELETE CASCADE,
  -- The same photograph twice on one product is always a mistake.
  UNIQUE KEY uq_plant_image (plant_id, url),
  KEY idx_plant_image_order (plant_id, sort_order, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
