# Vercel Supabase Security Lockdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep login, signup, approval, and schedule-generation UX working while closing the exposed Supabase management token, permissive Supabase DB access, and unauthenticated Vercel solver proxy path.

**Architecture:** Roll out in three contained stages: first revoke and remove exposed repo tokens, then add a Supabase migration that removes broad function/table access without changing data, then require a Supabase Auth access token at the Vercel solver proxy and attach that token from the browser client. Edge Functions keep their existing service-role write path, so approval and schedule write flows should continue even after direct client RLS is tightened.

**Tech Stack:** Vue 3, TypeScript, Vite, Vitest, Vercel Node API route, `@supabase/supabase-js`, Supabase Postgres RLS, SQL migrations.

---

## Scope And Rollout

This plan upgrades the previous security plan but keeps the same product boundary.

- In scope: tracked repo secret cleanup, Vercel solver proxy authentication, Supabase function grants, RLS enablement, permissive policy removal, regression tests, and post-deploy verification.
- Out of scope: Cloud Run direct-origin protection. That must be a separate plan because this work only authenticates the Vercel `/api/*` path.
- User-facing UI copy and app flow must not change.
- No data deletion. SQL changes are grants, RLS enablement, and policies only.
- Run in a dedicated worktree if possible because this touches secrets, migrations, Vercel API code, and client API code.

## Current Findings To Preserve In Context

- `scripts/mcp.env.example` currently contains a real `sbp_...` Supabase Management API token. Treat it as compromised.
- `scripts/mcp.env copy.local` is tracked. Local secret copies must not be tracked.
- `api/[...path].js` re-exports `api/solver-proxy.js`; all Vercel `/api/*` solver traffic lands in `api/solver-proxy.js`.
- `api/solver-proxy.js` currently forwards requests to Cloud Run without authenticating the browser caller.
- `src/api/solver.ts` currently calls `/api/solve` and `/api/status/:id` without a Supabase access token.
- Live policy snapshot before this plan showed:
  - `grant_superuser(text, uuid[])` executable by `anon`, `authenticated`, and `service_role`.
  - `has_org_access(uuid, text)` executable by `anon`, `authenticated`, and `service_role`.
  - `is_super_admin()` executable by `anon`, `authenticated`, and `service_role`.
  - `schedule_assignments`, `organization_settings`, `approval_logs`, `site_staffing_requirements`, `analytics_metrics`, `notifications`, `notification_preferences`, `employee_skills`, and `employee_site_assignments` have RLS disabled.
  - `profiles`, `schedules`, and `schedule_preferences` still have `true`/`public` policies.

## File Structure

- Modify `scripts/mcp.env.example`: keep only placeholders and comments. Do not include real project tokens.
- Remove from git index `scripts/mcp.env copy.local`: tracked local copy must leave the repo. Do not delete a developer's private untracked copy unless explicitly requested.
- Verify `.gitignore`: keep `scripts/mcp.env.local`; add `scripts/mcp.env*.local` and `scripts/mcp.env copy.local` so future local copies stay untracked.
- Create `migrations/20260428_010000_security_boundary_lockdown.sql`: all DB grant/RLS/policy hardening.
- Modify `tests/unit/phase2-ops-migrations.spec.ts`: assert the new migration contains the required security boundaries.
- Modify `api/solver-proxy.js`: require and verify `Authorization: Bearer <Supabase access_token>` before forwarding to Cloud Run; strip browser-sensitive headers.
- Modify `tests/unit/solver-proxy.spec.ts`: cover missing token, malformed token, rejected token, accepted token, Cloud Run forwarding, and blocked header forwarding.
- Modify `src/api/solver.ts`: read Supabase session before solver calls and attach `Authorization`.
- Modify `tests/unit/solver.spec.ts`: mock Supabase session, assert solver calls include `Authorization`, and assert no fetch occurs without a session.
- Optional docs update after implementation: `scripts/README.md` if it currently instructs copying real MCP env values.

## Task 1: Revoke Exposed Supabase Management Token

**Files:**

- No repo file change in this task.
- External action: Supabase Dashboard personal access token settings.

- [ ] **Step 1: Revoke the exposed token**

Open Supabase Dashboard and revoke the exposed Management API token that was present in `scripts/mcp.env.example`.

Expected: the old `sbp_...` token can no longer authenticate.

- [ ] **Step 2: Create a replacement token outside git**

Create a new personal access token only if MCP/Supabase CLI work still needs it.

Expected: the new token exists only in `scripts/mcp.env.local`, which is gitignored.

- [ ] **Step 3: Verify no repo command depends on the old token**

Run:

```bash
git grep -n "sbp_" -- .
```

Expected before Task 2: this likely finds the known tracked leak.

- [ ] **Step 4: Commit**

