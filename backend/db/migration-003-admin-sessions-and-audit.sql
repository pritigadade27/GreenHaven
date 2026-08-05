-- ===========================================================================
--  Green Haven — migration 003
--  Admin session control + activity audit
--
--  Additive only.
--    mysql --default-character-set=utf8mb4 -u priti green_haven < migration-003-admin-sessions-and-audit.sql
-- ===========================================================================

SET NAMES utf8mb4;

-- --------------------------------------------------------- admin_session ---
-- A JWT is self-contained and cannot be withdrawn once issued: "log out" on a
-- bearer token normally just deletes the browser's copy while the token stays
-- valid for its full lifetime. This table is the server's record of which
-- tokens it still honours, which is what makes real logout, an inactivity
-- timeout and one-session-at-a-time possible.
CREATE TABLE IF NOT EXISTS admin_session (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id       BIGINT       NOT NULL,
  -- The JWT's `jti` claim. The token is only accepted while this row lives.
  jti           VARCHAR(64)  NOT NULL,
  ip_address    VARCHAR(45)  NULL,         -- 45 = longest IPv6 text form
  user_agent    VARCHAR(255) NULL,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked       TINYINT(1)   NOT NULL DEFAULT 0,
  revoked_reason VARCHAR(60) NULL,          -- LOGOUT | SUPERSEDED | TIMEOUT

  CONSTRAINT fk_session_user FOREIGN KEY (user_id)
    REFERENCES app_user (id) ON DELETE CASCADE,
  UNIQUE KEY uq_session_jti (jti),
  KEY idx_session_user (user_id, revoked)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------- admin_activity_log ---
-- Who did what, when, and from where. Kept even if the admin account is later
-- deleted — an audit trail that disappears with its subject is not an audit
-- trail, which is why admin_name is copied in rather than joined.
CREATE TABLE IF NOT EXISTS admin_activity_log (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  admin_id    BIGINT       NULL,
  admin_name  VARCHAR(120) NOT NULL,
  admin_email VARCHAR(160) NOT NULL,
  action      VARCHAR(60)  NOT NULL,   -- LOGIN, PRODUCT_UPDATED, ORDER_STATUS_CHANGED …
  entity_type VARCHAR(40)  NULL,       -- ORDER | PRODUCT | USER | REVIEW
  entity_id   VARCHAR(64)  NULL,
  detail      VARCHAR(500) NULL,       -- human-readable: "stock 100 -> 3"
  ip_address  VARCHAR(45)  NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_log_admin FOREIGN KEY (admin_id)
    REFERENCES app_user (id) ON DELETE SET NULL,
  KEY idx_log_created (created_at),
  KEY idx_log_action (action, created_at),
  KEY idx_log_admin (admin_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
