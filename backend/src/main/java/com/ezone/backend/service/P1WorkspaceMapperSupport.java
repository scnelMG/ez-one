package com.ezone.backend.service;

import com.ezone.backend.domain.persistence.JobRow;
import com.ezone.backend.domain.persistence.MattermostParsedJobPostRow;
import com.ezone.backend.mapper.P1WorkspaceMapper;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("mysql")
public class P1WorkspaceMapperSupport {

    private final P1WorkspaceMapper mapper;

    public P1WorkspaceMapperSupport(P1WorkspaceMapper mapper) {
        this.mapper = mapper;
    }

    public Long promoteMattermostJob(MattermostParsedJobPostRow candidate) {
        JobRow job = new JobRow();
        job.setCompanyName(candidate.getCompanyName());
        job.setCompanyDomain(CompanyDetailDefaults.domainFromUrl(candidate.getUrl()));
        job.setCompanyType(CompanyDetailDefaults.UNKNOWN_KO);
        job.setCompanySize(CompanyDetailDefaults.UNKNOWN_KO);
        job.setPositionTitle(candidate.getTitle());
        job.setDeadlineLabel(candidate.getDeadlineLabel());
        job.setSourceUrl(candidate.getUrl());
        job.setSource("MATTERMOST");
        mapper.upsertCompany(job);
        mapper.recordCompanyInfoSource(job.getCompanyId(), "MATTERMOST_JOB_URL", candidate.getUrl(), "UNVERIFIED");
        mapper.insertJob(job);
        return job.getId();
    }
}
