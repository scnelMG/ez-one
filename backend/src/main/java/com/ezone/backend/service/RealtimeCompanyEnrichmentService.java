package com.ezone.backend.service;

import java.util.List;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class RealtimeCompanyEnrichmentService {

    private static final Logger log = LoggerFactory.getLogger(RealtimeCompanyEnrichmentService.class);

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

        for (RealtimeCompanyEnrichmentProvider provider : providers) {
            try {
                Optional<RealtimeCompanyEnrichment> enrichment = provider.enrich(companyName.trim());
                if (enrichment.isPresent()) {
                    return enrichment;
                }
            } catch (RuntimeException exception) {
                log.warn(
                    "Realtime company enrichment provider {} failed for {}: {}",
                    provider.getClass().getSimpleName(),
                    companyName,
                    exception.getMessage()
                );
            }
        }
        return Optional.empty();
    }
}
