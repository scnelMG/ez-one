package com.ezone.backend.controller;

import com.ezone.backend.dto.study.NotificationDto;
import com.ezone.backend.service.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {
    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    public ResponseEntity<List<NotificationDto>> getMyNotifications(@AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails user) {
        return ResponseEntity.ok(notificationService.getMyNotifications(user.getUsername()));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Integer> getUnreadCount(@AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails user) {
        return ResponseEntity.ok(notificationService.countUnread(user.getUsername()));
    }

    @PostMapping("/{id}/read")
    public ResponseEntity<Void> readNotification(@PathVariable String id, @AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails user) {
        notificationService.readNotification(id, user.getUsername());
        return ResponseEntity.ok().build();
    }
}
