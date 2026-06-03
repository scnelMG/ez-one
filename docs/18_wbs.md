# 18. 작업 분해 구조

기준 원본: Notion `18. WBS`

이 문서는 MVP 구현 순서와 작업 분해 기준이다. 세부 일정은 Notion `일정 / Todo 관리` DB에서 관리한다.

## 구현 순서

| 단계 | 작업 | 우선순위 |
| --- | --- | --- |
| 1 | Google 로그인, 사용자 프로필, 온보딩 | Must |
| 2 | 공고 장바구니, 중복 처리, 워크스페이스 자동 생성 | Must |
| 3 | Chrome Extension 공고 추출/미리보기/저장 | Must |
| 4 | 대시보드 요약과 장바구니 필터/정렬 라우팅 | Must |
| 5 | 서류 입력 정보 표준 섹션과 커스텀 항목 | Must |
| 6 | 워크스페이스 상세, 도화지, 자동 저장, 문항 | Must |
| 7 | 자소서 버전 생성/비교 | Must |
| 8 | 참고자료 보드와 JD/news/DART/인재상 수동 입력 | Must |
| 9 | Jasoseol.com 추천 목록과 star-to-basket | Must |
| 10 | Notion `JOB_ONLY` 자동 동기화 | Must |
| 11 | 마이페이지와 프롬프트 저장/복사 | Should |
| 12 | 확장 프로그램 서류 입력 보조 고도화 | Should |
| 13 | Mattermost raw 수집과 추천 후보화 | Should/P2 |
| 14 | 기업 정보 hover/수집, 자동 참고자료 수집, 과거 지원 통계 | Could/P2 |

## 핵심 작업

| ID | 작업 | 산출물 |
| --- | --- | --- |
| DEV-BASE-001 | 프로젝트 스캐폴딩과 로컬 실행 기준 확정 | backend/frontend/extension 기본 실행 |
| DEV-AUTH-001 | Google 로그인 구현 | Auth API/UI/test |
| DEV-ONB-001 | 온보딩 저장/건너뛰기 | Profile API/UI/test |
| DEV-JOB-001 | 장바구니 저장/중복 처리 | Basket API/DB/test |
| DEV-JOB-002 | 워크스페이스 자동 생성 | Workspace 생성 로직/test |
| DEV-EXT-001 | 확장 프로그램 공고 preview/save | Extension API/Popup/Content script |
| DEV-DASH-001 | 대시보드 요약/라우팅 | Summary API/UI/test |
| DEV-PROFILE-001 | 서류 입력 정보 표준 섹션 | API/UI/DB/test |
| DEV-PROFILE-CUSTOM-001 | 커스텀 항목 CRUD | API/UI/DB/test |
| DEV-WS-001 | 워크스페이스 상세 | 지원/기업/초안/참고자료 payload |
| DEV-WS-002 | 도화지 자동 저장 | Draft API/UI/test |
| DEV-WS-003 | 자소서 버전관리 | Version CRUD/compare/test |
| DEV-REF-001 | 참고자료 수동 입력 | Reference API/UI/test |
| DEV-REC-001 | 추천 공고 저장 | Recommendation save/test |
| DEV-NOTION-001 | `JOB_ONLY` Notion sync | Sync setting/log/test |
| DEV-QA-001 | P1 통합 테스트와 문서 동기화 | regression result, updated docs |

## 보류 작업

| ID | 작업 | 보류 사유 |
| --- | --- | --- |
| DEV-MYPAGE-001 | 마이페이지와 프롬프트 저장/복사 | P1 핵심 흐름 완료 후 범위 확정 |
| DEV-EXT-002 | 확장 프로그램 서류 입력 보조 고도화 | 공고 저장 안정화 이후 |
| DEV-MM-001 | Mattermost raw 수집과 후보화 | Should/P2 |
| DEV-P2-001 | 기업 정보 hover/자동 참고자료/과거 지원 통계 | P2/P3 |
## 2026-06-04 진행 기록

### 완료된 개발 단위

| ID | 작업 | 상태 | 비고 |
| --- | --- | --- | --- |
| DEV-BASE-001 | 프로젝트 스캐폴드와 로컬 실행 기준 | 완료 | `main` 반영 |
| DEV-AUTH-001 | Google 로그인 구현 | 완료 | `AUTH-001`, token 발급, refresh token hash 저장 |
| DEV-FE-SHELL-001 | 한국어 프론트 route shell | 완료 | P1 route shell 완성, P2 route 미활성 |

### 다음으로 진행할 작업

| 우선순위 | ID | 작업 | 이유 |
| --- | --- | --- | --- |
| 1 | DEV-ONB-001 | 온보딩 프로필 저장/건너뛰기 | 로그인 직후 P1 흐름이며 추천공고/마이페이지/워크스페이스 기본값의 기반 |
| 2 | DEV-JOB-001 | 공고함 저장/중복 처리 | P1 핵심 루프의 공고 저장 진입점 |
| 3 | DEV-JOB-002 | 저장 공고별 워크스페이스 자동 생성 | 공고 저장 이후 자기소개서/참고자료 작업으로 이어지는 연결부 |

DEV-ONB-001 시작 기준:

- 요구사항 ID: `ONB-001`, `ONB-002`, `AUTH-013`, `AUTH-014`, `MY-002`, `MY-003`
- API 계약: `GET /api/me/profile`, `PUT /api/me/profile`
- DB: `user_profiles`
- 프론트 범위: `/onboarding`, `/mypage`의 프로필 입력 모델 공유
- TDD 시작점: backend service/controller test, frontend profile API client/store test
