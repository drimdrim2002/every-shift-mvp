# Public Holidays Solver Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **For the next agent session:** implement this plan directly. Keep the scope limited to database schema, local holiday sync, and solver request enrichment. Do not build a holiday management UI in this pass.

**Date:** 2026-05-13  
**Goal:** Create a reliable Korean public holiday data path so EveryShift can include generated-period public holiday dates in solver requests.  
**Architecture:** A local operator script syncs official Korean public holidays into one global Supabase table. Schedule request construction reads that table once per solve, enriches `SolverRequest.publicHolidays`, and snapshots the enriched request while keeping `src/api/solver.ts` transport-only.  
**Tech Stack:** Vue 3, TypeScript, Vite, Vitest, Supabase JS, PostgreSQL migrations, Node 20, optional `tsx` and `fast-xml-parser`.  
**Target:** Korean public holiday data for solver requests  
**Primary files likely touched:** `migrations/*`, `scripts/ops/*`, `src/types/schedule.ts`, `src/api/*`, `src/composables/useScheduleSolverRequest.ts`, `src/utils/scheduleInputSnapshot.ts`, related unit tests  
**Source of truth for holiday data:** Korea Astronomy and Space Science Institute public holiday API via data.go.kr  
**Eng review status:** reviewed with `/plan-eng-review` on 2026-05-13; plan hardened before implementation  
**Writing-plans status:** reviewed with `superpowers:writing-plans` on 2026-05-13; task checklist and file ownership map added

---

## Engineering Review Verdict

Proceed with a small, boring implementation.

The plan should stay limited to:

1. a global `public.public_holidays` table,
2. a local operator sync script,
3. a browser read helper,
4. solver request enrichment,
5. snapshot compatibility and tests.

Do not add a holiday UI, admin workflow, Edge Function, scheduler/cron job, or organization-specific override model in this pass. Those are useful future features, but they are not needed to deliver the solver payload contract.

Lake score: 5/5 recommendations choose the complete implementation over shortcuts where the added CC cost is small: full parser tests, snapshot regression tests, transport pass-through tests, API error handling tests, and migration tests.

---

## Writing-Plans Review Verdict

The original plan had the right architecture but was not yet granular enough for a fresh agentic worker. This version locks file responsibilities and decomposes implementation into TDD tasks with exact test commands, expected outcomes, and commit points.

Execution rules:

- Work one task at a time.
- Write the failing test first.
- Run the focused test and confirm the expected failure.
- Implement the smallest code that passes.
- Run the focused test again.
- Commit after each task if the working tree contains only that task's files.
- Do not mix structural changes and behavior changes in the same task unless the task explicitly says so.
- Do not include unrelated local changes in commits.

---

## Goal

Create a reliable Korean public holiday data path so EveryShift can include public holiday dates in solver requests.

The implementation must:

1. Fetch Korean public holiday data from the official public API.
2. Store holiday data in a global database table.
3. Seed/sync the years 2026 through 2030.
4. Add only the relevant public holiday date list to solver request payloads.
5. Keep `src/api/solver.ts` as the transport layer that sends the already-built payload.

---

## Clarified Requirements

### Data Source

Use the official Korean public holiday API from data.go.kr:

- Provider: Korea Astronomy and Space Science Institute
- API family: special day / public holiday information
- Endpoint: `https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo`
- Request parameters: `ServiceKey`, `solYear`, `solMonth`, `pageNo=1`, `numOfRows=100`
- Store only records that are actual public holidays.

Documentation checked on 2026-05-13:

- Official data.go.kr dataset: `https://www.data.go.kr/data/15012690/openapi.do`
- Official service URL: `http://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService`
- Official response fields include `locdate`, `seq`, `dateKind`, `isHoliday`, and `dateName`.
- The official portal still advertises XML as the formal data format. Some existing client examples use `_type=json`, but implementation must treat JSON support as a capability to verify, not an assumption.

Implementation note:

- Try `_type=json` first because the normalized rows are easier to test and safer to map.
- If the response is not JSON, parse XML with a small parser dependency. Do not hand-roll XML parsing with regex/string slicing.
- Node 20 does not provide a reliable server-side `DOMParser` baseline for this script. If XML fallback is required, prefer `fast-xml-parser` and isolate it to the local sync module.

### Data Range

The first sync must load public holidays from:

```text
2026-01-01 through 2030-12-31
```

The sync should be repeatable. Running it again must update existing rows instead of creating duplicates.

### Database Ownership

Create a global shared table:

```text
public.public_holidays
```

This table is not organization-specific.

Do not add RLS for this table in this pass.

Do not build a holiday management UI in this pass. A future superuser-only holiday management screen may be added later, but it is out of scope here.

### Solver Payload Contract

Add a date-only holiday list to `SolverRequest`.

Recommended shape:

```ts
publicHolidays: string[]
```

Example:

```json
{
  "publicHolidays": ["2026-01-01", "2026-02-16", "2026-02-17"]
}
```

Do not include holiday names, source metadata, Saturday/Sunday dates, or organization-specific holiday overrides in the solver request.

### Solver Date Range

Include only holidays inside the generated draft period:

```text
firstDraftDate through firstDraftDate + draftLength - 1 day
```

Do not include the previous-month historical range.

Reason: the previous-month range is locked historical context. Public holiday constraints should apply to the generation target period.

### Implementation Responsibility

Holiday dates should be attached during solver request construction, not inside the solver transport client.

Use this responsibility split:

- `useScheduleSolverRequest.ts` or a nearby API/helper loads public holidays from Supabase.
- The request builder adds `publicHolidays` to `SolverRequest`.
- `src/api/solver.ts` sends the final request as-is.
- Tests should still verify that `src/api/solver.ts` forwards the payload without stripping `publicHolidays`.

---

## What Already Exists

- `src/utils/solverMapper.ts` already converts local schedule state into `SolverRequest`. Reuse it for the base payload, then enrich the result in `useScheduleSolverRequest.ts`.
- `src/composables/useScheduleSolverRequest.ts` already owns async data loading, snapshot rebuild, and final request assembly. This is the correct place to load public holidays; do not put holiday lookup in `src/api/solver.ts`.
- `src/utils/scheduleInputSnapshot.ts` already normalizes request data into immutable solver snapshots and hashes them. Add `publicHolidays` there so retry/rebuild flows preserve the exact input.
- `src/api/solver.ts` already serializes and sends the request body. Leave it as transport-only and add only a pass-through test.
- `tests/unit/phase2-ops-migrations.spec.ts` already validates migration text for safety regressions. Extend it for `public_holidays` instead of creating a new migration test harness.
- `tests/unit/solver.spec.ts` and `tests/unit/solver-mapper.spec.ts` already cover the solver payload boundary. Extend fixtures with `publicHolidays: []`.
- `package.json` has Vitest and TypeScript, but not `tsx`. A TypeScript operator script needs either a new `tsx` dev dependency or a plain Node `.mjs` implementation.

