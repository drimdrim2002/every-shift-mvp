-- public.shifts definition

-- Drop table

-- DROP TABLE public.shifts;

CREATE TABLE public.shifts (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	organization_id uuid NOT NULL,
	code varchar(10) NOT NULL,
	"name" varchar(50) NOT NULL,
	color_code varchar(20) NOT NULL,
	start_time time NULL,
	end_time time NULL,
	created_at timestamptz DEFAULT now() NULL,
	CONSTRAINT shifts_organization_id_code_key UNIQUE (organization_id, code),
	CONSTRAINT shifts_pkey PRIMARY KEY (id),
	CONSTRAINT shifts_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
);