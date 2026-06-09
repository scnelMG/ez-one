package com.ezone.backend.security;

import com.ezone.backend.mapper.UserAccountMapper;
import java.util.Locale;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class LocalUserDetailsService implements UserDetailsService {

    private final UserAccountMapper userAccountMapper;

    public LocalUserDetailsService(UserAccountMapper userAccountMapper) {
        this.userAccountMapper = userAccountMapper;
    }

    @Override
    public UserDetails loadUserByUsername(String username) {
        String email = username.trim().toLowerCase(Locale.ROOT);
        String passwordHash = userAccountMapper.findPasswordHashByEmail(email)
            .orElseThrow(() -> new UsernameNotFoundException("Local user not found."));

        return User.withUsername(email)
            .password(passwordHash)
            .roles("USER")
            .build();
    }
}
