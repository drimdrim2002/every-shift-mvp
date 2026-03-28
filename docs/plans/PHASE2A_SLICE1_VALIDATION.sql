-- Phase2A Slice 1 validation queries
-- Run after applying migrations/007_phase2a_trust_layer_foundation.sql.

-- 0. Optional normalization for environments that previously ran a draft backfill.
UPDATE schedule_versions sv
SET
  source_type = 'initial_solve',
  current_revision = 0,
  manual_edit_count = 0,
  input_snapshot = jsonb_build_object(
    'off_request_count',
    COALESCE((
      SELECT COUNT(*)::int
      FROM schedule_preferences sp
      WHERE sp.schedule_version_id = sv.id
    ), 0),
    'locked_assignment_count',
    COALESCE((
      SELECT COUNT(*)::int
      FROM schedule_assignments sa
      WHERE sa.schedule_version_id = sv.id
        AND sa.is_locked IS TRUE
    ), 0)
  ),
  input_diff_summary = '{}'::jsonb
WHERE sv.version_no = 1
  AND (
    sv.source_type = 'legacy_migration'
    OR sv.input_snapshot ? 'legacy_migration'
    OR sv.input_diff_summary = jsonb_build_object('note', 'Backfilled from legacy schedule row')
  );

-- 1. schedules count and V1 count should match.
SELECT
  (SELECT COUNT(*) FROM schedules) AS schedule_count,
  (SELECT COUNT(*) FROM schedule_versions WHERE version_no = 1) AS v1_count;

-- 2. Every schedule container should have exactly one V1.
SELECT
  s.id AS schedule_id,
  COUNT(sv.id) AS v1_count
FROM schedules s
LEFT JOIN schedule_versions sv
  ON sv.schedule_id = s.id
 AND sv.version_no = 1
GROUP BY s.id
HAVING COUNT(sv.id) <> 1;

-- 3. Child tables should have no NULL schedule_version_id values.
SELECT 'schedule_assignments' AS table_name, COUNT(*) AS null_count
FROM schedule_assignments
WHERE schedule_version_id IS NULL
UNION ALL
SELECT 'schedule_preferences' AS table_name, COUNT(*) AS null_count
FROM schedule_preferences
WHERE schedule_version_id IS NULL;

-- 4. Version-scoped uniqueness should hold for assignments.
SELECT schedule_version_id, employee_id, date, COUNT(*) AS dup_count
FROM schedule_assignments
GROUP BY schedule_version_id, employee_id, date
HAVING COUNT(*) > 1;

-- 5. Version-scoped uniqueness should hold for preferences.
SELECT schedule_version_id, employee_id, date, COUNT(*) AS dup_count
FROM schedule_preferences
GROUP BY schedule_version_id, employee_id, date
HAVING COUNT(*) > 1;

-- 6. selected_version_id should point to the same container's V1 and latest_version_no should be initialized.
SELECT
  s.id AS schedule_id,
  s.selected_version_id,
  sv.schedule_id AS selected_version_schedule_id,
  sv.version_no,
  s.latest_version_no
FROM schedules s
LEFT JOIN schedule_versions sv
  ON sv.id = s.selected_version_id
WHERE sv.id IS NULL
   OR sv.schedule_id <> s.id
   OR sv.version_no <> 1
   OR s.latest_version_no < 1;

-- 7. Assignments must point at a version in the same container.
SELECT sa.id, sa.schedule_id, sa.schedule_version_id, sv.schedule_id AS version_schedule_id
FROM schedule_assignments sa
JOIN schedule_versions sv ON sv.id = sa.schedule_version_id
WHERE sa.schedule_id <> sv.schedule_id;

-- 8. Preferences must point at a version in the same container.
SELECT sp.id, sp.schedule_id, sp.schedule_version_id, sv.schedule_id AS version_schedule_id
FROM schedule_preferences sp
JOIN schedule_versions sv ON sv.id = sp.schedule_version_id
WHERE sp.schedule_id <> sv.schedule_id;

-- 9. schedule_evaluations should still be empty after Slice 1.
SELECT COUNT(*) AS evaluation_count
FROM schedule_evaluations;

-- 10. Legacy finalized fields should remain empty after Slice 1.
SELECT COUNT(*) AS non_null_finalized_count
FROM schedules
WHERE finalized_version_id IS NOT NULL
   OR finalized_at IS NOT NULL
   OR finalized_by IS NOT NULL;

-- 11. Spot check canonical V1 shape.
SELECT
  sv.schedule_id,
  sv.id AS version_id,
  sv.version_no,
  sv.name,
  sv.source_type,
  sv.current_revision,
  sv.status,
  sv.manual_edit_count,
  sv.input_snapshot,
  sv.input_diff_summary,
  sv.active_solver_execution_id
FROM schedule_versions sv
WHERE sv.version_no = 1
ORDER BY sv.created_at DESC
LIMIT 20;
