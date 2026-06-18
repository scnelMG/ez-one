package com.ezone.backend.service;

import java.util.Optional;

interface RealtimeCompanyEnrichmentProvider {

    Optional<RealtimeCompanyEnrichment> enrich(String companyName);
}
