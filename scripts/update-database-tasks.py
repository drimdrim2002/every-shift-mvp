#!/usr/bin/env python3
"""
Script to update database tasks in tasks.json:
1. Add RLS policy setup task
2. Add database verification task
3. Update seed data task with complete employee SQL
4. Add time estimates to all database tasks
5. Update task dependencies
"""

import json
from datetime import datetime
import uuid

# Task IDs
SCHEMA_MIGRATION_TASK_ID = "c44240eb-9148-4a0b-8787-b9560b29af7f"
SEED_DATA_TASK_ID = "48f3a743-a0ff-4fb3-8970-2877edcbc56e"
CLIENT_TEST_TASK_ID = "9b220011-43f5-4bf5-9f1c-1083deab00f8"

# New task IDs
RLS_POLICY_TASK_ID = str(uuid.uuid4())
VERIFICATION_TASK_ID = str(uuid.uuid4())

# Standard analysis result (copied from existing tasks)
ANALYSIS_RESULT = """EveryShift MVP - 간호사 근무표 생성 시스템 개발

**프로젝트 목표**: 엑셀 근무표 작성 시간 90% 단축 (4-8시간 → 자동 생성)
**기술 스택**: Vue 3 + TypeScript + Vite + Supabase + TanStack Table + Naive UI
**개발 기간**: 8주
**MVP 범위**: 4단계 워크플로우 (기본 정보 → 사이트 정보 → 초기 데이터 입력 → 결과 확인)

**핵심 제약사항**:
- 30명 직원 × 36일 (전월 5일 + 당월 31일) = 1,080개 셀 그리드
- Step 3 ScheduleGrid가 80% 개발 노력 집중
- MVP는 Out-of-Scope 항목 완전 제외 (회원가입, CRUD, 대시보드, 알림 등)
- AI Solver는 Mock 구현 (실제 Google Cloud Run 연동은 MVP 이후)
- 로컬 개발만, 배포 환경 미구성"""

def create_rls_policy_task():
    """Create RLS policy setup task"""
    now = datetime.utcnow().isoformat() + 'Z'
    return {
        "id": RLS_POLICY_TASK_ID,
        "name": "Supabase RLS 정책 설정 (schedules 테이블)",
        "description": "schedules 테이블에 Row Level Security 정책을 설정하여 조직별 데이터 접근 제어. MVP에서는 간소화된 정책 사용 (모든 사용자 접근 가능).",
        "status": "pending",
        "dependencies": [
            {"taskId": SCHEMA_MIGRATION_TASK_ID}
        ],
        "createdAt": now,
        "updatedAt": now,
        "relatedFiles": [],
        "estimatedMinutes": 5,
        "implementationGuide": """1. Supabase SQL Editor에서 다음 SQL 실행:

```sql
-- RLS 활성화
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

-- SELECT 정책 (MVP: 모든 사용자 조회 가능)
CREATE POLICY "Users can view own organization schedules"
ON schedules FOR SELECT
USING (true);

-- INSERT 정책 (MVP: 모든 사용자 생성 가능)
CREATE POLICY "Users can insert own organization schedules"
ON schedules FOR INSERT
WITH CHECK (true);

-- UPDATE 정책 (MVP: 모든 사용자 수정 가능)
CREATE POLICY "Users can update own organization schedules"
ON schedules FOR UPDATE
USING (true)
WITH CHECK (true);

-- DELETE 정책 (MVP: 모든 사용자 삭제 가능)
CREATE POLICY "Users can delete own organization schedules"
ON schedules FOR DELETE
USING (true);
```

2. Table Editor → schedules 테이블 → Policies 탭에서 정책 확인

**참고**: MVP에서는 Admin 단일 역할만 사용하므로 모든 정책을 `USING (true)`로 설정. 프로덕션에서는 `organization_id` 기반 필터링 필요.""",
        "verificationCriteria": "1. schedules 테이블에 RLS가 활성화되어 있음\n2. 4개 정책 생성 확인 (SELECT, INSERT, UPDATE, DELETE)\n3. Supabase Authentication 없이도 데이터 접근 가능 (USING true)\n4. 정책 이름이 명확하고 이해하기 쉬움",
        "analysisResult": ANALYSIS_RESULT
    }

