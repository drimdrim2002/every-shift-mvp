BEGIN;

ALTER TABLE public.site_staffing_requirements
  DROP CONSTRAINT IF EXISTS site_staffing_requirements_shift_id_fkey;

ALTER TABLE public.site_staffing_requirements
  ADD CONSTRAINT site_staffing_requirements_shift_id_fkey
  FOREIGN KEY (shift_id)
  REFERENCES public.shifts(id)
  ON DELETE RESTRICT;

COMMENT ON CONSTRAINT site_staffing_requirements_shift_id_fkey ON public.site_staffing_requirements IS
  'Prevents deleting shifts that are still referenced by service-native staffing requirements.';

COMMIT;
