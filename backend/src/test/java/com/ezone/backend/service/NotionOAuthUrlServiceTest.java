package com.ezone.backend.service;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class NotionOAuthUrlServiceTest {

    @Test
    void buildsAuthorizationUrlFromServerClientIdWithoutLeakingSecret() {
        NotionOAuthUrlService service = new NotionOAuthUrlService(new NotionProperties(
            "notion-client-id",
            "notion-client-secret",
            "https://api.notion.com/v1/oauth/authorize",
            "https://api.notion.com/v1/oauth/token",
            "https://api.notion.com/v1/pages",
            "https://api.notion.com/v1/databases",
            "2022-06-28",
            null
        ));

        String url = service.buildAuthorizationUrl("http://localhost:5173/mypage/notion", "notion-state");

        assertThat(url).startsWith("https://api.notion.com/v1/oauth/authorize?");
        assertThat(url).contains("client_id=notion-client-id");
        assertThat(url).contains("redirect_uri=http://localhost:5173/mypage/notion");
        assertThat(url).contains("response_type=code");
        assertThat(url).contains("owner=user");
        assertThat(url).contains("state=notion-state");
        assertThat(url).doesNotContain("notion-client-secret");
        assertThat(url).doesNotContain("client_secret");
    }
}
