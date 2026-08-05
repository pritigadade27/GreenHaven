-- ===========================================================================
--  Green Haven — MySQL schema
--  Run once against an empty database:
--      CREATE DATABASE green_haven CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--      USE green_haven;
--      SOURCE schema.sql;
--      SOURCE data.sql;
--
--  utf8mb4 throughout so ₹, °C and — survive round trips.
-- ===========================================================================

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS order_item;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS cart_item;
DROP TABLE IF EXISTS wishlist_item;
DROP TABLE IF EXISTS contact_message;
DROP TABLE IF EXISTS newsletter_subscriber;
DROP TABLE IF EXISTS plant_badge;
DROP TABLE IF EXISTS badge;
DROP TABLE IF EXISTS plant;
DROP TABLE IF EXISTS category;
DROP TABLE IF EXISTS app_user;

SET FOREIGN_KEY_CHECKS = 1;

-- ------------------------------------------------------------------ catalogue

CREATE TABLE category (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  slug        VARCHAR(80)  NOT NULL UNIQUE,
  name        VARCHAR(120) NOT NULL,
  blurb       VARCHAR(255),
  sort_order  INT DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE plant (
  id             BIGINT AUTO_INCREMENT PRIMARY KEY,
  code           VARCHAR(12)  NOT NULL UNIQUE,          -- p01, p02 …
  slug           VARCHAR(120) NOT NULL UNIQUE,
  name           VARCHAR(150) NOT NULL,
  botanical_name VARCHAR(150),
  category_id    BIGINT       NOT NULL,

  price          DECIMAL(10,2) NOT NULL,
  mrp            DECIMAL(10,2),
  stock          INT DEFAULT 0,
  image          VARCHAR(255),

  rating         DECIMAL(2,1) DEFAULT 0,
  review_count   INT DEFAULT 0,

  short_description VARCHAR(400),
  description       TEXT,
  care_tip          VARCHAR(400),

  -- the "tabs" a buyer filters on
  -- plain VARCHAR rather than ENUM: Hibernate's schema validation rejects
  -- MySQL ENUM against a String field, and ENUMs are a pain to extend anyway
  pet_safety     VARCHAR(10) NOT NULL DEFAULT 'safe',
  difficulty     VARCHAR(10) NOT NULL DEFAULT 'Easy',
  light_need     VARCHAR(10) NOT NULL DEFAULT 'medium',
  water_need     VARCHAR(10) NOT NULL DEFAULT 'medium',
  maintenance    VARCHAR(40),
  growth_rate    VARCHAR(40),
  mature_size    VARCHAR(60),

  -- care card
  care_light       VARCHAR(400),
  care_water       VARCHAR(400),
  care_soil        VARCHAR(400),
  care_humidity    VARCHAR(400),
  care_temperature VARCHAR(400),
  care_feed        VARCHAR(400),
  care_repot       VARCHAR(400),

  is_featured    BOOLEAN DEFAULT FALSE,
  is_best_seller BOOLEAN DEFAULT FALSE,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_plant_category FOREIGN KEY (category_id) REFERENCES category(id),
  INDEX idx_plant_category (category_id),
  INDEX idx_plant_pet_safety (pet_safety),
  INDEX idx_plant_flags (is_featured, is_best_seller)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE badge (
  id      BIGINT AUTO_INCREMENT PRIMARY KEY,
  code    VARCHAR(40)  NOT NULL UNIQUE,   -- petFriendly, beginner …
  label   VARCHAR(60)  NOT NULL,
  tone    VARCHAR(20)  NOT NULL,
  icon    VARCHAR(40),
  detail  VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE plant_badge (
  plant_id BIGINT NOT NULL,
  badge_id BIGINT NOT NULL,
  PRIMARY KEY (plant_id, badge_id),
  CONSTRAINT fk_pb_plant FOREIGN KEY (plant_id) REFERENCES plant(id) ON DELETE CASCADE,
  CONSTRAINT fk_pb_badge FOREIGN KEY (badge_id) REFERENCES badge(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------- customers

CREATE TABLE app_user (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  full_name     VARCHAR(120) NOT NULL,
  email         VARCHAR(160) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,      -- BCrypt. Never a plain password.
  phone         VARCHAR(20),
  role          VARCHAR(10) NOT NULL DEFAULT 'CUSTOMER',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cart_item (
  id       BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id  BIGINT NOT NULL,
  plant_id BIGINT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_cart (user_id, plant_id),
  CONSTRAINT fk_cart_user  FOREIGN KEY (user_id)  REFERENCES app_user(id) ON DELETE CASCADE,
  CONSTRAINT fk_cart_plant FOREIGN KEY (plant_id) REFERENCES plant(id)    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE wishlist_item (
  id       BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id  BIGINT NOT NULL,
  plant_id BIGINT NOT NULL,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_wishlist (user_id, plant_id),
  CONSTRAINT fk_wish_user  FOREIGN KEY (user_id)  REFERENCES app_user(id) ON DELETE CASCADE,
  CONSTRAINT fk_wish_plant FOREIGN KEY (plant_id) REFERENCES plant(id)    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------------- orders

CREATE TABLE orders (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_number  VARCHAR(30) NOT NULL UNIQUE,
  user_id       BIGINT NOT NULL,
  status        VARCHAR(12) NOT NULL DEFAULT 'PENDING',
  subtotal      DECIMAL(10,2) NOT NULL,
  shipping      DECIMAL(10,2) DEFAULT 0,
  total         DECIMAL(10,2) NOT NULL,
  address_line  VARCHAR(255),
  city          VARCHAR(80),
  state         VARCHAR(80),
  pincode       VARCHAR(10),
  -- Razorpay handles. razorpay_order_id is UNIQUE so a replayed callback can
  -- never create a second order for the same payment.
  razorpay_order_id   VARCHAR(64) NULL,
  razorpay_payment_id VARCHAR(64) NULL,
  UNIQUE KEY uq_rzp_order (razorpay_order_id),
  placed_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_order_user FOREIGN KEY (user_id) REFERENCES app_user(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE order_item (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_id   BIGINT NOT NULL,
  plant_id   BIGINT NOT NULL,
  quantity   INT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,     -- captured at purchase time
  CONSTRAINT fk_oi_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_oi_plant FOREIGN KEY (plant_id) REFERENCES plant(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------- contact

CREATE TABLE contact_message (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(120) NOT NULL,
  email      VARCHAR(160) NOT NULL,
  subject    VARCHAR(200),
  message    TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE newsletter_subscriber (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  email         VARCHAR(160) NOT NULL UNIQUE,
  subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
