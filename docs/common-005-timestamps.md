# COMMON-005 Timestamp Evidence

Requirement: 주요 데이터는 생성일시와 수정일시를 DB에 저장한다.

The MySQL schema defines both `created_at` and `updated_at` for mutable P1 data tables, and `P1SchemaTimestampContractTest` verifies the contract against `schema-mysql.sql`.

Covered mutable tables:

- `users`
- `companies`
- `jobs`
- `basket_jobs`
- `workspaces`
- `essay_questions`
- `essay_drafts`
- `reference_materials`
- `document_profile_sections`
- `document_custom_fields`

Append-only or event-log tables, such as `user_sessions`, `essay_versions`, and `sync_logs`, keep `created_at` as their immutable event timestamp.