Do not commit anything in this task if only external Dashboard actions were performed.

## Task 2: Remove Tracked MCP Secrets And Harden Ignore Rules

**Files:**

- Modify: `scripts/mcp.env.example`
- Modify: `.gitignore`
- Remove from git index: `scripts/mcp.env copy.local`

- [ ] **Step 1: Write the failing secret hygiene check manually**

Run:

```bash
git grep -n "sbp_" -- scripts . ':!scripts/mcp.env.local'
```

Expected: FAIL because `scripts/mcp.env.example` currently contains an exposed token.

- [ ] **Step 2: Replace `scripts/mcp.env.example` with placeholders**

Use this exact shape:

```bash
# Source this file to export MCP-related environment variables for Codex/Claude.
# Copy to scripts/mcp.env.local and fill in the secrets, then run:
#   source scripts/mcp.env.local

# Supabase MCP (required)
export SUPABASE_PROJECT_REF="your-project-ref"
export SUPABASE_ACCESS_TOKEN="sbp_your_personal_access_token"

# Shrimp Task Manager MCP (optional, local path)
export MCP_SHRIMP_TASK_MANAGER_ENTRY="/absolute/path/to/mcp-shrimp-task-manager/dist/index.js"

# Context7 MCP (optional, local path)
export MCP_CONTEXT7_ENTRY="/absolute/path/to/@upstash/context7-mcp/dist/index.js"

# Sequential Thinking MCP (optional, local path)
export MCP_SEQUENTIAL_THINKING_ENTRY="/absolute/path/to/@modelcontextprotocol/server-sequential-thinking/dist/index.js"
```

- [ ] **Step 3: Update `.gitignore`**

Add:

```gitignore
scripts/mcp.env*.local
scripts/mcp.env copy.local
```

Keep the existing `scripts/mcp.env.local` entry if present.

- [ ] **Step 4: Remove the tracked local copy from git**

Run:

```bash
git rm --cached 'scripts/mcp.env copy.local'
```

Expected: file is staged as deleted from git, but any local working copy remains available if the command only removes from the index.

- [ ] **Step 5: Verify no real management token remains in tracked files**

Run:

```bash
git grep -n "sbp_" -- . ':!scripts/mcp.env.local'
```

Expected: either no matches or only placeholder text such as `sbp_your_personal_access_token`.

- [ ] **Step 6: Commit**

```bash
git add .gitignore scripts/mcp.env.example
git add -u 'scripts/mcp.env copy.local'
git commit -m "chore: remove tracked supabase management token"
```

## Task 3: Add Migration Contract Tests

**Files:**

- Modify: `tests/unit/phase2-ops-migrations.spec.ts`
- Create later: `migrations/20260428_010000_security_boundary_lockdown.sql`

- [ ] **Step 1: Add a failing migration contract test**

Append this test to `tests/unit/phase2-ops-migrations.spec.ts`:

```ts
it('locks down public security boundaries for solver launch', () => {
  const sql = readMigration('20260428_010000_security_boundary_lockdown.sql').toLowerCase();

  expect(sql).toContain(
    'revoke all on function public.grant_superuser(text, uuid[]) from public, anon, authenticated'
  );
  expect(sql).toContain(
    'grant execute on function public.grant_superuser(text, uuid[]) to service_role'
  );
  expect(sql).toContain(
    'revoke all on function public.has_org_access(uuid, text) from public, anon'
  );
  expect(sql).toContain(
    'grant execute on function public.has_org_access(uuid, text) to authenticated, service_role'
  );
  expect(sql).toContain('revoke all on function public.is_super_admin() from public, anon');

  for (const tableName of [
    'schedule_assignments',
    'organization_settings',
    'approval_logs',
    'site_staffing_requirements',
    'analytics_metrics',
    'notifications',
    'notification_preferences',
    'employee_skills',
    'employee_site_assignments',
  ]) {
    expect(sql).toContain(`alter table if exists public.${tableName} enable row level security`);
  }

  expect(sql).toContain('drop policy if exists "admin can do everything" on public.profiles');
  expect(sql).toContain(
    'drop policy if exists "admin can do everything" on public.schedule_preferences'
  );
  expect(sql).toContain(
    'drop policy if exists "users can view own organization schedules" on public.schedules'
  );
  expect(sql).toContain('create policy schedule_assignments_select_authenticated');
  expect(sql).toContain('create policy schedule_assignments_admin_insert');
  expect(sql).toContain('create policy schedule_preferences_select_authenticated');
  expect(sql).toContain('create policy organization_settings_admin_all');
  expect(sql).toContain('create policy approval_logs_no_client_access');
});
```

- [ ] **Step 2: Run the new test and verify it fails**

Run:

```bash
pnpm test:unit tests/unit/phase2-ops-migrations.spec.ts
```

