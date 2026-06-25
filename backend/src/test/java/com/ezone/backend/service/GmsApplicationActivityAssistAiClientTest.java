package com.ezone.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.ezone.backend.dto.extension.ApplicationActivityAssistRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpEntity;
import org.springframework.web.client.RestTemplate;

class GmsApplicationActivityAssistAiClientTest {

    @Test
    @SuppressWarnings("unchecked")
    void promptRanksActivitiesWithSchemaAndTokenBudget() {
        RestTemplate restTemplate = mock(RestTemplate.class);
        ObjectMapper objectMapper = new ObjectMapper();
        GmsApplicationActivityAssistAiClient client = new GmsApplicationActivityAssistAiClient(
            restTemplate,
            objectMapper,
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
                {"recommendations":[{"rank":1,"title":"EZ-ONE","fitScore":92,"recruiterView":"직무 관련성이 높습니다.","practitionerView":"구현 경험이 구체적입니다.","appealPoints":["Chrome Extension"],"risks":[],"drafts":[{"label":"글자수 맞춤","text":"지원 직무에 맞춘 경험입니다."}]}]}
                """
        ));

        client.recommend(
            new ApplicationActivityAssistRequest(
                "카카오뱅크",
                "데이터 엔지니어",
                2,
                500,
                "char",
                "경험 및 경력기술서",
                List.of("활동명", "상세 내용")
            ),
            List.of(new ApplicationActivityAssistService.ActivityCandidate(
                "프로젝트",
                "EZ-ONE",
                "백엔드 개발",
                "개인",
                "Chrome Extension 자동 입력과 Spring Boot API 연결",
                "반복 입력 시간 단축",
                "Java, Spring Boot, Chrome Extension",
                Map.of()
            )),
            2,
            500,
            "char"
        );

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

        assertThat(body.get("max_output_tokens")).isEqualTo(900);
        assertThat(prompt).contains("한국 IT 채용 담당자이자 실무 리뷰어");
        assertThat(prompt).contains("제공된 후보 JSON의 사실만 사용");
        assertThat(prompt).contains("붙여넣을 수 있는 한국어 문장");
        assertThat(prompt).contains("500 char");
        assertThat(prompt).contains("90%");
        assertThat(prompt).contains("회사명: 카카오뱅크");
        assertThat(prompt).contains("지원 직무: 데이터 엔지니어");
        assertThat(format.get("type")).isEqualTo("json_schema");
        assertThat(format.get("name")).isEqualTo("application_activity_recommendations");
        assertThat(format.get("strict")).isEqualTo(true);
    }
}
