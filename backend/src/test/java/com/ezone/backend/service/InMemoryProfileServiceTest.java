package com.ezone.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;

import com.ezone.backend.dto.profile.UserProfileRequest;
import com.ezone.backend.dto.profile.UserProfileResponse;
import com.ezone.backend.mapper.UserAccountMapper;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class InMemoryProfileServiceTest {

    @Mock
    private UserAccountMapper userAccountMapper;

    @Test
    void updateUserProfileMarksAccountProfileCompleted() {
        InMemoryProfileService service = new InMemoryProfileService(userAccountMapper);

        UserProfileResponse response = service.updateUserProfile(3L, new UserProfileRequest(
            List.of("Backend"),
            List.of("Startup"),
            List.of("IT"),
            List.of("Seoul"),
            List.of("Java"),
            true
        ));

        assertThat(response.completed()).isTrue();
        verify(userAccountMapper).markProfileCompleted(3L);
    }
}
