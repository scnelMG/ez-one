package com.ezone.backend.mapper;

import com.ezone.backend.domain.UserSession;
import org.apache.ibatis.annotations.Arg;
import org.apache.ibatis.annotations.ConstructorArgs;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
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
    @ConstructorArgs({
        @Arg(column = "id", javaType = Long.class),
        @Arg(column = "user_id", javaType = Long.class),
        @Arg(column = "refresh_token_hash", javaType = String.class),
        @Arg(column = "expires_at", javaType = java.time.Instant.class),
        @Arg(column = "revoked_at", javaType = java.time.Instant.class)
    })
    Optional<UserSession> findActiveByHash(String refreshTokenHash);

    @Update("""
        UPDATE user_sessions
        SET revoked_at = CURRENT_TIMESTAMP
        WHERE refresh_token_hash = #{refreshTokenHash}
          AND revoked_at IS NULL
        """)
    int revokeByHash(String refreshTokenHash);

    @Update("""
        UPDATE user_sessions
        SET revoked_at = CURRENT_TIMESTAMP
        WHERE user_id = #{userId}
          AND revoked_at IS NULL
        """)
    int revokeAllByUserId(@Param("userId") Long userId);
}
