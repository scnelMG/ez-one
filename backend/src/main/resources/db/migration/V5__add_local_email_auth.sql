ALTER TABLE users
  ADD COLUMN password_hash VARCHAR(255) NULL;

ALTER TABLE users
  ADD UNIQUE KEY uk_users_email (email);
