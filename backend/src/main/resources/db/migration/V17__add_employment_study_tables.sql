-- V17__add_employment_study_tables.sql
-- 취업 스터디 기능 관련 신규 테이블 스키마 뼈대

-- 스터디 그룹 테이블
CREATE TABLE IF NOT EXISTS study_group (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_by VARCHAR(255) NOT NULL, -- 스터디장 email 또는 id
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 스터디 멤버 테이블
CREATE TABLE IF NOT EXISTS study_member (
    id VARCHAR(36) PRIMARY KEY,
    study_id VARCHAR(36) NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'MEMBER', -- 'LEADER', 'MEMBER'
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (study_id) REFERENCES study_group(id) ON DELETE CASCADE
);

-- 스터디 초대 테이블
CREATE TABLE IF NOT EXISTS study_invite (
    id VARCHAR(36) PRIMARY KEY,
    study_id VARCHAR(36) NOT NULL,
    inviter_email VARCHAR(255) NOT NULL,
    invitee_email VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING', -- 'PENDING', 'ACCEPTED', 'REJECTED'
    invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (study_id) REFERENCES study_group(id) ON DELETE CASCADE
);

-- 공유된 자소서 테이블
CREATE TABLE IF NOT EXISTS shared_essay (
    id VARCHAR(36) PRIMARY KEY,
    study_id VARCHAR(36) NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    workspace_id VARCHAR(255) NOT NULL,
    version_id VARCHAR(255) NOT NULL, -- 개인이 저장한 자소서 특정 버전의 ID
    shared_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (study_id) REFERENCES study_group(id) ON DELETE CASCADE
);

-- 자소서 피드백(댓글) 테이블
CREATE TABLE IF NOT EXISTS essay_feedback (
    id VARCHAR(36) PRIMARY KEY,
    shared_essay_id VARCHAR(36) NOT NULL,
    author_email VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (shared_essay_id) REFERENCES shared_essay(id) ON DELETE CASCADE
);

-- 공유된 공고 (지인 추천) 테이블
CREATE TABLE IF NOT EXISTS shared_job (
    id VARCHAR(36) PRIMARY KEY,
    study_id VARCHAR(36) NOT NULL,
    recommender_email VARCHAR(255) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    position_title VARCHAR(255) NOT NULL,
    deadline_label VARCHAR(100),
    source_url TEXT,
    recommended_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (study_id) REFERENCES study_group(id) ON DELETE CASCADE
);