---

## File Structure

Lock the implementation to these files unless a test exposes a missing boundary.

### Create

- `migrations/20260513_130000_public_holidays.sql` — database schema for global Korean public holiday rows.
- `scripts/ops/sync-public-holidays.ts` — operator CLI entrypoint; validates env vars, calls sync helpers, prints summary.
- `scripts/ops/publicHolidaySync.ts` — pure sync helpers; request URL building, JSON/XML response parsing, row normalization, upsert payload construction.
- `src/api/publicHolidays.ts` — browser Supabase read helper for date-only holiday ranges.
- `tests/unit/public-holiday-sync.spec.ts` — sync helper coverage.
- `tests/unit/public-holidays-api.spec.ts` — Supabase read helper coverage.
- `tests/unit/schedule-solver-request.spec.ts` — solver request builder holiday enrichment and snapshot rebuild coverage.
- `tests/unit/schedule-input-snapshot.spec.ts` — snapshot normalization/hash coverage if the existing `phase2-schedule-contracts.spec.ts` becomes too large.

### Modify

- `package.json` — add `sync:public-holidays`; add `tsx` dev dependency only if choosing the TypeScript script path.
- `pnpm-lock.yaml` — update only if adding dependencies.
- `src/types/schedule.ts` — add `SolverRequest.publicHolidays` and `ScheduleInputSnapshotSolverInput.publicHolidays`.
- `src/composables/useScheduleSolverRequest.ts` — load holidays for fresh builds; preserve holidays for snapshot rebuilds.
- `src/utils/scheduleInputSnapshot.ts` — normalize and hash holiday dates as part of solver input.
- `src/utils/solverMapper.ts` — return `publicHolidays: []` from the base mapper so the type is always complete before enrichment.
- `src/api/solver.ts` — no production behavior change expected; transport should remain pass-through.
- `tests/unit/phase2-ops-migrations.spec.ts` — migration safety assertions.
- `tests/unit/solver.spec.ts` — transport pass-through assertion.
- `tests/unit/solver-mapper.spec.ts` — fixture/type updates and base mapper default assertion.
- Any existing `SolverRequest` fixtures in `tests/unit/step4-initial-data.spec.ts` and related tests — add `publicHolidays: []`.

### Do Not Create

- No holiday Pinia store.
- No holiday Vue components.
- No route or navigation entries.
- No Supabase Edge Function.
- No cron/scheduler automation.
- No browser-side data.go.kr client.

---

## Proposed Architecture

### Data Flow

```text
Local operator shell
  │
  ├─ pnpm sync:public-holidays
  │     │
  │     ├─ scripts/ops/sync-public-holidays.ts
  │     │     ├─ validate private env vars
  │     │     ├─ fetch getRestDeInfo by year/month
  │     │     ├─ normalize JSON/XML response rows
  │     │     ├─ keep isHoliday === 'Y' only
  │     │     └─ upsert rows by holiday_date
  │     │
  │     └─ public.public_holidays
  │
Browser schedule generation
  │
  ├─ useScheduleSolverRequest.buildScheduleSolverRequest()
  │     │
  │     ├─ mapToSolverRequest(...)             existing base payload
  │     ├─ resolveSolverHolidayRange(...)      firstDraftDate..draftEndDate
  │     ├─ listPublicHolidayDatesInRange(...)  Supabase read-only query
  │     ├─ attach publicHolidays               date-only array
  │     └─ buildScheduleInputSnapshot(...)     stores enriched request input
  │
  └─ src/api/solver.ts
        └─ JSON.stringify(request) unchanged
```

Dependency rule: the official API key and service role key exist only in the local operator shell. Browser code reads only the already-synced `public.public_holidays` table.

### Database Table

Create a migration in the root `migrations/` directory.

Suggested migration name:

```text
migrations/20260513_130000_public_holidays.sql
```

Suggested schema:

```sql
CREATE TABLE IF NOT EXISTS public.public_holidays (
  holiday_date date PRIMARY KEY,
  name text NOT NULL,
  is_holiday boolean NOT NULL DEFAULT true,
  country_code text NOT NULL DEFAULT 'KR',
  source text NOT NULL DEFAULT 'data.go.kr:kasi-special-day',
  source_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS public_holidays_country_date_idx
  ON public.public_holidays (country_code, holiday_date);
```

Recommended constraints:

```sql
ALTER TABLE public.public_holidays
  ADD CONSTRAINT public_holidays_country_code_check
  CHECK (country_code = 'KR');
```

Do not enable RLS in this migration.

Add any timestamp trigger only if the repo already has a standard helper for it. Otherwise, the sync script can explicitly set `updated_at`.

### Local Sync Script

Create a local operator script:

```text
scripts/ops/sync-public-holidays.ts
```

Recommended implementation choice:

- Add `tsx` as a dev dependency and use `"sync:public-holidays": "tsx scripts/ops/sync-public-holidays.ts"`.
- Reason: it keeps the operator code TypeScript-first, lets Vitest import pure helpers directly, and avoids maintaining a tested `.ts` helper plus an untyped `.mjs` wrapper.
- If dependency churn must be avoided, use one plain `.mjs` file and test behavior through exported pure functions. Do not create both `.ts` and `.mjs` versions of the same parser logic.

The script should:

1. Read environment variables from the shell.
2. Validate required variables.
3. Fetch Korean public holidays for each month from 2026-01 through 2030-12.
4. Normalize API rows into local DB rows.
5. Filter to actual public holidays only.
6. Upsert into `public.public_holidays` on `holiday_date`.
7. Print a concise summary: years processed, rows fetched, rows upserted.

