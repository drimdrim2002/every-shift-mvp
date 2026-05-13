CREATE TABLE IF NOT EXISTS public.public_holidays (
  holiday_date date PRIMARY KEY,
  name text NOT NULL,
  is_holiday boolean NOT NULL DEFAULT true,
  country_code text NOT NULL DEFAULT 'KR',
  source text NOT NULL DEFAULT 'data.go.kr:kasi-special-day',
  source_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT public_holidays_country_code_check CHECK (country_code = 'KR')
);

CREATE INDEX IF NOT EXISTS public_holidays_country_date_idx
  ON public.public_holidays (country_code, holiday_date);
