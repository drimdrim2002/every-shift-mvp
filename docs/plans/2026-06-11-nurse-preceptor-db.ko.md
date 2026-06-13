# 간호사 프리셉터 — DB 설계

> **상태:** DB 슬라이스 구현 완료 (2026-06-11)  
> **작성일:** 2026-06-11  
> **순서:** 1/3 — DB → [API](./2026-06-11-nurse-preceptor-api.ko.md) → [UI](./2026-06-11-nurse-preceptor-ui.ko.md)  
> **상위 문서:** [개요](./2026-06-11-nurse-preceptor-design.ko.md)

---

## 1. 범위

본 문서는 **PostgreSQL 스키마**, **RLS**, **Roster Replace RPC** 변경만 다룬다.

| 포함                                    | 제외 (다른 문서)                                                |
| --------------------------------------- | --------------------------------------------------------------- |
| `employees.preceptor_id` 컬럼·인덱스·FK | TypeScript 타입 → [API](./2026-06-11-nurse-preceptor-api.ko.md) |
| `replace_*_roster_atomic` 2-pass        | Step3 화면·엑셀 → [UI](./2026-06-11-nurse-preceptor-ui.ko.md)   |
| RPC payload `preceptor_employee_id`     | 솔버·compliance 로직 → API 문서                                 |
| 저장 시 DB/RPC 검증 규칙                |                                                                 |

### 1.1 확정 요구사항 (DB 관점)

| 항목           | 결정                                                 |
| -------------- | ---------------------------------------------------- |
| 저장           | 조직 단위 — `employees` 테이블 영구 저장             |
| 관계           | 1:1 — 프리셉티 행이 `preceptor_id` FK 보유           |
| 미지정         | `preceptor_id = NULL` → DB 제약 없음                 |
| Roster replace | DELETE 후 INSERT → **직번 기준 2-pass resolve** 필수 |

### 1.2 식별자 (DB ↔ 앱 경계)

| DB / RPC                                      | 앱 (참고)                           |
| --------------------------------------------- | ----------------------------------- |
| `employees.preceptor_id` (UUID FK)            | UI는 직번만 입력 — RPC에서 resolve  |
| RPC JSON `preceptor_employee_id` (text, 직번) | `EmployeeInput.preceptorEmployeeId` |

---

## 2. 원격 DB 조회 결과 (Supabase, 2026-06-11)

프로젝트 ref: `vjmerqaxguovnojinxfq` (`every-shift-mvp`, ACTIVE_HEALTHY)

### 2.1 `public.employees` 현재 컬럼

| column_name        | data_type   | nullable | default             |
| ------------------ | ----------- | -------- | ------------------- |
| `id`               | uuid        | NO       | `gen_random_uuid()` |
| `organization_id`  | uuid        | NO       | —                   |
| `employee_id`      | varchar     | NO       | —                   |
| `name`             | varchar     | NO       | —                   |
| `available_shifts` | jsonb       | NO       | —                   |
| `created_at`       | timestamptz | YES      | `now()`             |
| `updated_at`       | timestamptz | YES      | `now()`             |
| `user_id`          | uuid        | YES      | —                   |
| `rank_code`        | varchar     | YES      | —                   |

### 2.2 인덱스

- `employees_pkey` — `(id)`
- `employees_organization_id_employee_id_key` — UNIQUE `(organization_id, employee_id)`
- `idx_employees_org` — `(organization_id)`
- `idx_employees_user_id` — `(user_id)`

### 2.3 RLS 정책

| policyname                       | cmd    | qual                                       |
| -------------------------------- | ------ | ------------------------------------------ |
| `employees_select_authenticated` | SELECT | `has_org_access(organization_id, 'user')`  |
| `employees_admin_all`            | ALL    | `has_org_access(organization_id, 'admin')` |

### 2.4 Migration diff

| 항목           | 로컬 migration        | 원격 DB | 비고                        |
| -------------- | --------------------- | ------- | --------------------------- |
| `preceptor_id` | 없음                  | 없음    | **이번 migration에서 추가** |
| `rank_code`    | `20260408_*`          | 있음    | 일치                        |
| `user_id`      | migration 파일 미확인 | 있음    | 프리셉터와 무관             |

---

## 3. 스키마 변경 (migration 초안)

**파일:** `migrations/20260611_100000_employee_preceptor_pairing.sql`