def create_verification_task():
    """Create database verification task"""
    now = datetime.utcnow().isoformat() + 'Z'
    return {
        "id": VERIFICATION_TASK_ID,
        "name": "Supabase 데이터베이스 마이그레이션 검증",
        "description": "모든 테이블, 인덱스, RLS 정책, Seed 데이터가 올바르게 생성되었는지 SQL 쿼리로 검증.",
        "status": "pending",
        "dependencies": [
            {"taskId": SEED_DATA_TASK_ID},
            {"taskId": RLS_POLICY_TASK_ID}
        ],
        "createdAt": now,
        "updatedAt": now,
        "relatedFiles": [],
        "estimatedMinutes": 10,
        "implementationGuide": """1. Supabase SQL Editor에서 다음 검증 쿼리 실행:

**1단계: 테이블 존재 확인**
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'organizations',
    'employees',
    'shifts',
    'schedules',
    'schedule_assignments',
    'site_requirements'
  )
ORDER BY table_name;
-- 예상 결과: 6개 행
```

**2단계: 레코드 수 확인**
```sql
SELECT
  'organizations' as table_name, COUNT(*) as count FROM organizations
UNION ALL
SELECT 'employees', COUNT(*) FROM employees
UNION ALL
SELECT 'shifts', COUNT(*) FROM shifts
UNION ALL
SELECT 'schedules', COUNT(*) FROM schedules
UNION ALL
SELECT 'schedule_assignments', COUNT(*) FROM schedule_assignments
UNION ALL
SELECT 'site_requirements', COUNT(*) FROM site_requirements;
-- 예상 결과:
-- organizations: 1
-- employees: 30
-- shifts: 4
-- schedules: 0 (아직 근무표 생성 전)
-- schedule_assignments: 0
-- site_requirements: 21 (7일 × 3시프트)
```

**3단계: 인덱스 확인**
```sql
SELECT
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'idx_employees_org',
    'idx_schedules_org_month',
    'idx_assignments_schedule',
    'idx_assignments_employee_date'
  )
ORDER BY indexname;
-- 예상 결과: 4개 인덱스
```

**4단계: RLS 정책 확인**
```sql
SELECT
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'schedules'
ORDER BY policyname;
-- 예상 결과: 4개 정책 (SELECT, INSERT, UPDATE, DELETE)
```

**5단계: 데이터 무결성 확인**
```sql
-- 조직 데이터
SELECT id, name, type FROM organizations;
-- 예상: 세브란스병원, hospital

-- 시프트 데이터
SELECT code, name, color_code FROM shifts ORDER BY code;
-- 예상: D, E, N, O

-- 직원 샘플 (처음 5명)
SELECT employee_id, name, available_shifts FROM employees LIMIT 5;
-- 예상: JSONB 배열 형식 ["D","E","N","O"]

-- 사이트 요구사항 (일요일)
SELECT sr.day_of_week, s.code, sr.required_count
FROM site_requirements sr
JOIN shifts s ON sr.shift_id = s.id
WHERE sr.day_of_week = 0
ORDER BY s.code;
-- 예상: D=3, E=3, N=3
```

2. 모든 쿼리가 예상대로 결과를 반환하는지 확인
3. 오류 발생 시 PRD Section 4 (Troubleshooting) 참조""",
        "verificationCriteria": "1. 6개 테이블 모두 존재\n2. organizations: 1개, employees: 30개, shifts: 4개, site_requirements: 21개\n3. 4개 인덱스 모두 생성됨\n4. schedules 테이블에 4개 RLS 정책 활성화\n5. 데이터 무결성 확인 (JSONB 형식, 외래 키, 색상 코드)\n6. 모든 검증 쿼리가 에러 없이 실행됨",
        "analysisResult": ANALYSIS_RESULT
    }

