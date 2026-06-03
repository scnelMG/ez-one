# EZ One

EZ One은 취업 준비자를 위한 채용 공고 기반 지원 준비 워크스페이스 서비스입니다. 사용자는 채용 공고를 저장하고, 바구니에서 관리하며, 공고별 워크스페이스에서 자기소개서를 작성하고 참고자료와 서류 입력 정보를 재사용할 수 있습니다.

## 현재 상태

이 저장소는 개발 착수 전 스캐폴딩 단계입니다. P1 구현을 위한 기획 문서는 준비되어 있으며, 다음 단계는 앱 스캐폴딩입니다.

## 제품 범위

P1은 핵심 지원 준비 흐름에 집중합니다.

```text
Google login -> onboarding -> main -> job save -> basket -> workspace -> essay/reference/document profile -> Notion JOB_ONLY sync
```

다음 P2 및 IA-only 항목은 의도적으로 보류합니다.

- Mattermost 추천 공고 수집
- 과거 지원 통계
- 캘린더/주간 마감일 보기
- 독립 알림 채널
- JD/news/DART/인재상 자동 수집
- 확장 프로그램의 서류 입력 자동화
- 고객 지원 화면
- AI/chatbot 기능

## 기술 스택

| 영역 | 스택 |
| --- | --- |
| Backend | Spring Boot, Spring MVC, Spring Security, JWT, MyBatis |
| Frontend | Vue 3, Vite, Vue Router, Pinia, Axios |
| Extension | Chrome Extension |
| Database | MySQL |
| External | Google OAuth2, Notion API |
| Deploy | AWS EC2 |

## 모노레포 구조

| 경로 | 목적 |
| --- | --- |
| `backend/` | Spring Boot REST API, 인증/인가, DB, 외부 연동 |
| `frontend/` | Vue 3 웹 앱, 라우트, 페이지, 스토어, API 클라이언트 |
| `extension/` | Chrome Extension 팝업, 공고 추출, 미리보기, 저장 |
| `docs/` | Notion에서 복사하거나 요약한 구현용 Markdown 문서 |
| `infra/` | 배포, 환경, 데이터베이스 설정, 운영 스크립트 |
| `.github/` | Pull request 템플릿과 CI 설정 |

## 먼저 읽을 문서

| 목적 | 문서 |
| --- | --- |
| 제품 이해 | [docs/04_requirements.md](./docs/04_requirements.md) |
| 프론트엔드 구조 시작 | [docs/09_screen-design.md](./docs/09_screen-design.md) |
| 백엔드 API 구현 | [docs/13_api-spec.md](./docs/13_api-spec.md), [docs/10_feature-spec.md](./docs/10_feature-spec.md) |
| DB/마이그레이션 구현 | [docs/12_erd.md](./docs/12_erd.md) |
| 작업 순서 계획 | [docs/18_wbs.md](./docs/18_wbs.md) |
| P1 커버리지 확인 | [docs/23_traceability.md](./docs/23_traceability.md), [docs/21_test-plan.md](./docs/21_test-plan.md) |
| Codex/AI 에이전트 사용 | [AGENTS.md](./AGENTS.md) |
| 코드 기여 | [CONTRIBUTING.md](./CONTRIBUTING.md) |

## 로컬 설정

아직 앱 스캐폴딩은 확정되지 않았습니다. 스캐폴딩 후 각 앱은 자체 README에 설치, 실행, 테스트 명령을 유지해야 합니다.

예상 파일:

```text
backend/.env.example
frontend/.env.example
extension/.env.example
```

예상 포트:

| 앱 | 포트 |
| --- | --- |
| Backend | `8080` |
| Frontend | `5173` |
| MySQL | `3306` |

스캐폴딩 후 정의할 명령 그룹:

| 앱 | 정의할 명령 |
| --- | --- |
| Backend | build, test, run |
| Frontend | install, dev, build, test |
| Extension | install, build, package |

