SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS review_image (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  review_id  BIGINT       NOT NULL,
  url        VARCHAR(255) NOT NULL,
  sort_order INT          NOT NULL DEFAULT 0,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_review_image_review FOREIGN KEY (review_id)
    REFERENCES review (id) ON DELETE CASCADE,
  UNIQUE KEY uq_review_image (review_id, url),
  KEY idx_review_image_order (review_id, sort_order, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
