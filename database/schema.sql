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

INSERT INTO categories (category_name, description)
VALUES
('Fire', 'Emergency fire incidents'),
('Accident', 'Vehicle or personal accident'),
('Flooding', 'Flooded roads or crossings'),
('Garbage', 'Illegal dumping or trash accumulation'),
('Traffic', 'Traffic obstruction or road issue'),
('Road Obstruction', 'Blockages on roads or pathways'),
('Other', 'Other barangay concerns')
ON DUPLICATE KEY UPDATE category_name = VALUES(category_name);

INSERT INTO status (status_name, description)
VALUES
('Submitted', 'New report submitted'),
('Under Review', 'Assigned for review'),
('Verified', 'Official priority reviewed'),
('In Progress', 'Barangay action started'),
('Resolved', 'Incident addressed'),
('Problem Solved', 'Incident problem has been solved')
ON DUPLICATE KEY UPDATE status_name = VALUES(status_name);

INSERT INTO users (first_name, last_name, email, password, role)
VALUES
('Super', 'Admin', 'superadmin@example.com', '$2y$12$Pqn.rwhJsNKZi5ZpBTuu4.a7ADGzUOGDOPJ5MhisGj6JouL4NEWhC', 'super_admin'),
('Barangay', 'Admin', 'admin@barangay.gov', '$2y$12$5Wmb1eMBRcTY873S4sadPeDPG9rx9plWsuLrpk7b0VjHfw1gy0Ja6', 'admin'),
('Juan', 'Dela Cruz', 'resident@example.com', '$2y$12$d30dwmtWl7a98N2eSsh/z.jk7xebAagbRBUF/YTLPcRpE7GpLlVNG', 'resident')
ON DUPLICATE KEY UPDATE first_name = VALUES(first_name), last_name = VALUES(last_name), password = VALUES(password);
