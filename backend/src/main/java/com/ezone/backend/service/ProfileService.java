package com.ezone.backend.service;

import com.ezone.backend.dto.profile.DocumentProfileResponse;
import com.ezone.backend.dto.profile.UpsertDocumentSectionRequest;
import com.ezone.backend.dto.profile.UserProfileRequest;
import com.ezone.backend.dto.profile.UserProfileResponse;

public interface ProfileService {

    UserProfileResponse getUserProfile(Long userId);

    UserProfileResponse updateUserProfile(Long userId, UserProfileRequest request);

    DocumentProfileResponse getDocumentProfile(Long userId);

    DocumentProfileResponse upsertSection(Long userId, String sectionType, UpsertDocumentSectionRequest request);
}
