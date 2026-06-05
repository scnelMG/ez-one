package com.ezone.backend.service;

import java.net.URI;
import java.net.URISyntaxException;

final class CompanyDetailDefaults {

    static final String UNKNOWN_KO = "미확인";
    static final String UNVERIFIED = "unverified";

    private CompanyDetailDefaults() {
    }

    static String domainFromUrl(String sourceUrl) {
        if (sourceUrl == null || sourceUrl.isBlank()) {
            return UNKNOWN_KO;
        }

        try {
            URI uri = new URI(sourceUrl);
            String host = uri.getHost();
            if (host == null || host.isBlank()) {
                return UNKNOWN_KO;
            }
            return host.startsWith("www.") ? host.substring(4) : host;
        } catch (URISyntaxException exception) {
            return UNKNOWN_KO;
        }
    }
}