Required environment variables:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
PUBLIC_DATA_SERVICE_KEY
```

Optional environment variables:

```text
PUBLIC_HOLIDAY_SYNC_START_YEAR=2026
PUBLIC_HOLIDAY_SYNC_END_YEAR=2030
```

Important security rule:

- Do not expose `PUBLIC_DATA_SERVICE_KEY` in browser `VITE_*` variables.
- Do not commit real keys.
- Do not add the key to `.env.example` unless it is a placeholder only.

Recommended package script:

```json
{
  "scripts": {
    "sync:public-holidays": "tsx scripts/ops/sync-public-holidays.ts"
  }
}
```

Because `tsx` is not currently installed, the implementation should explicitly choose one path:

- preferred: add `tsx` as a dev dependency for a tested TypeScript operator script,
- fallback: use one plain Node ESM `.mjs` script if dependency churn is rejected.

### Holiday Read API

Add a small frontend API helper, for example:

```text
src/api/publicHolidays.ts
```

Suggested function:

```ts
export async function listPublicHolidayDatesInRange(
  startDate: string,
  endDate: string
): Promise<string[]>;
```

Behavior:

- Query `public_holidays`.
- Select `holiday_date`.
- Filter `country_code = 'KR'`.
- Filter `is_holiday = true`.
- Filter `holiday_date >= startDate`.
- Filter `holiday_date <= endDate`.
- Return sorted `YYYY-MM-DD` strings.

Because RLS is not enabled for this table, the normal browser Supabase client can read it. Keep the query read-only.

### Solver Type Update

Extend `SolverRequest` in `src/types/schedule.ts`:

```ts
export interface SolverRequest {
  organization: {
    id: string;
    name: string;
    type: string;
    shifts: PlanningShift[];
    lastHistoricalDate: string;
    firstDraftDate: string;
    publishLength: number;
    draftLength: number;
  };
  employees: SolverRequestEmployee[];
  history: SolverRequestHistoryItem[];
  undesirable: SolverRequestUndesirableItem[];
  requirements: SolverRequestRequirementItem[];
  publicHolidays: string[];
}
```

### Solver Request Builder Update

Update `useScheduleSolverRequest.ts` so `buildScheduleSolverRequest()` loads public holidays for the generated draft period.

Date range:

```ts
const holidayStartDate = solverRequest.organization.firstDraftDate;
const holidayEndDate = dayjs(holidayStartDate)
  .add(solverRequest.organization.draftLength - 1, 'day')
  .format('YYYY-MM-DD');
