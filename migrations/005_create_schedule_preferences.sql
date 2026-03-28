-- Create schedule_preferences table for Step4 preference/constraint inputs
-- Migration: 005_create_schedule_preferences
-- Date: 2026-02-13

CREATE TABLE IF NOT EXISTS schedule_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  request_code VARCHAR(1) NOT NULL CHECK (request_code IN ('O', 'H', 'E', 'L')),
  request_note TEXT,
  is_soft BOOLEAN NOT NULL DEFAULT TRUE,
  resolution_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (
    resolution_status IN ('pending', 'fulfilled', 'unfulfilled')
  ),
  resolved_shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (schedule_id, employee_id, date)
);

CREATE INDEX IF NOT EXISTS idx_schedule_preferences_schedule_status
  ON schedule_preferences(schedule_id, resolution_status);

CREATE INDEX IF NOT EXISTS idx_schedule_preferences_schedule_date
  ON schedule_preferences(schedule_id, date);

ALTER TABLE schedule_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can do everything" ON schedule_preferences;

CREATE POLICY "Admin can do everything"
ON schedule_preferences
FOR ALL
USING (true)
WITH CHECK (true);

COMMENT ON TABLE schedule_preferences IS 'Step4에서 입력된 근무 희망/불가 요청 (O/H/E/L)';
COMMENT ON COLUMN schedule_preferences.request_code IS '요청 코드: O(Off), H(Holiday), E(Education), L(Labor)';
COMMENT ON COLUMN schedule_preferences.request_note IS '요청 메모 (선택)';
COMMENT ON COLUMN schedule_preferences.resolution_status IS '요청 반영 상태: pending/fulfilled/unfulfilled';
COMMENT ON COLUMN schedule_preferences.resolved_shift_id IS '최종 반영 시프트 ID (schedule_assignments 기준)';
