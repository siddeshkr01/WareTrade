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
  `action_type` enum('add','remove') DEFAULT NULL,
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

CREATE TABLE trade (
    trade_id INT AUTO_INCREMENT PRIMARY KEY,

    initiator_id INT NOT NULL,
    counterparty_id INT NOT NULL,

    trade_type ENUM('buy', 'sell') NOT NULL,

    status ENUM('created', 'pending', 'accepted', 'rejected', 'cancelled') DEFAULT 'created',
    version INT NOT NULL DEFAULT 1,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (initiator_id) REFERENCES user(user_id),
    FOREIGN KEY (counterparty_id) REFERENCES user(user_id)
);

CREATE TABLE trade_item (
    trade_id INT,
    product_id INT,
    quantity INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    from_godown_id INT,
    to_godown_id INT,
    PRIMARY KEY (trade_id, product_id),

    FOREIGN KEY (trade_id) REFERENCES trade(trade_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);

-- =========================
-- LOAN TABLE (single-table ledger, Merchant's Rule interest)
-- =========================
-- One row per cash-flow event between a lender and borrower. A loan starts
-- life as a single 'disbursement' row (loan_id = its own transaction_id,
-- carrying the propose/accept lifecycle). Each partial repayment is a
-- separate 'repayment' row referencing that same loan_id, with no lifecycle
-- of its own (either party can log one directly once the loan is active).
--
-- Interest uses the Merchant's Rule convention: every row is independently
-- future-valued via simple interest from its own effective_date to the
-- settlement date, and the current balance is the signed sum across all
-- rows for a loan_id (disbursement = +amount, repayment = -amount). This
-- avoids needing to replay history in order or track a running principal.
--
-- loan_id deliberately has no FK constraint (it would self-reference before
-- the row exists); it's just an indexed grouping key.
CREATE TABLE loan_transaction (
    transaction_id INT AUTO_INCREMENT PRIMARY KEY,
    loan_id INT NOT NULL,

    transaction_type ENUM('disbursement', 'repayment') NOT NULL,

    lender_id INT NOT NULL,
    borrower_id INT NOT NULL,
    initiator_id INT NULL,
    counterparty_id INT NULL,

    amount DECIMAL(12,2) NOT NULL,
    annual_interest_rate DECIMAL(5,2) NOT NULL DEFAULT 0,

    status ENUM('created', 'pending', 'active', 'rejected', 'cancelled', 'closed') NOT NULL DEFAULT 'active',

    effective_date DATETIME NULL,
    closed_at DATETIME NULL,

    recorded_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_loan_id (loan_id),
    FOREIGN KEY (lender_id) REFERENCES user(user_id),
    FOREIGN KEY (borrower_id) REFERENCES user(user_id),
    FOREIGN KEY (initiator_id) REFERENCES user(user_id),
    FOREIGN KEY (counterparty_id) REFERENCES user(user_id),
    FOREIGN KEY (recorded_by) REFERENCES user(user_id)
);

-- =========================
-- NOTIFICATION TABLE
-- =========================
CREATE TABLE notification (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type VARCHAR(40) NOT NULL,
    message VARCHAR(255) NOT NULL,
    link VARCHAR(255) NULL,
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_user_unread (user_id, is_read),
    FOREIGN KEY (user_id) REFERENCES user(user_id)
);
