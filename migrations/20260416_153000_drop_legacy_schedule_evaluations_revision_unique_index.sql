-- Drop legacy revision uniqueness so schedule_evaluations can remain append-only per revision.

DROP INDEX IF EXISTS public.idx_schedule_evaluations_version_revision;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'schedule_evaluations_schedule_version_id_revision_no_key'
      AND conrelid = 'public.schedule_evaluations'::regclass
  ) THEN
    ALTER TABLE public.schedule_evaluations
      DROP CONSTRAINT schedule_evaluations_schedule_version_id_revision_no_key;
  END IF;
END $$;
