-- public.site_requirements definition

-- Drop table

-- DROP TABLE public.site_requirements;

CREATE TABLE public.site_requirements (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	organization_id uuid NOT NULL,
	shift_id uuid NOT NULL,
	day_of_week int4 NOT NULL,
	required_count int4 NOT NULL,
	created_at timestamptz DEFAULT now() NULL,
	CONSTRAINT site_requirements_organization_id_shift_id_day_of_week_key UNIQUE (organization_id, shift_id, day_of_week),
	CONSTRAINT site_requirements_pkey PRIMARY KEY (id),
	CONSTRAINT site_requirements_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id),
	CONSTRAINT site_requirements_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.shifts(id) ON DELETE CASCADE
);