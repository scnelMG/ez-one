package com.ezone.backend.service;

import com.ezone.backend.domain.persistence.JobRow;
import com.ezone.backend.domain.persistence.MattermostParsedJobPostRow;
import com.ezone.backend.mapper.P1WorkspaceMapper;
import java.util.Optional;
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
        Optional<OfficialCompanyRegistry.OfficialCompany> official = OfficialCompanyRegistry.resolve(candidate.getCompanyName());
        CompanyDetailDefaults.CompanyDefaults defaults = official.isPresent()
            ? null
            : CompanyDetailDefaults.resolve(candidate.getCompanyName(), candidate.getUrl());
        String domain = official.isPresent() ? official.get().domain() : defaults.domain();
        job.setCompanyDomain(domain);
        job.setCompanyType(official.isPresent() ? official.get().companyType() : defaults.companyType());
        job.setCompanySize(official.isPresent() ? official.get().size() : defaults.size());
        applyLogo(job, domain, official.isPresent() ? official.get().homepageUrl() : candidate.getUrl());
        job.setPositionTitle(candidate.getTitle());
        job.setDeadlineLabel(candidate.getDeadlineLabel());
        job.setSourceUrl(candidate.getUrl());
        job.setSource("MATTERMOST");
        mapper.upsertCompany(job);
        if (official.isPresent()) {
            OfficialCompanyRegistry.OfficialCompany company = official.get();
            mapper.upsertOfficialCompanyProfile(
                job.getCompanyId(),
                company.industry(),
                company.homepageUrl(),
                company.sourceType(),
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
            mapper.recordCompanyProfileSource(
                job.getCompanyId(),
                company.sourceType(),
                company.sourceName(),
                company.sourceUrl(),
                company.sourceNote()
            );
        } else if (!CompanyDetailDefaults.UNKNOWN_DOMAIN.equals(defaults.domain())) {
            mapper.upsertRuleBasedCompanyProfile(job.getCompanyId(), defaults.industry(), defaults.domain());
        }
        mapper.recordCompanyInfoSource(job.getCompanyId(), "MATTERMOST_JOB_URL", candidate.getUrl(), "UNVERIFIED");
        mapper.insertJob(job);
        return job.getId();
    }

    private void applyLogo(JobRow job, String domain, String sourceUrl) {
        if (domain == null || domain.isBlank() || CompanyDetailDefaults.UNKNOWN_DOMAIN.equals(domain)) {
            return;
        }
        job.setCompanyLogoUrl("https://www.google.com/s2/favicons?domain=%s&sz=128".formatted(domain));
        job.setLogoSourceUrl(sourceUrl);
        job.setLogoStatus("DISCOVERED");
    }
}
