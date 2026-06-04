package com.ezone.backend.security;

import com.ezone.backend.domain.UserAccount;

public interface AuthTokenIssuer {
    IssuedTokenPair issueFor(UserAccount user);

    IssuedTokenPair refresh(String refreshToken);

    void revoke(String refreshToken);
}