Expected: FAIL because `migrations/20260428_010000_security_boundary_lockdown.sql` does not exist yet.

- [ ] **Step 3: Commit only if the team allows red commits**

Usually skip committing the failing test alone unless the branch policy accepts TDD red commits.

## Task 4: Create Supabase Security Lockdown Migration

**Files:**

- Create: `migrations/20260428_010000_security_boundary_lockdown.sql`
- Test: `tests/unit/phase2-ops-migrations.spec.ts`

- [ ] **Step 1: Create the migration**

Create `migrations/20260428_010000_security_boundary_lockdown.sql` with the SQL below. Keep table changes in `IF EXISTS` form and guard function grants with `to_regprocedure(...)` so the migration is robust across branch drift.

```sql
-- Security boundary lockdown for public DB access.
-- Data is preserved; this migration only changes grants, RLS, and policies.

BEGIN;

DO $$
BEGIN
  IF to_regprocedure('public.grant_superuser(text, uuid[])') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.grant_superuser(text, uuid[]) FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.grant_superuser(text, uuid[]) TO service_role;
  END IF;

  IF to_regprocedure('public.has_org_access(uuid, text)') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.has_org_access(uuid, text) FROM PUBLIC, anon;
    GRANT EXECUTE ON FUNCTION public.has_org_access(uuid, text) TO authenticated, service_role;
  END IF;

  IF to_regprocedure('public.is_super_admin()') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.is_super_admin() FROM PUBLIC, anon;
    GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated, service_role;
  END IF;

  IF to_regprocedure('public.onboarding_progress_before_write()') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.onboarding_progress_before_write() FROM PUBLIC, anon;
    GRANT EXECUTE ON FUNCTION public.onboarding_progress_before_write() TO authenticated, service_role;
  END IF;
END;
$$;

ALTER TABLE IF EXISTS public.schedule_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.organization_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.approval_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.site_staffing_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.analytics_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.employee_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.employee_site_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can do everything" ON public.profiles;
DROP POLICY IF EXISTS profiles_self_select ON public.profiles;
DROP POLICY IF EXISTS profiles_self_update ON public.profiles;

CREATE POLICY profiles_self_select ON public.profiles
FOR SELECT TO authenticated
USING (auth.uid() = id);

CREATE POLICY profiles_self_update ON public.profiles
FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admin can do everything" ON public.schedules;
DROP POLICY IF EXISTS "Users can view own organization schedules" ON public.schedules;
DROP POLICY IF EXISTS "Users can insert own organization schedules" ON public.schedules;
DROP POLICY IF EXISTS "Users can update own organization schedules" ON public.schedules;
DROP POLICY IF EXISTS "Users can delete own organization schedules" ON public.schedules;
DROP POLICY IF EXISTS schedules_select_authenticated ON public.schedules;
DROP POLICY IF EXISTS schedules_admin_all ON public.schedules;

CREATE POLICY schedules_select_authenticated ON public.schedules
FOR SELECT TO authenticated
USING (public.has_org_access(organization_id, 'user'));

CREATE POLICY schedules_admin_all ON public.schedules
FOR ALL TO authenticated
USING (public.has_org_access(organization_id, 'admin'))
WITH CHECK (public.has_org_access(organization_id, 'admin'));

DROP POLICY IF EXISTS "Admin can do everything" ON public.schedule_preferences;
DROP POLICY IF EXISTS schedule_preferences_select_authenticated ON public.schedule_preferences;
DROP POLICY IF EXISTS schedule_preferences_admin_all ON public.schedule_preferences;

CREATE POLICY schedule_preferences_select_authenticated ON public.schedule_preferences
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.schedules s
    WHERE s.id = schedule_preferences.schedule_id
      AND public.has_org_access(s.organization_id, 'user')
  )
);

CREATE POLICY schedule_preferences_admin_all ON public.schedule_preferences
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.schedules s
    WHERE s.id = schedule_preferences.schedule_id
      AND public.has_org_access(s.organization_id, 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.schedules s
    WHERE s.id = schedule_preferences.schedule_id
      AND public.has_org_access(s.organization_id, 'admin')
  )
);

DROP POLICY IF EXISTS schedule_assignments_select_authenticated ON public.schedule_assignments;
DROP POLICY IF EXISTS schedule_assignments_admin_insert ON public.schedule_assignments;
DROP POLICY IF EXISTS schedule_assignments_admin_update ON public.schedule_assignments;
DROP POLICY IF EXISTS schedule_assignments_admin_delete ON public.schedule_assignments;

CREATE POLICY schedule_assignments_select_authenticated ON public.schedule_assignments
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.schedules s
    WHERE s.id = schedule_assignments.schedule_id
      AND public.has_org_access(s.organization_id, 'user')
  )
);

CREATE POLICY schedule_assignments_admin_insert ON public.schedule_assignments
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.schedules s
    WHERE s.id = schedule_assignments.schedule_id
      AND public.has_org_access(s.organization_id, 'admin')
  )
);

CREATE POLICY schedule_assignments_admin_update ON public.schedule_assignments
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.schedules s
    WHERE s.id = schedule_assignments.schedule_id
      AND public.has_org_access(s.organization_id, 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.schedules s
    WHERE s.id = schedule_assignments.schedule_id
      AND public.has_org_access(s.organization_id, 'admin')
  )
);

CREATE POLICY schedule_assignments_admin_delete ON public.schedule_assignments
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.schedules s
    WHERE s.id = schedule_assignments.schedule_id
      AND public.has_org_access(s.organization_id, 'admin')
  )
);

DROP POLICY IF EXISTS organization_settings_select_authenticated ON public.organization_settings;
DROP POLICY IF EXISTS organization_settings_admin_all ON public.organization_settings;

CREATE POLICY organization_settings_select_authenticated ON public.organization_settings
FOR SELECT TO authenticated
USING (public.has_org_access(organization_id, 'user'));

CREATE POLICY organization_settings_admin_all ON public.organization_settings
FOR ALL TO authenticated
USING (public.has_org_access(organization_id, 'admin'))
WITH CHECK (public.has_org_access(organization_id, 'admin'));

DROP POLICY IF EXISTS site_staffing_requirements_select_authenticated ON public.site_staffing_requirements;
DROP POLICY IF EXISTS site_staffing_requirements_admin_all ON public.site_staffing_requirements;

CREATE POLICY site_staffing_requirements_select_authenticated ON public.site_staffing_requirements
FOR SELECT TO authenticated
USING (public.has_org_access(organization_id, 'user'));

CREATE POLICY site_staffing_requirements_admin_all ON public.site_staffing_requirements
FOR ALL TO authenticated
USING (public.has_org_access(organization_id, 'admin'))
WITH CHECK (public.has_org_access(organization_id, 'admin'));

DROP POLICY IF EXISTS analytics_metrics_select_authenticated ON public.analytics_metrics;
DROP POLICY IF EXISTS analytics_metrics_admin_all ON public.analytics_metrics;

CREATE POLICY analytics_metrics_select_authenticated ON public.analytics_metrics
FOR SELECT TO authenticated
USING (public.has_org_access(organization_id, 'user'));

CREATE POLICY analytics_metrics_admin_all ON public.analytics_metrics
FOR ALL TO authenticated
USING (public.has_org_access(organization_id, 'admin'))
WITH CHECK (public.has_org_access(organization_id, 'admin'));

DROP POLICY IF EXISTS notifications_select_authenticated ON public.notifications;
DROP POLICY IF EXISTS notifications_admin_all ON public.notifications;

CREATE POLICY notifications_select_authenticated ON public.notifications
FOR SELECT TO authenticated
USING (public.has_org_access(organization_id, 'user'));

CREATE POLICY notifications_admin_all ON public.notifications
FOR ALL TO authenticated
USING (public.has_org_access(organization_id, 'admin'))
WITH CHECK (public.has_org_access(organization_id, 'admin'));

DROP POLICY IF EXISTS notification_preferences_select_authenticated ON public.notification_preferences;
DROP POLICY IF EXISTS notification_preferences_admin_all ON public.notification_preferences;

CREATE POLICY notification_preferences_select_authenticated ON public.notification_preferences
FOR SELECT TO authenticated
USING (public.has_org_access(organization_id, 'user'));

CREATE POLICY notification_preferences_admin_all ON public.notification_preferences
FOR ALL TO authenticated
USING (public.has_org_access(organization_id, 'admin'))
WITH CHECK (public.has_org_access(organization_id, 'admin'));

DROP POLICY IF EXISTS employee_skills_select_authenticated ON public.employee_skills;
DROP POLICY IF EXISTS employee_skills_admin_all ON public.employee_skills;

CREATE POLICY employee_skills_select_authenticated ON public.employee_skills
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.employees e
    JOIN public.skills sk ON sk.id = employee_skills.skill_id
    WHERE e.id = employee_skills.employee_id
      AND sk.organization_id = e.organization_id
      AND public.has_org_access(e.organization_id, 'user')
  )
);

CREATE POLICY employee_skills_admin_all ON public.employee_skills
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.employees e
    JOIN public.skills sk ON sk.id = employee_skills.skill_id
    WHERE e.id = employee_skills.employee_id
      AND sk.organization_id = e.organization_id
      AND public.has_org_access(e.organization_id, 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.employees e
    JOIN public.skills sk ON sk.id = employee_skills.skill_id
    WHERE e.id = employee_skills.employee_id
      AND sk.organization_id = e.organization_id
      AND public.has_org_access(e.organization_id, 'admin')
  )
);

DROP POLICY IF EXISTS employee_site_assignments_select_authenticated ON public.employee_site_assignments;
DROP POLICY IF EXISTS employee_site_assignments_admin_all ON public.employee_site_assignments;

CREATE POLICY employee_site_assignments_select_authenticated ON public.employee_site_assignments
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.employees e
    JOIN public.sites st ON st.id = employee_site_assignments.site_id
    WHERE e.id = employee_site_assignments.employee_id
      AND st.organization_id = e.organization_id
      AND public.has_org_access(e.organization_id, 'user')
  )
);

CREATE POLICY employee_site_assignments_admin_all ON public.employee_site_assignments
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.employees e
    JOIN public.sites st ON st.id = employee_site_assignments.site_id
    WHERE e.id = employee_site_assignments.employee_id
      AND st.organization_id = e.organization_id
      AND public.has_org_access(e.organization_id, 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.employees e
    JOIN public.sites st ON st.id = employee_site_assignments.site_id
    WHERE e.id = employee_site_assignments.employee_id
      AND st.organization_id = e.organization_id
      AND public.has_org_access(e.organization_id, 'admin')
  )
);

DROP POLICY IF EXISTS approval_logs_no_client_access ON public.approval_logs;
CREATE POLICY approval_logs_no_client_access ON public.approval_logs
FOR ALL TO authenticated
USING (false)
WITH CHECK (false);

COMMIT;
```

