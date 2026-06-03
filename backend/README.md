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

## AUTH-001 Google 로그인 구현

`POST /api/auth/google`은 Google OAuth code를 받아 EZ One 로그인 세션을 만든다.

구현 흐름:

1. `AuthController`가 `authorizationCode`, `redirectUri`를 받는다.
2. `GoogleOAuthRestClient`가 Google token endpoint에 code를 교환한다.
3. Google access token으로 userinfo endpoint를 조회한다.
4. `DefaultAuthService`가 Google subject 기준으로 사용자를 조회한다.
5. 사용자가 없으면 `UserAccountMapper`가 `users`에 Google 사용자를 생성한다.
6. `JwtAuthTokenIssuer`가 access token과 refresh token을 발급한다.
7. refresh token 원문은 저장하지 않고 SHA-256 hash만 `user_sessions`에 저장한다.

필수 환경변수:

```text
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
JWT_ACCESS_SECRET
JWT_REFRESH_SECRET
DB_URL
DB_USERNAME
DB_PASSWORD
```

현재 완료 범위는 Google 로그인 성공 경로다. `refresh`, `logout`, `GET /api/me`는 다음 AUTH 사이클에서 구현한다.

## Documentation

- API contract: `../docs/13_api-spec.md`
- DB contract: `../docs/12_erd.md`
- Feature behavior: `../docs/10_feature-spec.md`
- Test criteria: `../docs/21_test-plan.md`
