package com.ezone.backend.security;

import com.ezone.backend.domain.UserAccount;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnMissingBean(AuthTokenIssuer.class)
public class UnconfiguredAuthTokenIssuer implements AuthTokenIssuer {

    @Override
    public IssuedTokenPair issueFor(UserAccount user) {
        throw new IllegalStateException("Auth token issuer is not configured yet.");
    }

    @Override
    public IssuedTokenPair refresh(String refreshToken) {
        throw new IllegalStateException("Auth token issuer is not configured yet.");
    }

    @Override
    public void revoke(String refreshToken) {
        throw new IllegalStateException("Auth token issuer is not configured yet.");
    }
}
