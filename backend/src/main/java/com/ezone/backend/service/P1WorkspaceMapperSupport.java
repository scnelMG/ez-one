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
        CompanyDetailDefaults.CompanyDefaults defaults = CompanyDetailDefaults.resolve(candidate.getCompanyName(), candidate.getUrl());
        job.setCompanyName(candidate.getCompanyName());
        job.setCompanyDomain(defaults.domain());
        job.setCompanyType(defaults.companyType());
        job.setCompanySize(defaults.size());
        job.setPositionTitle(candidate.getTitle());
        job.setDeadlineLabel(candidate.getDeadlineLabel());
        job.setSourceUrl(candidate.getUrl());
        job.setSource("MATTERMOST");
        mapper.upsertCompany(job);
        if (!CompanyDetailDefaults.UNKNOWN_DOMAIN.equals(defaults.domain())) {
            mapper.upsertRuleBasedCompanyProfile(job.getCompanyId(), defaults.industry(), defaults.domain());
        }
        mapper.recordCompanyInfoSource(job.getCompanyId(), "MATTERMOST_JOB_URL", candidate.getUrl(), "UNVERIFIED");
        mapper.insertJob(job);
        return job.getId();
    }
}
