# 28. Mattermost 데이터 수집

기준 원본: Notion `28. Mattermost 데이터 수집`

Mattermost 수집은 P1 필수 구현 범위가 아니다. SSAFY 추천 고도화를 위한 Should/P2 데이터 소스로만 관리한다.

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

이 메시지는 `mm_messages`에는 저장하지만 `mm_parsed_job_posts` row를 만들지 않는다.
