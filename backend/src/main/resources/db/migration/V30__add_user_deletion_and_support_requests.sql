ALTER TABLE users
    ADD COLUMN deleted_at TIMESTAMP NULL;

CREATE INDEX idx_users_deleted_at ON users (deleted_at);

CREATE TABLE IF NOT EXISTS support_requests (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    request_type VARCHAR(32) NOT NULL,
    category VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    company_name VARCHAR(255) NULL,
    contact_name VARCHAR(255) NULL,
    contact_email VARCHAR(255) NULL,
    contact_phone VARCHAR(64) NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'RECEIVED',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_support_requests_user FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE INDEX idx_support_requests_user_created ON support_requests (user_id, created_at);
