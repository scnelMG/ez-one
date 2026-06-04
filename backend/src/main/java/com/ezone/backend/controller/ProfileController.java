package com.ezone.backend.controller;

import com.ezone.backend.dto.ApiResponse;
import com.ezone.backend.dto.profile.CreateDocumentCustomFieldRequest;
import com.ezone.backend.dto.profile.DocumentCustomFieldResponse;
import com.ezone.backend.dto.profile.DocumentProfileResponse;
import com.ezone.backend.dto.profile.UpsertDocumentSectionRequest;
import com.ezone.backend.dto.profile.UserProfileRequest;
import com.ezone.backend.dto.profile.UserProfileResponse;
import com.ezone.backend.service.ProfileService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ProfileController {

    private final ProfileService profileService;

    public ProfileController(ProfileService profileService) {
        this.profileService = profileService;
    }

    @GetMapping("/api/me/profile")
    public ApiResponse<UserProfileResponse> getUserProfile() {
        return ApiResponse.success(profileService.getUserProfile(CurrentUserSupport.currentUserId()));
    }

    @PutMapping("/api/me/profile")
    public ApiResponse<UserProfileResponse> updateUserProfile(@RequestBody UserProfileRequest request) {
        return ApiResponse.success(profileService.updateUserProfile(CurrentUserSupport.currentUserId(), request));
    }

    @GetMapping("/api/document-profile")
    public ApiResponse<DocumentProfileResponse> getDocumentProfile() {
        return ApiResponse.success(profileService.getDocumentProfile(CurrentUserSupport.currentUserId()));
    }

    @PutMapping("/api/document-profile/sections/{sectionType}")
    public ApiResponse<DocumentProfileResponse> upsertSection(
        @PathVariable String sectionType,
        @RequestBody UpsertDocumentSectionRequest request
    ) {
        return ApiResponse.success(profileService.upsertSection(
            CurrentUserSupport.currentUserId(),
            sectionType,
            request
        ));
    }

    @PostMapping("/api/document-profile/custom-fields")
    public ApiResponse<DocumentCustomFieldResponse> createCustomField(
        @Valid @RequestBody CreateDocumentCustomFieldRequest request
    ) {
        return ApiResponse.success(profileService.createCustomField(CurrentUserSupport.currentUserId(), request));
    }

    @PatchMapping("/api/document-profile/custom-fields/{fieldId}")
    public ApiResponse<DocumentCustomFieldResponse> updateCustomField(
        @PathVariable Long fieldId,
        @Valid @RequestBody CreateDocumentCustomFieldRequest request
    ) {
        return ApiResponse.success(profileService.updateCustomField(
            CurrentUserSupport.currentUserId(),
            fieldId,
            request
        ));
    }

    @DeleteMapping("/api/document-profile/custom-fields/{fieldId}")
    public ApiResponse<Void> deleteCustomField(@PathVariable Long fieldId) {
        profileService.deleteCustomField(CurrentUserSupport.currentUserId(), fieldId);
        return ApiResponse.success(null);
    }
}