- [ ] **Step 2: Run migration contract test**

Run:

```bash
pnpm test:unit tests/unit/phase2-ops-migrations.spec.ts
```

Expected: PASS.

- [ ] **Step 3: Review SQL for tables that may not exist in old branches**

Run:

```bash
rg -n "ALTER TABLE IF EXISTS public\\.|CREATE POLICY" migrations/20260428_010000_security_boundary_lockdown.sql
```

Expected: every RLS enablement uses `ALTER TABLE IF EXISTS`; every `CREATE POLICY` targets a table that exists in the current Supabase project.

- [ ] **Step 4: Commit**

```bash
git add tests/unit/phase2-ops-migrations.spec.ts migrations/20260428_010000_security_boundary_lockdown.sql
git commit -m "fix: lock down supabase public security boundaries"
```

## Task 5: Add Vercel Solver Proxy Auth Tests

**Files:**

- Modify: `tests/unit/solver-proxy.spec.ts`
- Modify later: `api/solver-proxy.js`

- [ ] **Step 1: Add tests for proxy auth and header stripping**

Replace or extend `tests/unit/solver-proxy.spec.ts` so it imports the new helpers:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import proxySolverApi, {
  buildCloudRunApiUrl,
  createForwardHeaders,
  extractBearerToken,
} from '../../api/solver-proxy.js';
```

Inside the `describe('solver vercel proxy', () => { ... })` block, add:

```ts
beforeEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});
```

Add these cases:

```ts
it('extracts bearer tokens case-insensitively', () => {
  expect(extractBearerToken('Bearer token-1')).toBe('token-1');
  expect(extractBearerToken('bearer token-2')).toBe('token-2');
  expect(extractBearerToken('Basic abc')).toBeNull();
  expect(extractBearerToken(undefined)).toBeNull();
});

