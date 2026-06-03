# EZ One Backend

Spring Boot 기반 REST API 애플리케이션이다.

## 역할

- Google OAuth2 로그인 처리
- JWT access token 및 refresh token 세션 처리
- 사용자, 온보딩, 공고함, 워크스페이스, 자기소개서, 서류 입력 정보 API 제공
- Notion 연결 상태와 동기화 로그 관리
- MyBatis 기반 MySQL 영속성 처리
- DB schema 기준은 `../docs/12_erd.md`를 따른다.

## P1 범위

| 요구사항 | 설명 |
| --- | --- |
| `AUTH-001` | Google 로그인으로 서비스 진입 |
| `ONB-001`, `ONB-002` | 온보딩 프로필 저장과 추천 기반 정보 관리 |
| `JOB-001`, `JOB-002` | 공고 저장, 중복 처리, 워크스페이스 자동 생성 |
| `WS-*`, `REF-*` | 워크스페이스, 자기소개서, 참고자료 관리 |
| `PROFILE-001` | 서류 입력 정보 관리 |
| `NOTION-001` | `JOB_ONLY` Notion 동기화 |

## P2 예약 범위

- Mattermost raw message 수집과 후보 공고 처리
- `JOB_ONLY`를 넘어서는 Notion 확장 동기화
- 관리자 기능
- 알림, 과거 지원 이력, 캘린더 독립 기능

## 패키지 기준

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

## 실행 명령

로컬에는 Maven이 필요하다.

```powershell
mvn test
mvn spring-boot:run
```

현재 초기 readiness 확인 API는 `GET /api/health`다.

## AUTH-001 Google 로그인 구현

`POST /api/auth/google`은 Google OAuth code를 받아 EZ One 로그인 세션을 만든다.

구현 흐름:

1. `AuthController`가 `authorizationCode`, `redirectUri`를 받는다.
2. `GoogleOAuthRestClient`가 Google token endpoint에서 code를 교환한다.
3. Google access token으로 userinfo endpoint를 조회한다.
4. `DefaultAuthService`가 Google subject 기준으로 사용자를 조회한다.
5. 사용자가 없으면 `UserAccountMapper`가 `users`에 Google 사용자를 생성한다.
6. `JwtAuthTokenIssuer`가 access token과 refresh token을 발급한다.
7. refresh token 원문은 저장하지 않고 SHA-256 hash만 `user_sessions`에 저장한다.

필수 환경 변수:

```text
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
JWT_ACCESS_SECRET
JWT_REFRESH_SECRET
DB_URL
DB_USERNAME
DB_PASSWORD
```

현재 완료 범위는 Google 로그인 성공 경로다. `POST /api/auth/refresh`, `POST /api/auth/logout`, `GET /api/me`는 다음 AUTH slice에서 구현한다.

## 문서

- API 계약: `../docs/13_api-spec.md`
- DB 계약: `../docs/12_erd.md`
- 기능 동작: `../docs/10_feature-spec.md`
- 테스트 기준: `../docs/21_test-plan.md`