## 개발 규칙

- P1/P2/P3 범위 충돌은 [docs/04_requirements.md](./docs/04_requirements.md)를 기준으로 판단합니다.
- API 계약 변경은 [docs/13_api-spec.md](./docs/13_api-spec.md)에 반영해야 합니다.
- DB 스키마 또는 enum 변경은 [docs/12_erd.md](./docs/12_erd.md)에 반영해야 합니다.
- 사용자에게 보이는 화면, 라우트, 컴포넌트, 스토어 동작 변경은 [docs/09_screen-design.md](./docs/09_screen-design.md)에 반영해야 합니다.
- 요구사항 연결 변경은 [docs/23_traceability.md](./docs/23_traceability.md)에 반영해야 합니다.
- 테스트 기준 변경은 [docs/21_test-plan.md](./docs/21_test-plan.md)에 반영해야 합니다.
- 비밀값은 커밋하지 않습니다.

## 권장 개발 순서

1. `backend`, `frontend`, `extension`을 스캐폴딩합니다.
2. `.env.example` 파일과 앱별 README를 추가합니다.
3. `AUTH-001`, `ONB-001`, `ONB-002`를 구현합니다.
4. 첫 번째 vertical slice를 구현합니다: 로그인, 온보딩, 메인, 공고 저장, 워크스페이스 자동 생성.
5. P1 작성 루프를 완성합니다: canvas, autosave, versions, references, document profile defaults.
6. P1 외부 연동을 완성합니다: Extension job save와 Notion `JOB_ONLY` sync.
7. 추적성, 테스트, 제품 가치를 기준으로 P2 진입 여부를 재검토합니다.

## 문서 색인

| 문서 | 목적 |
| --- | --- |
| [00. 용어사전](./docs/00_glossary.md) | 도메인 용어 |
| [04. 요구사항](./docs/04_requirements.md) | P1/P2/P3 범위의 기준 문서 |
| [05. 기능 우선순위](./docs/05_feature-priority.md) | Must/Should/Could 범위 |
| [06. 정책](./docs/06_policies.md) | 인증, 소유권, 외부 실패, Notion 정책 |
| [07. 유즈케이스 명세](./docs/07_use-case-specifications.md) | MVP 유스케이스 흐름 |
| [08. 사용자 흐름](./docs/08_user-flow.md) | 전체 제품 사용자 흐름과 IA |
| [09. 화면설계](./docs/09_screen-design.md) | 프론트엔드 라우트/페이지/컴포넌트/스토어 매핑 |
| [10. 기능 명세](./docs/10_feature-spec.md) | 기능 입력/처리/출력/실패 규칙 |
| [12. ERD](./docs/12_erd.md) | 데이터베이스 설계 |
| [13. API 명세](./docs/13_api-spec.md) | API 계약 |
| [16. 시스템 아키텍처](./docs/16_system-architecture.md) | 시스템 경계 |
| [17. 기술 스택](./docs/17_tech-stack-and-local-development.md) | 기술 스택과 로컬 개발 기준 |
| [18. 작업 분해 구조](./docs/18_wbs.md) | 작업 분해 |
| [20. Codex 작업 지시서](./docs/20_codex-instructions.md) | 에이전트 구현 가이드 |
| [21. 테스트 계획](./docs/21_test-plan.md) | P1 테스트 기준 |
| [23. 요구사항 추적표](./docs/23_traceability.md) | 요구사항-API-DB-화면-테스트 연결 |
| [24. 개발 착수 체크리스트](./docs/24_development-start-checklist.md) | 개발 착수 체크리스트 |
| [25. 개발 전 합의사항](./docs/25_pre-development-agreements.md) | 개발 전 확정 합의사항 |
| [28. Mattermost 데이터 수집](./docs/28_data-collection-mm.md) | 보류된 Mattermost 수집 범위 |
| [29. 의사결정 기록](./docs/29_decisions.md) | 의사결정 기록 |
