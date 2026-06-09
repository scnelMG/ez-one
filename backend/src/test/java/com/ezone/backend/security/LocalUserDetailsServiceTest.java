package com.ezone.backend.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import com.ezone.backend.mapper.UserAccountMapper;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

@ExtendWith(MockitoExtension.class)
class LocalUserDetailsServiceTest {

    @Mock
    private UserAccountMapper userAccountMapper;

    @Test
    void loadsLocalUserDetailsWithNormalizedEmail() {
        LocalUserDetailsService service = new LocalUserDetailsService(userAccountMapper);
        when(userAccountMapper.findPasswordHashByEmail("local@example.com")).thenReturn(Optional.of("bcrypt-hash"));

        var userDetails = service.loadUserByUsername(" LOCAL@example.com ");

        assertThat(userDetails.getUsername()).isEqualTo("local@example.com");
        assertThat(userDetails.getPassword()).isEqualTo("bcrypt-hash");
        assertThat(userDetails.getAuthorities()).extracting("authority").containsExactly("ROLE_USER");
    }

    @Test
    void rejectsMissingLocalCredentials() {
        LocalUserDetailsService service = new LocalUserDetailsService(userAccountMapper);
        when(userAccountMapper.findPasswordHashByEmail("google@example.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.loadUserByUsername("google@example.com"))
            .isInstanceOf(UsernameNotFoundException.class);
    }
}
