import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const readMigration = (name: string) =>
  readFileSync(join(process.cwd(), 'migrations', name), 'utf8');

describe('phase2 ops migrations', () => {
  it('upgrades existing sites tables before referencing schedule-active columns', () => {
    const migration = readMigration('20260408_090000_phase2a2_ops_foundation.sql');
    const addScheduleActiveColumnIndex = migration.indexOf(
      'ADD COLUMN IF NOT EXISTS is_schedule_active'
    );
    const scheduleActiveIndexIndex = migration.indexOf(
      'CREATE UNIQUE INDEX IF NOT EXISTS sites_one_schedule_active_per_org_idx'
    );

    expect(addScheduleActiveColumnIndex).toBeGreaterThan(-1);
    expect(scheduleActiveIndexIndex).toBeGreaterThan(-1);
    expect(addScheduleActiveColumnIndex).toBeLessThan(scheduleActiveIndexIndex);
  });

  it('upgrades existing off-request policy tables before referencing period columns', () => {
    const migration = readMigration('20260408_100000_phase2a2_off_request_policy.sql');
    const addPeriodTypeColumnIndex = migration.indexOf(
      'ADD COLUMN IF NOT EXISTS period_type'
    );
    const policyRuleConstraintIndex = migration.indexOf(
      'ADD CONSTRAINT off_request_policy_rules_organization_rank_period_key'
    );

    expect(addPeriodTypeColumnIndex).toBeGreaterThan(-1);
    expect(policyRuleConstraintIndex).toBeGreaterThan(-1);
    expect(addPeriodTypeColumnIndex).toBeLessThan(policyRuleConstraintIndex);
  });

  it('upgrades existing fairness ledger tables before referencing finalized columns', () => {
    const migration = readMigration('20260408_110000_phase2a2_fairness_ledger.sql');
    const addFinalizedAtColumnIndex = migration.indexOf(
      'ADD COLUMN IF NOT EXISTS finalized_at'
    );
    const finalizedAtIndexIndex = migration.indexOf(
      'CREATE INDEX IF NOT EXISTS fairness_ledger_monthly_organization_month_idx'
    );

    expect(addFinalizedAtColumnIndex).toBeGreaterThan(-1);
    expect(finalizedAtIndexIndex).toBeGreaterThan(-1);
    expect(addFinalizedAtColumnIndex).toBeLessThan(finalizedAtIndexIndex);
  });

  it('patches finalize RPC finalized_version_id ambiguity at the ledger conflict boundary', () => {
    const sql = readMigration(
      '20260513_120000_finalize_schedule_version_atomic_ambiguity_fix.sql'
    );

    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.finalize_schedule_version_atomic');
    expect(sql).toContain('ON CONSTRAINT fairness_ledger_monthly_finalized_version_id_key');
    expect(sql).toContain('v_return_finalized_version_id');
    expect(sql).toContain('RETURN QUERY SELECT');
    expect(sql).not.toContain('ON CONFLICT (finalized_version_id)');
    expect(sql).not.toMatch(/INTO\s+schedule_id,\s+finalized_version_id/i);
  });

  it('rejects empty solver completed payloads and empty finalize targets', () => {
    const sql = readMigration('20260805_120000_empty_assignment_guards.sql');

    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.commit_schedule_version_solver_result_atomic');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.finalize_schedule_version_atomic');
    expect(sql).toContain("MESSAGE = 'empty_solver_result'");
    expect(sql).toContain("MESSAGE = 'empty_assignments'");
    expect(sql).toContain('jsonb_array_length(COALESCE(v_filtered_assignments, \'[]\'::jsonb)) = 0');
    expect(sql).toContain('FROM schedule_assignments sa');
    expect(sql).toContain('v_assignment_count');
  });

  it('adds global public holidays without enabling rls', () => {
    const originalSql = readMigration('20260513_130000_public_holidays.sql');
    const sql = originalSql.toLowerCase();

    expect(sql).toContain('create table if not exists public.public_holidays');
    expect(sql).toContain('holiday_date date primary key');
    expect(sql).toContain('name text not null');
    expect(sql).toContain('is_holiday boolean not null default true');
    expect(originalSql).toContain("country_code text NOT NULL DEFAULT 'KR'");
    expect(sql).toContain("source text not null default 'data.go.kr:kasi-special-day'");
    expect(sql).toContain("source_payload jsonb not null default '{}'::jsonb");
    expect(sql).toContain('synced_at timestamptz not null default now()');
    expect(sql).toContain('created_at timestamptz not null default now()');
    expect(sql).toContain('updated_at timestamptz not null default now()');
    expect(sql).toMatch(
      /create index if not exists public_holidays_country_date_idx\s+on public\.public_holidays \(country_code, holiday_date\)/
    );
    expect(originalSql).toContain("CHECK (country_code = 'KR')");
    expect(sql).not.toContain('enable row level security');
  });

  it('backfills memberships and tightens org rls with membership-based access helpers', () => {
    const sql = readMigration(
      '20260418120000_phase2b_epic2_membership_auth_rbac_multi_org.sql'
    ).toLowerCase();

    expect(sql).toContain('create or replace function public.has_org_access');
    expect(sql).toContain('insert into public.organization_memberships');
    expect(sql).toContain("and p.account_status = 'active'");
    expect(sql).toContain('on conflict (organization_id, user_id) do nothing');
    expect(sql).toContain(
      'create index if not exists idx_organization_memberships_user_status_org'
    );
    expect(sql).toContain('drop policy if exists "admin can do everything" on public.profiles');
    expect(sql).toContain('create policy profiles_self_select on public.profiles');
    expect(sql).toContain(
      'drop policy if exists "users can view own organization schedules" on public.schedules'
    );
    expect(sql).toContain('create policy schedules_select_authenticated on public.schedules');
    expect(sql).toContain('create policy schedules_admin_all on public.schedules');
    expect(sql).toContain("has_org_access(organization_id, 'admin')");
  });

  it('adds a corrective membership backfill migration that upgrades stale non-approved rows only', () => {
    const sql = readMigration(
      '20260419120000_phase2b_membership_backfill_corrective.sql'
    ).toLowerCase();

    expect(sql).toContain('insert into public.organization_memberships');
    expect(sql).toContain("lower(coalesce(p.account_status, 'pending')) = 'active'");
    expect(sql).toContain("lower(coalesce(p.status, 'active')) = 'active'");
    expect(sql).toContain('on conflict (organization_id, user_id) do update');
    expect(sql).toContain("status = 'approved'");
    expect(sql).toContain('rejection_reason = null');
    expect(sql).toContain(
      "where lower(coalesce(public.organization_memberships.status, 'pending')) <> 'approved'"
    );
  });

  it('aligns direct-path rls policies for organizations, employees, shifts, and site requirements', () => {
    const sql = readMigration(
      '20260419123000_phase2b_direct_path_rls_alignment.sql'
    ).toLowerCase();

    expect(sql).toContain('from pg_policies');
    expect(sql).toContain(
      "tablename in ('organizations', 'employees', 'shifts', 'site_requirements')"
    );
    expect(sql).toContain('alter table if exists public.organizations enable row level security');
    expect(sql).toContain('alter table if exists public.employees enable row level security');
    expect(sql).toContain('alter table if exists public.shifts enable row level security');
    expect(sql).toContain(
      'alter table if exists public.site_requirements enable row level security'
    );
    expect(sql).toContain('create policy organizations_select_authenticated on public.organizations');
    expect(sql).toContain('create policy organizations_update_admin on public.organizations');
    expect(sql).toContain('create policy employees_select_authenticated on public.employees');
    expect(sql).toContain('create policy employees_admin_all on public.employees');
    expect(sql).toContain('create policy shifts_select_authenticated on public.shifts');
    expect(sql).toContain('create policy shifts_admin_all on public.shifts');
    expect(sql).toContain(
      'create policy site_requirements_select_authenticated on public.site_requirements'
    );
    expect(sql).toContain('create policy site_requirements_admin_all on public.site_requirements');
    expect(sql).toContain("has_org_access(id, 'user')");
    expect(sql).toContain("has_org_access(id, 'admin')");
    expect(sql).toContain("has_org_access(organization_id, 'user')");
    expect(sql).toContain("has_org_access(organization_id, 'admin')");
  });

  it('adds requester email snapshots and upgrades signup rpc signatures', () => {
    const sql = readMigration(
      '20260419_150000_signup_request_email_snapshot.sql'
    ).toLowerCase();

    expect(sql).toContain('alter table if exists public.signup_requests');
    expect(sql).toContain('add column if not exists requester_email text');
    expect(sql).toContain('update public.signup_requests sr');
    expect(sql).toContain('from auth.users au');
    expect(sql).toContain('drop function if exists public.submit_admin_signup_atomic(uuid, uuid, text, text)');
    expect(sql).toContain('create function public.submit_admin_signup_atomic(');
    expect(sql).toContain('p_requester_email text');
    expect(sql).toContain('requester_email');
    expect(sql).toContain(
      'drop function if exists public.redeem_user_invite_signup_atomic(uuid, uuid, text, text)'
    );
    expect(sql).toContain(
      'drop function if exists public.redeem_user_invite_signup_atomic(uuid, uuid, text, text, text)'
    );
    expect(sql).toContain('create or replace function public.redeem_user_invite_signup_atomic(');
    expect(sql).toContain('v_invite_id uuid');
  });

  it('syncs blocked admin signup state into memberships and profiles', () => {
    const sql = readMigration(
      '20260419_160000_phase2b_admin_signup_blocked_state_sync.sql'
    ).toLowerCase();

    expect(sql).toContain('drop function if exists public.submit_admin_signup_atomic');
    expect(sql).toContain("message = 'duplicate_approved_membership'");
    expect(sql).toContain('insert into public.organization_memberships');
    expect(sql).toContain("status = 'pending'");
    expect(sql).toContain("status = 'rejected'");
    expect(sql).toContain("account_status = 'active'");
    expect(sql).toContain("account_status = 'pending'");
    expect(sql).toContain("account_status = 'rejected'");
    expect(sql).toContain(
      "where lower(coalesce(public.organization_memberships.status, 'pending')) <> 'approved'"
    );
  });

  it('locks down security boundaries for client-visible phase2 tables and helpers', () => {
    const sql = readMigration('20260428_010000_security_boundary_lockdown.sql').toLowerCase();

    expect(sql).toContain("to_regprocedure('public.grant_superuser(text, uuid[])')");
    expect(sql).toMatch(/end;\s*\$\$;/);
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
    expect(sql).toContain(
      'grant execute on function public.is_super_admin() to authenticated, service_role'
    );

    [
      'schedule_assignments',
      'organization_settings',
      'approval_logs',
      'site_staffing_requirements',
      'analytics_metrics',
      'notifications',
      'notification_preferences',
      'employee_skills',
      'employee_site_assignments',
    ].forEach((table) => {
      expect(sql).toContain(`alter table if exists public.${table} enable row level security`);
    });

    expect(sql).toContain('drop policy if exists "admin can do everything" on public.profiles');
    expect(sql).toContain(
      'drop policy if exists "admin can do everything" on public.schedule_preferences'
    );
    expect(sql).toContain('drop policy if exists "admin can do everything" on public.schedules');

    [
      'schedule_assignments_select_authenticated',
      'schedule_assignments_admin_insert',
      'schedule_preferences_select_authenticated',
      'organization_settings_admin_all',
      'notifications_admin_insert',
      'notifications_admin_update',
      'notifications_admin_delete',
      'notification_preferences_admin_insert',
      'notification_preferences_admin_update',
      'notification_preferences_admin_delete',
      'approval_logs_no_client_access',
    ].forEach((policyName) => {
      expect(sql).toContain(policyName);
    });

    expect(sql).not.toContain('create policy notifications_admin_all');
    expect(sql).not.toContain('create policy notification_preferences_admin_all');
    expect(sql).not.toContain('using (true)');
    expect(sql).not.toContain('with check (true)');
    expect(sql).toContain('using (false)');
    expect(sql).toContain('with check (false)');

    [
      'e.organization_id = s.organization_id',
      'sh.organization_id = s.organization_id',
      'st.organization_id = s.organization_id',
      'sk.organization_id = site_staffing_requirements.organization_id',
      'left join public.ranks r on r.id = site_staffing_requirements.rank_id',
      'r.organization_id = site_staffing_requirements.organization_id',
      'recipient_user_id = auth.uid()',
      'user_id = auth.uid()',
    ].forEach((predicate) => {
      expect(sql).toContain(predicate);
    });
  });
});
