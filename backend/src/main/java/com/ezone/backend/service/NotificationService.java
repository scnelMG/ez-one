package com.ezone.backend.service;

import com.ezone.backend.domain.persistence.NotificationRow;
import com.ezone.backend.dto.study.NotificationDto;
import com.ezone.backend.mapper.StudyMapper;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class NotificationService {
    private final StudyMapper studyMapper;

    public NotificationService(StudyMapper studyMapper) {
        this.studyMapper = studyMapper;
    }

    public List<NotificationDto> getMyNotifications(String userEmail) {
        return studyMapper.findNotificationsByUserEmail(userEmail).stream().map(row -> {
            NotificationDto dto = new NotificationDto();
            dto.setId(row.getId());
            dto.setUserEmail(row.getUserEmail());
            dto.setStudyId(row.getStudyId());
            dto.setMessage(row.getMessage());
            dto.setType(row.getType());
            dto.setIsRead(row.isRead());
            dto.setCreatedAt(row.getCreatedAt());
            return dto;
        }).collect(Collectors.toList());
    }

    public void readNotification(String id, String userEmail) {
        studyMapper.updateNotificationRead(id, userEmail);
    }

    public int countUnread(String userEmail) {
        return studyMapper.countUnreadNotifications(userEmail);
    }
}
