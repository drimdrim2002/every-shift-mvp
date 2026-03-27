-- Phase2A Slice 1: Trust Layer schema foundation
--
-- Compatibility rules for legacy schedule_id reads:
-- 1. schedules.id remains the month-container identifier; it no longer identifies a single candidate version.
-- 2. This migration backfills exactly one default V1 version for every legacy schedules row, so old SQL filtered only by schedule_id still resolves to that backfilled version.
-- 3. Once multiple versions exist, reads against schedule_assignments and schedule_preferences must also filter by schedule_version_id or resolve it via schedules.selected_version_id / schedules.finalized_version_id.

CREATE TABLE IF NOT EXISTS schedule_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  version_no INTEGER NOT NULL,
  name VARCHAR(100),
  source_type VARCHAR(30) NOT NULL,
  base_version_id UUID,
  current_revision INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(30) NOT NULL,
  input_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  input_diff_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  manual_edit_count INTEGER NOT NULL DEFAULT 0,
  active_solver_execution_id TEXT,
  latest_evaluation_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS schedule_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  schedule_version_id UUID NOT NULL,
  revision_no INTEGER NOT NULL,
  result_status VARCHAR(30) NOT NULL,
  proof_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  violation_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  infeasibility JSONB,
  off_request_results JSONB NOT NULL DEFAULT '{}'::jsonb,
  comparison_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  finalization_gate JSONB NOT NULL DEFAULT '{}'::jsonb,
  assignment_hash TEXT NOT NULL,
  solver_execution_id TEXT,
  evaluator_version VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'schedule_versions_base_version_id_fkey'
      AND conrelid = 'schedule_versions'::regclass
  ) THEN
    ALTER TABLE schedule_versions
      DROP CONSTRAINT schedule_versions_base_version_id_fkey;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'schedule_versions_schedule_id_version_no_key'
  ) THEN
    ALTER TABLE schedule_versions
      ADD CONSTRAINT schedule_versions_schedule_id_version_no_key
      UNIQUE (schedule_id, version_no);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'schedule_versions_schedule_id_id_key'
  ) THEN
    ALTER TABLE schedule_versions
      ADD CONSTRAINT schedule_versions_schedule_id_id_key
      UNIQUE (schedule_id, id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'schedule_versions_source_type_check'
  ) THEN
    ALTER TABLE schedule_versions
      ADD CONSTRAINT schedule_versions_source_type_check
      CHECK (source_type IN ('initial_solve', 're_solve', 'manual_variant'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'schedule_versions_status_check'
  ) THEN
    ALTER TABLE schedule_versions
      ADD CONSTRAINT schedule_versions_status_check
      CHECK (
        status IN (
          'draft',
          'solving',
          'review_ready',
          'review_blocked',
          'review_pending',
          'infeasible',
          'solve_failed',
          'finalized'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'schedule_versions_version_no_positive_check'
  ) THEN
    ALTER TABLE schedule_versions
      ADD CONSTRAINT schedule_versions_version_no_positive_check
      CHECK (version_no > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'schedule_versions_current_revision_nonnegative_check'
  ) THEN
    ALTER TABLE schedule_versions
      ADD CONSTRAINT schedule_versions_current_revision_nonnegative_check
      CHECK (current_revision >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'schedule_versions_manual_edit_count_nonnegative_check'
  ) THEN
    ALTER TABLE schedule_versions
      ADD CONSTRAINT schedule_versions_manual_edit_count_nonnegative_check
      CHECK (manual_edit_count >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'schedule_versions_base_version_not_self_check'
  ) THEN
    ALTER TABLE schedule_versions
      ADD CONSTRAINT schedule_versions_base_version_not_self_check
      CHECK (base_version_id IS NULL OR base_version_id <> id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'schedule_versions_base_version_owner_fkey'
  ) THEN
    ALTER TABLE schedule_versions
      ADD CONSTRAINT schedule_versions_base_version_owner_fkey
      FOREIGN KEY (schedule_id, base_version_id)
      REFERENCES schedule_versions(schedule_id, id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'schedule_evaluations_schedule_version_id_id_key'
  ) THEN
    ALTER TABLE schedule_evaluations
      ADD CONSTRAINT schedule_evaluations_schedule_version_id_id_key
      UNIQUE (schedule_version_id, id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'schedule_evaluations_schedule_version_id_revision_no_key'
  ) THEN
    ALTER TABLE schedule_evaluations
      ADD CONSTRAINT schedule_evaluations_schedule_version_id_revision_no_key
      UNIQUE (schedule_version_id, revision_no);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'schedule_evaluations_result_status_check'
  ) THEN
    ALTER TABLE schedule_evaluations
      ADD CONSTRAINT schedule_evaluations_result_status_check
      CHECK (result_status IN ('passed', 'review_blocked', 'infeasible', 'solve_failed'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'schedule_evaluations_revision_no_positive_check'
  ) THEN
    ALTER TABLE schedule_evaluations
      ADD CONSTRAINT schedule_evaluations_revision_no_positive_check
      CHECK (revision_no >= 0);
  END IF;
END $$;

ALTER TABLE schedule_versions
  ALTER COLUMN active_solver_execution_id TYPE TEXT;

ALTER TABLE schedule_evaluations
  ALTER COLUMN solver_execution_id TYPE TEXT;

ALTER TABLE schedule_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_evaluations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can do everything" ON schedule_versions;
DROP POLICY IF EXISTS "Admin can do everything" ON schedule_evaluations;

CREATE POLICY "Admin can do everything"
ON schedule_versions
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Admin can do everything"
ON schedule_evaluations
FOR ALL
USING (true)
WITH CHECK (true);

ALTER TABLE schedules
  ADD COLUMN IF NOT EXISTS selected_version_id UUID,
  ADD COLUMN IF NOT EXISTS finalized_version_id UUID,
  ADD COLUMN IF NOT EXISTS latest_version_no INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS finalized_by UUID;

ALTER TABLE schedule_assignments
  ADD COLUMN IF NOT EXISTS schedule_version_id UUID,
  ADD COLUMN IF NOT EXISTS edited_by UUID,
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;

ALTER TABLE schedule_preferences
  ADD COLUMN IF NOT EXISTS schedule_version_id UUID,
  ADD COLUMN IF NOT EXISTS request_source VARCHAR(30) NOT NULL DEFAULT 'employee_off';

ALTER TABLE schedules
  ALTER COLUMN latest_version_no SET DEFAULT 0;

UPDATE schedules
SET latest_version_no = 0
WHERE latest_version_no IS NULL;

ALTER TABLE schedules
  ALTER COLUMN latest_version_no SET NOT NULL;

ALTER TABLE schedule_preferences
  ALTER COLUMN request_source SET DEFAULT 'employee_off';

UPDATE schedule_preferences
SET request_source = 'employee_off'
WHERE request_source IS NULL;

ALTER TABLE schedule_preferences
  ALTER COLUMN request_source SET NOT NULL;

COMMENT ON TABLE schedule_versions IS 'Candidate versions that belong to a month-level schedules container.';
COMMENT ON COLUMN schedule_versions.schedule_id IS 'Container identity. Legacy SQL may still join by schedule_id, but new reads must treat schedule_version_id as the version identity.';
COMMENT ON COLUMN schedule_versions.version_no IS 'Monotonic version number within a schedules container.';
COMMENT ON COLUMN schedule_versions.input_snapshot IS 'Backfilled V1 rows only include safely derivable counts (off_request_count, locked_assignment_count). Later writes may add richer snapshot fields.';
COMMENT ON COLUMN schedule_versions.input_diff_summary IS 'Compare-facing input diff summary. Backfilled V1 rows always use an empty object.';
COMMENT ON COLUMN schedule_versions.latest_evaluation_id IS 'Pointer to the latest immutable evaluation for the current revision of this version.';

COMMENT ON TABLE schedule_evaluations IS 'Immutable review artifacts stored per schedule version and revision.';
COMMENT ON COLUMN schedule_evaluations.schedule_id IS 'Container identity duplicated for joins and composite ownership checks.';
COMMENT ON COLUMN schedule_evaluations.schedule_version_id IS 'Version being evaluated. The composite FK proves it belongs to the same schedules container.';
COMMENT ON COLUMN schedule_evaluations.result_status IS 'Evaluation outcome: passed, review_blocked, infeasible, or solve_failed.';

COMMENT ON COLUMN schedules.selected_version_id IS 'Version currently under review for this month container.';
COMMENT ON COLUMN schedules.finalized_version_id IS 'Finalized read-only version for this month container.';
COMMENT ON COLUMN schedules.latest_version_no IS 'Container-level source of truth for version numbering.';

COMMENT ON COLUMN schedule_assignments.schedule_version_id IS 'Owning schedule version. schedule_id remains the container reference for legacy SQL only.';
COMMENT ON COLUMN schedule_assignments.edited_by IS 'Last editor for the current version-scoped assignment state.';
COMMENT ON COLUMN schedule_assignments.edited_at IS 'Last manual edit timestamp for the current version-scoped assignment state.';

COMMENT ON COLUMN schedule_preferences.schedule_version_id IS 'Owning schedule version. schedule_id remains the container reference for legacy SQL only.';
COMMENT ON COLUMN schedule_preferences.request_source IS 'Origin of the off-request row. Legacy rows backfill to employee_off.';

WITH legacy_schedule_counts AS (
  SELECT
    s.id AS schedule_id,
    COALESCE(pref.off_request_count, 0) AS off_request_count,
    COALESCE(assignments.locked_assignment_count, 0) AS locked_assignment_count
  FROM schedules s
  LEFT JOIN (
    SELECT schedule_id, COUNT(*)::INTEGER AS off_request_count
    FROM schedule_preferences
    GROUP BY schedule_id
  ) pref ON pref.schedule_id = s.id
  LEFT JOIN (
    SELECT schedule_id, (COUNT(*) FILTER (WHERE is_locked IS TRUE))::INTEGER AS locked_assignment_count
    FROM schedule_assignments
    GROUP BY schedule_id
  ) assignments ON assignments.schedule_id = s.id
)
INSERT INTO schedule_versions (
  schedule_id,
  version_no,
  name,
  source_type,
  current_revision,
  status,
  input_snapshot,
  input_diff_summary,
  manual_edit_count,
  latest_evaluation_id,
  active_solver_execution_id,
  created_at,
  updated_at
)
SELECT
  s.id,
  1,
  'V1',
  'initial_solve',
  0,
  CASE s.status
    WHEN 'created' THEN 'draft'
    WHEN 'running' THEN 'solving'
    WHEN 'complete' THEN 'review_pending'
    WHEN 'changed' THEN 'review_pending'
    WHEN 'error' THEN 'solve_failed'
    ELSE 'draft'
  END,
  jsonb_build_object(
    'off_request_count', c.off_request_count,
    'locked_assignment_count', c.locked_assignment_count
  ),
  '{}'::jsonb,
  0,
  NULL,
  s.solver_execution_id,
  COALESCE(s.created_at, NOW()),
  COALESCE(s.updated_at, s.created_at, NOW())
FROM schedules s
JOIN legacy_schedule_counts c
  ON c.schedule_id = s.id
WHERE NOT EXISTS (
  SELECT 1
  FROM schedule_versions sv
  WHERE sv.schedule_id = s.id
    AND sv.version_no = 1
);

UPDATE schedule_assignments sa
SET schedule_version_id = sv.id
FROM schedule_versions sv
WHERE sv.schedule_id = sa.schedule_id
  AND sv.version_no = 1
  AND sa.schedule_version_id IS NULL;

UPDATE schedule_preferences sp
SET schedule_version_id = sv.id
FROM schedule_versions sv
WHERE sv.schedule_id = sp.schedule_id
  AND sv.version_no = 1
  AND sp.schedule_version_id IS NULL;

UPDATE schedules s
SET latest_version_no = CASE
      WHEN s.latest_version_no = 0 THEN 1
      ELSE s.latest_version_no
    END,
    selected_version_id = CASE
      WHEN s.selected_version_id IS NULL THEN sv.id
      ELSE s.selected_version_id
    END
FROM schedule_versions sv
WHERE sv.schedule_id = s.id
  AND sv.version_no = 1
  AND (
    s.selected_version_id IS NULL
    OR s.latest_version_no = 0
  );

DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'schedule_assignments'
      AND c.contype = 'u'
      AND (
        SELECT array_agg(a.attname::text ORDER BY u.ordinality)
        FROM unnest(c.conkey) WITH ORDINALITY AS u(attnum, ordinality)
        JOIN pg_attribute a
          ON a.attrelid = t.oid
         AND a.attnum = u.attnum
      ) = ARRAY['schedule_id', 'employee_id', 'date']::text[]
  LOOP
    EXECUTE format('ALTER TABLE public.schedule_assignments DROP CONSTRAINT %I', rec.conname);
  END LOOP;

  FOR rec IN
    SELECT idx.relname AS index_name
    FROM pg_class t
    JOIN pg_namespace n ON n.oid = t.relnamespace
    JOIN pg_index i ON i.indrelid = t.oid
    JOIN pg_class idx ON idx.oid = i.indexrelid
    LEFT JOIN pg_constraint c ON c.conindid = i.indexrelid
    WHERE n.nspname = 'public'
      AND t.relname = 'schedule_assignments'
      AND i.indisunique
      AND c.oid IS NULL
      AND (
        SELECT array_agg(a.attname::text ORDER BY u.ordinality)
        FROM unnest(i.indkey) WITH ORDINALITY AS u(attnum, ordinality)
        JOIN pg_attribute a
          ON a.attrelid = t.oid
         AND a.attnum = u.attnum
      ) = ARRAY['schedule_id', 'employee_id', 'date']::text[]
  LOOP
    EXECUTE format('DROP INDEX IF EXISTS public.%I', rec.index_name);
  END LOOP;

  FOR rec IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'schedule_preferences'
      AND c.contype = 'u'
      AND (
        SELECT array_agg(a.attname::text ORDER BY u.ordinality)
        FROM unnest(c.conkey) WITH ORDINALITY AS u(attnum, ordinality)
        JOIN pg_attribute a
          ON a.attrelid = t.oid
         AND a.attnum = u.attnum
      ) = ARRAY['schedule_id', 'employee_id', 'date']::text[]
  LOOP
    EXECUTE format('ALTER TABLE public.schedule_preferences DROP CONSTRAINT %I', rec.conname);
  END LOOP;

  FOR rec IN
    SELECT idx.relname AS index_name
    FROM pg_class t
    JOIN pg_namespace n ON n.oid = t.relnamespace
    JOIN pg_index i ON i.indrelid = t.oid
    JOIN pg_class idx ON idx.oid = i.indexrelid
    LEFT JOIN pg_constraint c ON c.conindid = i.indexrelid
    WHERE n.nspname = 'public'
      AND t.relname = 'schedule_preferences'
      AND i.indisunique
      AND c.oid IS NULL
      AND (
        SELECT array_agg(a.attname::text ORDER BY u.ordinality)
        FROM unnest(i.indkey) WITH ORDINALITY AS u(attnum, ordinality)
        JOIN pg_attribute a
          ON a.attrelid = t.oid
         AND a.attnum = u.attnum
      ) = ARRAY['schedule_id', 'employee_id', 'date']::text[]
  LOOP
    EXECUTE format('DROP INDEX IF EXISTS public.%I', rec.index_name);
  END LOOP;
END $$;

ALTER TABLE schedule_assignments
  ALTER COLUMN schedule_version_id SET NOT NULL;

ALTER TABLE schedule_preferences
  ALTER COLUMN schedule_version_id SET NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'schedules_selected_version_belongs_to_schedule_fkey'
      AND conrelid = 'schedules'::regclass
  ) THEN
    ALTER TABLE schedules
      DROP CONSTRAINT schedules_selected_version_belongs_to_schedule_fkey;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'schedules_finalized_version_belongs_to_schedule_fkey'
      AND conrelid = 'schedules'::regclass
  ) THEN
    ALTER TABLE schedules
      DROP CONSTRAINT schedules_finalized_version_belongs_to_schedule_fkey;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'schedule_versions_latest_evaluation_version_fkey'
      AND conrelid = 'schedule_versions'::regclass
  ) THEN
    ALTER TABLE schedule_versions
      DROP CONSTRAINT schedule_versions_latest_evaluation_version_fkey;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'schedule_assignments_schedule_version_id_employee_id_date_key'
  ) THEN
    ALTER TABLE schedule_assignments
      ADD CONSTRAINT schedule_assignments_schedule_version_id_employee_id_date_key
      UNIQUE (schedule_version_id, employee_id, date);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'schedule_preferences_schedule_version_id_employee_id_date_key'
  ) THEN
    ALTER TABLE schedule_preferences
      ADD CONSTRAINT schedule_preferences_schedule_version_id_employee_id_date_key
      UNIQUE (schedule_version_id, employee_id, date);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'schedule_assignments_schedule_version_owner_fkey'
  ) THEN
    ALTER TABLE schedule_assignments
      ADD CONSTRAINT schedule_assignments_schedule_version_owner_fkey
      FOREIGN KEY (schedule_id, schedule_version_id)
      REFERENCES schedule_versions(schedule_id, id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'schedule_preferences_schedule_version_owner_fkey'
  ) THEN
    ALTER TABLE schedule_preferences
      ADD CONSTRAINT schedule_preferences_schedule_version_owner_fkey
      FOREIGN KEY (schedule_id, schedule_version_id)
      REFERENCES schedule_versions(schedule_id, id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'schedule_evaluations_schedule_version_owner_fkey'
  ) THEN
    ALTER TABLE schedule_evaluations
      ADD CONSTRAINT schedule_evaluations_schedule_version_owner_fkey
      FOREIGN KEY (schedule_id, schedule_version_id)
      REFERENCES schedule_versions(schedule_id, id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'schedules_selected_version_belongs_to_schedule_fkey'
  ) THEN
    ALTER TABLE schedules
      ADD CONSTRAINT schedules_selected_version_belongs_to_schedule_fkey
      FOREIGN KEY (id, selected_version_id)
      REFERENCES schedule_versions(schedule_id, id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'schedules_finalized_version_belongs_to_schedule_fkey'
  ) THEN
    ALTER TABLE schedules
      ADD CONSTRAINT schedules_finalized_version_belongs_to_schedule_fkey
      FOREIGN KEY (id, finalized_version_id)
      REFERENCES schedule_versions(schedule_id, id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'schedule_versions_latest_evaluation_version_fkey'
  ) THEN
    ALTER TABLE schedule_versions
      ADD CONSTRAINT schedule_versions_latest_evaluation_version_fkey
      FOREIGN KEY (id, latest_evaluation_id)
      REFERENCES schedule_evaluations(schedule_version_id, id);
  END IF;
END $$;