it('does not forward browser credentials or routing headers to cloud run', () => {
  const headers = createForwardHeaders({
    origin: 'https://every-shift-mvp.vercel.app',
    referer: 'https://every-shift-mvp.vercel.app/app/schedules/1',
    host: 'every-shift-mvp.vercel.app',
    cookie: 'sb-session=secret',
    authorization: 'Bearer browser-token',
    'x-forwarded-host': 'every-shift-mvp.vercel.app',
    'content-type': 'application/json',
  });

  expect(headers.has('origin')).toBe(false);
  expect(headers.has('referer')).toBe(false);
  expect(headers.has('host')).toBe(false);
  expect(headers.has('cookie')).toBe(false);
  expect(headers.has('authorization')).toBe(false);
  expect(headers.has('x-forwarded-host')).toBe(false);
  expect(headers.get('content-type')).toBe('application/json');
});

it('returns 401 before forwarding when authorization is missing', async () => {
  const fetchMock = vi.spyOn(globalThis, 'fetch');
  const req = { method: 'POST', url: '/api/solve', headers: {}, query: {}, body: {} };
  const res = createMockResponse();

  await proxySolverApi(req, res);

  expect(res.statusCode).toBe(401);
  expect(res.body).toEqual({ code: 'unauthorized', message: 'Authorization required' });
  expect(fetchMock).not.toHaveBeenCalled();
});

