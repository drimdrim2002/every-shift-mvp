-- public.schedule_preferences definition

-- Drop table

-- DROP TABLE public.schedule_preferences;

CREATE TABLE public.schedule_preferences (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	schedule_id uuid NOT NULL,
	employee_id uuid NOT NULL,
	"date" date NOT NULL,
	request_code varchar(1) NOT NULL,
	request_note text NULL,
	is_soft bool DEFAULT true NOT NULL,
	resolution_status varchar(20) DEFAULT 'pending'::character varying NOT NULL,
	resolved_shift_id uuid NULL,
	resolved_at timestamptz NULL,
	created_at timestamptz DEFAULT now() NULL,
	updated_at timestamptz DEFAULT now() NULL,
	CONSTRAINT schedule_preferences_pkey PRIMARY KEY (id),
	CONSTRAINT schedule_preferences_request_code_check CHECK (((request_code)::text = ANY ((ARRAY['O'::character varying, 'H'::character varying, 'E'::character varying, 'L'::character varying])::text[]))),
	CONSTRAINT schedule_preferences_resolution_status_check CHECK (((resolution_status)::text = ANY ((ARRAY['pending'::character varying, 'fulfilled'::character varying, 'unfulfilled'::character varying])::text[]))),
	CONSTRAINT schedule_preferences_schedule_id_employee_id_date_key UNIQUE (schedule_id, employee_id, date),
	CONSTRAINT schedule_preferences_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE,
	CONSTRAINT schedule_preferences_resolved_shift_id_fkey FOREIGN KEY (resolved_shift_id) REFERENCES public.shifts(id) ON DELETE SET NULL,
	CONSTRAINT schedule_preferences_schedule_id_fkey FOREIGN KEY (schedule_id) REFERENCES public.schedules(id) ON DELETE CASCADE
);
CREATE INDEX idx_schedule_preferences_schedule_date ON public.schedule_preferences USING btree (schedule_id, date);
CREATE INDEX idx_schedule_preferences_schedule_status ON public.schedule_preferences USING btree (schedule_id, resolution_status);