-- public.schedule_assignments definition

-- Drop table

-- DROP TABLE public.schedule_assignments;

CREATE TABLE public.schedule_assignments (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	schedule_id uuid NOT NULL,
	employee_id uuid NOT NULL,
	shift_id uuid NOT NULL,
	"date" date NOT NULL,
	is_locked bool DEFAULT false NULL,
	created_at timestamptz DEFAULT now() NULL,
	updated_at timestamptz DEFAULT now() NULL,
	off_reason varchar(50) DEFAULT NULL::character varying NULL,
	off_comment varchar(255) DEFAULT NULL::character varying NULL,
	"comment" text NULL,
	CONSTRAINT schedule_assignments_pkey PRIMARY KEY (id),
	CONSTRAINT schedule_assignments_schedule_id_employee_id_date_key UNIQUE (schedule_id, employee_id, date),
	CONSTRAINT schedule_assignments_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE,
	CONSTRAINT schedule_assignments_schedule_id_fkey FOREIGN KEY (schedule_id) REFERENCES public.schedules(id) ON DELETE CASCADE,
	CONSTRAINT schedule_assignments_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.shifts(id) ON DELETE CASCADE
);
CREATE INDEX idx_assignments_employee_date ON public.schedule_assignments USING btree (employee_id, date);
CREATE INDEX idx_assignments_schedule ON public.schedule_assignments USING btree (schedule_id);