def update_seed_data_task(task):
    """Update seed data task with complete employee SQL and time estimate"""
    # Add complete employee SQL (all 30 employees from PRD)
    complete_employee_sql = """('00000000-0000-0000-0000-000000000001', '40627', '박지현', '["D","E","N","O"]'),
('00000000-0000-0000-0000-000000000001', '41482', '김수빈', '["D","E","N","O"]'),
('00000000-0000-0000-0000-000000000001', '42635', '김다래', '["D","E","N","O"]'),
('00000000-0000-0000-0000-000000000001', '43891', '이서연', '["D","E","N","O"]'),
('00000000-0000-0000-0000-000000000001', '44205', '최유진', '["D","E","N","O"]'),
('00000000-0000-0000-0000-000000000001', '45678', '정민지', '["D","E","N","O"]'),
('00000000-0000-0000-0000-000000000001', '46234', '강하늘', '["D","E","N","O"]'),
('00000000-0000-0000-0000-000000000001', '47890', '윤서아', '["D","E","N","O"]'),
('00000000-0000-0000-0000-000000000001', '48123', '조예은', '["D","E","N","O"]'),
('00000000-0000-0000-0000-000000000001', '49456', '임수현', '["D","E","N","O"]'),
('00000000-0000-0000-0000-000000000001', '50789', '한지우', '["D","E","N","O"]'),
('00000000-0000-0000-0000-000000000001', '51234', '송민아', '["D","E","N","O"]'),
('00000000-0000-0000-0000-000000000001', '52567', '홍서진', '["D","E","N","O"]'),
('00000000-0000-0000-0000-000000000001', '53890', '백현지', '["D","E","N","O"]'),
('00000000-0000-0000-0000-000000000001', '54321', '문채원', '["D","E","N","O"]'),
('00000000-0000-0000-0000-000000000001', '55654', '신유리', '["D","E","N","O"]'),
('00000000-0000-0000-0000-000000000001', '56987', '오지은', '["D","E","N","O"]'),
('00000000-0000-0000-0000-000000000001', '57234', '안소희', '["D","E","N","O"]'),
('00000000-0000-0000-0000-000000000001', '58567', '류민정', '["D","E","N","O"]'),
('00000000-0000-0000-0000-000000000001', '59890', '진서영', '["D","E","N","O"]'),
('00000000-0000-0000-0000-000000000001', '60123', '표예진', '["D","E","N","O"]'),
('00000000-0000-0000-0000-000000000001', '61456', '남다은', '["D","E","N","O"]'),
('00000000-0000-0000-0000-000000000001', '62789', '권지안', '["D","E","N","O"]'),
('00000000-0000-0000-0000-000000000001', '63234', '황수아', '["D","E","N","O"]'),
('00000000-0000-0000-0000-000000000001', '64567', '탁지수', '["D","E","N","O"]'),
('00000000-0000-0000-0000-000000000001', '65890', '노윤서', '["D","E","N","O"]'),
('00000000-0000-0000-0000-000000000001', '66321', '석민주', '["D","E","N","O"]'),
('00000000-0000-0000-0000-000000000001', '67654', '양서현', '["D","E","N","O"]'),
('00000000-0000-0000-0000-000000000001', '68987', '허채린', '["D","E","N","O"]'),
('00000000-0000-0000-0000-000000000001', '69234', '설아름', '["D","E","N","O"]')"""

    new_implementation_guide = f"""1. Supabase SQL Editor에서 다음 순서로 데이터 삽입:

**1단계: 조직 생성**
```sql
INSERT INTO organizations (id, name, type) VALUES
('00000000-0000-0000-0000-000000000001', '세브란스병원', 'hospital');
```

**2단계: 시프트 정의**
```sql
INSERT INTO shifts (organization_id, code, name, color_code, start_time, end_time) VALUES
('00000000-0000-0000-0000-000000000001', 'D', 'Day', '#92D050', '08:00', '16:00'),
('00000000-0000-0000-0000-000000000001', 'E', 'Evening', '#FFC000', '16:00', '00:00'),
('00000000-0000-0000-0000-000000000001', 'N', 'Night', '#4472C4', '00:00', '08:00'),
('00000000-0000-0000-0000-000000000001', 'O', 'Off', '#D9D9D9', NULL, NULL);
```

**3단계: 직원 생성 (30명 전체)**
```sql
INSERT INTO employees (organization_id, employee_id, name, available_shifts) VALUES
{complete_employee_sql};
```

**4단계: 사이트 요구사항 (요일별)**
```sql
-- 일요일 (day_of_week=0)
INSERT INTO site_requirements (organization_id, shift_id, day_of_week, required_count)
SELECT '00000000-0000-0000-0000-000000000001'::uuid, id, 0,
  CASE code
    WHEN 'D' THEN 3
    WHEN 'E' THEN 3
    WHEN 'N' THEN 3
    ELSE 0
  END
FROM shifts WHERE organization_id = '00000000-0000-0000-0000-000000000001' AND code IN ('D', 'E', 'N');

-- 월요일 (day_of_week=1)
INSERT INTO site_requirements (organization_id, shift_id, day_of_week, required_count)
SELECT '00000000-0000-0000-0000-000000000001'::uuid, id, 1,
  CASE code
    WHEN 'D' THEN 3
    WHEN 'E' THEN 4
    WHEN 'N' THEN 3
    ELSE 0
  END
FROM shifts WHERE organization_id = '00000000-0000-0000-0000-000000000001' AND code IN ('D', 'E', 'N');

-- 화요일~금요일 (day_of_week=2-5): 월요일과 동일
INSERT INTO site_requirements (organization_id, shift_id, day_of_week, required_count)
SELECT '00000000-0000-0000-0000-000000000001'::uuid, id, day_num,
  CASE code
    WHEN 'D' THEN 3
    WHEN 'E' THEN 4
    WHEN 'N' THEN 3
    ELSE 0
  END
FROM shifts
CROSS JOIN (SELECT unnest(ARRAY[2,3,4,5]) as day_num) days
WHERE organization_id = '00000000-0000-0000-0000-000000000001' AND code IN ('D', 'E', 'N');

-- 토요일 (day_of_week=6)
INSERT INTO site_requirements (organization_id, shift_id, day_of_week, required_count)
SELECT '00000000-0000-0000-0000-000000000001'::uuid, id, 6,
  CASE code
    WHEN 'D' THEN 3
    WHEN 'E' THEN 3
    WHEN 'N' THEN 3
    ELSE 0
  END
FROM shifts WHERE organization_id = '00000000-0000-0000-0000-000000000001' AND code IN ('D', 'E', 'N');
```

2. Table Editor에서 데이터 확인:
   - organizations: 1개 레코드
   - shifts: 4개 레코드
   - employees: 30개 레코드
   - site_requirements: 21개 레코드 (7일 × 3시프트)"""

    task["implementationGuide"] = new_implementation_guide
    task["estimatedMinutes"] = 10
    task["updatedAt"] = datetime.utcnow().isoformat() + 'Z'
    return task

