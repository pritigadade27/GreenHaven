-- Adds password reset tokens
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS password_reset (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id    BIGINT      NOT NULL,
  token_hash VARCHAR(64) NOT NULL,
  expires_at DATETIME    NOT NULL,
  used_at    DATETIME    NULL,
  created_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  requested_ip VARCHAR(45) NULL,

  CONSTRAINT fk_reset_user FOREIGN KEY (user_id)
    REFERENCES app_user (id) ON DELETE CASCADE,
  UNIQUE KEY uq_reset_token (token_hash),
  KEY idx_reset_user (user_id, used_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
