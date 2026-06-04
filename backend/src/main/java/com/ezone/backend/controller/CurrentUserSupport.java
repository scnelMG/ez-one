package com.ezone.backend.controller;

import com.ezone.backend.security.JwtAuthenticatedUser;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

final class CurrentUserSupport {

    private CurrentUserSupport() {
    }

    static Long currentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new IllegalStateException("Authenticated user is required.");
        }

        Object principal = authentication.getPrincipal();
        if (principal instanceof JwtAuthenticatedUser user) {
            return user.userId();
        }

        return Long.valueOf(authentication.getName());
    }

    static String currentUserEmail() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        Object principal = authentication == null ? null : authentication.getPrincipal();
        if (principal instanceof JwtAuthenticatedUser user) {
            return user.email();
        }

        return "user@example.com";
    }
}