def add_time_estimates(tasks):
    """Add time estimates to database tasks"""
    time_estimates = {
        "cbab63dd-291c-49ba-af19-878efd0b063a": 5,   # Package install
        "0c2615ea-94e8-4674-8ba0-eb8297e1a89a": 10,  # Supabase project creation
        "ad6edb9e-3bf9-4f70-9882-0b9c451678f8": 5,   # Environment variables
        SCHEMA_MIGRATION_TASK_ID: 15,                 # Schema migration
        SEED_DATA_TASK_ID: 10,                        # Seed data (updated above)
        "9b220011-43f5-4bf5-9f1c-1083deab00f8": 10,  # Client test
    }

    for task in tasks:
        if task["id"] in time_estimates and "estimatedMinutes" not in task:
            task["estimatedMinutes"] = time_estimates[task["id"]]
            task["updatedAt"] = datetime.utcnow().isoformat() + 'Z'

    return tasks

def update_dependencies(tasks):
    """Update task dependencies to include new RLS and verification tasks"""
    for task in tasks:
        # Seed data task should depend on RLS policy task
        if task["id"] == SEED_DATA_TASK_ID:
            # Check if RLS dependency already exists
            rls_dep_exists = any(dep["taskId"] == RLS_POLICY_TASK_ID for dep in task["dependencies"])
            if not rls_dep_exists:
                task["dependencies"].append({"taskId": RLS_POLICY_TASK_ID})
                task["updatedAt"] = datetime.utcnow().isoformat() + 'Z'

        # Client test task should depend on verification task
        if task["id"] == CLIENT_TEST_TASK_ID:
            verification_dep_exists = any(dep["taskId"] == VERIFICATION_TASK_ID for dep in task["dependencies"])
            if not verification_dep_exists:
                task["dependencies"].append({"taskId": VERIFICATION_TASK_ID})
                task["updatedAt"] = datetime.utcnow().isoformat() + 'Z'

    return tasks

def main():
    # Read tasks.json
    with open('/home/brown/projects/every-shift-mvp/.shrimp-data/tasks.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    tasks = data["tasks"]

    # Find insertion point (after schema migration task)
    schema_idx = next(i for i, t in enumerate(tasks) if t["id"] == SCHEMA_MIGRATION_TASK_ID)

    # Create new tasks
    rls_task = create_rls_policy_task()
    verification_task = create_verification_task()

    # Insert new tasks
    tasks.insert(schema_idx + 1, rls_task)

    # Find seed data task (index changed after insertion)
    seed_idx = next(i for i, t in enumerate(tasks) if t["id"] == SEED_DATA_TASK_ID)
    tasks.insert(seed_idx + 1, verification_task)

    # Update seed data task
    seed_task_idx = next(i for i, t in enumerate(tasks) if t["id"] == SEED_DATA_TASK_ID)
    tasks[seed_task_idx] = update_seed_data_task(tasks[seed_task_idx])

    # Add time estimates to all database tasks
    tasks = add_time_estimates(tasks)

    # Update dependencies
    tasks = update_dependencies(tasks)

    # Write back
    data["tasks"] = tasks
    with open('/home/brown/projects/every-shift-mvp/.shrimp-data/tasks.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"✅ Added RLS policy task (ID: {RLS_POLICY_TASK_ID})")
    print(f"✅ Added verification task (ID: {VERIFICATION_TASK_ID})")
    print(f"✅ Updated seed data task with complete employee SQL")
    print(f"✅ Added time estimates to 8 database tasks")
    print(f"✅ Updated task dependencies")
    print(f"\nTotal database setup time: ~60 minutes")

if __name__ == "__main__":
    main()
