# Schema Relationships (DBML + dbdiagram.io)

`Mermaid` 대신 FK를 명확하게 보기 위해 `DBML` 기반으로 전환했습니다.

## Files

- DBML source: `ddl/SCHEMA_RELATIONSHIPS.dbml`
- This guide: `ddl/SCHEMA_RELATIONSHIPS.md`

## How To View

1. Open https://dbdiagram.io
2. Create a new diagram
3. Copy all content from `ddl/SCHEMA_RELATIONSHIPS.dbml`
4. Paste into dbdiagram editor
5. FK lines and cardinality will render automatically

## Scope Included

- Current MVP schema from `ddl/*.sql`
- Service transition schema from `migrations/007_service_transition_rbac_multitenant.sql`
- External auth table modeled as `auth.users` (reference only)
- 007의 compatibility cleanup(legacy drop/rename) 블록은 현재 파일에서 제외된 정책 반영

## Notes

- `site_requirements` is marked as legacy transition table.
- `site_staffing_requirements` is marked as service-native staffing table.
- `site_requirements` expression-based unique index (`COALESCE(...)`) is documented as note-level intent; DBML focuses on FK and structural relationships.
- `schedule_assignments` includes `off_reason`, `off_comment`, `comment` and 007-added `site_id`.
- `schedule_preferences` reflects current DDL columns including `is_soft`, `resolution_status`, `resolved_shift_id`, `resolved_at`.