it('forwards to cloud run after a valid supabase token', async () => {
  vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('SUPABASE_ANON_KEY', 'anon-key');

  vi.spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ user: { id: 'user-1' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ execution_id: 'exec-1' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

  const req = {
    method: 'POST',
    url: '/api/solve',
    headers: {
      authorization: 'Bearer session-token',
      cookie: 'secret',
      'content-type': 'application/json',
    },
    query: {},
    body: { hello: 'world' },
  };
  const res = createMockResponse();

  await proxySolverApi(req, res);

  expect(res.statusCode).toBe(200);
  expect(globalThis.fetch).toHaveBeenNthCalledWith(
    2,
    'https://every-shift-api-service-554455861916.asia-northeast3.run.app/api/solve',
    expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ hello: 'world' }),
    })
  );
  const forwardedHeaders = (vi.mocked(globalThis.fetch).mock.calls[1]?.[1] as RequestInit)
    .headers as Headers;
  expect(forwardedHeaders.has('authorization')).toBe(false);
  expect(forwardedHeaders.has('cookie')).toBe(false);
});
```

Add this helper in the test file:

```ts
function createMockResponse() {
  return {
    statusCode: 200,
    headers: {} as Record<string, string | string[]>,
    body: undefined as unknown,
    setHeader(name: string, value: string | string[]) {
      this.headers[name.toLowerCase()] = value;
    },
    send(payload: unknown) {
      if (Buffer.isBuffer(payload)) {
        const text = payload.toString('utf8');
        try {
          this.body = JSON.parse(text);
        } catch {
          this.body = text;
        }
        return;
      }
      this.body = payload;
    },
    json(payload: unknown) {
      this.body = payload;
    },
  };
}
```

- [ ] **Step 2: Run tests and verify they fail**

Run:

```bash
pnpm test:unit tests/unit/solver-proxy.spec.ts
```

Expected: FAIL because `extractBearerToken` and proxy auth are not implemented yet, and `authorization` is still forwarded.

## Task 6: Implement Vercel Solver Proxy Auth

**Files:**

- Modify: `api/solver-proxy.js`
- Test: `tests/unit/solver-proxy.spec.ts`

- [ ] **Step 1: Add auth helper and stricter blocked headers**

In `api/solver-proxy.js`, add `authorization`, `cookie`, and common proxy routing headers to `blockedForwardHeaderNames`:

```js
const blockedForwardHeaderNames = new Set([
  'authorization',
  'connection',
  'content-length',
  'cookie',
  'forwarded',
  'host',
  'origin',
  'referer',
  'transfer-encoding',
  'x-forwarded-for',
  'x-forwarded-host',
  'x-forwarded-port',
  'x-forwarded-proto',
  'x-real-ip',
]);
```

Add:

```js
function getSupabaseUrl() {
  return process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
}

function getSupabaseAnonKey() {
  return process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
}

