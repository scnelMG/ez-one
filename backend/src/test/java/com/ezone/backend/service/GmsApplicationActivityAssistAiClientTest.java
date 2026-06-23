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
    void promptRanksActivitiesForJobFitAndConstrainsDraftLength() {
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
                {"recommendations":[{"rank":1,"title":"EZ-ONE","fitScore":92,"recruiterView":"직무 관련성이 높습니다.","practitionerView":"구현 경험이 구체적입니다.","appealPoints":["Chrome Extension"],"risks":[],"drafts":[{"label":"글자수 맞춤","text":"직무에 맞춘 경험입니다."}]}]}
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
        String prompt = String.valueOf(captor.getValue().getBody().get("input"));

        assertThat(prompt).contains("Task: rank the candidate activities by job fit first");
        assertThat(prompt).contains("Fit scoring rubric");
        assertThat(prompt).contains("Draft-writing rules");
        assertThat(prompt).contains("Use only facts present in Candidates JSON");
        assertThat(prompt).contains("Each draft.text must be directly pasteable into the detected field");
        assertThat(prompt).contains("Keep each draft.text within 500 char");
        assertThat(prompt).contains("Return JSON only");
        assertThat(prompt).contains("Company: 카카오뱅크");
        assertThat(prompt).contains("Position: 데이터 엔지니어");
    }
}