```sql
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS preceptor_id UUID NULL
    REFERENCES public.employees(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.employees.preceptor_id IS
  'Preceptee -> preceptor FK. NULL means no pairing constraint. 1:1 enforced by partial unique index.';

-- 각 프리셉터는 최대 1명의 프리셉티만 가질 수 있음
CREATE UNIQUE INDEX IF NOT EXISTS employees_preceptor_id_unique
  ON public.employees (preceptor_id)
  WHERE preceptor_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_employees_preceptor_id
  ON public.employees (preceptor_id)
  WHERE preceptor_id IS NOT NULL;
```

### 3.1 설계 결정

- **FK 방향:** 프리셉티 행이 `preceptor_id` 보유 (신규 → 선배).
- **`ON DELETE SET NULL`:** 프리셉터 삭제 시 프리셉티 FK만 NULL — 제약 해제.
- **Self-reference CHECK:** DB CHECK 대신 RPC/앱 검증 (bulk insert와 충돌 방지).
- **1:1:** partial unique index `(preceptor_id) WHERE preceptor_id IS NOT NULL`.

---

## 4. RLS 영향

- **새 정책 불필요.** `preceptor_id`는 `employees` 일반 컬럼.
- SELECT: org `user` 이상 조회 가능.
- INSERT/UPDATE/DELETE: org `admin` (`employees_admin_all`).
- **Cross-org FK:** PostgreSQL은 same-table FK만으로 org 경계를 막지 않음 → RPC에서 preceptor UUID가 **같은 `organization_id`** 인지 검증 필수.

---

## 5. Roster Replace RPC — 2-pass resolve

현재 RPC는 `DELETE` 후 `INSERT`로 행 UUID가 매번 재생성된다.

| RPC                                        | 기존 migration                                                        |
| ------------------------------------------ | --------------------------------------------------------------------- |
| `replace_organization_roster_atomic`       | `migrations/20260413_120000_phase2a2_org_roster_replace_boundary.sql` |
| `replace_roster_and_reset_schedule_atomic` | `migrations/20260408_100000_phase2a2_off_request_policy.sql`          |

`preceptor_id`는 UUID FK이므로 payload에는 **직번**(`preceptor_employee_id`)만 받고 insert 후 resolve한다.

### 5.1 RPC JSON payload 확장

```json
{
  "employee_id": "40627",
  "name": "김신규",
  "available_shifts": ["D", "E", "N", "O"],
  "rank_code": "RN",
  "preceptor_employee_id": "40501"
}
```

`jsonb_to_recordset` 스키마에 `preceptor_employee_id text` 추가.

### 5.2 알고리즘 (두 RPC 공통)

```text
Pass 1 — INSERT (preceptor_id = NULL)
  DELETE FROM employees WHERE organization_id = :org;
  INSERT INTO employees (
    organization_id, employee_id, name, available_shifts, rank_code, preceptor_id
  )
  SELECT ..., NULL FROM jsonb_to_recordset(:payload);

Pass 2 — UPDATE preceptor_id (직번 → UUID)
  UPDATE employees AS preceptee
  SET preceptor_id = preceptor.id
  FROM jsonb_to_recordset(:payload) AS row(
    employee_id text,
    preceptor_employee_id text
  )
  JOIN employees AS preceptor
    ON preceptor.organization_id = :org
   AND preceptor.employee_id = btrim(row.preceptor_employee_id)
  WHERE preceptee.organization_id = :org
    AND preceptee.employee_id = btrim(row.employee_id)
    AND NULLIF(btrim(row.preceptor_employee_id), '') IS NOT NULL;
```

### 5.3 Pass 2 실패 처리

| 상황                                    | RPC 응답                                                   |
| --------------------------------------- | ---------------------------------------------------------- |
| `preceptor_employee_id`가 로스터에 없음 | `bad_request` — `프리셉터 직번 '{id}'를 찾을 수 없습니다.` |
| Pass 2 후에도 unresolved row            | migration/RPC 구현 시 COUNT 검증 후 `bad_request`          |

Pass 2 전 **§6 검증** 통과 필수 (Edge Function 또는 RPC 내부).

### 5.4 Ops repository 연동 (참고)

`supabase/functions/phase2-ops/repository.ts`:

- `callReplaceOrganizationRosterBoundary` — payload에 `preceptor_employee_id` snake_case 매핑
- `callResetRosterBoundary` — 동일

