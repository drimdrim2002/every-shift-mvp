-- ============================================================================
-- EveryShift P5 Organization Master Fields
-- File: 012_organization_master_fields.sql
-- Purpose:
--   1) Add work_constraints JSONB to organization_settings
--   2) Add credit NUMERIC column to ranks
-- Notes:
--   - Non-destructive: both columns are nullable / have defaults
--   - Existing rows are backfilled with sensible defaults
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1) organization_settings.work_constraints
--    Stores weekly scheduling constraints used by the AI Solver (P7).
--    Schema: { weeklyTargetHours: number, weeklyMaxHours: number, weeklyOffDays: number }
-- ============================================================================

ALTER TABLE organization_settings
  ADD COLUMN IF NOT EXISTS work_constraints JSONB NOT NULL
    DEFAULT '{"weeklyTargetHours":40,"weeklyMaxHours":52,"weeklyOffDays":2}'::JSONB;

-- Backfill any rows that somehow have a null (guard against future schema drift)
UPDATE organization_settings
SET work_constraints = '{"weeklyTargetHours":40,"weeklyMaxHours":52,"weeklyOffDays":2}'::JSONB
WHERE work_constraints IS NULL;

COMMENT ON COLUMN organization_settings.work_constraints IS
  'Weekly work constraint settings: { weeklyTargetHours, weeklyMaxHours, weeklyOffDays }';

-- ============================================================================
-- 2) ranks.credit
--    Numeric credit value per rank, used by employee management (P6) as
--    initial credit for new employees of this rank.
--    Nullable — existing ranks have no credit requirement.
-- ============================================================================

ALTER TABLE ranks
  ADD COLUMN IF NOT EXISTS credit NUMERIC(10, 2);

COMMENT ON COLUMN ranks.credit IS
  'Optional numeric credit value for this rank (e.g. LV1=1.0, LV4=4.0)';

-- ============================================================================
-- Post-migration verification
-- ============================================================================

DO $$
BEGIN
  -- Verify work_constraints column exists with correct default
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organization_settings'
      AND column_name = 'work_constraints'
  ) THEN
    RAISE EXCEPTION 'Migration 012: work_constraints column missing from organization_settings';
  END IF;

  -- Verify credit column exists on ranks
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ranks'
      AND column_name = 'credit'
  ) THEN
    RAISE EXCEPTION 'Migration 012: credit column missing from ranks';
  END IF;

  RAISE NOTICE 'Migration 012: Verified — work_constraints and credit columns exist.';
END $$;

COMMIT;
