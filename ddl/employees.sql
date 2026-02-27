-- public.employees definition

-- Drop table

-- DROP TABLE public.employees;

CREATE TABLE public.employees (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	organization_id uuid NOT NULL,
	employee_id varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	available_shifts jsonb NOT NULL,
	created_at timestamptz DEFAULT now() NULL,
	updated_at timestamptz DEFAULT now() NULL,
	CONSTRAINT employees_organization_id_employee_id_key UNIQUE (organization_id, employee_id),
	CONSTRAINT employees_pkey PRIMARY KEY (id),
	CONSTRAINT employees_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
);
CREATE INDEX idx_employees_org ON public.employees USING btree (organization_id);