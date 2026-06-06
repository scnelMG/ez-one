# 29. 의사결정 기록

이 문서는 EZ-ONE 개발 중 확정한 주요 기술/운영 결정을 기록한다.

## DEC-001: Monorepo 사용

| 항목 | 내용 |
| --- | --- |
| 상태 | 승인됨 |
| 일자 | 2026-05-31 |
| 결정 | `backend`, `frontend`, `extension`, `docs`, `infra`를 한 repository에서 관리한다. |
| 이유 | backend, frontend, extension의 API 계약을 강하게 연결하고 문서와 계약을 한 곳에서 관리하기 위함이다. |

## DEC-002: MyBatis + MySQL 사용

| 항목 | 내용 |
| --- | --- |
| 상태 | 승인됨 |
| 일자 | 2026-05-31 |
| 결정 | 영속성 계층은 MyBatis와 MySQL을 사용한다. |
| 이유 | 현재 학습/프로젝트 범위와 맞고, 승인되지 않은 JPA 도입을 피한다. |

## DEC-003: Refresh Token Hash DB 저장

| 항목 | 내용 |
| --- | --- |
| 상태 | 승인됨 |
| 일자 | 2026-05-31 |
| 결정 | `user_sessions`에 refresh token hash를 저장한다. |
| 이유 | 단일 서버 MVP에 충분하며 Redis를 불필요하게 앞당기지 않는다. |

## DEC-004: mm Raw Message 원본 저장

| 항목 | 내용 |
| --- | --- |
| 상태 | 승인됨 |
| 일자 | 2026-05-31 |
| 결정 | mm 메시지는 원문 저장 후 후보 공고로 선별한다. |
| 이유 | mm에는 다양한 메시지가 섞여 있으므로 parser 오류와 재처리를 고려한다. |

## 보류 중인 결정

| ID | 필요한 결정 | 현재 기준 |
| --- | --- | --- |
| PEND-001 | DB migration tool | 보류. 초기에는 ERD와 SQL 파일 기준으로 시작하고, 첫 배포 전 Flyway 등 도구 도입을 재검토한다. |
| PEND-002 | GitHub repository name | `job-application-workspace` |
| PEND-003 | Repository visibility | Private |
