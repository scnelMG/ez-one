package com.ezone.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.ezone.backend.domain.ApplicationStatus;
import com.ezone.backend.domain.persistence.WorkspaceRow;
import com.ezone.backend.dto.workspace.CompanyDetailsResponse;
import com.ezone.backend.dto.workspace.WorkspaceResponse;
import com.ezone.backend.infrastructure.api.OpenAiClient;
import com.ezone.backend.mapper.ActivityMapper;
import com.ezone.backend.mapper.P1WorkspaceMapper;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class P1WorkspaceCompanyDetailsContractTest {

    @Test
    void getWorkspaceExposesCompanyDetailsSourceAndOfficialProfileFields() {
        P1WorkspaceMapper mapper = mock(P1WorkspaceMapper.class);
        MyBatisP1WorkspaceService service = new MyBatisP1WorkspaceService(
            mapper,
            mock(ActivityMapper.class),
            mock(RealtimeCompanyEnrichmentService.class),
            mock(CompanyDataSyncService.class),
            mock(OpenAiClient.class)
        );
        WorkspaceRow row = workspaceRowWithCompanyDetails();
        when(mapper.findWorkspace(1L, 40L)).thenReturn(Optional.of(row));
        when(mapper.listQuestions(40L)).thenReturn(List.of());
        when(mapper.listReferences(40L)).thenReturn(List.of());

        WorkspaceResponse response = service.getWorkspace(1L, 40L);

        CompanyDetailsResponse details = response.companyDetails();
        assertThat(details.domain()).isEqualTo("dbinc.co.kr");
        assertThat(details.homepage()).isEqualTo("https://www.dbinc.co.kr");
        assertThat(details.industry()).isEqualTo("IT 서비스");
        assertThat(details.representative()).isEqualTo("대표자");
        assertThat(details.employeeCount()).isEqualTo(1200);
        assertThat(details.capital()).isEqualTo(10_000_000_000L);
        assertThat(details.revenue()).isEqualTo(95_000_000_000L);
        assertThat(details.business()).isEqualTo("시스템 통합 및 IT 서비스");
        assertThat(details.address()).isEqualTo("서울시 강남구");
        assertThat(details.sourceStatus()).isEqualTo("OFFICIAL");
        assertThat(details.sourceNames()).isEqualTo("OpenDART 기업개황");
        assertThat(details.lastUpdatedAt()).isEqualTo("2026-07-03T12:30:00");
        assertThat(details.companyCategory()).isEqualTo("유가증권시장");
    }

    private WorkspaceRow workspaceRowWithCompanyDetails() {
        WorkspaceRow row = new WorkspaceRow();
        row.setId(40L);
        row.setBasketJobId(30L);
        row.setUserId(1L);
        row.setCompanyName("DB Inc");
        row.setPositionTitle("Backend Engineer");
        row.setDeadlineLabel("D-10");
        row.setApplicationStatus(ApplicationStatus.READY);
        row.setSourceUrl("https://dbgroup.recruiter.co.kr/app/jobnotice/view");
        row.setCompanyDomain("dbinc.co.kr");
        row.setCompanyType("대기업");
        row.setCompanySize("대기업");
        row.setCompanyIndustry("IT 서비스");
        row.setCompanyEmployeeCount(1200);
        row.setCompanyFoundedAt("1977.03.15");
        row.setCompanyCapital(10_000_000_000L);
        row.setCompanyRevenue(95_000_000_000L);
        row.setCompanyRepresentative("대표자");
        row.setCompanyHomepage("https://www.dbinc.co.kr");
        row.setCompanyBusiness("시스템 통합 및 IT 서비스");
        row.setCompanyAddress("서울시 강남구");
        row.setCompanySourceStatus("OFFICIAL");
        row.setCompanySourceNames("OpenDART 기업개황");
        row.setCompanySourceUpdatedAt("2026-07-03T12:30:00");
        row.setCompanyCategory("유가증권시장");
        return row;
    }
}
