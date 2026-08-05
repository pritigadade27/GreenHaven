-- IMPORTANT: never keep a real password in this file. It lives in
-- src/main/resources, so it is compiled into the deployable JAR and would
-- be committed the moment this project becomes a git repository.
-- Substitute the password when you run it, and keep the real one in
-- backend/.env (gitignored) or a real environment variable.
--
-- The grant is DML only. The application never needs DROP, ALTER or
-- CREATE at runtime, and withholding them caps the damage of any future
-- compromise at data theft rather than data destruction.

-- ===========================================================================
--  Green Haven — one-time database and user setup
--
--  Run this ONCE as the MySQL root user, before schema.sql and data.sql:
--      mysql -u root -p < setup-user.sql
--
--  It creates the green_haven database and the 'priti' account the Spring Boot
--  application connects with, granting it rights on that one database only —
--  never use root as the application account.
-- ===========================================================================

CREATE DATABASE IF NOT EXISTS green_haven
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Both hosts, because MySQL treats 'localhost' (socket) and '127.0.0.1' (TCP)
-- as different accounts, and the JDBC driver may use either.
CREATE USER IF NOT EXISTS 'priti'@'localhost' IDENTIFIED BY '<put-your-password-here>';
CREATE USER IF NOT EXISTS 'priti'@'127.0.0.1' IDENTIFIED BY '<put-your-password-here>';

GRANT SELECT, INSERT, UPDATE, DELETE ON green_haven.* TO 'priti'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON green_haven.* TO 'priti'@'127.0.0.1';

FLUSH PRIVILEGES;

SELECT 'green_haven database and priti user ready' AS status;
