-- Slice 1-4 leak recovery: lock trust-layer tables to backend-only access.
-- schedule_versions / schedule_evaluations must never be client-direct.

ALTER TABLE schedule_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_evaluations ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('schedule_versions', 'schedule_evaluations')
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename
    );
  END LOOP;
END $$;

REVOKE ALL ON TABLE schedule_versions FROM anon, authenticated;
REVOKE ALL ON TABLE schedule_evaluations FROM anon, authenticated;
