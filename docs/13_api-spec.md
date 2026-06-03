# 13. API 명세서

기준 원본: Notion `13. API 명세서`

모든 API는 공통 응답 형식을 사용한다. Controller는 DB row/entity를 직접 반환하지 않고 DTO를 반환한다.

## 공통 응답

```json
{
  "success": true,
  "data": {},
  "error": null
}
```

오류 응답은 stable code, message, optional details를 포함한다.

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "FORBIDDEN",
    "message": "접근 권한이 없습니다.",
    "details": {}
  }
}
```

## 인증 / 프로필

| 메서드 | 경로 | 목적 |
| --- | --- | --- |
| POST | `/api/auth/google` | Google OAuth 로그인 |
| POST | `/api/auth/refresh` | refresh token으로 access token 재발급 |
| POST | `/api/auth/logout` | refresh token revoke |
| GET | `/api/me` | 현재 사용자 조회 |
| GET | `/api/me/profile` | 온보딩/마이페이지 프로필 조회 |
| PUT | `/api/me/profile` | 온보딩/마이페이지 프로필 저장 |

## 대시보드 / 장바구니

| 메서드 | 경로 | 목적 |
| --- | --- | --- |
| GET | `/api/dashboard/summary` | 지원 상태 수와 마감 요약 |
| GET | `/api/basket/jobs?status=&sort=` | 장바구니 목록, 상태 필터, 마감 정렬 |
| POST | `/api/basket/jobs` | 공고 저장. 확장/추천/직접 입력 공통 |
| GET | `/api/basket/jobs/{basketJobId}` | 저장 공고 상세 |
| PATCH | `/api/basket/jobs/{basketJobId}/status` | 지원 상태 변경 |
| DELETE | `/api/basket/jobs/{basketJobId}` | soft delete/archive |

장바구니와 대시보드 조회는 마감 경과 normalization을 적용한다. 마감된 미완료 공고는 `NOT_APPLIED`로 처리한다.

## 추천

| 메서드 | 경로 | 목적 |
| --- | --- | --- |
| GET | `/api/recommendations/jobs` | Jasoseol.com 기반 추천 공고 목록 |
| POST | `/api/recommendations/jobs/{recommendationId}/save` | 추천 공고 장바구니 저장 |
| GET | `/api/recommendations/jobs/{recommendationId}/summary` | P2 추천 hover 기업 요약 |

## 서류 입력 정보

| 메서드 | 경로 | 목적 |
| --- | --- | --- |
| GET | `/api/document-profile` | 전체 서류 입력 정보 조회 |
| PUT | `/api/document-profile/sections/{sectionType}` | 표준 섹션 저장 |
| POST | `/api/document-profile/custom-fields` | 커스텀 항목 추가 |
| PATCH | `/api/document-profile/custom-fields/{fieldId}` | 커스텀 항목 수정 |
| DELETE | `/api/document-profile/custom-fields/{fieldId}` | 커스텀 항목 삭제 |

## 워크스페이스

| 메서드 | 경로 | 목적 |
| --- | --- | --- |
| GET | `/api/workspaces/{workspaceId}` | 워크스페이스 상세 |
| GET | `/api/workspaces/{workspaceId}/defaults` | 서류 입력 정보 기반 기본값 |
| POST | `/api/workspaces/{workspaceId}/questions` | 자소서 문항 추가 |
| PATCH | `/api/workspaces/{workspaceId}/drafts/{draftId}` | 도화지/초안 자동 저장 |
| POST | `/api/workspaces/{workspaceId}/versions` | 자소서 버전 생성 |
| GET | `/api/workspaces/{workspaceId}/versions` | 버전 목록 |
| POST | `/api/workspaces/{workspaceId}/versions/compare` | 두 버전 비교 |

## 참고자료

| 메서드 | 경로 | 목적 |
| --- | --- | --- |
| GET | `/api/workspaces/{workspaceId}/references` | 참고자료 목록 |
| POST | `/api/workspaces/{workspaceId}/references` | 참고자료 생성 |
| GET | `/api/references/{referenceId}` | 전체 페이지 참고자료 조회 |
| GET | `/api/references/{referenceId}/side-panel` | 사이드 패널 참고자료 조회 |
| PATCH | `/api/references/{referenceId}` | 참고자료 수정 |
| DELETE | `/api/references/{referenceId}` | 참고자료 삭제 |

생성 시 `boardName`, `referenceType`, `title`은 필수다. `body`, `imagePayload`, `url` 중 하나 이상을 포함해야 한다.

## Notion

| 메서드 | 경로 | 목적 |
| --- | --- | --- |
| GET | `/api/integrations/notion` | 연결 상태와 계정 정보 조회 |
| POST | `/api/integrations/notion/connect` | Notion OAuth 연결 시작/완료 |
| DELETE | `/api/integrations/notion` | Notion 연결 해제 |
| PUT | `/api/integrations/notion/sync-settings` | 자동 동기화 설정 저장. P1 scope는 `JOB_ONLY` |
| GET | `/api/integrations/notion/sync-logs` | 동기화 이력/실패 로그 조회 |

## Chrome Extension

| 메서드 | 경로 | 목적 |
| --- | --- | --- |
| POST | `/api/extension/jobs/preview` | 현재 페이지 공고 추출 미리보기 |
| POST | `/api/extension/jobs/save` | 추출 공고 장바구니 저장 |

## P2 / 예약 API

아래 API는 IA에는 남기지만 P1 구현 계약이 아니다. 구현 시 요구사항, 권한, 테스트를 다시 확정한다.

| 메서드 | 경로 | 목적 |
| --- | --- | --- |
| GET | `/api/extension/document-profile` | 확장 프로그램 서류 자동 입력 보조용 서류 입력 정보 조회 |
| GET | `/api/basket/calendar` | 장바구니 마감 캘린더/주간 일정 |
