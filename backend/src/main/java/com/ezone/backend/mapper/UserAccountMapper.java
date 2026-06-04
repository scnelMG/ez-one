package com.ezone.backend.mapper;

import com.ezone.backend.domain.UserAccount;
import com.ezone.backend.dto.auth.GoogleUserProfile;
import java.util.Optional;
import org.apache.ibatis.annotations.Arg;
import org.apache.ibatis.annotations.ConstructorArgs;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

@Mapper
public interface UserAccountMapper {
    @Select("""
        SELECT
            id,
            provider_id AS google_subject,
            email,
            name,
            nickname,
            profile_completed
        FROM users
        WHERE provider = 'GOOGLE'
          AND provider_id = #{googleSubject}
        """)
    @ConstructorArgs({
        @Arg(column = "id", javaType = Long.class),
        @Arg(column = "google_subject", javaType = String.class),
        @Arg(column = "email", javaType = String.class),
        @Arg(column = "name", javaType = String.class),
        @Arg(column = "nickname", javaType = String.class),
        @Arg(column = "profile_completed", javaType = boolean.class)
    })
    Optional<UserAccount> findByGoogleSubject(String googleSubject);

    @Select("""
        SELECT
            id,
            provider_id AS google_subject,
            email,
            name,
            nickname,
            profile_completed
        FROM users
        WHERE id = #{userId}
        """)
    @ConstructorArgs({
        @Arg(column = "id", javaType = Long.class),
        @Arg(column = "google_subject", javaType = String.class),
        @Arg(column = "email", javaType = String.class),
        @Arg(column = "name", javaType = String.class),
        @Arg(column = "nickname", javaType = String.class),
        @Arg(column = "profile_completed", javaType = boolean.class)
    })
    Optional<UserAccount> findById(Long userId);

    default UserAccount createFromGoogleProfile(GoogleUserProfile profile) {
        insertGoogleUser(profile);
        return findByGoogleSubject(profile.subject())
            .orElseThrow(() -> new IllegalStateException("Created Google user could not be loaded."));
    }

    @Insert("""
        INSERT INTO users (email, name, nickname, provider, provider_id, profile_completed, created_at)
        VALUES (
            #{profile.email},
            #{profile.name},
            #{profile.nickname},
            'GOOGLE',
            #{profile.subject},
            FALSE,
            CURRENT_TIMESTAMP
        )
        """)
    void insertGoogleUser(@Param("profile") GoogleUserProfile profile);

    @Update("""
        UPDATE users
        SET nickname = #{nickname}
        WHERE id = #{userId}
        """)
    void updateNickname(@Param("userId") Long userId, @Param("nickname") String nickname);
}
