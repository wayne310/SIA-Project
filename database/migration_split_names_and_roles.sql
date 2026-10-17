USE barangay_data;

ALTER TABLE users
    ADD COLUMN first_name VARCHAR(75) NULL AFTER user_id,
    ADD COLUMN last_name VARCHAR(75) NULL AFTER first_name;

UPDATE users
SET first_name = TRIM(SUBSTRING_INDEX(full_name, ' ', 1)),
    last_name = TRIM(SUBSTRING(full_name, LENGTH(SUBSTRING_INDEX(full_name, ' ', 1)) + 1));

ALTER TABLE users
    MODIFY first_name VARCHAR(75) NOT NULL,
    MODIFY last_name VARCHAR(75) NOT NULL,
    MODIFY role ENUM('resident', 'admin', 'super_admin') NOT NULL DEFAULT 'resident',
    DROP COLUMN full_name;

INSERT INTO status (status_name, description)
VALUES ('Problem Solved', 'Incident problem has been solved')
ON DUPLICATE KEY UPDATE description = VALUES(description);

INSERT INTO users (first_name, last_name, email, password, role)
VALUES ('Super', 'Admin', 'superadmin@example.com', '$2y$12$Pqn.rwhJsNKZi5ZpBTuu4.a7ADGzUOGDOPJ5MhisGj6JouL4NEWhC', 'super_admin')
ON DUPLICATE KEY UPDATE first_name = VALUES(first_name), last_name = VALUES(last_name), password = VALUES(password), role = VALUES(role);
