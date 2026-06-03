# Glossary

Source of truth: Notion `00. 용어사전`

This document defines the terms used across requirements, API, ERD, screen design, and tests. Use these terms consistently in code, UI copy, API names, and database comments unless a later architecture decision changes them.

## Product Terms

| Term | Definition | Example | Related docs |
| --- | --- | --- | --- |
| EZ One | Job application workspace service for saving postings and preparing applications. | Service name shown in docs and UI | `docs/02_project_plan.md` |
| 공고 | A job posting managed inside EZ One. It may come from an external page, recommendation, or manual input. | Backend developer posting from Jasoseol.com | `JOB-001`, `jobs` |
| 저장 공고 | A posting saved by the user and managed in the basket. | A starred recommendation saved to the basket | `JOB-001`, `basket_jobs` |
| 공고 장바구니 | The user's preparation queue for saved postings. It shows company, role, deadline, status, and workspace entry. | Basket row for company A/backend role | `DASH-001`, `JOB-001` |
| 지원 워크스페이스 | Posting-specific workspace automatically created when a posting is saved. | Workspace for company A/backend role | `JOB-002`, `WS-001` |
| 도화지 | Workspace writing area for essay drafts, notes, text/image content, character count, and auto-save state. | Essay draft canvas for a posting | `WS-002`, `essay_drafts` |
| 자소서 버전 | Explicit essay version created by the user for comparison or history. | Version 1 and version 2 of the same answer | `WS-004` |
| 참고자료 | Material used while writing, such as JD, news, DART, talent profile, memo, or custom board content. | JD note saved in a workspace | `REF-001` |
| 사이드 패널 | Workspace panel that lets users read saved reference material while writing on the canvas. | Reference panel beside the canvas | `REF-002`, `UC-10` |
| 서류 입력 정보 | User-level reusable application form data. Includes basic info, education, career, projects, certificates/language, awards/activities, and custom fields. | Education and project data reused for application forms | `PROFILE-001` |
| 온보딩 정보 | Initial preference data used for recommendations and personalization. | Preferred role, company type, region, tech stack, SSAFY status | `ONB-001`, `ONB-002` |
| 대시보드 | Main-page summary area that routes users to basket filters or sorting. | Total applications, urgent deadlines, in progress, not applied | `DASH-001` |

## Status Terms

| Term | Definition | Allowed values or rule |
| --- | --- | --- |
| 지원 상태 | Preparation/application state of a saved posting. | `READY`, `IN_PROGRESS`, `COMPLETED`, `NOT_APPLIED` |
| 지원 전 | User has saved the posting but has not started preparation. | Maps to `READY` |
| 진행 중 | User has started workspace or preparation work. | Maps to `IN_PROGRESS` |
| 제출 완료 | User marked the application as submitted/completed. | Maps to `COMPLETED` |
| 미지원 | Posting was not applied to, or an incomplete posting passed its deadline. | Maps to `NOT_APPLIED` |
| 마감 임박 | Basket/dashboard sorting condition for postings near deadline. | Sort by deadline ascending |

## Integration Terms

| Term | Definition | MVP boundary |
| --- | --- | --- |
| Chrome Extension | Browser extension used to extract and save posting data from supported job pages. | P1 starts with Jasoseol.com posting save |
| Jasoseol.com | First supported source for extension posting save and recommendation save flow. | P1 source |
| 추천 공고 | Posting recommended from onboarding/profile criteria or later collection sources. | P1 supports Jasoseol.com-based star-to-basket |
| Mattermost 추천 | SSAFY/community recommendation path based on Mattermost data. | P2 collection/candidate flow |
| Notion 동기화 | External sync from EZ One to the user's Notion workspace. | P1 is `JOB_ONLY` |
| `JOB_ONLY` | Notion sync scope that sends saved posting data only. | MVP default |
| 확장 동기화 | Notion sync including job, essay, and canvas data. | P2, not P1 |

## Data Ownership Terms

| Term | Definition | Implementation rule |
| --- | --- | --- |
| 사용자 소유 데이터 | Data that belongs to one authenticated user. | Every read, update, and delete must validate ownership. |
| Ownership 검증 | Authorization check that the current user owns the target record. | Required for basket, workspace, document profile, reference, and Notion settings. |
| 외부 연동 실패 | Failure from Google OAuth, Notion API, extension extraction, or external page changes. | Must not corrupt or silently roll back unrelated core DB data. |

## Naming Rules

- Use `공고` for the business object and `job` for API/database naming.
- Use `공고 장바구니` in Korean docs and `basket` or `basket_job` in implementation naming.
- Use `지원 워크스페이스` in Korean docs and `workspace` in implementation naming.
- Use `서류 입력 정보` in Korean docs and `document profile` in implementation naming.
- Do not use `경험` or `역량` as standalone P1 domain names unless they are part of document profile fields or onboarding criteria.
