-- =========================
-- USER TABLE
-- =========================
CREATE TABLE `user` (
  `user_id` int NOT NULL AUTO_INCREMENT,
  `user_name` varchar(100) NOT NULL,
  `phone_number` varchar(15) NOT NULL,
  `password` varchar(255) NOT NULL,
  `address` text,
  `role` enum('admin','user') DEFAULT 'user',
  `display_name` varchar(100) DEFAULT NULL,
  `deleted` tinyint(1) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `phone_number` (`phone_number`),
  UNIQUE KEY `user_name_UNIQUE` (`user_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- =========================
-- GODOWN TABLE
-- =========================
CREATE TABLE `godown` (
  `godown_id` int NOT NULL AUTO_INCREMENT,
  `godown_name` varchar(100) NOT NULL,
  `location` varchar(255) DEFAULT NULL,
  `capacity` int NOT NULL,
  `owner_id` int NOT NULL,
  `deleted` tinyint(1) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`godown_id`),
  KEY `owner_id` (`owner_id`),
  CONSTRAINT `godown_ibfk_1` FOREIGN KEY (`owner_id`)
    REFERENCES `user` (`user_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- =========================
-- PRODUCTS TABLE
-- =========================
CREATE TABLE `products` (
  `product_id` int NOT NULL AUTO_INCREMENT,
  `product_name` varchar(100) NOT NULL,
  `category` varchar(100) DEFAULT NULL,
  `deleted` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- =========================
-- GODOWN RENTAL DETAILS
-- =========================
CREATE TABLE `godown_rental_details` (
  `rental_id` int NOT NULL AUTO_INCREMENT,
  `godown_id` int NOT NULL,
  `tenant_id` int NOT NULL,
  `rent_cost` decimal(10,2) NOT NULL,
  `status` enum('requested','accepted','rejected','completed') DEFAULT 'requested',
  `start_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `end_date` datetime DEFAULT NULL,
  `deleted` tinyint(1) DEFAULT 0,
  `updated_on` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`rental_id`),
  KEY `godown_id` (`godown_id`),
  KEY `tenant_id` (`tenant_id`),
  CONSTRAINT `godown_rental_details_ibfk_1` FOREIGN KEY (`godown_id`)
    REFERENCES `godown` (`godown_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `godown_rental_details_ibfk_2` FOREIGN KEY (`tenant_id`)
    REFERENCES `user` (`user_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- =========================
-- STORES TABLE (CURRENT STOCK)
-- =========================
CREATE TABLE `stores` (
  `godown_id` int NOT NULL,
  `product_id` int NOT NULL,
  `quantity` int DEFAULT 0,
  `deleted` tinyint(1) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`godown_id`,`product_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `stores_ibfk_1` FOREIGN KEY (`godown_id`)
    REFERENCES `godown` (`godown_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `stores_ibfk_2` FOREIGN KEY (`product_id`)
    REFERENCES `products` (`product_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- =========================
-- STORE HISTORY TABLE (AUDIT LOG)
-- =========================
CREATE TABLE `store_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `godown_id` int NOT NULL,
  `product_id` int NOT NULL,
  `quantity_change` int DEFAULT NULL,
  `action_type` enum('add','remove','transfer') DEFAULT NULL,
  `deleted` tinyint(1) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `godown_id` (`godown_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `store_history_ibfk_1` FOREIGN KEY (`godown_id`)
    REFERENCES `godown` (`godown_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `store_history_ibfk_2` FOREIGN KEY (`product_id`)
    REFERENCES `products` (`product_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;