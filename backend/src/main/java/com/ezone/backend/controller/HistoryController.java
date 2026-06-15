package com.ezone.backend.controller;

import com.ezone.backend.domain.HistoryResultStage;
import com.ezone.backend.dto.ApiResponse;
import com.ezone.backend.dto.history.HistoryApplicationResponse;
import com.ezone.backend.service.HistoryService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/history")
public class HistoryController {

    private final HistoryService historyService;

    public HistoryController(HistoryService historyService) {
        this.historyService = historyService;
    }

    @GetMapping("/applications")
    public ApiResponse<HistoryApplicationResponse> listApplications(
        @RequestParam(defaultValue = "ALL") String period,
        @RequestParam(required = false) HistoryResultStage resultStage
    ) {
        return ApiResponse.success(historyService.listApplications(CurrentUserSupport.currentUserId(), period, resultStage));
    }
}
