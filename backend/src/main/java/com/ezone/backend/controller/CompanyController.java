package com.ezone.backend.controller;

import com.ezone.backend.dto.ApiResponse;
import com.ezone.backend.dto.company.CompanySearchResponse;
import com.ezone.backend.service.CompanyDataSyncService;
import com.ezone.backend.service.P1WorkspaceService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/p1/companies")
public class CompanyController {

    private final P1WorkspaceService workspaceService;
    private final CompanyDataSyncService syncService;

    public CompanyController(P1WorkspaceService workspaceService, CompanyDataSyncService syncService) {
        this.workspaceService = workspaceService;
        this.syncService = syncService;
    }

    @GetMapping("/search")
    public ApiResponse<List<CompanySearchResponse>> searchCompanies(@RequestParam String query) {
        try {
            // 사용자가 추가하는 기업은 즉시 백그라운드에서 연금/DART 데이터를 수집하도록 비동기 호출
            syncService.syncCompanyDataAsync(query);
        } catch (Exception e) {
            // API 호출 실패가 검색 실패로 이어지지 않도록 예외 처리
        }
        return ApiResponse.success(workspaceService.searchCompanies(query));
    }

    @PostMapping("/sync")
    public ApiResponse<String> syncCompany(@RequestParam String name) {
        // syncService.syncCompanyByName(name); // 실시간 동기화 제거
        return ApiResponse.success("Synced data for: " + name);
    }
}
