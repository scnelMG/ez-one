-- V18__update_shared_essay_versions.sql
-- 공유된 자소서가 여러 문항의 버전들을 포함할 수 있도록 구조 변경

ALTER TABLE shared_essay DROP COLUMN version_id;
ALTER TABLE shared_essay ADD COLUMN version_ids TEXT;
