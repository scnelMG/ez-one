# 25. 개발 전 합의사항

Source of truth: Notion `25. 개발 전 합의사항`

구현 전에 고정한 결정만 관리한다. 이 문서와 `docs/04_requirements.md`가 충돌하면 요구사항 정의서를 우선한다.

## 합의사항

| 영역 | 결정 | 우선순위 |
| --- | --- | --- |
| 기준 문서 | P1/P2 충돌 시 `04. 요구사항 정의서`를 우선한다. | P1 |
| 핵심 흐름 | 공고 저장 -> 장바구니 -> 워크스페이스 -> 참고자료/자소서 작성 -> 서류 입력 정보 재사용 | P1 |
| 공고 저장 | 저장 시 장바구니 row와 워크스페이스를 생성한다. | P1 |
| 확장 프로그램 | P1 공고 저장 지원 사이트는 Jasoseol.com부터 시작한다. | P1 |
| 추천 | P1 추천 저장은 Jasoseol.com 기반 star-to-basket이다. | P1 |
| Mattermost | SSAFY 추천 구조는 유지하되 raw 수집/후보화는 후순위다. | Should/P2 |
| Notion | P1은 공고 저장 시 `JOB_ONLY` 자동 동기화만 검증한다. | P1 |
| 참고자료 | JD/news/DART/인재상은 P1 수동 입력이다. | P1 |
| 자동 저장 | UI dirty 즉시 표시, API 1초 debounce, 최대 5초 forced save를 사용한다. | P1 |
| 지원 상태 | `READY`, `IN_PROGRESS`, `COMPLETED`, `NOT_APPLIED`를 사용한다. | P1 |
| 마감 상태 | 마감 지난 미완료 공고는 `NOT_APPLIED`로 전환한다. | P1 |
| 서류 입력 정보 | 표준 섹션과 커스텀 항목을 함께 제공한다. | P1 |

## 서류 입력 정보 P1 섹션

| Section | Fields |
| --- | --- |
| Basic | 이름, 이메일, 전화번호, 주소, 생년월일, 포트폴리오/GitHub/블로그 URL |
| Education | 학교, 전공, 기간, 졸업 상태, GPA |
| Career | 회사, 역할, 기간, 고용 형태, 담당 업무 |
| Projects | 이름, 역할, 기간, 기술스택, 설명, 링크 |
| Certificates/language | 이름, 발급기관, 점수/등급, 취득일 |
| Awards/activities | 제목, 기관, 일자, 설명 |
| Custom fields | 사용자 정의 label, type, value |

민감한 선택 항목은 지원 사이트가 고정 필드로 요구하지 않는 한 커스텀 항목으로 관리한다.
