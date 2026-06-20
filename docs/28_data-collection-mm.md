# 28. Mattermost 데이터 수집

기준 원본: Notion `28. Mattermost 데이터 수집`

Mattermost 수집은 SSAFY 사용자 전용 추천 화면의 활성 데이터 소스로 관리한다. 접근 권한은 `user_profiles.is_ssafy = true`로 제한한다.

## 목적

mm 채널에는 채용공고, 채용 관련 공지, 합격 후기, 일반 공지, 파일-only 메시지가 섞여 있다. 서비스는 원문을 먼저 저장하고, 유효한 채용공고 메시지만 후보 공고로 승격한다.

## 저장 정책

| 정책 | 설명 |
| --- | --- |
| Raw-first | 수집 endpoint가 메시지를 받으면 원문을 `mm_messages`에 먼저 저장한다. |
| Selective promotion | job-like 메시지만 `mm_parsed_job_posts`를 만든다. |
| Admin review | 후보 공고는 관리자 승인 후 추천 후보 또는 공고로 반영한다. |
| Non-job retention | 합격 후기와 일반 공지는 raw로 보존하되 후보 공고에서는 제외한다. |
| Attachment handling | 파일-only 메시지는 첨부 처리 전까지 pending 상태로 둔다. |

## 시각 기준

- `mm_messages.posted_at`은 Mattermost 원본 게시 시각이다. webhook payload의 `timestamp`, `create_at`, `post_create_at` 또는 백필 원문 날짜/시간에서 채운다.
- `mm_messages.received_at`은 backend가 webhook/backfill 요청을 실제 수신한 시각이다.
- 사용자 추천 UI는 `posted_at`이 있으면 “게시” 시각을 우선 표시하고, 없을 때만 `received_at` 기반 “수집” 시각으로 fallback한다.
- 붙여넣기 백필 원문은 연도를 포함하지 않으므로 `MATTERMOST_BACKFILL_YEAR`를 실제 원문 연도로 설정한 뒤 실행한다. 미설정 시 실행 시점의 현재 연도를 사용한다.

## 회사 정보 보강

- Mattermost 공고가 Wanted, JobKorea, Saramin 등 채용 플랫폼 URL로 들어오면 플랫폼 도메인을 회사 홈페이지로 사용하지 않는다.
- 회사명이 공식 회사 레지스트리 또는 Mattermost 회사 기본값에 있으면 `companyDomain`, `companyType`, favicon 기반 `companyLogoUrl`을 추천 응답에 포함한다.
- 회사 공식 도메인을 확인하지 못한 공고는 임의 도메인을 만들지 않고 원문 공고 URL만 유지한다.
- 주간 공고 행의 직무명에 `Node.js`, `Next.js` 같은 기술명이 들어 있어도 이를 URL로 저장하지 않고 인접한 실제 채용 URL을 사용한다.

## Webhook 연결

- Mattermost Outgoing Webhook callback URL은 Spring endpoint `/api/integrations/mattermost/webhook` 또는 이를 전달하는 Worker URL로 설정한다.
- 단일 채널 token은 backend `.env`의 `MATTERMOST_WEBHOOK_SECRET`으로 검증한다.
- 채널별 token이 여러 개이면 `MATTERMOST_WEBHOOK_SECRETS=token1,token2`처럼 쉼표로 구분해 설정한다.
- 요청 body `token` 또는 `X-MM-Webhook-Secret` header 값이 설정된 token 중 하나와 일치해야 수집한다.

## 메시지 유형

| 유형 | 의미 | 후보 생성 |
| --- | --- | --- |
| `JOB_POSTING` | 명확한 채용공고 | Yes |
| `JOB_RELATED_NOTICE` | 검토가 필요한 채용 관련 공지 | Maybe |
| `SUCCESS_STORY` | 합격 후기 | No |
| `FILE_ONLY` | 첨부 처리가 필요한 메시지 | Maybe |
| `ANNOUNCEMENT` | 일반 공지 | No |
| `UNKNOWN` | 분류 실패 | Admin review |

## 파싱 상태

| Status | 의미 |
| --- | --- |
| `RAW_SAVED` | 원문 저장 완료 |
| `FILE_PENDING` | 첨부 처리 필요 |
| `PARSED` | 파싱 성공 |
| `NEEDS_REVIEW` | 관리자 검토 필요 |
| `IGNORED` | 후보 공고 생성 제외 |
| `FAILED` | 파싱 실패 |

## 예시 분류

예시 메시지 제목: `[SSAFY 취업성공후기] 5기 4주차 - 프론트엔드 개발자`

| 필드 | 값 |
| --- | --- |
| `message_type` | `SUCCESS_STORY` |
| `parse_status` | `IGNORED` |
| `createdParsedJobPost` | `false` |

## 2026-06-20 활성화된 추천 조회 범위

- Requirement: `MM-001`, `MM-006`, `MM-007`, `MM-008`, `MM-009`, `REC-003`, `REC-004`.
- Mattermost 수집/후보화는 SSAFY 사용자 추천 화면의 활성 데이터 소스로 사용한다. 단, 접근 권한은 계속 `user_profiles.is_ssafy = true`로 제한한다.
- 추천 목록은 승인/저장된 공고만 보여주지 않고, 파싱된 마감 전 후보 전체를 우선 보여준다.
- 목록 조회는 AI를 즉시 호출하지 않는다. 후보별 저장 점수가 있으면 사용하고, 없으면 `PENDING` 또는 `RULE_FALLBACK` 상태로 응답한다.
- 마감 정보는 원문 `deadline_label`과 별도로 `deadline_type`, `deadline_date`, `normalized_deadline_label`에 저장한다.
- UI는 전체 공고를 기본값으로 보여주며 `AI 추천`, `마감 임박` 세그먼트와 `마감 기한순`, `AI 추천 점수순`, `최근 게시순` 정렬을 제공한다.

이 메시지는 `mm_messages`에는 저장하지만 `mm_parsed_job_posts` row를 만들지 않는다.
