package com.ezone.backend.mapper;

import com.ezone.backend.domain.UserAccount;
import com.ezone.backend.dto.auth.GoogleUserProfile;
import java.util.Optional;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface UserAccountMapper {
    Optional<UserAccount> findByGoogleSubject(String googleSubject);

    UserAccount createFromGoogleProfile(GoogleUserProfile profile);
}
