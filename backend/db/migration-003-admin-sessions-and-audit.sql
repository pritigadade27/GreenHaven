-- Adds admin sessions, audit log
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS admin_session (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id       BIGINT       NOT NULL,
  jti           VARCHAR(64)  NOT NULL,
  ip_address    VARCHAR(45)  NULL,
  user_agent    VARCHAR(255) NULL,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked       TINYINT(1)   NOT NULL DEFAULT 0,
  revoked_reason VARCHAR(60) NULL,

  CONSTRAINT fk_session_user FOREIGN KEY (user_id)
    REFERENCES app_user (id) ON DELETE CASCADE,
  UNIQUE KEY uq_session_jti (jti),
  KEY idx_session_user (user_id, revoked)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_activity_log (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  admin_id    BIGINT       NULL,
  admin_name  VARCHAR(120) NOT NULL,
  admin_email VARCHAR(160) NOT NULL,
  action      VARCHAR(60)  NOT NULL,
  entity_type VARCHAR(40)  NULL,
  entity_id   VARCHAR(64)  NULL,
  detail      VARCHAR(500) NULL,
  ip_address  VARCHAR(45)  NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_log_admin FOREIGN KEY (admin_id)
    REFERENCES app_user (id) ON DELETE SET NULL,
  KEY idx_log_created (created_at),
  KEY idx_log_action (action, created_at),
  KEY idx_log_admin (admin_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
