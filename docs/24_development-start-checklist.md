# 24. 개발 착수 체크리스트

기준 원본: Notion `24. 개발 착수 체크리스트`

## 준비 상태

| 항목 | 상태 | 확인 기준 |
| --- | --- | --- |
| 요구사항 | Ready | P1/P2/P3 범위가 요구사항 정의서에 고정됨 |
| 우선순위 | Ready | Must/Should/Could 구분 완료 |
| 정책 | Ready | 상태값, 자동 저장, Notion, 외부 실패 처리 기준 정리 |
| 화면설계 | Ready | IA와 문서용 와이어프레임 기준 정리 |
| 유즈케이스 | Ready | MVP 유즈케이스와 다이어그램 정리 |
| 기능 명세 | Ready | P1 입력/처리/출력/예외 정리 |
| ERD | Ready | P1 데이터 모델과 enum 기준 정리 |
| API | Ready | P1 API 계약과 공통 응답 정리 |
| 테스트 | Ready | P1 필수 테스트와 P2 예약 테스트 분리 |
| 추적표 | Ready | P1 요구사항과 화면/API/DB/테스트 연결 정리 |

## 개발 전 확인

- 구현하려는 기능의 요구사항 ID를 확인한다.
- API/DB 변경이 있으면 API 명세서와 ERD를 함께 갱신한다.
- 화면 변경이 있으면 화면설계서와 와이어프레임 이미지를 함께 갱신한다.
- 테스트는 정상 케이스와 대표 실패 케이스를 포함한다.
- 외부 연동 실패가 core save를 롤백하지 않는지 확인한다.
- 실제 `.env` 값, 토큰, 개인정보는 문서/코드/로그에 남기지 않는다.

## 현재 제외

구현 결과, 테스트 실행 결과, 트러블슈팅, 회고는 개발 후 작성한다.
## 2026-06-04 개발 진행 상태

현재 `main`에는 초기 스캐폴드, 협업 규칙 문서, AUTH-001 Google 로그인 구현, 한국어 프론트 route shell이 반영되어 있다.

### 완료

| 항목 | 상태 | 근거 |
| --- | --- | --- |
| 프로젝트 스캐폴드 | 완료 | `backend`, `frontend`, `extension`, `docs`, `infra` 기본 구조 생성 |
| 에이전트 협업 규칙 | 완료 | `docs/30_team-collaboration-workflow.md`, `docs/31_agent-workflow.md` |
| AUTH-001 Google 로그인 | 완료 | `POST /api/auth/google`, JWT 발급, refresh token hash 저장, README/Notion 기록 |
| 프론트 route shell | 완료 | `/login`, `/onboarding`, `/`, `/basket`, `/workspaces/:workspaceId`, `/document-profile`, `/recommendations`, `/mypage`, `/mypage/notion` |
| P2 route 비활성 경계 | 완료 | `/history`, `/alerts`, `/basket/calendar`, `/mypage/support` 미등록 테스트 추가 |

### 검증

| 명령 | 결과 |
| --- | --- |
| `cd frontend && npm run test` | 통과: 3 files, 4 tests |
| `cd frontend && npm run build` | 통과 |
| `rg "path: '/history'|path: '/alerts'|path: '/basket/calendar'|path: '/mypage/support'" frontend/src` | 결과 없음 |
| `rg "�|怨|吏|異|\\?쒕|\\?몄|\\?⑤|\\?" frontend/src` | 결과 없음 |

### 다음 작업 후보

다음 P1 구현은 `DEV-ONB-001`을 추천한다. 이유는 실제 Google 로그인 이후 첫 사용자 흐름이 온보딩이고, 추천공고/마이페이지/워크스페이스 기본값이 모두 프로필 데이터를 기준으로 이어지기 때문이다.

시작 전 계약:

- 요구사항: `ONB-001`, `ONB-002`, `AUTH-013`, `AUTH-014`, `MY-002`, `MY-003`
- API: `GET /api/me/profile`, `PUT /api/me/profile`
- DB: `user_profiles`
- 테스트 우선순위: 프로필 조회 empty/default, 저장 validation, 사용자 ownership, 프론트 API client/store 상태