```

Then attach:

```ts
solverRequest.publicHolidays = await listPublicHolidayDatesInRange(
  holidayStartDate,
  holidayEndDate
);
```

Keep this logic testable. A small pure helper such as `resolveSolverHolidayRange()` is acceptable if it reduces duplication.

### Snapshot Compatibility

This repo stores solver input snapshots. Update snapshot-related types and builders so `publicHolidays` survives rebuild/retry flows.

Likely files:

- `src/types/schedule.ts`
- `src/utils/scheduleInputSnapshot.ts`
- `src/composables/useScheduleSolverRequest.ts`

When rebuilding from an existing `inputSnapshot`, the resulting `SolverRequest` must include the same `publicHolidays` from the snapshot if present.

Decision: old snapshots that do not have the field should rebuild with `publicHolidays: []`, not reload holidays from the database.

Reason: `ScheduleInputSnapshot` is an immutable record of the input used for a solve. Reloading holidays for legacy snapshots would make old retry/rebuild flows depend on current DB state and could change the solver input without a visible user edit. New snapshots will include holidays because enrichment happens before `buildScheduleInputSnapshot()`.

Required type update:

```ts
export interface ScheduleInputSnapshotSolverInput {
  // existing fields...
  publicHolidays: string[];
}
```

---

## Scope Challenge

### Minimum Change Set

The minimum implementation is seven touched areas:

1. `migrations/20260513_130000_public_holidays.sql`
2. `scripts/ops/sync-public-holidays.ts`
3. `src/api/publicHolidays.ts`
4. `src/types/schedule.ts`
5. `src/composables/useScheduleSolverRequest.ts`
6. `src/utils/scheduleInputSnapshot.ts`
7. focused unit tests and fixture updates

This is below the complexity smell threshold if the script stays as one module plus tests. Do not introduce an Edge Function, cron scheduler, admin page, store, route, or composable unless a test proves the current boundary is insufficient.

### Search Check

- [Layer 1] Supabase range reads are already available through the existing browser client. Use the existing query pattern instead of a custom backend endpoint.
- [Layer 1] Vitest is already the repo test framework. Use it for parser, migration, snapshot, and solver transport tests.
- [Layer 1] `createSolverExecution()` already stringifies the whole `SolverRequest`; no transport abstraction is needed.
- [Layer 2] data.go.kr examples often use `_type=json`, but the official portal lists XML. Treat JSON as an optimization and XML as the documented fallback.
- [Layer 3] Snapshot immutability matters more than "latest holiday DB" correctness for old retries. Preserve old snapshot meaning and put new holiday data only into new snapshots.

### Distribution Check

This plan does not introduce a distributable artifact. The only operational artifact is a local script invoked through `pnpm sync:public-holidays`; no publish pipeline is required.

---

## Agentic Execution Tasks

Use this section as the implementation checklist. The older "Implementation Steps" section below remains as supporting detail, but this checklist is the primary execution plan.

### Task 1: Migration Contract

**Files:**

- Create: `migrations/20260513_130000_public_holidays.sql`
- Modify: `tests/unit/phase2-ops-migrations.spec.ts`

- [ ] **Step 1: Write the failing migration test**

Add a test like:

```ts
it('adds global public holidays without enabling rls', () => {
  const sql = readMigration('20260513_130000_public_holidays.sql').toLowerCase();

  expect(sql).toContain('create table if not exists public.public_holidays');
  expect(sql).toContain('holiday_date date primary key');
  expect(sql).toContain('country_code text not null default');
  expect(sql).toContain('source text not null default');
  expect(sql).toContain('source_payload jsonb not null default');
  expect(sql).toContain('create index if not exists public_holidays_country_date_idx');
  expect(sql).toContain('check (country_code = ');
  expect(sql).not.toContain('enable row level security');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm test:unit tests/unit/phase2-ops-migrations.spec.ts
```

Expected: FAIL because `migrations/20260513_130000_public_holidays.sql` does not exist.

- [ ] **Step 3: Create the migration**

Create `migrations/20260513_130000_public_holidays.sql` with the schema from `Database Table`.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm test:unit tests/unit/phase2-ops-migrations.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add migrations/20260513_130000_public_holidays.sql tests/unit/phase2-ops-migrations.spec.ts
git commit -m "feat: add public holidays migration"
```

### Task 2: Public Holiday Sync Helpers

**Files:**

- Create: `scripts/ops/publicHolidaySync.ts`
- Create: `tests/unit/public-holiday-sync.spec.ts`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml` only if adding `tsx` or `fast-xml-parser`

- [ ] **Step 1: Write failing normalization tests**

Cover these cases in `tests/unit/public-holiday-sync.spec.ts`:

```ts
describe('normalizePublicHolidayRows', () => {
  it('normalizes a single holiday item', () => {
    expect(
      normalizePublicHolidayRows({
        response: {
          header: { resultCode: '00' },
          body: { items: { item: { locdate: 20260101, dateName: '1월1일', isHoliday: 'Y' } } },
        },
      })
    ).toEqual([
      expect.objectContaining({
        holiday_date: '2026-01-01',
        name: '1월1일',
        country_code: 'KR',
        is_holiday: true,
      }),
    ]);
  });
});
```

Also add tests for array response, empty response, `isHoliday !== 'Y'`, duplicate dates, invalid `locdate`, and non-success `resultCode`.

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm test:unit tests/unit/public-holiday-sync.spec.ts
```

Expected: FAIL because `scripts/ops/publicHolidaySync.ts` does not exist.

- [ ] **Step 3: Implement pure helpers**

Implement these exports:

```ts
export interface PublicHolidayApiItem {
  locdate?: string | number;
  dateName?: string;
  isHoliday?: string | boolean;
  [key: string]: unknown;
}

export interface PublicHolidayUpsertRow {
  holiday_date: string;
  name: string;
  is_holiday: true;
  country_code: 'KR';
  source: 'data.go.kr:kasi-special-day';
  source_payload: Record<string, unknown>;
  synced_at: string;
  updated_at: string;
}

export function buildPublicHolidayApiUrl(input: {
  serviceKey: string;
  year: number;
  month: number;
  responseType?: 'json';
}): string;

export function normalizePublicHolidayRows(
  payload: unknown,
  now?: string
): PublicHolidayUpsertRow[];
```

Implementation rules:

- Convert `locdate` from `YYYYMMDD` to `YYYY-MM-DD`.
- Keep only `isHoliday === 'Y'` unless implementation confirms a boolean provider shape.
- Deduplicate by `holiday_date`; later duplicate rows can overwrite earlier rows.
- Throw on provider failure or invalid `locdate`.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm test:unit tests/unit/public-holiday-sync.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/ops/publicHolidaySync.ts tests/unit/public-holiday-sync.spec.ts package.json pnpm-lock.yaml
git commit -m "feat: add public holiday sync helpers"
```

### Task 3: Operator Sync CLI

**Files:**

- Create: `scripts/ops/sync-public-holidays.ts`
- Modify: `package.json`
- Modify: `tests/unit/public-holiday-sync.spec.ts`

- [ ] **Step 1: Write failing CLI helper tests**

Add tests for env validation and year/month iteration. Keep network and Supabase calls injectable so tests do not call real services.

Expected helper shape:

```ts
export function resolvePublicHolidaySyncConfig(env: NodeJS.ProcessEnv): {
  supabaseUrl: string;
  serviceRoleKey: string;
  publicDataServiceKey: string;
  startYear: number;
  endYear: number;
};
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm test:unit tests/unit/public-holiday-sync.spec.ts
```

Expected: FAIL because CLI config helpers are missing.

- [ ] **Step 3: Implement CLI wrapper**

The CLI should:

```text
resolve env
  -> create Supabase service-role client
  -> for each year/month fetch getRestDeInfo
  -> normalize rows
  -> upsert rows into public_holidays on holiday_date
  -> print summary
```

Required package script:

```json
"sync:public-holidays": "tsx scripts/ops/sync-public-holidays.ts"
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm test:unit tests/unit/public-holiday-sync.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/ops/sync-public-holidays.ts scripts/ops/publicHolidaySync.ts tests/unit/public-holiday-sync.spec.ts package.json pnpm-lock.yaml
git commit -m "feat: add public holiday sync cli"
```

### Task 4: Public Holiday Read API

**Files:**

- Create: `src/api/publicHolidays.ts`
- Create: `tests/unit/public-holidays-api.spec.ts`

- [ ] **Step 1: Write failing Supabase query tests**

Test expectations:

```ts
await expect(listPublicHolidayDatesInRange('2026-01-01', '2026-01-31')).resolves.toEqual([
  '2026-01-01',
  '2026-01-27',
]);
```

Assert the query selects `holiday_date`, filters `country_code = 'KR'`, `is_holiday = true`, `holiday_date >= startDate`, and `holiday_date <= endDate`.

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm test:unit tests/unit/public-holidays-api.spec.ts
```

Expected: FAIL because `src/api/publicHolidays.ts` does not exist.

- [ ] **Step 3: Implement read helper**

Implement:

```ts
export async function listPublicHolidayDatesInRange(
  startDate: string,
  endDate: string
): Promise<string[]>;
```

Rules:

- Return `[]` for inverted ranges.
- Throw `new Error('공휴일 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.')` on Supabase error.
- Return unique sorted `YYYY-MM-DD` strings.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm test:unit tests/unit/public-holidays-api.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/api/publicHolidays.ts tests/unit/public-holidays-api.spec.ts
git commit -m "feat: read public holidays for solver requests"
```

### Task 5: Solver Types and Snapshot Normalization

**Files:**

- Modify: `src/types/schedule.ts`
- Modify: `src/utils/scheduleInputSnapshot.ts`
- Modify: `src/utils/solverMapper.ts`
- Create or modify: `tests/unit/schedule-input-snapshot.spec.ts`
- Modify: `tests/unit/solver-mapper.spec.ts`

- [ ] **Step 1: Write failing snapshot and mapper tests**

Required assertions:

```ts
expect(mapToSolverRequest(/* existing fixture args */).publicHolidays).toEqual([]);
```

```ts
expect(
  normalizeScheduleSolverInput({
    ...input,
    solverRequest: { ...solverRequest, publicHolidays: ['2026-01-27', '2026-01-01'] },
  }).publicHolidays
).toEqual(['2026-01-01', '2026-01-27']);
```

Also assert the snapshot hash changes when `publicHolidays` changes.

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
pnpm test:unit tests/unit/solver-mapper.spec.ts
pnpm test:unit tests/unit/schedule-input-snapshot.spec.ts
```

Expected: FAIL because types and normalization do not include `publicHolidays`.

- [ ] **Step 3: Implement type and normalization changes**

Add:

```ts
publicHolidays: string[];
```

to `SolverRequest` and `ScheduleInputSnapshotSolverInput`.

In `normalizeScheduleSolverInput()`, add sorted unique holidays:

```ts
publicHolidays: [...new Set(solverRequest.publicHolidays)].sort(compareByText),
```

In `mapToSolverRequest()`, add:

```ts
publicHolidays: [],
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
pnpm test:unit tests/unit/solver-mapper.spec.ts
pnpm test:unit tests/unit/schedule-input-snapshot.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/types/schedule.ts src/utils/scheduleInputSnapshot.ts src/utils/solverMapper.ts tests/unit/solver-mapper.spec.ts tests/unit/schedule-input-snapshot.spec.ts
git commit -m "feat: include public holidays in solver snapshots"
```

### Task 6: Solver Request Builder Enrichment

**Files:**

- Modify: `src/composables/useScheduleSolverRequest.ts`
- Create: `tests/unit/schedule-solver-request.spec.ts`

- [ ] **Step 1: Write failing builder tests**

Test these cases:

```text
fresh build:
  firstDraftDate=2026-01-01
  draftLength=31
  -> calls listPublicHolidayDatesInRange('2026-01-01', '2026-01-31')
  -> solverRequest.publicHolidays is returned date list
  -> inputSnapshot.solverInput.publicHolidays has same dates

snapshot rebuild:
  snapshot has publicHolidays
  -> no public holiday API read
  -> rebuilt solverRequest uses snapshot dates

legacy snapshot:
  snapshot lacks publicHolidays
  -> solverRequest.publicHolidays is []
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm test:unit tests/unit/schedule-solver-request.spec.ts
```

Expected: FAIL because holiday enrichment is missing.

- [ ] **Step 3: Implement builder helper and enrichment**

Add a small helper:

```ts
export function resolveSolverHolidayRange(solverRequest: SolverRequest): {
  startDate: string;
  endDate: string;
} {
  const startDate = solverRequest.organization.firstDraftDate;
  return {
    startDate,
    endDate: dayjs(startDate)
      .add(solverRequest.organization.draftLength - 1, 'day')
      .format('YYYY-MM-DD'),
  };
}
```

Fresh build sequence:

```ts
const holidayRange = resolveSolverHolidayRange(solverRequest);
solverRequest.publicHolidays = await listPublicHolidayDatesInRange(
  holidayRange.startDate,
  holidayRange.endDate
);
```

Snapshot rebuild sequence:

```ts
publicHolidays: solverInput.publicHolidays ?? [],
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm test:unit tests/unit/schedule-solver-request.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/composables/useScheduleSolverRequest.ts tests/unit/schedule-solver-request.spec.ts
git commit -m "feat: enrich solver requests with public holidays"
```

### Task 7: Solver Transport and Fixture Cleanup

**Files:**

- Modify: `tests/unit/solver.spec.ts`
- Modify: any existing test fixtures that construct `SolverRequest`
- Production `src/api/solver.ts` should not need behavior changes

- [ ] **Step 1: Write failing pass-through test**

Add or extend a `createSolverExecution()` test:

```ts
const request = createSolverRequest();
request.publicHolidays = ['2026-01-01'];

await createSolverExecution(request, directApiEnv);

const [, init] = fetchMock.mock.calls[0]!;
expect(JSON.parse(String(init.body)).publicHolidays).toEqual(['2026-01-01']);
```

- [ ] **Step 2: Run test to verify it fails or fixture errors surface**

Run:

```bash
pnpm test:unit tests/unit/solver.spec.ts
```

Expected: FAIL if fixtures/types are still incomplete; otherwise PASS because transport already stringifies the whole request.

- [ ] **Step 3: Update fixtures only**

Add `publicHolidays: []` to all `SolverRequest` fixtures that do not specifically test holiday dates.

- [ ] **Step 4: Run focused solver tests**

Run:

```bash
pnpm test:unit tests/unit/solver.spec.ts
pnpm test:unit tests/unit/solver-mapper.spec.ts
pnpm test:unit tests/unit/step4-initial-data.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/unit
git commit -m "test: cover public holidays solver payload"
```

### Task 8: Final Verification and Operator Smoke Check

**Files:**

- Modify: this plan only if implementation discovers a confirmed API shape difference.

- [ ] **Step 1: Run all focused tests**

Run:

```bash
pnpm test:unit tests/unit/phase2-ops-migrations.spec.ts
pnpm test:unit tests/unit/public-holiday-sync.spec.ts
pnpm test:unit tests/unit/public-holidays-api.spec.ts
pnpm test:unit tests/unit/schedule-solver-request.spec.ts
pnpm test:unit tests/unit/schedule-input-snapshot.spec.ts
pnpm test:unit tests/unit/solver-mapper.spec.ts
pnpm test:unit tests/unit/solver.spec.ts
```

Expected: PASS.

- [ ] **Step 2: Run project checks**

Run:

```bash
pnpm lint:check
pnpm run build
```

Expected: PASS.

- [ ] **Step 3: Verify release blocker**

Confirm one of:

```text
external solver accepts publicHolidays: string[]
external solver ignores unknown publicHolidays
external solver is updated in the same release train
```

Expected: documented confirmation before production rollout.

- [ ] **Step 4: Run real sync only after credentials and migration are ready**

Run:

```bash
PUBLIC_HOLIDAY_SYNC_START_YEAR=2026 PUBLIC_HOLIDAY_SYNC_END_YEAR=2030 pnpm sync:public-holidays
```

Expected: concise summary with processed years, fetched rows, and upserted rows. Do not commit secrets or output containing keys.

- [ ] **Step 5: Commit final documentation adjustment if any**

```bash
git add docs/plans/2026-05-13-public-holidays-solver-integration-plan.md
git commit -m "docs: finalize public holidays solver plan"
```

---

## Implementation Steps

### Step 1: Inspect Current Contracts

Read:

- `src/types/schedule.ts`
- `src/composables/useScheduleSolverRequest.ts`
- `src/utils/solverMapper.ts`
- `src/utils/scheduleInputSnapshot.ts`
- `tests/unit/solver-mapper.spec.ts`
- `tests/unit/solver.spec.ts`
- existing migration tests around `tests/unit/phase2-ops-migrations.spec.ts`

Confirm where `SolverRequest` is built, snapshotted, retried, and sent.

Review finding: as of 2026-05-13, `buildSolverRequestFromSnapshot()` in `src/composables/useScheduleSolverRequest.ts` reconstructs a `SolverRequest` from `inputSnapshot.solverInput`. This function must be updated with `publicHolidays: solverInput.publicHolidays ?? []`.

### Step 2: Add Migration Tests First

Add or extend a migration unit test to assert that the new migration:

- creates `public.public_holidays`
- uses `holiday_date date PRIMARY KEY`
- includes `country_code`
- includes `source`
- includes `source_payload jsonb`
- does not enable RLS

Expected initial result: fail until the migration exists.

### Step 3: Add the Migration

Create `migrations/20260513_130000_public_holidays.sql`.

Run the migration test and adjust SQL until it passes.

### Step 4: Add Holiday Sync Script Tests or Dry-Run Coverage

Add focused coverage for normalization logic if practical.

Recommended structure:

- Put pure parsing/normalization helpers in `scripts/ops/publicHolidaySync.ts`.
- Put the executable CLI wrapper in `scripts/ops/sync-public-holidays.ts`.
- Unit test the pure helpers with sample API payloads.

Tests should cover:

- single row response
- array response
- empty `items` response
- JSON response with `items: ''`
- XML response if JSON is unavailable
- filtering `isHoliday !== 'Y'`
- normalizing boolean-like `isHoliday: true` only if the API actually returns that shape during implementation
- date normalization from API date format to `YYYY-MM-DD`
- duplicate rows in the same API response
- upsert payload shape
- API result code not equal to success

### Step 5: Implement Local Sync Script

Implement the local script.

It should be safe to rerun. Upsert on:

```text
holiday_date
```

Use batching if needed, but 2026-2030 public holidays are small enough that a simple upsert is acceptable.

Do not call the script from app runtime.

### Step 6: Add Public Holiday Read Helper

Create `src/api/publicHolidays.ts` with `listPublicHolidayDatesInRange()`.

Add unit tests that mock Supabase query behavior and verify:

- correct date filters
- sorted output
- error handling

Recommended error behavior:

- Throw a Korean user-facing error if the query fails during solver request construction.
- Message meaning: "공휴일 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요."

Also validate the caller-provided range before querying:

- `startDate` and `endDate` must match `YYYY-MM-DD`.
- If `startDate > endDate`, return `[]` and do not query.
- If the query returns duplicate dates, return a unique sorted array.

### Step 7: Extend Solver Request Types

Add `publicHolidays: string[]` to:

- `SolverRequest`
- snapshot input types, if required

Update existing test fixtures so they include `publicHolidays: []` unless a test specifically expects holiday dates.

### Step 8: Enrich Solver Request During Build

In `useScheduleSolverRequest.ts`:

1. Build the normal solver request.
2. Compute the generated draft date range.
3. Load public holiday dates from `public_holidays`.
4. Attach them to `solverRequest.publicHolidays`.
5. Ensure the `inputSnapshot` stores the enriched request.

For snapshot rebuild:

- Preserve holiday dates from the snapshot when available.
- Use `[]` for legacy snapshots without the field.
- Avoid changing historical snapshots unless the existing code already regenerates request data.

Important sequencing:

```text
fresh build:
  mapToSolverRequest()
    -> listPublicHolidayDatesInRange()
    -> assign solverRequest.publicHolidays
    -> buildScheduleInputSnapshot()

snapshot rebuild:
  inputSnapshot.solverInput
    -> buildSolverRequestFromSnapshot()
    -> publicHolidays = snapshot.publicHolidays ?? []
    -> return original inputSnapshot unchanged
```

### Step 9: Verify Transport Pass-Through

Extend `tests/unit/solver.spec.ts` so `createSolverExecution()` sends a request containing `publicHolidays`.

The test should prove `src/api/solver.ts` does not remove or transform the field.

Implementation detail: parse `JSON.parse(String(init.body))` from the mocked `fetch()` call and assert that `publicHolidays` is exactly the array provided by the test request.

### Step 9.5: Verify Solver Contract Compatibility

Before this ships to an environment that calls a real solver, verify one of these is true:

- the external solver already accepts unknown fields and ignores `publicHolidays`, or
- the external solver schema is updated to accept `publicHolidays: string[]`.

This is a release blocker, not a coding blocker. The frontend can be implemented first, but production rollout should not send the new field to a strict backend that rejects unknown keys.

### Step 10: Run Sync for 2026-2030

After migration is applied to the target DB, run:

```bash
PUBLIC_HOLIDAY_SYNC_START_YEAR=2026 PUBLIC_HOLIDAY_SYNC_END_YEAR=2030 pnpm sync:public-holidays
```

Then verify:

```sql
SELECT
  EXTRACT(YEAR FROM holiday_date) AS year,
  COUNT(*) AS holiday_count
FROM public.public_holidays
WHERE holiday_date BETWEEN DATE '2026-01-01' AND DATE '2030-12-31'
GROUP BY 1
ORDER BY 1;
```

Do not hard-code expected counts unless the official API response is captured and reviewed during implementation. Counts may vary because substitute or temporary holidays can change.

---

## Architecture Review

### Boundary Recommendation

Keep three boundaries explicit:

```text
sync boundary:
  data.go.kr -> local script -> public.public_holidays

request-building boundary:
  Supabase reads -> useScheduleSolverRequest -> SolverRequest.publicHolidays

transport boundary:
  src/api/solver.ts -> POST existing request body unchanged
```

This matches the current code shape and avoids coupling the official public API key to browser runtime or solver transport.

### Production Failure Scenarios

- data.go.kr returns XML even when `_type=json` is requested. Covered by parser tests if XML fallback is implemented; otherwise implementation must fail with a clear operator error before DB writes.
- data.go.kr returns a single `item` object instead of an array. Covered by normalization tests.
- The sync script is run twice after a temporary holiday update. Covered by upsert-on-`holiday_date` behavior and duplicate-response tests.
- Supabase holiday read fails while a user starts generation. The user should see `공휴일 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.` and no solver execution should start.
- The external solver rejects unknown `publicHolidays`. This is a release blocker covered by Step 9.5 contract verification.

### Inline Diagram Comments

Implementation does not need inline ASCII comments in production code unless the holiday range helper becomes more complex than:

```text
firstDraftDate + draftLength
  -> inclusive end date
  -> Supabase range query
```

If XML/JSON normalization has more than two nested shape guards, add a short ASCII comment in the sync module showing accepted response shapes.

---

## Code Quality Review

### DRY Requirements

- Keep date-range calculation in one helper, for example `resolveSolverHolidayRange()`.
- Keep response normalization in one tested function, for example `normalizePublicHolidayRows()`.
- Do not duplicate sample fixtures across parser tests; create small fixture builders for single item, array, and empty response.
- Do not add both `.ts` and `.mjs` implementations of the sync logic.

### Error Handling Requirements

- Missing env vars must list missing variable names without printing values.
- API result codes other than success must fail the sync with provider context.
- Invalid `locdate` values must be skipped or rejected explicitly; recommended behavior is reject the sync so bad provider data is visible.
- Browser holiday read failures must throw a Korean user-facing error and stop solver creation.
- Legacy snapshots without `publicHolidays` must rebuild with `[]`.

---

## Test Review

Detected test framework: Vitest from `package.json` (`pnpm test:unit`) plus Playwright for E2E. No E2E is required for this backend/payload-only change because no user-facing interaction changes.

### Code Path Coverage Target

```text
CODE PATH COVERAGE
==================
[+] migrations/20260513_130000_public_holidays.sql
    ├── [GAP] creates public.public_holidays
    ├── [GAP] holiday_date date primary key
    ├── [GAP] country/source/source_payload columns
    ├── [GAP] country/date index
    └── [GAP] no ENABLE ROW LEVEL SECURITY

[+] scripts/ops/sync-public-holidays.ts
    ├── [GAP] validates env vars without leaking secrets
    ├── [GAP] builds getRestDeInfo URL with year/month/page/rows
    ├── [GAP] normalizes JSON single item
    ├── [GAP] normalizes JSON array
    ├── [GAP] normalizes empty response
    ├── [GAP] normalizes XML fallback if needed
    ├── [GAP] filters isHoliday !== 'Y'
    ├── [GAP] rejects invalid locdate
    └── [GAP] creates idempotent upsert payload

[+] src/api/publicHolidays.ts
    ├── [GAP] queries country_code/is_holiday/date range
    ├── [GAP] returns sorted unique dates
    ├── [GAP] returns [] for inverted range
    └── [GAP] throws Korean message on Supabase error

[+] src/composables/useScheduleSolverRequest.ts
    ├── [GAP] fresh build attaches draft-period holidays before snapshot
    ├── [GAP] excludes previous-month historical range
    ├── [GAP] snapshot rebuild preserves snapshot publicHolidays
    └── [GAP] legacy snapshot rebuild uses []

[+] src/utils/scheduleInputSnapshot.ts
    ├── [GAP] snapshot normalization stores sorted publicHolidays
    └── [GAP] hash changes when publicHolidays changes

[+] src/api/solver.ts
    └── [GAP] createSolverExecution forwards publicHolidays unchanged

USER FLOW COVERAGE
==================
[+] Step4 schedule generation
    ├── [GAP] [unit] successful generate path includes publicHolidays in solver request
    ├── [GAP] [unit] holiday read failure prevents solver execution and surfaces Korean error
    └── [GAP] [unit] retry/rebuild from snapshot does not re-query holidays

─────────────────────────────────
COVERAGE NOW: 0/30 new paths tested because implementation has not started.
TARGET: 30/30 paths covered by focused unit tests before merge.
E2E: not required unless UI copy/flow changes are introduced.
EVAL: not required; no prompt or LLM behavior changes.
─────────────────────────────────
```

### Required Test Files

- `tests/unit/phase2-ops-migrations.spec.ts`: add assertions for the new migration.
- `tests/unit/public-holiday-sync.spec.ts`: add parser/env/upsert-shape coverage for the sync module.
- `tests/unit/public-holidays-api.spec.ts`: mock Supabase and cover query shape, sorting, duplicates, inverted ranges, and error handling.
- `tests/unit/schedule-solver-request.spec.ts`: cover fresh build enrichment, historical range exclusion, snapshot preservation, and legacy snapshot fallback. If no file exists yet, create it for `useScheduleSolverRequest`.
- `tests/unit/phase2-schedule-contracts.spec.ts` or a new `tests/unit/schedule-input-snapshot.spec.ts`: cover snapshot normalization and hash behavior.
- `tests/unit/solver.spec.ts`: assert transport pass-through.
- Existing solver request fixtures in `tests/unit/solver-mapper.spec.ts`, `tests/unit/step4-initial-data.spec.ts`, and related tests must include `publicHolidays: []`.

### QA Test Plan Artifact

Primary QA input for a later `/qa` pass:

```markdown
# Test Plan

Generated by /plan-eng-review on 2026-05-13
Branch: codex/dashboard-readiness-gate
Repo: every-shift-mvp

## Affected Pages/Routes

- `/schedule/:schedulePublicId/step4` or current Step4 route — generation should still start only after all existing validations pass.

## Key Interactions to Verify

- Generate a schedule after public holidays are seeded; inspect mocked solver request and confirm `publicHolidays` contains only draft-period dates.
- Retry/rebuild from an existing snapshot; confirm holidays come from the snapshot and no new holiday read is performed.

## Edge Cases

- Supabase holiday query fails during generation.
- Existing snapshot has no `publicHolidays` field.
- Draft period starts after a previous-month historical window.

## Critical Paths

- Fresh schedule generation creates enriched solver request and enriched input snapshot.
- Solver transport sends enriched payload unchanged.
```

---

## Performance Review

- The sync loop is at most 60 month requests for 2026-2030. This is acceptable for a manual operator script.
- The browser query is a single indexed range read on `(country_code, holiday_date)`. No caching is necessary for MVP.
- The `publicHolidays` payload is a small date array and should not materially affect request size.
- Do not query holidays per employee, per row, or per grid cell. One query per solver request build is the performance boundary.

---

## Failure Modes

| Codepath               | Realistic failure                            | Test coverage required | Error handling required             | User/operator impact                   |
| ---------------------- | -------------------------------------------- | ---------------------- | ----------------------------------- | -------------------------------------- |
| sync env validation    | `PUBLIC_DATA_SERVICE_KEY` missing            | yes                    | fail before network call            | operator sees missing var name         |
| data.go.kr fetch       | non-success result code or non-JSON response | yes                    | fallback XML or fail clearly        | operator sees provider context         |
| response normalization | single item/array/empty shape drift          | yes                    | normalize all supported shapes      | no duplicate/bad rows                  |
| locdate parsing        | malformed `locdate`                          | yes                    | reject sync                         | bad provider data does not enter DB    |
| upsert                 | duplicate existing row                       | yes                    | upsert by `holiday_date`            | rerun is safe                          |
| holiday read helper    | Supabase query error                         | yes                    | throw Korean message                | user can retry; solver not started     |
| holiday read helper    | inverted date range                          | yes                    | return `[]`                         | no unnecessary query                   |
| fresh request build    | holiday read happens after snapshot          | yes                    | sequence enrichment before snapshot | snapshot contains actual payload       |
| snapshot rebuild       | legacy snapshot lacks field                  | yes                    | use `[]`                            | old snapshot remains immutable         |
| solver transport       | backend rejects unknown field                | contract check         | release blocker                     | do not ship until solver accepts field |

Critical gaps before implementation: none if the required tests above are added. Without the holiday-read failure test and solver contract check, this plan would have a silent failure risk.

---

## Verification Commands

Run focused tests first:

```bash
pnpm test:unit tests/unit/phase2-ops-migrations.spec.ts
pnpm test:unit tests/unit/public-holiday-sync.spec.ts
pnpm test:unit tests/unit/public-holidays-api.spec.ts
pnpm test:unit tests/unit/schedule-solver-request.spec.ts
pnpm test:unit tests/unit/schedule-input-snapshot.spec.ts
pnpm test:unit tests/unit/solver-mapper.spec.ts
pnpm test:unit tests/unit/solver.spec.ts
```

Add any new tests to the command list.

Then run required project checks:

```bash
pnpm lint:check
pnpm run build
```

Because this change touches `.ts`, database migration files, solver request contracts, and scripts, both lint and build are required before completion.

---

## NOT in Scope

Do not include:

- holiday management UI — the MVP only needs solver payload enrichment.
- superuser navigation changes — no user-facing management surface is being added.
- organization-specific holiday overrides — global Korean public holidays solve the current requirement.
- hospital-specific holidays — this needs a separate policy model and is not required for the first solver integration.
- public holiday status labels in the work performance screen — UI labeling is unrelated to solver request construction.
- real AI solver behavior changes outside accepting the new payload field — solver optimization rules are separate from payload delivery.
- RLS policies for `public_holidays` — this table is intentionally global read data in this pass.
- frontend calls to the official data.go.kr API — browser code must not receive the public data API key.
- exposing the public data API key to browser code — keys stay in local operator environment variables only.
- scheduled/automatic holiday sync — manual rerunnable sync is enough for 2026-2030 MVP data.
- expected holiday counts hard-coded in tests — official data can change through substitute or temporary holidays.

---

## Risks and Mitigations

### API Shape Drift

Risk: data.go.kr responses may vary between one-row and multi-row shapes.

Mitigation: normalize both single object and array responses in tests.

### Future Temporary Holidays

Risk: temporary holidays may be announced after the first sync.

Mitigation: keep the sync script repeatable and document rerunning it before generating schedules for future years.

### Snapshot Drift

Risk: solver input snapshots may not include `publicHolidays`, causing retry/rebuild flows to omit them.

Mitigation: update snapshot types and add a regression test for snapshot rebuild or retry behavior.

### Transport Layer Responsibility Creep

Risk: implementing holiday lookup inside `src/api/solver.ts` would mix payload construction with HTTP transport.

Mitigation: keep holiday enrichment in request-building code and only test pass-through in `src/api/solver.ts`.

### Strict Solver Schema

Risk: the deployed solver rejects unknown request fields.

Mitigation: verify or update the external solver contract before production rollout. Treat this as a release blocker.

---

## Acceptance Criteria

- `public.public_holidays` exists as a global table with no RLS enabled by this plan.
- A local sync script can fetch and upsert Korean public holidays for 2026-2030.
- The sync script is rerunnable without duplicate rows.
- Official API keys and Supabase service role keys are read only from private runtime environment variables.
- Browser code never calls data.go.kr directly.
- `SolverRequest` includes `publicHolidays: string[]`.
- Solver requests include only generated draft-period public holiday dates.
- Previous-month historical dates are not included in `publicHolidays`.
- `src/api/solver.ts` sends the enriched payload unchanged.
- The external solver contract accepts `publicHolidays` or is proven to ignore unknown fields before production rollout.
- Relevant unit tests pass.
- `pnpm lint:check` passes.
- `pnpm run build` passes.

---

## TODO Candidates

No `TODOS.md` item is required for this implementation plan. Deferred items are intentionally captured in `NOT in Scope` because they should not silently turn into backlog commitments without product prioritization.

Potential future TODOs only if/when product scope expands:

- Add superuser holiday management UI after MVP solver payload integration proves useful.
- Add organization-specific holiday overrides if hospitals need local closure days or policy exceptions.
- Add scheduled sync automation if manual sync becomes operationally unreliable.

---

## Remaining Open Questions for Implementation

- Confirm during implementation whether `_type=json` works for `getRestDeInfo`; if not, use XML fallback.
- Confirm whether XML fallback is needed. If yes, add a small parser dependency such as `fast-xml-parser`.
- Confirm whether the external solver already tolerates unknown fields or must be updated before this frontend payload field ships.

---

## Completion Summary

- Step 0: Scope Challenge — scope accepted with a reduced/minimum implementation boundary.
- Writing-plans Review: required handoff header added, file ownership map written, 8 checkbox-based TDD tasks added.
- Architecture Review: 1 release-blocking issue found: external solver contract compatibility.
- Code Quality Review: 0 blocking issues if DRY helpers and explicit error handling are followed.
- Test Review: diagram produced, 30 gaps identified for the future implementation.
- Performance Review: 0 issues found; one indexed query per solver request is acceptable.
- NOT in scope: written.
- What already exists: written.
- TODOS.md updates: 0 items proposed; future ideas captured as non-committal candidates.
- Failure modes: 0 critical gaps if required tests and solver contract check are completed; 1 release blocker remains.
- Outside voice: skipped; the user asked to review and strengthen the document, not run an independent model pass.
- Lake Score: 5/5 recommendations chose the complete option.

---

## GSTACK REVIEW REPORT

| Review        | Trigger               | Why                             | Runs | Status      | Findings                                                                                        |
| ------------- | --------------------- | ------------------------------- | ---- | ----------- | ----------------------------------------------------------------------------------------------- |
| CEO Review    | `/plan-ceo-review`    | Scope & strategy                | 0    | —           | —                                                                                               |
| Codex Review  | `/codex review`       | Independent 2nd opinion         | 0    | —           | —                                                                                               |
| Eng Review    | `/plan-eng-review`    | Architecture & tests (required) | 2    | issues_open | latest: 31 implementation issues/gaps, 0 critical gaps, 1 unresolved release blocker            |
| Design Review | `/plan-design-review` | UI/UX gaps                      | 1    | clean       | score: 7/10 -> 9/10, 3 decisions; stale for this plan because it was logged at commit `274855e` |

**UNRESOLVED:** external solver contract compatibility must be verified before production rollout.

**VERDICT:** ENG REVIEW COMPLETE WITH IMPLEMENTATION REQUIREMENTS — ready to implement after accepting the release-blocker check.
