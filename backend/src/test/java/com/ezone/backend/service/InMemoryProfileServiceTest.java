package com.ezone.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;

import com.ezone.backend.dto.profile.UserProfileRequest;
import com.ezone.backend.dto.profile.UserProfileResponse;
import com.ezone.backend.domain.persistence.UserProfileRow;
import com.ezone.backend.mapper.UserAccountMapper;
import com.ezone.backend.mapper.UserProfileMapper;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class InMemoryProfileServiceTest {

    @Mock
    private UserAccountMapper userAccountMapper;

    @Mock
    private UserProfileMapper userProfileMapper;

    @Test
    void updateUserProfileMarksAccountProfileCompleted() {
        InMemoryProfileService service = new InMemoryProfileService(userAccountMapper, userProfileMapper);
        org.mockito.Mockito.when(userProfileMapper.findByUserId(3L)).thenReturn(Optional.of(new UserProfileRow(
            3L,
            "[\"Backend\"]",
            "[\"Startup\"]",
            "[\"IT\"]",
            "[\"Seoul\"]",
            "[\"Java\"]",
            true,
            true
        )));

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
        verify(userProfileMapper).upsert(
            3L,
            "[\"Backend\"]",
            "[\"Startup\"]",
            "[\"IT\"]",
            "[\"Seoul\"]",
            "[\"Java\"]",
            true
        );
    }

    @Test
    void getUserProfileLoadsPersistedProfileFromDatabase() {
        InMemoryProfileService service = new InMemoryProfileService(userAccountMapper, userProfileMapper);
        org.mockito.Mockito.when(userProfileMapper.findByUserId(3L)).thenReturn(Optional.of(new UserProfileRow(
            3L,
            "[\"Backend\"]",
            "[\"Startup\"]",
            "[\"IT\"]",
            "[\"Seoul\"]",
            "[\"Java\"]",
            true,
            true
        )));

        UserProfileResponse response = service.getUserProfile(3L);

        assertThat(response.desiredRoles()).containsExactly("Backend");
        assertThat(response.companyTypes()).containsExactly("Startup");
        assertThat(response.industries()).containsExactly("IT");
        assertThat(response.regions()).containsExactly("Seoul");
        assertThat(response.skills()).containsExactly("Java");
        assertThat(response.ssafy()).isTrue();
        assertThat(response.completed()).isTrue();
    }
}
