package com.ezone.backend.controller;

import com.ezone.backend.dto.ApiResponse;
import com.ezone.backend.dto.company.CompanySearchResponse;
import com.ezone.backend.service.P1WorkspaceService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/p1/companies")
public class CompanyController {

    private final P1WorkspaceService workspaceService;

    public CompanyController(P1WorkspaceService workspaceService) {
        this.workspaceService = workspaceService;
    }

    @GetMapping("/search")
    public ApiResponse<List<CompanySearchResponse>> searchCompanies(@RequestParam String query) {
        return ApiResponse.success(workspaceService.searchCompanies(query));
    }
}
