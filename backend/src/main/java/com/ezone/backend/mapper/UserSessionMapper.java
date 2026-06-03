package com.ezone.backend.mapper;

import com.ezone.backend.domain.UserSession;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface UserSessionMapper {

    @Insert("""
        INSERT INTO user_sessions (user_id, refresh_token_hash, expires_at, created_at)
        VALUES (#{userId}, #{refreshTokenHash}, #{expiresAt}, CURRENT_TIMESTAMP)
        """)
    void insertSession(UserSession session);
}
