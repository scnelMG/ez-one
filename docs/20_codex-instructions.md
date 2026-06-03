# 20. Codex 작업 지시서

기준 원본: Notion `20. Codex 작업 지시서`

## 작업 전 확인

- 구현하려는 기능의 요구사항 ID와 P1/P2 범위를 `docs/04_requirements.md`에서 확인한다.
- 유즈케이스 기준은 `docs/07_use-case-specifications.md`를 사용한다.
- User Flow는 전체 제품 흐름을 설명한다. P1 구현 범위는 요구사항 정의서와 요구사항 추적표를 우선한다.
- API/DB/화면 변경이 있으면 관련 문서를 함께 갱신한다.
- push, publish, deploy, third-party 변경은 사용자 승인 없이 수행하지 않는다.

## 구현 규칙

- Controller에는 비즈니스 로직을 넣지 않는다.
- API 응답은 공통 응답 형식을 사용하고 DB row/entity를 직접 노출하지 않는다.
- 사용자 소유 데이터는 ownership을 검증한다.
- 외부 연동 실패는 core save 트랜잭션과 분리한다.
- 자동 저장은 최신 draft를 갱신하고, 버전은 명시적 사용자 action으로만 생성한다.
- P1 Notion 동기화는 `JOB_ONLY`다.

## 주요 작업 프롬프트

| 영역 | 지시 |
| --- | --- |
| Auth/Onboarding | Google 로그인, JWT 발급, 프로필 저장/건너뛰기를 구현한다. |
| Basket | URL 중복 처리, workspace 자동 생성, deadline normalization을 구현한다. |
| Workspace | 상단 지원 정보 유지, 도화지/버전/참고자료 하단 패널 전환을 구현한다. |
| References | 자유 메모/커스텀 보드와 JD/news/DART/인재상 수동 입력을 구현한다. |
| Document Profile | 표준 섹션과 커스텀 항목을 구현한다. |
| Extension | Jasoseol.com 공고 preview/save를 우선 구현한다. |
| Notion | 연결 계정 구분, `JOB_ONLY` setting, sync log를 구현한다. |

## 검증

- P1 정상 케이스와 대표 실패 케이스를 테스트한다.
- 권한, 중복, 외부 실패, 마감 경과 상태를 확인한다.
- 구현 완료 후 문서와 코드 기준이 일치하는지 확인한다.
