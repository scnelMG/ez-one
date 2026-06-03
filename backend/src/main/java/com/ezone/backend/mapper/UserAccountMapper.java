package com.ezone.backend.mapper;

import com.ezone.backend.domain.UserAccount;
import com.ezone.backend.dto.auth.GoogleUserProfile;
import java.util.Optional;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Result;
import org.apache.ibatis.annotations.Results;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface UserAccountMapper {
    @Select("""
        SELECT
            id,
            provider_id AS google_subject,
            email,
            email AS name,
            email AS nickname,
            FALSE AS profile_completed
        FROM users
        WHERE provider = 'GOOGLE'
          AND provider_id = #{googleSubject}
        """)
    @Results(id = "userAccountResultMap", value = {
        @Result(column = "id", property = "id"),
        @Result(column = "google_subject", property = "googleSubject"),
        @Result(column = "email", property = "email"),
        @Result(column = "name", property = "name"),
        @Result(column = "nickname", property = "nickname"),
        @Result(column = "profile_completed", property = "profileCompleted")
    })
    Optional<UserAccount> findByGoogleSubject(String googleSubject);

    default UserAccount createFromGoogleProfile(GoogleUserProfile profile) {
        insertGoogleUser(profile);
        return findByGoogleSubject(profile.subject())
            .orElseThrow(() -> new IllegalStateException("Created Google user could not be loaded."));
    }

    @Insert("""
        INSERT INTO users (email, provider, provider_id, created_at)
        VALUES (#{profile.email}, 'GOOGLE', #{profile.subject}, CURRENT_TIMESTAMP)
        """)
    void insertGoogleUser(@Param("profile") GoogleUserProfile profile);
}
