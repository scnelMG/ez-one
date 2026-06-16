-- V23__add_workspace_id_to_activities.sql
-- 사용자 활동 테이블에 workspace_id 추가
ALTER TABLE user_activities ADD COLUMN workspace_id BIGINT NULL;
ALTER TABLE user_activities ADD CONSTRAINT fk_user_activities_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL;
