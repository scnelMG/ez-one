# EZ One Backend

Spring Boot 기반의 EZ One REST API 서버입니다.

## 역할

- `AUTH-001`: Google OAuth2 로그인 처리
- `AUTH-006`: JWT access token / refresh token 발급
- `AUTH-013`: Google 계정 이름 기반 사용자 이름과 닉네임 기본값 저장
- `ONB-001`: 최초 로그인 후 온보딩 여부 판단을 위한 `profileCompleted` 관리
- 공고 장바구니, 워크스페이스, 참고자료, 서류 입력 정보, Notion JOB_ONLY 동기화 API 제공
- MyBatis 기반 MySQL 영속성 처리
- Flyway 기반 DB schema 변경 이력 관리

## 실행

환경변수는 `backend/.env`에 둡니다. 실제 `.env` 파일은 커밋하지 않습니다.

```powershell
.\mvnw.cmd test
.\mvnw.cmd spring-boot:run
```

로컬 Windows 환경에서 IPv4 listen 문제가 있으면 `SERVER_ADDRESS=::1`로 실행합니다.

```env
SERVER_ADDRESS=::1
```

헬스체크:

```http
GET /api/health
```

## AUTH-001 Google 로그인 구현

EZ One은 프론트엔드에서 Google OAuth authorization code를 받고, 백엔드가 그 code를 Google에 교환하는 방식으로 로그인합니다.

흐름:

1. 사용자가 프론트 로그인 화면에서 `Google로 시작하기`를 누릅니다.
2. 프론트가 Google OAuth URL을 만들고 `state`를 `sessionStorage`에 저장합니다.
3. Google이 `/login/callback`으로 `code`, `state`를 돌려줍니다.
4. 프론트가 `POST /api/auth/google`로 `authorizationCode`, `redirectUri`를 백엔드에 전달합니다.
5. `GoogleOAuthRestClient`가 Google token endpoint에서 code를 access token으로 교환합니다.
6. Google userinfo endpoint에서 email, name, subject를 조회합니다.
7. `DefaultAuthService`가 Google subject 기준으로 `users`를 조회하거나 생성합니다.
8. `JwtAuthTokenIssuer`가 access token과 refresh token을 발급합니다.
9. refresh token 원문은 저장하지 않고 SHA-256 hash만 `user_sessions.refresh_token_hash`에 저장합니다.
10. 프론트는 access/refresh token과 사용자 DTO를 저장하고 보호 라우트로 이동합니다.

## 왜 이 방식으로 구현했나

- **Authorization Code Flow 사용**: Google client secret을 브라우저에 노출하지 않기 위해 code 교환은 백엔드에서 처리합니다.
- **Google subject 기준 계정 매핑**: email은 사용자가 변경할 수 있으므로, Google의 고유 subject를 `provider_id`로 저장해 같은 사용자를 안정적으로 식별합니다.
- **JWT access token 사용**: 프론트와 백엔드가 분리된 Vue + Spring 구조라 API 요청에 `Authorization: Bearer`를 붙이는 방식이 단순하고 P1 범위에 맞습니다.
- **refresh token hash 저장**: DB 유출 시 refresh token 원문 재사용 위험을 줄이기 위해 원문 대신 SHA-256 hash를 저장합니다.
- **refresh token rotation**: 재발급 시 기존 refresh token을 `revoked_at`으로 폐기하고 새 token을 발급해 탈취 token의 재사용 가능성을 낮춥니다.
- **DB 세션 테이블 사용**: P1에서는 Redis를 추가하지 않고 MySQL의 `user_sessions`로 폐기, 만료, 재발급을 추적합니다. approved stack을 유지하기 위한 선택입니다.
- **Flyway 도입**: `users` 컬럼 추가처럼 동료 로컬 DB에도 같은 변경이 필요하므로 SQL 파일 수동 공유 대신 migration 파일로 schema 변경을 추적합니다.
- **프론트 public callback + 보호 라우트 guard**: `/login/callback`은 OAuth 완료를 위해 공개하고, `/main`, `/basket`, `/workspaces/:id` 등 로그인 필요 화면은 access token 없으면 `/` 로그인 화면으로 보냅니다.

## 구현 중 발생한 이슈와 해결

