-- Add off_reason column to schedule_assignments table
-- Migration: 002_add_off_reason
-- Date: 2025-12-02

ALTER TABLE schedule_assignments 
ADD COLUMN IF NOT EXISTS off_reason VARCHAR(50) DEFAULT NULL;

COMMENT ON COLUMN schedule_assignments.off_reason IS 'Off 사유 (휴가/교육/병가/기타)';

