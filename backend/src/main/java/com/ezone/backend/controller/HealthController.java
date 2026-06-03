package com.ezone.backend.controller;

import com.ezone.backend.dto.HealthResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {

    @GetMapping("/api/health")
    HealthResponse health() {
        return new HealthResponse("ok", "ez-one-backend");
    }
}
