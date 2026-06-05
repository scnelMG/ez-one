CREATE TABLE IF NOT EXISTS company_info_sources (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  company_id BIGINT NOT NULL,
  source_name VARCHAR(64) NOT NULL,
  source_url VARCHAR(1024) NOT NULL,
  status VARCHAR(32) NOT NULL,
  collected_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_company_info_sources_company FOREIGN KEY (company_id) REFERENCES companies(id),
  UNIQUE KEY uk_company_info_sources_url (company_id, source_url)
);
