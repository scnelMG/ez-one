package com.ezone.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.ezone.backend.domain.persistence.MattermostParsedJobPostRow;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpEntity;
import org.springframework.web.client.RestTemplate;

class GmsAiJobRecommendationClientTest {

    @Test
    @SuppressWarnings("unchecked")
    void recommendsMattermostJobWithSchemaAndReviewPriorityPrompt() {
        RestTemplate restTemplate = mock(RestTemplate.class);
        GmsAiJobRecommendationClient client = new GmsAiJobRecommendationClient(
            restTemplate,
            new ObjectMapper(),
            "test-key",
            "https://gms.example.test",
            "gpt-test"
        );
        when(restTemplate.postForObject(
            eq("https://gms.example.test/responses"),
            any(HttpEntity.class),
            eq(Map.class)
        )).thenReturn(Map.of(
            "output_text",
            """
                {"score":84,"recommended":true,"reason":"백엔드 직무 키워드와 마감 정보가 명확해 우선 검토할 만합니다.","evidence":["직무명에 Backend 포함","마감 D-5"]}
                """
        ));

        var signal = client.recommend(candidate("카카오", "Backend Engineer", "D-5"));

        ArgumentCaptor<HttpEntity<Map<String, Object>>> captor = ArgumentCaptor.forClass(HttpEntity.class);
        org.mockito.Mockito.verify(restTemplate).postForObject(
            eq("https://gms.example.test/responses"),
            captor.capture(),
            eq(Map.class)
        );
        Map<String, Object> body = captor.getValue().getBody();
        String prompt = String.valueOf(body.get("input"));
        Map<String, Object> text = (Map<String, Object>) body.get("text");
        Map<String, Object> format = (Map<String, Object>) text.get("format");

        assertThat(signal).isPresent();
        assertThat(signal.get().score()).isEqualTo(84);
        assertThat(signal.get().reason()).contains("카카오");
        assertThat(signal.get().reason()).contains("Backend Engineer");
        assertThat(body.get("max_output_tokens")).isEqualTo(220);
        assertThat(prompt).contains("검토 우선순위");
        assertThat(prompt).contains("합격 가능성");
        assertThat(prompt).contains("근거 없는 회사 정보나 채용 가능성은 추정하지 않습니다");
        assertThat(prompt).contains("5점 단위나 10점 단위로 반올림하지 않습니다");
        assertThat(prompt).contains("회사명과 공고 직무명을 reason에 반드시 포함합니다");
        assertThat(prompt).contains("희망 직무와 보유 기술, 지역이 공고와 일부 부합");
        assertThat(prompt).contains("각 공고마다 다른 근거");
        assertThat(format.get("type")).isEqualTo("json_schema");
        assertThat(format.get("name")).isEqualTo("mattermost_job_recommendation");
    }

    @Test
    void customizesGenericMattermostReasonWithCompanyAndJobContext() {
        RestTemplate restTemplate = mock(RestTemplate.class);
        GmsAiJobRecommendationClient client = new GmsAiJobRecommendationClient(
            restTemplate,
            new ObjectMapper(),
            "test-key",
            "https://gms.example.test",
            "gpt-test"
        );
        when(restTemplate.postForObject(any(String.class), any(HttpEntity.class), eq(Map.class)))
            .thenReturn(Map.of(
                "output_text",
                "{\"score\":82,\"recommended\":true,\"reason\":\"희망 직무와 보유 기술, 지역이 공고와 일부 부합하여 검토할 가치가 있습니다.\",\"evidence\":[\"케이뱅크 백엔드 개발\",\"Java/Spring\",\"서울\"]}"
            ));

        var signal = client.recommend(
            candidate("케이뱅크", "백엔드 개발(서울)", "2026.04.24"),
            new UserRecommendationProfile(
                List.of("백엔드"),
                List.of("대기업"),
                List.of("핀테크"),
                List.of("서울"),
                List.of("Java", "Spring"),
                true
            )
        );

        assertThat(signal).isPresent();
        assertThat(signal.get().reason()).contains("케이뱅크");
        assertThat(signal.get().reason()).contains("백엔드 개발");
        assertThat(signal.get().reason()).contains("Java");
        assertThat(signal.get().reason()).doesNotContain("희망 직무와 보유 기술, 지역이 공고와 일부 부합");
    }

    @Test
    void returnsEmptyWhenMattermostAiJsonIsIncomplete() {
        RestTemplate restTemplate = mock(RestTemplate.class);
        GmsAiJobRecommendationClient client = new GmsAiJobRecommendationClient(
            restTemplate,
            new ObjectMapper(),
            "test-key",
            "https://gms.example.test",
            "gpt-test"
        );
        when(restTemplate.postForObject(any(String.class), any(HttpEntity.class), eq(Map.class)))
            .thenReturn(Map.of("output_text", "{\"score\": 91}"));

        assertThat(client.recommend(candidate("라인", "Server Engineer", "D-7"))).isEmpty();
    }

    @Test
    @SuppressWarnings("unchecked")
    void includesOnboardingProfileInMattermostRecommendationPrompt() {
        RestTemplate restTemplate = mock(RestTemplate.class);
        GmsAiJobRecommendationClient client = new GmsAiJobRecommendationClient(
            restTemplate,
            new ObjectMapper(),
            "test-key",
            "https://gms.example.test",
            "gpt-test"
        );
        when(restTemplate.postForObject(any(String.class), any(HttpEntity.class), eq(Map.class)))
            .thenReturn(Map.of("output_text", "{\"score\":88,\"recommended\":true,\"reason\":\"프로필과 공고가 잘 맞습니다.\",\"evidence\":[]}"));

        client.recommend(
            candidate("Line", "Backend Engineer", "D-7"),
            new UserRecommendationProfile(
                List.of("백엔드", "클라우드"),
                List.of("대기업"),
                List.of("IT"),
                List.of("서울"),
                List.of("Java", "Spring"),
                true
            )
        );

        ArgumentCaptor<HttpEntity<Map<String, Object>>> captor = ArgumentCaptor.forClass(HttpEntity.class);
        org.mockito.Mockito.verify(restTemplate).postForObject(any(String.class), captor.capture(), eq(Map.class));
        String prompt = String.valueOf(captor.getValue().getBody().get("input"));
        assertThat(prompt).contains("백엔드");
        assertThat(prompt).contains("Java");
        assertThat(prompt).contains("서울");
        assertThat(prompt).contains("SSAFY");
    }

    private MattermostParsedJobPostRow candidate(String companyName, String title, String deadlineLabel) {
        MattermostParsedJobPostRow row = new MattermostParsedJobPostRow();
        row.setId(10L);
        row.setCompanyName(companyName);
        row.setTitle(title);
        row.setUrl("https://careers.example.com/jobs/10");
        row.setDeadlineLabel(deadlineLabel);
        return row;
    }
}
