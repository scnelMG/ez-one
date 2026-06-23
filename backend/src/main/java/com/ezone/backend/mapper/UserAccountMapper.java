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
            profile_image_url,
            profile_completed
        FROM users
        WHERE provider = 'GOOGLE'
          AND provider_id = #{googleSubject}
          AND deleted_at IS NULL
        """)
    @ConstructorArgs({
        @Arg(column = "id", javaType = Long.class),
        @Arg(column = "google_subject", javaType = String.class),
        @Arg(column = "email", javaType = String.class),
        @Arg(column = "name", javaType = String.class),
        @Arg(column = "nickname", javaType = String.class),
        @Arg(column = "profile_image_url", javaType = String.class),
        @Arg(column = "profile_completed", javaType = boolean.class)
    })
    Optional<UserAccount> findByGoogleSubject(String googleSubject);

    @Select("""
        SELECT
            id,
            CASE WHEN provider = 'GOOGLE' THEN provider_id ELSE NULL END AS google_subject,
            email,
            name,
            nickname,
            profile_image_url,
            profile_completed
        FROM users
        WHERE email = #{email}
          AND deleted_at IS NULL
        """)
    @ConstructorArgs({
        @Arg(column = "id", javaType = Long.class),
        @Arg(column = "google_subject", javaType = String.class),
        @Arg(column = "email", javaType = String.class),
        @Arg(column = "name", javaType = String.class),
        @Arg(column = "nickname", javaType = String.class),
        @Arg(column = "profile_image_url", javaType = String.class),
        @Arg(column = "profile_completed", javaType = boolean.class)
    })
    Optional<UserAccount> findByEmail(String email);

    @Select("""
        SELECT password_hash
        FROM users
        WHERE email = #{email}
          AND provider = 'LOCAL'
          AND deleted_at IS NULL
        """)
    Optional<String> findPasswordHashByEmail(String email);

    @Select("""
        SELECT
            id,
            provider_id AS google_subject,
            email,
            name,
            nickname,
            profile_image_url,
            profile_completed
        FROM users
        WHERE id = #{userId}
          AND deleted_at IS NULL
        """)
    @ConstructorArgs({
        @Arg(column = "id", javaType = Long.class),
        @Arg(column = "google_subject", javaType = String.class),
        @Arg(column = "email", javaType = String.class),
        @Arg(column = "name", javaType = String.class),
        @Arg(column = "nickname", javaType = String.class),
        @Arg(column = "profile_image_url", javaType = String.class),
        @Arg(column = "profile_completed", javaType = boolean.class)
    })
    Optional<UserAccount> findById(Long userId);

    default UserAccount createFromGoogleProfile(GoogleUserProfile profile) {
        insertGoogleUser(profile);
        return findByGoogleSubject(profile.subject())
            .orElseThrow(() -> new IllegalStateException("Created Google user could not be loaded."));
    }

    default UserAccount createLocalUser(String email, String name, String passwordHash) {
        insertLocalUser(email, name, passwordHash);
        return findByEmail(email)
            .orElseThrow(() -> new IllegalStateException("Created local user could not be loaded."));
    }

    @Insert("""
        INSERT INTO users (email, name, nickname, provider, provider_id, password_hash, profile_completed, created_at)
        VALUES (
            #{profile.email},
            #{profile.name},
            #{profile.nickname},
            'GOOGLE',
            #{profile.subject},
            NULL,
            FALSE,
            CURRENT_TIMESTAMP
        )
        """)
    void insertGoogleUser(@Param("profile") GoogleUserProfile profile);

    @Update("""
        UPDATE users
        SET
            provider = 'GOOGLE',
            provider_id = #{profile.subject},
            name = #{profile.name},
            nickname = #{profile.nickname},
            password_hash = NULL
        WHERE LOWER(email) = LOWER(#{profile.email})
        """)
    void linkGoogleProfile(@Param("profile") GoogleUserProfile profile);

    @Insert("""
        INSERT INTO users (email, name, nickname, provider, provider_id, password_hash, profile_completed, created_at)
        VALUES (
            #{email},
            #{name},
            #{name},
            'LOCAL',
            #{email},
            #{passwordHash},
            FALSE,
            CURRENT_TIMESTAMP
        )
        """)
    void insertLocalUser(
        @Param("email") String email,
        @Param("name") String name,
        @Param("passwordHash") String passwordHash
    );

    @Update("""
        UPDATE users
        SET nickname = #{nickname}
        WHERE id = #{userId}
          AND deleted_at IS NULL
        """)
    void updateNickname(@Param("userId") Long userId, @Param("nickname") String nickname);

    @Update("""
        UPDATE users
        SET profile_image_url = #{profileImageUrl}
        WHERE id = #{userId}
          AND deleted_at IS NULL
        """)
    void updateProfileImageUrl(@Param("userId") Long userId, @Param("profileImageUrl") String profileImageUrl);

    @Update("""
        UPDATE users
        SET profile_completed = TRUE
        WHERE id = #{userId}
          AND deleted_at IS NULL
        """)
    void markProfileCompleted(@Param("userId") Long userId);

    @Update("""
        UPDATE users
        SET
            email = CONCAT('deleted+', id, '@ez-one.local'),
            name = '탈퇴한 사용자',
            nickname = '탈퇴한 사용자',
            provider_id = CONCAT('deleted+', id),
            password_hash = NULL,
            deleted_at = CURRENT_TIMESTAMP
        WHERE id = #{userId}
          AND deleted_at IS NULL
        """)
    int withdrawUser(Long userId);
}
