-- Adds product gallery images
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS plant_image (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  plant_id   BIGINT       NOT NULL,
  url        VARCHAR(255) NOT NULL,
  sort_order INT          NOT NULL DEFAULT 0,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_plant_image_plant FOREIGN KEY (plant_id)
    REFERENCES plant (id) ON DELETE CASCADE,
  UNIQUE KEY uq_plant_image (plant_id, url),
  KEY idx_plant_image_order (plant_id, sort_order, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
