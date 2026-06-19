package com.ezone.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.verify;

import com.ezone.backend.domain.persistence.JobRow;
import com.ezone.backend.domain.persistence.MattermostParsedJobPostRow;
import com.ezone.backend.mapper.P1WorkspaceMapper;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;

class P1WorkspaceMapperSupportTest {

    private final P1WorkspaceMapper mapper = Mockito.mock(P1WorkspaceMapper.class);
    private final P1WorkspaceMapperSupport support = new P1WorkspaceMapperSupport(mapper);

    @Test
    void promoteMattermostJobConnectsOfficialCompanyInfoAndLogo() {
        MattermostParsedJobPostRow candidate = new MattermostParsedJobPostRow();
        candidate.setCompanyName("한국교육학술정보원");
        candidate.setTitle("정보기술 서비스 기획");
        candidate.setDeadlineLabel("04/27(월)");
        candidate.setUrl("https://keris.recruiter.co.kr/app/jobnotice/view?jobnoticeSn=250774");
        doAnswer(invocation -> {
            JobRow row = invocation.getArgument(0);
            row.setCompanyId(88L);
            return null;
        }).when(mapper).upsertCompany(Mockito.any());
        doAnswer(invocation -> {
            JobRow row = invocation.getArgument(0);
            row.setId(900L);
            return null;
        }).when(mapper).insertJob(Mockito.any());

        Long promotedJobId = support.promoteMattermostJob(candidate);

        assertThat(promotedJobId).isEqualTo(900L);
        ArgumentCaptor<JobRow> jobCaptor = ArgumentCaptor.forClass(JobRow.class);
        verify(mapper).upsertCompany(jobCaptor.capture());
        JobRow promoted = jobCaptor.getValue();
        assertThat(promoted.getCompanyDomain()).isEqualTo("keris.or.kr");
        assertThat(promoted.getCompanyLogoUrl())
            .isEqualTo("https://www.google.com/s2/favicons?domain=keris.or.kr&sz=128");
        assertThat(promoted.getLogoSourceUrl()).isEqualTo("https://www.keris.or.kr");
        assertThat(promoted.getLogoStatus()).isEqualTo("DISCOVERED");
        verify(mapper).upsertOfficialCompanyProfile(
            88L,
            "교육/공공",
            "https://www.keris.or.kr",
            "OFFICIAL_SITE",
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null
        );
        verify(mapper).recordCompanyProfileSource(
            88L,
            "OFFICIAL_SITE",
            "공식 홈페이지",
            "https://www.keris.or.kr",
            "회사 공식 홈페이지 기준"
        );
        verify(mapper).recordCompanyInfoSource(88L, "MATTERMOST_JOB_URL", candidate.getUrl(), "UNVERIFIED");
        verify(mapper).insertJob(argThat(row ->
            "MATTERMOST".equals(row.getSource())
                && "정보기술 서비스 기획".equals(row.getPositionTitle())
                && "https://keris.recruiter.co.kr/app/jobnotice/view?jobnoticeSn=250774".equals(row.getSourceUrl())
        ));
    }
}
