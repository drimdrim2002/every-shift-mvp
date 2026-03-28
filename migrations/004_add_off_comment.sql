-- Add comment column to schedule_assignments table
ALTER TABLE schedule_assignments
ADD COLUMN IF NOT EXISTS comment text;

-- Add comment on column
COMMENT ON COLUMN schedule_assignments.comment IS 'User provided comment for this assignment (e.g. reason for manual placement)';
