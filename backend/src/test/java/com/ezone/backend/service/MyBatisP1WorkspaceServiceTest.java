package com.ezone.backend.service;

import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ezone.backend.domain.persistence.BasketJobRow;
import com.ezone.backend.domain.persistence.EssayQuestionRow;
import com.ezone.backend.domain.persistence.JobRow;
import com.ezone.backend.domain.persistence.WorkspaceRow;
import com.ezone.backend.dto.basket.CreateBasketJobRequest;
import com.ezone.backend.mapper.P1WorkspaceMapper;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class MyBatisP1WorkspaceServiceTest {

    @Mock
    private P1WorkspaceMapper mapper;

    @InjectMocks
    private MyBatisP1WorkspaceService service;

    @Test
    void createBasketJobRecordsUnverifiedCompanyInfoSourceFromSavedUrl() {
        String sourceUrl = "https://careers.example.com/jobs/backend";
        when(mapper.findDuplicateBasketJob(1L, sourceUrl, "Backend Developer")).thenReturn(Optional.empty());
        doAnswer(invocation -> {
            JobRow row = invocation.getArgument(0);
            row.setCompanyId(10L);
            return null;
        }).when(mapper).upsertCompany(org.mockito.ArgumentMatchers.any());
        doAnswer(invocation -> {
            JobRow row = invocation.getArgument(0);
            row.setId(20L);
            return null;
        }).when(mapper).insertJob(org.mockito.ArgumentMatchers.any());
        doAnswer(invocation -> {
            BasketJobRow row = invocation.getArgument(0);
            row.setId(30L);
            return null;
        }).when(mapper).insertBasketJob(org.mockito.ArgumentMatchers.any());
        doAnswer(invocation -> {
            WorkspaceRow row = invocation.getArgument(0);
            row.setId(40L);
            return null;
        }).when(mapper).insertWorkspace(org.mockito.ArgumentMatchers.any());
        doAnswer(invocation -> {
            EssayQuestionRow row = invocation.getArgument(0);
            row.setId(50L);
            return null;
        }).when(mapper).insertEssayQuestion(org.mockito.ArgumentMatchers.any());

        service.createBasketJob(1L, new CreateBasketJobRequest(
            "Example Labs",
            "Backend Developer",
            "D-5",
            sourceUrl,
            "DIRECT"
        ));

        verify(mapper).recordCompanyInfoSource(10L, "SAVED_JOB_URL", sourceUrl, "UNVERIFIED");
    }
}
