# 32. AUTH-001 Google 로그인 API 계약

이 문서는 `AUTH-001` 구현 전에 프론트엔드와 백엔드가 합의할 API 계약을 정의한다.

관련 추적:

- 요구사항: `AUTH-001`
- 테스트: `TC-AUTH-001`, `TC-AUTH-002`, `TC-AUTH-003`, `TC-AUTH-004`, `TC-AUTH-005`
- 화면: `/login`
- 공통 응답 형식: `docs/13_api-spec.md`

## 범위

P1에서 활성화할 동작:

- Google OAuth 결과를 서버에 전달해 EZ One 사용자 세션을 만든다.
- 로그인 성공 시 access token과 refresh token을 발급한다.
- refresh token으로 access token을 재발급한다.
- logout 시 refresh token을 폐기한다.
- `GET /api/me`로 현재 로그인 사용자를 조회한다.
- `PATCH /api/me`로 서비스 표시용 닉네임을 수정한다.

P1에서 활성화하지 않는 동작:

- 이메일/비밀번호 로그인
- 비밀번호 변경/재설정
- 관리자 권한 관리
- 소셜 계정 다중 연결

## 공통 규칙

- 모든 응답은 `success`, `data`, `error` 형태를 사용한다.
- 컨트롤러는 DB row나 내부 모델을 직접 반환하지 않고 DTO만 반환한다.
- refresh token은 서버에서 폐기 가능해야 한다.
- 인증이 필요한 API는 access token이 없거나 유효하지 않으면 `401 UNAUTHORIZED`를 반환한다.
- 다른 사용자의 데이터 접근은 `403 FORBIDDEN`을 반환한다.

## `POST /api/auth/google`

Google OAuth 인증 결과로 로그인하거나 사용자를 생성한다.

### 요청

```json
{
  "authorizationCode": "google-oauth-code",
  "redirectUri": "http://localhost:5173/login/callback"
}
```

### 요청 DTO

```text
GoogleLoginRequest
- authorizationCode: string, required
- redirectUri: string, required
```

### 성공 응답

```json
{
  "success": true,
  "data": {
    "accessToken": "access-token",
    "refreshToken": "refresh-token",
    "tokenType": "Bearer",
    "expiresIn": 3600,
    "user": {
      "id": 1,
      "email": "user@example.com",
      "name": "홍길동",
      "nickname": "홍길동",
      "profileCompleted": false
    }
  },
  "error": null
}
```

### 응답 DTO

```text
AuthTokenResponse
- accessToken: string
- refreshToken: string
- tokenType: "Bearer"
- expiresIn: number
- user: CurrentUserResponse

CurrentUserResponse
- id: number
- email: string
- name: string
- nickname: string
- profileCompleted: boolean
```

### 오류

| HTTP | code | 조건 |
| --- | --- | --- |
| 400 | `INVALID_REQUEST` | `authorizationCode` 또는 `redirectUri` 누락 |
| 401 | `OAUTH_FAILED` | Google OAuth 코드 검증 실패, 만료, 거부 |
| 500 | `EXTERNAL_AUTH_ERROR` | Google API 장애 또는 통신 실패 |

## `POST /api/auth/refresh`

refresh token으로 access token을 재발급한다.

### 요청

```json
{
  "refreshToken": "refresh-token"
}
```

### 요청 DTO

```text
RefreshTokenRequest
- refreshToken: string, required
```

### 성공 응답

```json
{
  "success": true,
  "data": {
    "accessToken": "new-access-token",
    "refreshToken": "new-refresh-token",
    "tokenType": "Bearer",
    "expiresIn": 3600
  },
  "error": null
}
```

### 응답 DTO

```text
RefreshTokenResponse
- accessToken: string
- refreshToken: string
- tokenType: "Bearer"
- expiresIn: number
```

### 오류

| HTTP | code | 조건 |
| --- | --- | --- |
| 400 | `INVALID_REQUEST` | refresh token 누락 |
| 401 | `INVALID_REFRESH_TOKEN` | 만료, 폐기, 위조, 존재하지 않는 refresh token |

## `POST /api/auth/logout`

refresh token을 폐기한다.

### 요청

```json
{
  "refreshToken": "refresh-token"
}
```

### 요청 DTO

```text
LogoutRequest
- refreshToken: string, required
```

### 성공 응답

```json
{
  "success": true,
  "data": {
    "revoked": true
  },
  "error": null
}
```

### 오류

| HTTP | code | 조건 |
| --- | --- | --- |
| 400 | `INVALID_REQUEST` | refresh token 누락 |
| 401 | `INVALID_REFRESH_TOKEN` | 이미 폐기됐거나 유효하지 않은 refresh token |

## `GET /api/me`

현재 access token의 사용자 정보를 조회한다.

### 인증

```text
Authorization: Bearer <access-token>
```

### 성공 응답

```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "user@example.com",
    "name": "홍길동",
    "nickname": "홍길동",
    "profileCompleted": false
  },
  "error": null
}
```

### 오류

| HTTP | code | 조건 |
| --- | --- | --- |
| 401 | `UNAUTHORIZED` | access token 없음, 만료, 위조 |

## `PATCH /api/me`

현재 로그인 사용자의 서비스 닉네임을 수정한다. Google 계정 원본 이름은 `name`으로 유지하고, 화면 표시용 이름은 `nickname`을 우선 사용한다.

### 인증

```text
Authorization: Bearer <access-token>
```

### 요청

```json
{
  "nickname": "길동"
}
```

### 요청 DTO

```text
UpdateCurrentUserRequest
- nickname: string, required, max 50
```

### 성공 응답

```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "user@example.com",
    "name": "Hong Gil Dong",
    "nickname": "길동",
    "profileCompleted": true
  },
  "error": null
}
```

### 오류

| HTTP | code | 조건 |
| --- | --- | --- |
| 400 | `INVALID_REQUEST` | nickname 누락, 공백, 길이 초과 |
| 401 | `UNAUTHORIZED` | access token 없음, 만료, 위조 |

## 프론트엔드 상태 계약

프론트엔드는 다음 상태를 구분한다.

| 상태 | 기준 | 화면 처리 |
| --- | --- | --- |
| 미인증 | access token 없음 | `/login`으로 이동 |
| 인증됨 | access token 유효 | 원래 요청 화면 유지 |
| access token 만료 | refresh token 있음 | refresh 후 재시도 |
| refresh 실패 | refresh token 만료/폐기 | 토큰 삭제 후 `/login` 이동 |
| 온보딩 미완료 | `profileCompleted=false` | `/onboarding` 이동 |

## 테스트 기준

| 테스트 ID | 확인 |
| --- | --- |
| `TC-AUTH-001` | Google 로그인 성공 시 access/refresh token과 사용자 DTO 반환 |
| `TC-AUTH-002` | 인증 없는 요청은 `401 UNAUTHORIZED` |
| `TC-AUTH-003` | 다른 사용자 데이터 접근은 `403 FORBIDDEN` |
| `TC-AUTH-004` | refresh token으로 새 access token 발급 |
| `TC-AUTH-005` | logout 후 같은 refresh token 재사용 거부 |
| `TC-AUTH-006` | 마이페이지 닉네임 수정 후 현재 사용자 DTO와 프론트 세션 갱신 |