상세 TypeScript 변경은 [API 문서](./2026-06-11-nurse-preceptor-api.ko.md) 참조.

---

## 6. 저장 시 검증 규칙 (RPC / Edge Function)

클라이언트 검증과 동일 규칙을 RPC 경계에서도 적용한다.

| #   | 조건                                                | 결과                       |
| --- | --------------------------------------------------- | -------------------------- |
| 1   | `preceptor_employee_id` NULL/빈값                   | 통과 — `preceptor_id` NULL |
| 2   | 본인 지정 (`employee_id === preceptor_employee_id`) | `bad_request`              |
| 3   | D/E/N 기준 가능 시프트 겹침 없음                    | `bad_request`              |
| 4   | 동일 preceptor를 두 preceptee가 지정 (1:1)          | `bad_request`              |
| 5   | A→B 후 B→A (체인)                                   | `bad_request`              |
| 6   | A→B 후 C→B                                          | #4와 동일                  |

**시프트 겹침 (RPC 구현 참고):**

```sql
-- 또는 Edge Function TypeScript에서 동일 로직
-- work shifts = available_shifts에서 'O' 제외 후 교집합 존재
```

---

## 7. 구현 슬라이스 (DB만)

| Step | 작업                                              | 산출물                                           |
| ---- | ------------------------------------------------- | ------------------------------------------------ |
| D1   | migration 파일 작성·적용                          | `20260611_100000_employee_preceptor_pairing.sql` |
| D2   | `replace_organization_roster_atomic` 2-pass       | 동일 migration 또는 후속 migration               |
| D3   | `replace_roster_and_reset_schedule_atomic` 2-pass | 동일                                             |
| D4   | RPC 검증 + Ops repository payload                 | Edge Function (API 문서와 협업)                  |

**완료 기준:**

- [x] 원격/로컬 `employees.preceptor_id` 존재
- [x] partial unique index 동작
- [ ] roster replace 후 preceptor_id UUID resolve 확인 (RPC는 service_role 전용 — E2E/통합 테스트에서 검증)
- [ ] `ON DELETE SET NULL` 확인 (통합 테스트에서 검증)

---

## 8. 테스트 · 검증 SQL

### 8.1 Migration 검증

```sql
-- 1:1 partial unique — 동일 preceptor_id로 두 preceptee INSERT → fail
INSERT INTO employees (organization_id, employee_id, name, available_shifts, preceptor_id)
VALUES
  ('org-uuid', 'E1', 'A', '["D"]'::jsonb, 'preceptor-uuid'),
  ('org-uuid', 'E2', 'B', '["D"]'::jsonb, 'preceptor-uuid');

-- ON DELETE SET NULL
DELETE FROM employees WHERE id = 'preceptor-uuid';
-- preceptee.preceptor_id IS NULL 확인

-- 2-pass resolve (roster replace RPC 호출 후)
SELECT employee_id, preceptor_id
FROM employees
WHERE organization_id = 'org-uuid'
ORDER BY employee_id;
```

### 8.2 Unit / Integration (DB 경계)

| 대상                                       | 케이스                                 |
| ------------------------------------------ | -------------------------------------- |
| `tests/unit/phase2-ops-repository.spec.ts` | RPC payload `preceptor_employee_id`    |
| migration smoke                            | apply → rollback 경로 (팀 정책에 따름) |

---

## 9. 원격 DB 조회 방법 (재현)

```bash
source scripts/mcp.env.local
curl -X POST "https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/database/query" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"query":"SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = '\''public'\'' AND table_name = '\''employees'\'' ORDER BY ordinal_position;"}'
```

Supabase MCP: `scripts/mcp/supabase.sh` (`list_tables`, `execute_sql`).

---

## 10. 참고 파일

| 경로                                                                  | 용도               |
| --------------------------------------------------------------------- | ------------------ |
| `migrations/20260413_120000_phase2a2_org_roster_replace_boundary.sql` | org roster replace |
| `migrations/20260408_100000_phase2a2_off_request_policy.sql`          | month roster reset |
| `migrations/20260419123000_phase2b_direct_path_rls_alignment.sql`     | employees RLS      |
| `supabase/functions/phase2-ops/repository.ts`                         | RPC 호출           |

---

**다음 단계:** [API 설계 (TypeScript)](./2026-06-11-nurse-preceptor-api.ko.md)
