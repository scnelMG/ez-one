package com.ezone.backend.service;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class CompanyDetailDefaultsTest {

    @Test
    void resolvesKnownCompanyDomainInsteadOfJobBoardDomain() {
        CompanyDetailDefaults.CompanyDefaults defaults = CompanyDetailDefaults.resolve(
            "카카오뱅크",
            "https://jasoseol.com/recruit?rec=104614"
        );

        assertThat(defaults.domain()).isEqualTo("kakaobank.com");
        assertThat(defaults.companyType()).isEqualTo("대기업");
        assertThat(defaults.size()).isEqualTo("대기업");
        assertThat(defaults.industry()).isEqualTo("금융");
    }

    @Test
    void resolvesMattermostCompaniesWithJobBoardUrlsToOfficialDomains() {
        assertThat(CompanyDetailDefaults.resolve("업스테이지", "https://www.wanted.co.kr/wd/313220").domain())
            .isEqualTo("upstage.ai");
        assertThat(CompanyDetailDefaults.resolve("채널코퍼레이션", "https://www.wanted.co.kr/wd/324638").domain())
            .isEqualTo("channel.io");
        assertThat(CompanyDetailDefaults.resolve("넛지헬스케어", "https://www.wanted.co.kr/wd/85836").domain())
            .isEqualTo("cashwalk.com");
        assertThat(CompanyDetailDefaults.resolve("펜타시큐리티", "https://www.wanted.co.kr/wd/96948").domain())
            .isEqualTo("pentasecurity.co.kr");
    }

    @Test
    void doesNotUseJobBoardDomainAsCompanyHomepageForUnknownCompany() {
        CompanyDetailDefaults.CompanyDefaults defaults = CompanyDetailDefaults.resolve(
            "알수없는회사",
            "https://www.jasoseol.com/recruit/123"
        );

        assertThat(defaults.domain()).isEqualTo(CompanyDetailDefaults.UNKNOWN_DOMAIN);
        assertThat(defaults.companyType()).isEqualTo(CompanyDetailDefaults.UNKNOWN_KO);
        assertThat(defaults.size()).isEqualTo(CompanyDetailDefaults.UNKNOWN_KO);
        assertThat(defaults.industry()).isEqualTo(CompanyDetailDefaults.UNKNOWN_KO);
    }

    @Test
    void keepsCompanyOwnedCareerDomainWhenItIsNotAJobBoard() {
        CompanyDetailDefaults.CompanyDefaults defaults = CompanyDetailDefaults.resolve(
            "Example Labs",
            "https://careers.example.com/jobs/backend"
        );

        assertThat(defaults.domain()).isEqualTo("careers.example.com");
    }
}
