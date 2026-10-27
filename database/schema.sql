CREATE DATABASE IF NOT EXISTS barangay_data;
USE barangay_data;

CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(75) NOT NULL,
    last_name VARCHAR(75) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NULL,
    address VARCHAR(255) NULL,
    birthday DATE NULL,
    nationality VARCHAR(100) NULL,
    role ENUM('resident','admin','super_admin') NOT NULL DEFAULT 'resident',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_sessions (
    session_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    login_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    logout_time DATETIME NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL,
    description TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS status (
    status_id INT AUTO_INCREMENT PRIMARY KEY,
    status_name VARCHAR(50) NOT NULL,
    description TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS incidents (
    incident_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    category_id INT NOT NULL,
    description TEXT NOT NULL,
    location VARCHAR(255) NOT NULL,
    latitude DECIMAL(10,8) NULL,
    longitude DECIMAL(11,8) NULL,
    ai_priority VARCHAR(50) NULL,
    verified_priority VARCHAR(50) NULL,
    verification_status VARCHAR(50) NOT NULL DEFAULT 'Pending',
    status_id INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(category_id),
    FOREIGN KEY (status_id) REFERENCES status(status_id)
);

CREATE TABLE IF NOT EXISTS incident_photos (
    photo_id INT AUTO_INCREMENT PRIMARY KEY,
    incident_id INT NOT NULL,
    photo_path VARCHAR(255) NOT NULL,
    uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL,
    FOREIGN KEY (incident_id) REFERENCES incidents(incident_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS incident_history (
    history_id INT AUTO_INCREMENT PRIMARY KEY,
    incident_id INT NOT NULL,
    actor_name VARCHAR(150) NOT NULL,
    action VARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (incident_id) REFERENCES incidents(incident_id) ON DELETE CASCADE
);

INSERT INTO categories (category_name, description)
SELECT 'Fire', 'Emergency fire incidents' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE category_name = 'Fire')
UNION ALL SELECT 'Accident', 'Vehicle or personal accident' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE category_name = 'Accident')
UNION ALL SELECT 'Flooding', 'Flooded roads or crossings' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE category_name = 'Flooding')
UNION ALL SELECT 'Garbage', 'Illegal dumping or trash accumulation' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE category_name = 'Garbage')
UNION ALL SELECT 'Traffic', 'Traffic obstruction or road issue' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE category_name = 'Traffic')
UNION ALL SELECT 'Road Obstruction', 'Blockages on roads or pathways' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE category_name = 'Road Obstruction')
UNION ALL SELECT 'Other', 'Other barangay concerns' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE category_name = 'Other');

INSERT INTO status (status_name, description)
SELECT 'Submitted', 'New report submitted' WHERE NOT EXISTS (SELECT 1 FROM status WHERE status_name = 'Submitted')
UNION ALL SELECT 'Under Review', 'Assigned for review' WHERE NOT EXISTS (SELECT 1 FROM status WHERE status_name = 'Under Review')
UNION ALL SELECT 'Verified', 'Official priority reviewed' WHERE NOT EXISTS (SELECT 1 FROM status WHERE status_name = 'Verified')
UNION ALL SELECT 'In Progress', 'Barangay action started' WHERE NOT EXISTS (SELECT 1 FROM status WHERE status_name = 'In Progress')
UNION ALL SELECT 'Resolved', 'Incident addressed' WHERE NOT EXISTS (SELECT 1 FROM status WHERE status_name = 'Resolved')
UNION ALL SELECT 'Problem Solved', 'Incident problem has been solved' WHERE NOT EXISTS (SELECT 1 FROM status WHERE status_name = 'Problem Solved');

INSERT INTO users (first_name, last_name, email, password, role)
VALUES
('Super', 'Admin', 'superadmin@example.com', '$2y$12$Pqn.rwhJsNKZi5ZpBTuu4.a7ADGzUOGDOPJ5MhisGj6JouL4NEWhC', 'super_admin'),
('Barangay', 'Admin', 'admin@barangay.gov', '$2y$12$5Wmb1eMBRcTY873S4sadPeDPG9rx9plWsuLrpk7b0VjHfw1gy0Ja6', 'admin'),
('Juan', 'Dela Cruz', 'resident@example.com', '$2y$12$d30dwmtWl7a98N2eSsh/z.jk7xebAagbRBUF/YTLPcRpE7GpLlVNG', 'resident')
ON DUPLICATE KEY UPDATE first_name = VALUES(first_name), last_name = VALUES(last_name), password = VALUES(password);
