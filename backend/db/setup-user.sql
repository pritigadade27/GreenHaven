-- Create the database
CREATE DATABASE IF NOT EXISTS green_haven
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Create the app user
CREATE USER IF NOT EXISTS 'priti'@'localhost' IDENTIFIED BY '<put-your-password-here>';
CREATE USER IF NOT EXISTS 'priti'@'127.0.0.1' IDENTIFIED BY '<put-your-password-here>';

-- Data rights only, no DDL
GRANT SELECT, INSERT, UPDATE, DELETE ON green_haven.* TO 'priti'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON green_haven.* TO 'priti'@'127.0.0.1';

FLUSH PRIVILEGES;

SELECT 'green_haven database and priti user ready' AS status;
