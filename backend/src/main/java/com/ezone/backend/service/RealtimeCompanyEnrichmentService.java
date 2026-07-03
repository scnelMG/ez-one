package com.ezone.backend.service;

import java.util.List;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class RealtimeCompanyEnrichmentService {

    private static final Logger log = LoggerFactory.getLogger(RealtimeCompanyEnrichmentService.class);
    private static final Set<String> DOMAIN_LABEL_STOP_WORDS = Set.of("com", "net", "org", "co", "kr", "www");

    private final List<RealtimeCompanyEnrichmentProvider> providers;
    private final boolean enabled;

    public RealtimeCompanyEnrichmentService(
        List<RealtimeCompanyEnrichmentProvider> providers,
        @Value("${company-enrichment.realtime.enabled:true}") boolean enabled
    ) {
        this.providers = providers;
        this.enabled = enabled;
    }

    public Optional<RealtimeCompanyEnrichment> enrich(String companyName) {
        if (!enabled || companyName == null || companyName.isBlank()) {
            return Optional.empty();
        }

        RealtimeCompanyEnrichment merged = null;
        List<String> candidates = companyNameCandidates(companyName);
        for (RealtimeCompanyEnrichmentProvider provider : providers) {
            for (String candidate : candidates) {
                try {
                    Optional<RealtimeCompanyEnrichment> enrichment = provider.enrich(candidate);
                    if (enrichment.isPresent()) {
                        merged = merged == null ? enrichment.get() : merged.mergeMissing(enrichment.get());
                        break;
                    }
                } catch (RuntimeException exception) {
                    log.warn(
                        "Realtime company enrichment provider {} failed for {}: {}",
                        provider.getClass().getSimpleName(),
                        companyName,
                        exception.getMessage()
                    );
                    break;
                }
            }
        }
        return Optional.ofNullable(merged);
    }

    private List<String> companyNameCandidates(String companyName) {
        String trimmed = companyName.trim();
        Set<String> candidates = new LinkedHashSet<>();
        candidates.add(trimmed);
        OfficialCompanyRegistry.resolve(trimmed)
            .map(OfficialCompanyRegistry.OfficialCompany::domain)
            .flatMap(this::candidateFromDomain)
            .ifPresent(candidates::add);
        CompanyDetailDefaults.CompanyDefaults defaults = CompanyDetailDefaults.resolve(trimmed, null);
        candidateFromDomain(defaults.domain()).ifPresent(candidates::add);
        return List.copyOf(candidates);
    }

    private Optional<String> candidateFromDomain(String domain) {
        if (domain == null || domain.isBlank() || CompanyDetailDefaults.UNKNOWN_DOMAIN.equals(domain)) {
            return Optional.empty();
        }
        String host = domain.toLowerCase(Locale.ROOT)
            .replaceFirst("^https?://", "")
            .replaceFirst("^www\\.", "");
        String label = host.split("[/:]")[0].split("\\.")[0];
        String candidate = label
            .replaceAll("(corporation|incorporated|company|corp|group|holdings|limited|ltd|inc|llc|co)$", "")
            .trim();
        if (candidate.length() < 2 || DOMAIN_LABEL_STOP_WORDS.contains(candidate)) {
            return Optional.empty();
        }
        return Optional.of(candidate);
    }
}
