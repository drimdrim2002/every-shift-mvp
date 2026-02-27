-- public.schedules definition

-- Drop table

-- DROP TABLE public.schedules;

CREATE TABLE public.schedules (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	organization_id uuid NOT NULL,
	"month" varchar(7) NOT NULL,
	status varchar(20) DEFAULT 'created'::character varying NOT NULL,
	hard_score int4 DEFAULT 0 NULL,
	soft_score int4 DEFAULT 0 NULL,
	created_at timestamptz DEFAULT now() NULL,
	updated_at timestamptz DEFAULT now() NULL,
	solver_execution_id text NULL,
	CONSTRAINT schedules_organization_id_month_key UNIQUE (organization_id, month),
	CONSTRAINT schedules_pkey PRIMARY KEY (id),
	CONSTRAINT schedules_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
);
CREATE INDEX idx_schedules_org_month ON public.schedules USING btree (organization_id, month);