export function extractBearerToken(authorizationHeader) {
  if (!authorizationHeader) {
    return null;
  }

  const value = Array.isArray(authorizationHeader)
    ? authorizationHeader[0]
    : String(authorizationHeader);
  const match = value.match(/^bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export async function verifySupabaseAccessToken(accessToken) {
  const supabaseUrl = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  if (!supabaseUrl || !anonKey) {
    throw new Error('Missing Supabase environment variables for solver proxy auth');
  }

  const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/user`, {
    method: 'GET',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    return null;
  }

  const user = await response.json();
  return user && typeof user === 'object' && 'id' in user ? user : null;
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.send(JSON.stringify(payload));
}
```

- [ ] **Step 2: Require auth before `fetch(targetUrl)`**

At the start of `proxySolverApi`:

```js
export default async function proxySolverApi(req, res) {
  const accessToken = extractBearerToken(req.headers?.authorization);
  if (!accessToken) {
    sendJson(res, 401, { code: 'unauthorized', message: 'Authorization required' });
    return;
  }

  let user = null;
  try {
    user = await verifySupabaseAccessToken(accessToken);
  } catch (error) {
    console.error('[solver-proxy] Supabase auth verification failed:', error);
    sendJson(res, 500, { code: 'auth_verification_failed', message: 'Auth verification failed' });
    return;
  }

  if (!user) {
    sendJson(res, 401, { code: 'unauthorized', message: 'Invalid authorization token' });
    return;
  }

  const targetUrl = buildCloudRunApiUrl(req.url || '', req.query?.path);
  // existing forward logic stays here
}
```

- [ ] **Step 3: Run proxy tests**

Run:

```bash
pnpm test:unit tests/unit/solver-proxy.spec.ts
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add api/solver-proxy.js tests/unit/solver-proxy.spec.ts
git commit -m "fix: require auth on solver proxy"
```

## Task 7: Add Client Solver Auth Tests

**Files:**

- Modify: `tests/unit/solver.spec.ts`
- Modify later: `src/api/solver.ts`

- [ ] **Step 1: Mock Supabase session in solver tests**

At the top of `tests/unit/solver.spec.ts`, before imports from `@/api/solver`, add:

```ts
const getSessionMock = vi.hoisted(() => vi.fn());

vi.mock('@/api/supabase', () => ({
  supabase: {
    auth: {
      getSession: getSessionMock,
    },
  },
}));
```

In `beforeEach`, set:

```ts
getSessionMock.mockResolvedValue({
  data: {
    session: {
      access_token: 'session-token',
    },
  },
  error: null,
});
```

- [ ] **Step 2: Update existing fetch assertions**

For `createSolverExecution`, expect:

```ts
expect(init).toMatchObject({
  method: 'POST',
  headers: {
    Authorization: 'Bearer session-token',
    'Content-Type': 'application/json',
  },
});
```

For `getSolverStatus`, assert the status request includes:

```ts
expect(init).toMatchObject({
  headers: {
    Authorization: 'Bearer session-token',
  },
});
```

- [ ] **Step 3: Add a no-session fail-fast test**

```ts
it('fails before calling solver when there is no authenticated session token', async () => {
  getSessionMock.mockResolvedValueOnce({
    data: { session: null },
    error: null,
  });
  const fetchMock = vi.spyOn(globalThis, 'fetch');

  await expect(createSolverExecution(createSolverRequest(), directApiEnv)).rejects.toMatchObject({
    name: 'SolverApiError',
    message: '로그인이 필요합니다. 다시 로그인한 뒤 근무표 생성을 시도해주세요.',
    code: 'solver_auth_required',
  });
  expect(fetchMock).not.toHaveBeenCalled();
});
```

- [ ] **Step 4: Run tests and verify they fail**

Run:

```bash
pnpm test:unit tests/unit/solver.spec.ts
```

Expected: FAIL because `src/api/solver.ts` does not read Supabase session yet.

## Task 8: Attach Supabase Session Token To Solver Calls

**Files:**

- Modify: `src/api/solver.ts`
- Test: `tests/unit/solver.spec.ts`

- [ ] **Step 1: Import Supabase client**

Add near the top of `src/api/solver.ts`:

```ts
import { supabase } from '@/api/supabase';
```

- [ ] **Step 2: Add a required token helper**

Add after `SolverApiError`:

```ts
async function getRequiredSolverAccessToken(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw error;
  }

  const accessToken = data.session?.access_token;
  if (!accessToken) {
    throw new SolverApiError('로그인이 필요합니다. 다시 로그인한 뒤 근무표 생성을 시도해주세요.', {
      code: 'solver_auth_required',
    });
  }

  return accessToken;
}

function buildSolverAuthHeaders(
  accessToken: string,
  headers: Record<string, string> = {}
): Record<string, string> {
  return {
    ...headers,
    Authorization: `Bearer ${accessToken}`,
  };
}
```

- [ ] **Step 3: Attach token in `createSolverExecution`**

Before `fetchSolverApiWithDevProxyFallback`, call:

```ts
const accessToken = await getRequiredSolverAccessToken();
```

Then set headers:

```ts
headers: buildSolverAuthHeaders(accessToken, { 'Content-Type': 'application/json' }),
```

Keep the existing network error handling.

- [ ] **Step 4: Attach token in `getSolverStatus`**

Before `fetchSolverApiWithDevProxyFallback`, call:

```ts
const accessToken = await getRequiredSolverAccessToken();
```

Then set:

```ts
headers: buildSolverAuthHeaders(accessToken),
signal: options.signal,
```

- [ ] **Step 5: Run solver tests**

Run:

```bash
pnpm test:unit tests/unit/solver.spec.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/api/solver.ts tests/unit/solver.spec.ts
git commit -m "fix: authenticate solver client requests"
```

## Task 9: Regression Verification

**Files:**

- No additional file changes expected.

- [ ] **Step 1: Run focused unit tests**

Run:

```bash
pnpm test:unit tests/unit/solver-proxy.spec.ts tests/unit/solver.spec.ts tests/unit/phase2-schedule-api.spec.ts tests/unit/phase2-ops-api.spec.ts tests/unit/approval-api.spec.ts tests/unit/phase2-ops-migrations.spec.ts
```

Expected: PASS.

- [ ] **Step 2: Run lint**

Run:

```bash
pnpm lint:check
```

Expected: PASS. If ESLint reports errors, fix them and rerun.

- [ ] **Step 3: Run schedule workflow e2e if the branch has deployment or local app dependencies ready**

Run:

```bash
pnpm test:e2e tests/e2e/schedule-workflow.spec.ts
```

Expected: PASS. If local auth fixtures are unavailable, record the blocker in the final handoff.

- [ ] **Step 4: Commit verification-only fixes if needed**

```bash
git add <changed-files>
git commit -m "test: cover security lockdown regressions"
```

Only run this if Step 1-3 required additional code/test fixes.

## Task 10: Deploy And Live Verification

**Files:**

- No repo file changes expected unless deployment config is missing.

- [ ] **Step 1: Apply the Supabase migration**

Use the repo's established Supabase migration workflow. If applying manually, use the full migration file and verify it appears in the Supabase migration history.

Expected: migration succeeds without data deletion.

- [ ] **Step 2: Configure Vercel env vars**

Ensure Vercel has server runtime env vars:

```text
SUPABASE_URL=<project url>
SUPABASE_ANON_KEY=<anon key>
```

If only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are present and available to the function runtime, the proxy fallback works, but server-only names are clearer.

- [ ] **Step 3: Deploy Vercel**

Deploy the branch using the repo's normal Vercel flow.

Expected: `/api/solve` and `/api/status/:id` are served by the updated proxy.

- [ ] **Step 4: Verify unauthenticated solver proxy calls fail**

Run against production:

```bash
curl -i https://<vercel-domain>/api/status/test-execution
```

Expected: `401` with JSON body:

```json
{ "code": "unauthorized", "message": "Authorization required" }
```

- [ ] **Step 5: Verify logged-in schedule generation still works**

In the app, with a real authenticated user:

1. Log in.
2. Complete Step 1 basic info.
3. Complete Step 2 site info.
4. Upload or confirm Step 3 initial grid data.
5. Generate a schedule and wait for status polling.
6. Review Step 4/5 results.
7. Export Excel.

Expected: the schedule-generation UX is unchanged for a logged-in user.

- [ ] **Step 6: Verify approval and signup flows**

Check:

```text
signup-submit
hospital-search
approval-read queue/detail
approval-decision approve/reject
phase2-ops organization/site/roster reads and writes
```

Expected: Edge Function service-role paths still work.

- [ ] **Step 7: Verify Supabase advisors**

Run Supabase security advisor and confirm these findings are gone:

```text
rls_disabled_in_public for targeted tables
rls_policy_always_true for profiles/schedules/schedule_preferences
grant_superuser executable by anon/authenticated
```

- [ ] **Step 8: Verify anonymous REST exposure is reduced**

With only the anon key and no user JWT, request these tables:

```text
/rest/v1/schedule_assignments
/rest/v1/profiles
/rest/v1/schedules
/rest/v1/organization_settings
```

Expected: no private rows are returned. Depending on PostgREST headers and table grants, `Content-Range` may still show `0` but must not reveal private row counts.

## Task 11: Git History Scrub Maintenance Window

**Files:**

- Repository history, not normal working tree files.

- [ ] **Step 1: Schedule after token revocation and deployment**

Only do this after the exposed token is revoked. History rewrite affects every collaborator.

- [ ] **Step 2: Coordinate branch freeze**

Tell collaborators to pause pushes and prepare to rebase or reclone.

- [ ] **Step 3: Scrub history with an agreed tool**

Use `git filter-repo` or BFG with the exact exposed token value. Do not put the token value in shell history; use a temporary secrets file if needed.

- [ ] **Step 4: Force-push only during the window**

Force-push rewritten branches/tags according to the agreed repo policy.

- [ ] **Step 5: Rotate any token that could have been derived or copied**

Confirm the old token remains revoked and any replacement token is not committed.

## Risks And Rollback

- If schedule UI fails after the DB migration, first verify Edge Functions are using service-role clients for writes. Client-side direct reads may now need org-scoped RLS policies, but do not reintroduce `USING (true)`.
- If Vercel `/api/*` returns `500 auth_verification_failed`, check `SUPABASE_URL` and `SUPABASE_ANON_KEY` in Vercel server runtime env.
- If Cloud Run is still publicly callable, this work is not a full solver-origin security fix. It only closes the Vercel path.
- Rollback order: revert Vercel proxy auth if schedule generation is down, then investigate token availability; do not rollback token revocation; do not restore permissive RLS without a narrower replacement policy.

## Review Notes

The original draft was directionally correct but needed these upgrades:

- Token revocation must happen before repo cleanup and before any history rewrite.
- The solver proxy must strip browser `Authorization` and `Cookie` before forwarding, otherwise Cloud Run receives user session material.
- Client solver tests should live in `tests/unit/solver.spec.ts`, not `phase2-schedule-api.spec.ts`, because `src/api/solver.ts` owns `/api/solve` and `/api/status/:id`.
- RLS policies for child tables must join through `schedules` or `employees` instead of assuming every table has `organization_id`.
- Approval/sign-up internal tables should remain closed to direct client access; Edge Functions keep service-role access.
- `has_org_access` can remain executable by `authenticated` because policies call it for logged-in users, but `anon` access should be removed.
