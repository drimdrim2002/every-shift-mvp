-- Store solver execution id per schedule so Step5 can resume polling
ALTER TABLE schedules
ADD COLUMN IF NOT EXISTS solver_execution_id TEXT;

COMMENT ON COLUMN schedules.solver_execution_id IS '현재 실행 중인 AI Solver 작업 ID';
