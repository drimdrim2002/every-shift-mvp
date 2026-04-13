-- Align onboarding_progress with the current phase2-ops cursor model while
-- preserving compatibility with legacy onboarding keys that still exist in
-- historical rows and auth metadata.

ALTER TABLE public.onboarding_progress
  ADD COLUMN IF NOT EXISTS current_step_key character varying,
  ADD COLUMN IF NOT EXISTS organization_info_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS organization_info_confirmed_by uuid,
  ADD COLUMN IF NOT EXISTS completed_by uuid,
  ADD COLUMN IF NOT EXISTS last_actor_user_id uuid;

UPDATE public.onboarding_progress
SET current_step_key = CASE current_step
  WHEN 1 THEN 'organization_info'
  WHEN 2 THEN 'employee_seed'
  WHEN 3 THEN 'schedule_request'
  ELSE current_step_key
END
WHERE current_step_key IS NULL
  AND completed_at IS NULL
  AND current_step BETWEEN 1 AND 3;

ALTER TABLE public.onboarding_progress
  DROP CONSTRAINT IF EXISTS onboarding_progress_completion_shape_check,
  DROP CONSTRAINT IF EXISTS onboarding_progress_current_step_key_check,
  DROP CONSTRAINT IF EXISTS onboarding_progress_current_step_check;

CREATE OR REPLACE FUNCTION public.onboarding_progress_before_write()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.organization_info_confirmed_at IS NULL THEN
    NEW.organization_info_confirmed_by := NULL;
  END IF;

  IF NEW.completed_at IS NULL THEN
    NEW.completed_by := NULL;
  END IF;

  IF auth.uid() IS NOT NULL THEN
    IF NEW.organization_info_confirmed_by IS NOT NULL
       AND NEW.organization_info_confirmed_by <> auth.uid() THEN
      RAISE EXCEPTION 'organization_info_confirmed_by must match auth.uid()'
        USING ERRCODE = '42501';
    END IF;

    IF NEW.completed_by IS NOT NULL
       AND NEW.completed_by <> auth.uid() THEN
      RAISE EXCEPTION 'completed_by must match auth.uid()'
        USING ERRCODE = '42501';
    END IF;

    IF NEW.last_actor_user_id IS NOT NULL
       AND NEW.last_actor_user_id <> auth.uid() THEN
      RAISE EXCEPTION 'last_actor_user_id must match auth.uid()'
        USING ERRCODE = '42501';
    END IF;

    NEW.last_actor_user_id := auth.uid();
  END IF;

  IF TG_OP = 'UPDATE'
     AND auth.uid() IS NOT NULL
     AND OLD.completed_at IS NOT NULL
     AND (NEW.completed_at IS NULL OR NEW.current_step_key IS NOT NULL) THEN
    RAISE EXCEPTION 'completed onboarding_progress rows cannot be rewound by product writes'
      USING ERRCODE = '42501';
  END IF;

  NEW.current_step := CASE NEW.current_step_key
    WHEN 'organization_info' THEN 1
    WHEN 'organization_profile' THEN 1
    WHEN 'employee_seed' THEN 2
    WHEN 'schedule_foundation' THEN 2
    WHEN 'employee_roster' THEN 3
    WHEN 'schedule_request' THEN 4
    WHEN 'off_request_policy' THEN 4
    WHEN 'schedule_review' THEN 5
    ELSE COALESCE(NEW.current_step, OLD.current_step, 1)
  END;
  NEW.updated_at := NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_onboarding_progress_before_write ON public.onboarding_progress;

CREATE TRIGGER trg_onboarding_progress_before_write
BEFORE INSERT OR UPDATE ON public.onboarding_progress
FOR EACH ROW
EXECUTE FUNCTION public.onboarding_progress_before_write();

ALTER TABLE public.onboarding_progress
  ADD CONSTRAINT onboarding_progress_completion_shape_check
  CHECK (
    (
      current_step_key IS NULL
      AND completed_at IS NOT NULL
    )
    OR (
      current_step_key IS NOT NULL
      AND completed_at IS NULL
    )
  ),
  ADD CONSTRAINT onboarding_progress_current_step_key_check
  CHECK (
    current_step_key IS NULL
    OR current_step_key = ANY (
      ARRAY[
        'organization_info'::character varying,
        'organization_profile'::character varying,
        'employee_seed'::character varying,
        'schedule_foundation'::character varying,
        'employee_roster'::character varying,
        'schedule_request'::character varying,
        'off_request_policy'::character varying,
        'schedule_review'::character varying
      ]
    )
  ),
  ADD CONSTRAINT onboarding_progress_current_step_check
  CHECK (current_step >= 1 AND current_step <= 5);
