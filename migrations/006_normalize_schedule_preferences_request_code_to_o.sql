-- Normalize legacy schedule_preferences request codes to O only
-- Migration: 006_normalize_schedule_preferences_request_code_to_o
-- Date: 2026-02-13

UPDATE schedule_preferences
SET
  request_code = 'O',
  updated_at = NOW()
WHERE request_code IN ('H', 'E', 'L');

COMMENT ON TABLE schedule_preferences IS 'Step4에서 입력된 근무 불가 요청 (O)';
COMMENT ON COLUMN schedule_preferences.request_code IS '요청 코드: O(Off)';
COMMENT ON COLUMN schedule_preferences.request_note IS '근무 불가 사유 메모 (선택)';
