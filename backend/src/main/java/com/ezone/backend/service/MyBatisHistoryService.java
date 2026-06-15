package com.ezone.backend.service;

import com.ezone.backend.domain.HistoryResultStage;
import com.ezone.backend.dto.history.HistoryApplicationResponse;
import com.ezone.backend.mapper.HistoryMapper;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

@Service
@Profile("mysql")
public class MyBatisHistoryService implements HistoryService {

    private final HistoryMapper mapper;

    public MyBatisHistoryService(HistoryMapper mapper) {
        this.mapper = mapper;
    }

    @Override
    public HistoryApplicationResponse listApplications(Long userId, String period, HistoryResultStage resultStage) {
        return HistoryApplicationAssembler.toResponse(mapper.listApplications(userId), period, resultStage);
    }
}
