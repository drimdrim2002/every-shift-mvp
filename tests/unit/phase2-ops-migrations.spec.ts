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
});
