-- ===========================================================================
--  Green Haven — migration 010
--  Password reset
--
--  The token is stored HASHED. A reset token is a temporary password: anyone
--  holding one can take an account. Storing them in the clear would mean a
--  read-only leak of this table hands over every account with a live token,
--  which is exactly the disaster the hashed password column exists to prevent.
--    mysql --default-character-set=utf8mb4 -u priti green_haven < migration-010-password-reset.sql
-- ===========================================================================

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS password_reset (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id    BIGINT      NOT NULL,
  -- SHA-256 of the token that was emailed. The token itself is never stored.
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
