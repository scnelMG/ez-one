package com.ezone.backend.mapper;

import com.ezone.backend.domain.UserSession;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Result;
import org.apache.ibatis.annotations.Results;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;
import java.util.Optional;

@Mapper
public interface UserSessionMapper {

    @Insert("""
        INSERT INTO user_sessions (user_id, refresh_token_hash, expires_at, created_at)
        VALUES (#{userId}, #{refreshTokenHash}, #{expiresAt}, CURRENT_TIMESTAMP)
        """)
    void insertSession(UserSession session);

    @Select("""
        SELECT id, user_id, refresh_token_hash, expires_at, revoked_at
        FROM user_sessions
        WHERE refresh_token_hash = #{refreshTokenHash}
          AND revoked_at IS NULL
          AND expires_at > CURRENT_TIMESTAMP
        """)
    @Results(id = "userSessionResultMap", value = {
        @Result(column = "id", property = "id"),
        @Result(column = "user_id", property = "userId"),
        @Result(column = "refresh_token_hash", property = "refreshTokenHash"),
        @Result(column = "expires_at", property = "expiresAt"),
        @Result(column = "revoked_at", property = "revokedAt")
    })
    Optional<UserSession> findActiveByHash(String refreshTokenHash);

    @Update("""
        UPDATE user_sessions
        SET revoked_at = CURRENT_TIMESTAMP
        WHERE refresh_token_hash = #{refreshTokenHash}
          AND revoked_at IS NULL
        """)
    int revokeByHash(String refreshTokenHash);
}
