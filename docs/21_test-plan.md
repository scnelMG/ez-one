# 21. 테스트 계획서

기준 원본: Notion `21. 테스트 계획서 / 결과서`

현재 개발 전 단계에서는 테스트 계획만 확정한다. 실제 실행 결과는 구현 후 같은 문서에 별도 결과 섹션으로 추가한다.

## P1 테스트

| ID | 영역 | 케이스 | 기대 결과 |
| --- | --- | --- | --- |
| TC-AUTH-001 | Auth | Google 로그인 성공 | JWT 발급 |
| TC-AUTH-002 | Auth | 미인증 요청 | 401 공통 오류 |
| TC-AUTH-003 | Auth | 다른 사용자 데이터 접근 | 403 공통 오류 |
| TC-AUTH-004 | Auth | refresh token 재발급 | 새 access token 발급 |
| TC-AUTH-005 | Auth | logout 후 refresh 재사용 | token revoke로 재발급 거부 |
| TC-ONB-001 | Onboarding | 온보딩 저장 | 프로필 저장 |
| TC-ONB-002 | Onboarding | 온보딩 건너뛰기 | 빈 editable profile 상태 유지 |
| TC-DASH-001 | Dashboard | 상태 카드 클릭 | 장바구니가 예상 filter/sort로 열린다. |
| TC-JOB-001 | Basket | 공고 저장 | basket job과 workspace 생성 |
| TC-JOB-002 | Basket | 중복 URL 저장 | 기존 공고 경로 반환 |
| TC-JOB-003 | Basket | 마감 경과 미완료 공고 | `NOT_APPLIED`로 전환 |
| TC-EXT-001 | Extension | 지원 사이트 공고 저장 | 공고 저장과 workspace 생성 |
| TC-EXT-002 | Extension | 추출 실패 | 오류/수동 보완 안내, 잘못된 저장 없음 |
| TC-REC-001 | Recommendation | 추천 공고 별표 저장 | 장바구니 저장, 중복 처리 |
| TC-PROFILE-001 | Document Profile | 표준 섹션 저장 | 사용자별 데이터 저장 |
| TC-PROFILE-CUSTOM-001 | Document Profile | 커스텀 항목 추가 | 재사용 가능한 항목 생성 |
| TC-WS-001 | Workspace | 워크스페이스 열기 | 상단 지원 정보와 작성 데이터 조회 |
| TC-WS-002 | Workspace | 자동 저장 | debounce 후 최신 draft 저장 |
| TC-WS-003 | Workspace | 텍스트/이미지 도화지 | payload 유지 |
| TC-WS-004 | Workspace | 버전 생성/비교 | 두 버전 비교 결과 반환 |
| TC-REF-001 | References | 참고자료 생성 | 필수값 검증 후 저장 |
| TC-REF-002 | References | 전체 페이지/사이드 패널 열기 | 소유한 참고자료 내용 반환 |
| TC-NOTION-001 | Notion | Notion 연결 | 연결 계정 저장 |
| TC-NOTION-002 | Notion | 만료/실패 연결 | 경고/로그 기록, core save 유지 |
| TC-NOTION-JOB-001 | Notion | job-only sync enabled 상태에서 공고 저장 | posting sync log 생성, essay/canvas 미동기화 |

## P2 예약 테스트

| ID | 영역 | 케이스 |
| --- | --- | --- |
| TC-ALERT-P2 | Alert | 알림 채널 |
| TC-HISTORY-P2 | Past History | 기간별 통계/공고 |
| TC-CALENDAR-P2 | Basket Calendar | 마감 캘린더/주간 일정 |
| TC-SUPPORT-P2 | Support | 고객지원/문의/약관 |
| TC-REC-P2 | Recommendation | hover 기업 정보 |
| TC-MM-P2 | Mattermost | raw 저장과 후보 공고 승인 |
| TC-REF-AUTO-P2 | References | 자동 JD/news/DART/인재상 수집 |
| TC-EXT-DOC-P2 | Extension | 서류 자동 입력 보조 |
| TC-NOTION-SCOPE-P2 | Notion | job+essay, job+essay+canvas 동기화 |

## 검증 규칙

- 모든 P1 요구사항은 화면, API, DB, 테스트 연결을 가진다.
- P2 기능은 P1 필수 테스트처럼 보이지 않도록 분리한다.
- 권한, token refresh/revoke, 중복, 외부 연동 실패, 마감 경과 상태는 대표 실패 케이스로 테스트한다.
