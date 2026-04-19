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
});
