USE barangay_data;

ALTER TABLE users
    ADD COLUMN birthday DATE NULL,
    ADD COLUMN nationality VARCHAR(100) NULL;

CREATE TABLE IF NOT EXISTS incident_history (
    history_id INT AUTO_INCREMENT PRIMARY KEY,
    incident_id INT NOT NULL,
    actor_name VARCHAR(150) NOT NULL,
    action VARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (incident_id) REFERENCES incidents(incident_id) ON DELETE CASCADE
);
