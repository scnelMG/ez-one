# Backend

Spring Boot REST API application.

## Responsibilities

- Authentication and authorization
- JWT access token and refresh token session handling
- User, onboarding, basket job, workspace, essay, document input information APIs
- Notion connection and sync logs
- MySQL persistence through MyBatis
- DB schema follows `../docs/12_erd.md`; migration tool is pending

## P2 / Reserved Responsibilities

- Mattermost raw message collection and parsed job candidate handling
- Expanded Notion sync beyond `JOB_ONLY`

## Package Guideline

```text
backend/
  src/main/java/.../
    config/
    controller/
    service/
    mapper/
    dto/
    domain/
    exception/
    security/
  src/main/resources/
    mapper/
```

## Commands

Maven is required locally.

```powershell
mvn test
mvn spring-boot:run
```

The initial scaffold exposes `GET /api/health` as a public readiness check.

## Documentation

- API contract: `../docs/13_api-spec.md`
- DB contract: `../docs/12_erd.md`
- Feature behavior: `../docs/10_feature-spec.md`
- Test criteria: `../docs/21_test-plan.md`