| 이슈 | 원인 | 해결 |
| --- | --- | --- |
| `/basket` 접근 시 브라우저 기본 로그인 팝업이 뜸 | Spring Security 기본 HTTP Basic/form login이 켜져 있었음 | `SecurityConfig`에서 stateless JWT 구조로 변경하고 `httpBasic`, `formLogin`을 비활성화 |
| 로그인 API가 `Network Error`로 실패 | 프론트 base URL과 백엔드 listen 주소가 맞지 않았고 CORS preflight 처리가 부족했음 | API base URL을 `http://[::1]:8080/api`로 맞추고 CORS/OPTIONS 허용 |
| Google 로그인 후 `403` 응답 | 인증 예외가 공통 API envelope로 매핑되지 않고 Spring Security 레벨에서 막힘 | `/api/auth/google`, `/api/auth/refresh`, `/api/auth/logout`, `/api/health`를 public으로 열고 Google OAuth 실패는 `OAUTH_FAILED`로 반환 |
| 백엔드 HTTP 서버가 IPv4로 뜨지 않음 | 로컬 OS socket 문제로 `127.0.0.1` listen 실패 | 개발 환경에서 `SERVER_ADDRESS=::1` 사용 |
| `users`에 Google name/nickname 저장 실패 | 기존 `users` 테이블에 `name`, `nickname`, `profile_completed` 컬럼이 없었음 | schema와 Flyway migration을 추가하고 로컬 DB에는 `ALTER`로 컬럼 반영 |
| Flyway 자동 실행 실패 | `ezone_dev`에 `CREATE` 권한이 없어 `flyway_schema_history` 테이블을 만들 수 없었음 | 권한 요구사항 문서화. 관리자 계정에서 `GRANT CREATE ON ez_one.*` 필요 |
| MyBatis가 `UserAccount` record 매핑 실패 | record는 setter가 없는데 `@Results` setter 매핑을 사용함 | `@ConstructorArgs` 기반 생성자 매핑으로 변경 |
| 실제 Google 로그인 후 DB row가 안 생김 | 프론트 `LoginPage.vue`, `LoginCallbackPage.vue`의 한글 인코딩/태그가 깨져 백엔드 호출까지 가지 못함 | 두 Vue 파일을 정상 마크업과 문구로 재작성 |
| 실제 token 저장 검증 필요 | 단위 테스트만으로 Google OAuth end-to-end 저장 여부를 확인할 수 없음 | 실제 Google 로그인 후 `users=1`, `user_sessions=1`, refresh hash 길이 64, active/not expired 확인 |

## DB 권한 요구사항

앱 계정 `ezone_dev`는 최소한 다음 권한이 필요합니다.

```sql
GRANT SELECT, INSERT, UPDATE, DELETE, ALTER, CREATE ON ez_one.* TO 'ezone_dev'@'%';
FLUSH PRIVILEGES;
```

권한별 이유:

- `SELECT`, `INSERT`, `UPDATE`, `DELETE`: P1 API 데이터 조회/생성/수정/삭제
- `ALTER`: 기존 테이블에 컬럼을 추가하는 migration 실행
- `CREATE`: Flyway가 `flyway_schema_history` 테이블을 생성

Tailscale로 동료 또는 서버 MySQL에 연결할 수 있지만, Tailscale은 네트워크 경로만 해결합니다. DB 계정 권한은 MySQL에서 별도로 부여해야 합니다.

## 주요 파일

```text
backend/src/main/java/com/ezone/backend/controller/AuthController.java
backend/src/main/java/com/ezone/backend/controller/CurrentUserController.java
backend/src/main/java/com/ezone/backend/service/DefaultAuthService.java
backend/src/main/java/com/ezone/backend/client/GoogleOAuthRestClient.java
backend/src/main/java/com/ezone/backend/security/JwtAuthTokenIssuer.java
backend/src/main/java/com/ezone/backend/mapper/UserAccountMapper.java
backend/src/main/java/com/ezone/backend/mapper/UserSessionMapper.java
backend/src/main/resources/db/migration/
frontend/src/pages/LoginPage.vue
frontend/src/pages/LoginCallbackPage.vue
frontend/src/features/auth/
```

## 검증 기록

실행한 검증:

```powershell
.\mvnw.cmd test
npm run test -- --run LoginPage LoginCallbackPage authApi googleOAuth router
npm run build
```

실제 Google 로그인 검증:

```text
users: 1 row created
user_sessions: 1 row created
refresh_token_hash: 64 characters
session active: true
session not expired: true
```

## 관련 문서

- API 계약: `../docs/13_api-spec.md`, `../docs/32_auth-google-api-contract.md`
- 요구사항: `../docs/04_requirements.md`
- 추적성: `../docs/23_traceability.md`
- ERD: `../docs/12_erd.md`
- 기술 스택: `../docs/17_tech-stack-and-local-development.md`
- 결정 기록: `../docs/29_decisions.md`
