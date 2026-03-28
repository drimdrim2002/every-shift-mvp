# API Documentation

EveryShift MVP의 데이터베이스 스키마, RLS 정책, API 함수들을 문서화합니다.

## 목차

1. [개요](#개요)
2. [데이터베이스 스키마](#데이터베이스-스키마)
3. [RLS 정책](#rls-정책)
4. [API 함수](#api-함수)
5. [TypeScript 타입 정의](#typescript-타입-정의)
6. [상태 전이 다이어그램](#상태-전이-다이어그램)
7. [사용 예시](#사용-예시)

---

## 개요

### Backend 아키텍처

**데이터베이스**: Supabase PostgreSQL
**인증**: Supabase Auth (email/password)
**보안**: RLS (Row Level Security) - Admin 전용

### 핵심 구성 요소

- **6개 핵심 테이블**: organizations, shifts, employees, site_requirements, schedules, schedule_assignments
- **API 레이어**: `src/api/` - Supabase 통신 추상화
- **타입 정의**: `src/types/` - TypeScript 인터페이스

---

## 데이터베이스 스키마

### 1. organizations (조직)

**목적**: 병원/소방서/경찰서 등의 조직 정보

**스키마**:
```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,                      -- 조직명
  type VARCHAR NOT NULL,                      -- 'hospital', 'fire', 'police'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**비즈니스 규칙**:
- MVP에서는 1개 조직만 지원 (세브란스병원)
- 고정 UUID 사용: `00000000-0000-0000-0000-000000000001`
- type: 'hospital', 'fire', 'police' 중 하나

**예시 데이터**:
```json
{
  "id": "00000000-0000-0000-0000-000000000001",
  "name": "세브란스병원",
  "type": "hospital",
  "created_at": "2025-11-15T03:52:23.787103+00:00",
  "updated_at": "2025-11-15T03:52:23.787103+00:00"
}
```

---

### 2. shifts (교대 타입)

**목적**: D/E/N/O 교대 타입 정의

**스키마**:
```sql
CREATE TABLE shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code VARCHAR NOT NULL,                      -- 'D', 'E', 'N', 'O'
  name VARCHAR NOT NULL,                      -- 'Day', 'Evening', 'Night', 'Off'
  color_code VARCHAR NOT NULL,                -- HEX 색상 코드 (#RRGGBB)
  start_time TIME,                            -- 시작 시간 (Off는 NULL)
  end_time TIME,                              -- 종료 시간 (Off는 NULL)
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**교대 유형**:
| Code | Name | Color | 시작 | 종료 | 설명 |
|------|------|-------|------|------|------|
| D | Day | #92D050 | 08:00 | 16:00 | 주간 근무 |
| E | Evening | #FFC000 | 16:00 | 00:00 | 저녁 근무 |
| N | Night | #4472C4 | 00:00 | 08:00 | 야간 근무 |
| O | Off | #D9D9D9 | NULL | NULL | 휴무 |

**비즈니스 규칙**:
- 'O' (Off)는 `start_time`, `end_time`이 NULL
- 색상 코드는 UI에서 버튼 색상으로 사용 (Excel 호환)
- 교대 코드는 단일 문자 ('D', 'E', 'N', 'O')

---

### 3. employees (직원)

**목적**: 간호사 30명 정보

**스키마**:
```sql
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id VARCHAR NOT NULL,               -- 사원번호 (5자리 숫자)
  name VARCHAR NOT NULL,                      -- 이름
  available_shifts JSONB NOT NULL,            -- 가능한 교대 배열 ["D","E","N","O"]
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**비즈니스 규칙**:
- MVP에서는 30명 고정
- `employee_id`: 5자리 숫자 문자열 (예: "40627")
- `available_shifts`: JSONB 배열 형식 (예: `["D","E","N","O"]`)
- MVP에서는 모든 직원이 모든 교대 가능

**예시 데이터**:
```json
{
  "id": "96a66cdc-cb08-49ef-82ed-ecfb9b624c94",
  "organization_id": "00000000-0000-0000-0000-000000000001",
  "employee_id": "40627",
  "name": "박지현",
  "available_shifts": ["D", "E", "N", "O"]
}
```

**JSONB 형식 주의**:
- ✅ 올바른 형식: `'["D","E","N"]'::jsonb`
- ❌ 잘못된 형식: `["D","E","N"]` (따옴표 누락)
- ❌ 잘못된 형식: `'["D","E","N"]'` (캐스팅 누락)

---

### 4. site_requirements (사이트 필요 인원)

**목적**: 요일별, 교대별 필요 인원 정의

**스키마**:
```sql
CREATE TABLE site_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL,              -- 0=일요일, 1=월요일, ..., 6=토요일
  required_count INTEGER NOT NULL,           -- 필요 인원 수
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT day_of_week_range CHECK (day_of_week BETWEEN 0 AND 6)
);
```

**요일 코드**:
- 0: 일요일
- 1: 월요일
- 2: 화요일
- 3: 수요일
- 4: 목요일
- 5: 금요일
- 6: 토요일

**비즈니스 규칙**:
- 7일 × 4교대 = 28개 레코드
- AI Solver가 이 제약을 기반으로 스케줄 생성
- MVP 설정: 대부분 3명, 월요일 Day는 2명 (예외)

**예시 쿼리**:
```sql
-- 일요일 Day Shift 필요 인원
SELECT required_count
FROM site_requirements sr
JOIN shifts s ON sr.shift_id = s.id
WHERE sr.day_of_week = 0 AND s.code = 'D';
-- 결과: 3
```

---

### 5. schedules (스케줄 메타데이터)

**목적**: 월별 근무표 메타정보 및 AI Solver 결과

**스키마**:
```sql
CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  month VARCHAR NOT NULL,                    -- 대상 월 (YYYY-MM)
  status VARCHAR NOT NULL,                   -- 상태: 'created', 'running', 'complete', 'changed', 'error'
  hard_score INTEGER,                        -- Hard 제약 점수 (AI Solver)
  soft_score INTEGER,                        -- Soft 제약 점수 (AI Solver)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**상태 (status) 전이**:
```
created → running → complete (성공)
                 → error (실패)

complete → changed (수동 수정 시)
```

**비즈니스 규칙**:
- `month` 형식: "YYYY-MM" (예: "2025-12")
- `hard_score`: 0 = 모든 Hard 제약 만족
- `soft_score`: 높을수록 좋음 (공정성 점수)
- RLS 정책 활성화 (Admin만 접근)

**예시 데이터**:
```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "organization_id": "00000000-0000-0000-0000-000000000001",
  "month": "2025-12",
  "status": "complete",
  "hard_score": 0,
  "soft_score": 145,
  "created_at": "2025-12-01T10:00:00Z",
  "updated_at": "2025-12-01T10:05:00Z"
}
```

---

### 6. schedule_assignments (개별 배정)

**목적**: 직원별, 날짜별 시프트 배정 정보

**스키마**:
```sql
CREATE TABLE schedule_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  date DATE NOT NULL,                        -- 배정 날짜
  is_locked BOOLEAN DEFAULT FALSE,           -- 수정 금지 여부
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (schedule_id, employee_id, date)    -- 동일 날짜 중복 배정 방지
);
```

**비즈니스 규칙**:
- 1개 스케줄 = 30명 × 36일 = 1,080개 레코드
- 36일 = 전월 마지막 5일 + 당월 31일
- `is_locked`: Step 3에서 입력한 전월 데이터는 잠금 (수정 불가)
- AI Solver가 생성한 데이터는 Step 4에서 수동 수정 가능

**예시 데이터**:
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "schedule_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "employee_id": "96a66cdc-cb08-49ef-82ed-ecfb9b624c94",
  "shift_id": "a5bcb7c0-b9b1-408d-9add-fd08c13b951c",
  "date": "2025-12-01",
  "is_locked": false,
  "created_at": "2025-12-01T10:05:00Z",
  "updated_at": "2025-12-01T10:05:00Z"
}
```

---

## RLS 정책

### 개요

**Row Level Security (RLS)**는 Supabase PostgreSQL의 보안 기능입니다.

**MVP 정책**: Admin 전용 (모든 사용자가 Admin으로 간주)

### schedules 테이블 RLS

```sql
-- RLS 활성화
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

-- Admin 전체 권한 정책
CREATE POLICY "Admin can do everything"
ON schedules
FOR ALL
USING (true)
WITH CHECK (true);
```

**설명**:
- `USING (true)`: 모든 행 읽기 허용
- `WITH CHECK (true)`: 모든 행 쓰기 허용
- MVP에서는 모든 인증된 사용자가 Admin으로 간주

### 향후 확장 (Post-MVP)

조직별 권한 분리 예시:

```sql
-- 조직 멤버만 자신의 조직 데이터 접근
CREATE POLICY "Organization members can access their schedules"
ON schedules
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id
    FROM user_organizations
    WHERE user_id = auth.uid()
  )
);

-- 조직 Admin만 생성/수정/삭제
CREATE POLICY "Organization admins can modify schedules"
ON schedules
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM user_organizations
    WHERE user_id = auth.uid()
      AND organization_id = schedules.organization_id
      AND role = 'admin'
  )
);
```

---

## API 함수

### 1. Supabase 클라이언트 (`src/api/supabase.ts`)

**초기화**:
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)
```

**환경 변수** (`.env.local`):
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

### 2. 근무표 API (`src/api/schedule.ts`)

#### `createSchedule(orgId, month)`

**목적**: 근무표 생성 (기존 확인 후 재사용 또는 생성)

**시그니처**:
```typescript
async function createSchedule(
  orgId: string,
  month: string
): Promise<Schedule>
```

**동작**:
1. 기존 schedule 확인 (organization_id + month)
2. 있으면 재사용 (status 리셋)
3. 없으면 새로 생성

**예시**:
```typescript
const schedule = await createSchedule(
  '00000000-0000-0000-0000-000000000001',
  '2025-12'
);
// { id: '...', organization_id: '...', month: '2025-12', status: 'created' }
```

**구현**:
```typescript
export async function createSchedule(orgId: string, month: string) {
  // 1. 기존 schedule 확인
  const { data: existing } = await supabase
    .from('schedules')
    .select('*')
    .eq('organization_id', orgId)
    .eq('month', month)
    .maybeSingle();

  // 2. 기존 schedule이 있으면 재사용 (status 리셋)
  if (existing) {
    const { data, error } = await supabase
      .from('schedules')
      .update({
        status: 'created',
        hard_score: null,
        soft_score: null,
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // 3. 없으면 새로 생성
  const { data, error } = await supabase
    .from('schedules')
    .insert({
      organization_id: orgId,
      month,
      status: 'created',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

---

#### `getScheduleStatus(scheduleId)`

**목적**: 근무표 상태 조회 (AI Solver Polling용)

**시그니처**:
```typescript
async function getScheduleStatus(
  scheduleId: string
): Promise<Schedule>
```

**예시**:
```typescript
const schedule = await getScheduleStatus('schedule-uuid');
// { id: '...', status: 'running', hard_score: null, soft_score: null }
```

**구현**:
```typescript
export async function getScheduleStatus(scheduleId: string) {
  const { data, error } = await supabase
    .from('schedules')
    .select('*')
    .eq('id', scheduleId)
    .single();

  if (error) throw error;
  return data;
}
```

---

#### `getScheduleAssignments(scheduleId)`

**목적**: 근무표 배정 조회 (1080개 레코드)

**시그니처**:
```typescript
async function getScheduleAssignments(
  scheduleId: string
): Promise<AssignmentMap>
```

**반환 타입**:
```typescript
type AssignmentMap = Record<string, Record<string, string>>;
// { [employeeId]: { [date]: shiftCode } }
```

**예시**:
```typescript
const assignments = await getScheduleAssignments('schedule-uuid');
// {
//   "emp-1": { "2025-12-01": "D", "2025-12-02": "E", ... },
//   "emp-2": { "2025-12-01": "N", "2025-12-02": "O", ... },
//   ...
// }
```

**구현 (페이지네이션)**:
```typescript
export async function getScheduleAssignments(scheduleId: string): Promise<AssignmentMap> {
  const allData: AssignmentRow[] = [];
  let from = 0;
  const pageSize = 1000;
  let hasMore = true;

  // 1000개씩 페이지네이션하여 모든 데이터 조회
  while (hasMore) {
    const { data, error } = await supabase
      .from('schedule_assignments')
      .select('employee_id, date, shifts(code)')
      .eq('schedule_id', scheduleId)
      .range(from, from + pageSize - 1);

    if (error) throw error;

    if (data && data.length > 0) {
      allData.push(...data);
      from += pageSize;
      hasMore = data.length === pageSize;
    } else {
      hasMore = false;
    }
  }

  // AssignmentMap 형식으로 변환
  const assignments: AssignmentMap = {};
  allData.forEach((row) => {
    if (!assignments[row.employee_id]) {
      assignments[row.employee_id] = {};
    }
    assignments[row.employee_id][row.date] = row.shifts?.code ?? '';
  });

  return assignments;
}
```

---

#### `updateAssignment(scheduleId, employeeId, date, shiftId)`

**목적**: 배정 수정 (Upsert)

**시그니처**:
```typescript
async function updateAssignment(
  scheduleId: string,
  employeeId: string,
  date: string,
  shiftId: string
): Promise<void>
```

**예시**:
```typescript
await updateAssignment(
  'schedule-uuid',
  'emp-1',
  '2025-12-01',
  'shift-d-uuid'
);
// DB 업데이트 + 스케줄 상태 'changed'로 변경
```

**구현**:
```typescript
export async function updateAssignment(
  scheduleId: string,
  employeeId: string,
  date: string,
  shiftId: string
) {
  // Upsert
  const { error } = await supabase
    .from('schedule_assignments')
    .upsert(
      {
        schedule_id: scheduleId,
        employee_id: employeeId,
        shift_id: shiftId,
        date,
      },
      {
        onConflict: 'schedule_id,employee_id,date',
      }
    );

  if (error) throw error;

  // 근무표 상태를 'changed'로 변경
  await supabase
    .from('schedules')
    .update({ status: 'changed' })
    .eq('id', scheduleId);
}
```

---

#### `completeSchedule(scheduleId)`

**목적**: 근무표 완료 처리

**시그니처**:
```typescript
async function completeSchedule(
  scheduleId: string
): Promise<void>
```

**예시**:
```typescript
await completeSchedule('schedule-uuid');
// status: 'changed' → 'complete'
```

---

#### `getScheduleList(orgId)`

**목적**: 조직의 근무표 목록 조회

**시그니처**:
```typescript
async function getScheduleList(
  orgId: string
): Promise<Schedule[]>
```

**예시**:
```typescript
const schedules = await getScheduleList('org-uuid');
// [
//   { id: '...', month: '2025-12', status: 'complete', ... },
//   { id: '...', month: '2025-11', status: 'complete', ... }
// ]
```

---

### 3. AI Solver API (`src/api/solver.ts`)

#### `requestAISolver(payload)`

**목적**: AI Solver 호출 (MVP: Mock 응답)

**시그니처**:
```typescript
interface SolverPayload {
  scheduleId: string;
  employees: Employee[];
  requirements: SiteRequirements;
  lastMonthAssignments: AssignmentMap;
  thisMonthAssignments: AssignmentMap;
}

interface SolverResponse {
  scheduleId: string;
  status: 'complete' | 'error';
  hardScore: number;
  softScore: number;
  assignments: AssignmentMap;
}

async function requestAISolver(
  payload: SolverPayload
): Promise<SolverResponse>
```

**동작 (MVP)**:
- 5초 대기 후 Mock 응답 반환
- 전월 데이터 보존
- 빈 날짜만 랜덤 배정

**예시**:
```typescript
const response = await requestAISolver({
  scheduleId: 'schedule-uuid',
  employees: [...],
  requirements: {...},
  lastMonthAssignments: {...},
  thisMonthAssignments: {...}
});
// {
//   scheduleId: 'schedule-uuid',
//   status: 'complete',
//   hardScore: 0,
//   softScore: 145,
//   assignments: {...}
// }
```

**구현**:
```typescript
export async function requestAISolver(payload: SolverPayload): Promise<SolverResponse> {
  // MVP: 5초 후 완료
  await new Promise((resolve) => setTimeout(resolve, 5000));

  return {
    scheduleId: payload.scheduleId,
    status: 'complete',
    hardScore: 0,
    softScore: Math.floor(Math.random() * 100) + 100,
    assignments: generateMockAssignments(payload),
  };
}

function generateMockAssignments(payload: SolverPayload): AssignmentMap {
  const result: AssignmentMap = {};

  payload.employees.forEach((emp) => {
    result[emp.id] = {
      // 전월 데이터 보존
      ...payload.lastMonthAssignments[emp.id],
      // 당월 부분 입력 데이터 보존
      ...payload.thisMonthAssignments[emp.id],
    };

    // 빈 날짜만 자동 배정
    const dates = Object.keys(payload.requirements);
    const availableShifts = emp.available_shifts || ['D', 'E', 'N', 'O'];

    dates.forEach((date) => {
      if (!result[emp.id][date]) {
        const randomIndex = Math.floor(Math.random() * availableShifts.length);
        result[emp.id][date] = availableShifts[randomIndex];
      }
    });
  });

  return result;
}
```

---

## TypeScript 타입 정의

### 1. 조직 (`src/types/organization.ts`)

```typescript
export interface Organization {
  id: string;                    // UUID
  name: string;                  // "세브란스병원"
  type: string;                  // "hospital", "fire", "police"
  createdAt?: string;
  updatedAt?: string;
}
```

---

### 2. 교대 (`src/types/shift.ts`)

```typescript
export interface Shift {
  id: string;                    // UUID
  organizationId: string;
  code: string;                  // "D", "E", "N", "O"
  name: string;                  // "Day", "Evening", "Night", "Off"
  colorCode: string;             // "#92D050", "#FFC000", "#4472C4", "#D9D9D9"
  startTime: string | null;      // "08:00:00" or null for Off
  endTime: string | null;        // "16:00:00" or null for Off
  createdAt?: string;
}
```

---

### 3. 직원 (`src/types/employee.ts`)

```typescript
export interface Employee {
  id: string;                    // UUID
  organizationId: string;        // UUID
  employeeId: string;            // 직번 (예: "40627")
  name: string;                  // 이름 (예: "박지현")
  availableShifts: string[];     // ["D", "E", "N", "O"]
  createdAt?: string;
  updatedAt?: string;
}
```

---

### 4. 근무표 (`src/types/schedule.ts`)

```typescript
// 기본 정보 (Step 1)
export interface ScheduleBasicInfo {
  month: string;                 // "2025-12"
  organizationId: string;        // UUID
  organizationName: string;
  organizationType: string;
  employeeCount: number;
  shifts: Shift[];
}

// 그리드 컬럼 정보
export interface GridColumn {
  date: string;                  // "2025-11-27"
  day: number;                   // 27
  dayOfWeek: number;             // 0-6
  dayName: string;               // "일", "월", ...
  isLastMonth: boolean;          // 전월 여부
}

// 배정 맵: employeeId -> date -> shiftCode
export type AssignmentMap = Record<string, Record<string, string>>;

// 행/열 통계
export interface RowStat {
  D: number;
  E: number;
  N: number;
  total: number;
}

export interface ColumnStat {
  D: number;
  E: number;
  N: number;
  total: number;
}

export interface GridStatistics {
  rowStats: Record<string, RowStat>;      // employeeId별
  columnStats: Record<string, ColumnStat>; // date별
}

// 사이트 요구사항 (Step 2)
export interface SiteRequirements {
  [date: string]: DailyRequirement;        // "2025-12-01": { D: 3, E: 4, ... }
}

export interface DailyRequirement {
  D: number;
  E: number;
  N: number;
  O: number;
  total: number;
}
```

---

## 상태 전이 다이어그램

### 1. 근무표 상태 (schedules.status)

```
┌──────────┐
│ created  │ ← 근무표 생성 (Step 3)
└────┬─────┘
     │
     │ AI Solver 호출
     ↓
┌──────────┐
│ running  │ ← Polling 중...
└────┬─────┘
     │
     ├──→ ┌──────────┐
     │    │ complete │ ← 성공 (Step 4로 이동)
     │    └────┬─────┘
     │         │
     │         │ 수동 수정
     │         ↓
     │    ┌──────────┐
     │    │ changed  │ ← 수정된 상태
     │    └──────────┘
     │
     └──→ ┌──────────┐
          │  error   │ ← 실패 (에러 메시지 표시)
          └──────────┘
```

**상태 설명**:
- **created**: 근무표 레코드 생성됨, AI Solver 대기 중
- **running**: AI Solver 실행 중 (Polling)
- **complete**: AI Solver 완료, 결과 확인 가능
- **changed**: Step 4에서 수동 수정됨
- **error**: AI Solver 실패

---

### 2. 워크플로우 전체 흐름

```
┌─────────────────────────────────────────────────────────────┐
│ Step 1: 기본 정보                                              │
│  - 월 선택 (YYYY-MM)                                          │
│  - 조직 확인                                                   │
│  → scheduleStore.targetMonth, organizationId 저장             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 2: 사이트 정보                                            │
│  - 요일별, 교대별 필요 인원 설정                                │
│  → site_requirements 테이블 저장                              │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 3: 초기 데이터 (핵심)                                     │
│  - 30×36 그리드에 전월 데이터 입력                             │
│  - LocalStorage 자동 저장 (500ms debounce)                   │
│  - "근무표 생성" 버튼 클릭                                     │
│  → createSchedule() → status='created'                       │
│  → requestAISolver()                                         │
│  → startPolling() (5초 간격)                                 │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ AI Solver (Mock - 5초 대기)                                   │
│  - status: created → running → complete                      │
│  - Mock: 전월 보존 + 빈 날짜 랜덤 배정                         │
│  → schedule_assignments 테이블 저장                           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 4: 결과 확인                                              │
│  - getScheduleAssignments() → 1080개 레코드 조회              │
│  - 그리드 표시 (편집 가능)                                     │
│  - updateAssignment() → status='changed'                     │
│  - Excel 내보내기                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 사용 예시

### 예시 1: 근무표 생성 및 Polling

```typescript
import { createSchedule, getScheduleStatus } from '@/api/schedule';
import { requestAISolver } from '@/api/solver';

// 1. 근무표 레코드 생성
const schedule = await createSchedule(
  '00000000-0000-0000-0000-000000000001',
  '2025-12'
);
console.log(schedule.status); // 'created'

// 2. AI Solver 호출 (Mock)
const solverResponse = await requestAISolver({
  scheduleId: schedule.id,
  employees: employeeList,
  requirements: siteRequirements,
  lastMonthAssignments: previousData,
  thisMonthAssignments: {}
});

// 3. Polling 시작 (5초 간격)
const intervalId = setInterval(async () => {
  const updated = await getScheduleStatus(schedule.id);

  if (updated.status === 'complete') {
    clearInterval(intervalId);
    console.log('근무표 생성 완료!');
    router.push('/schedule/step4');
  } else if (updated.status === 'error') {
    clearInterval(intervalId);
    console.error('생성 실패');
  }
}, 5000);
```

---

### 예시 2: 결과 조회 및 수정

```typescript
import { getScheduleAssignments, updateAssignment } from '@/api/schedule';

// 1. 배정 데이터 조회 (1080개)
const assignments = await getScheduleAssignments('schedule-uuid');
console.log(Object.keys(assignments).length); // 30 (직원 수)

// 2. 특정 배정 확인
const empAssignments = assignments['emp-1'];
console.log(empAssignments['2025-12-01']); // 'D'

// 3. 배정 수정
await updateAssignment(
  'schedule-uuid',
  'emp-1',
  '2025-12-01',
  'shift-e-uuid' // D → E로 변경
);

// 4. 스케줄 상태 확인
const schedule = await getScheduleStatus('schedule-uuid');
console.log(schedule.status); // 'changed'
```

---

### 예시 3: 직원별 통계 계산

```typescript
import type { AssignmentMap, RowStat } from '@/types/schedule';

function calculateEmployeeStats(
  assignments: AssignmentMap,
  employeeId: string,
  targetMonth: string
): RowStat {
  const empAssignments = assignments[employeeId] || {};
  const stats: RowStat = { D: 0, E: 0, N: 0, total: 0 };

  Object.entries(empAssignments).forEach(([date, shiftCode]) => {
    // 대상 월만 카운트
    if (date.startsWith(targetMonth)) {
      if (shiftCode === 'D') stats.D++;
      else if (shiftCode === 'E') stats.E++;
      else if (shiftCode === 'N') stats.N++;

      if (shiftCode !== 'O') {
        stats.total++;
      }
    }
  });

  return stats;
}

// 사용
const stats = calculateEmployeeStats(assignments, 'emp-1', '2025-12');
console.log(stats); // { D: 10, E: 8, N: 7, total: 25 }
```

---

### 예시 4: 날짜별 배정 현황

```typescript
import type { AssignmentMap, ColumnStat } from '@/types/schedule';

function calculateDateStats(
  assignments: AssignmentMap,
  date: string
): ColumnStat {
  const stats: ColumnStat = { D: 0, E: 0, N: 0, total: 0 };

  Object.values(assignments).forEach((empAssignments) => {
    const shiftCode = empAssignments[date];

    if (shiftCode === 'D') stats.D++;
    else if (shiftCode === 'E') stats.E++;
    else if (shiftCode === 'N') stats.N++;

    if (shiftCode && shiftCode !== 'O') {
      stats.total++;
    }
  });

  return stats;
}

// 사용
const stats = calculateDateStats(assignments, '2025-12-01');
console.log(stats); // { D: 3, E: 4, N: 3, total: 10 }
```

---

## 참고 자료

### 내부 문서

- [SEED_DATA.md](./SEED_DATA.md) - Seed 데이터 구조 및 관리
- [DEVELOPMENT.md](./DEVELOPMENT.md) - 개발자 가이드
- [CLAUDE.md](./CLAUDE.md) - 프로젝트 개요 및 기술 스택
- [README.md](./README.md) - 프로젝트 소개

### 외부 문서

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase PostgreSQL](https://supabase.com/docs/guides/database)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

---

## 문서 히스토리

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|----------|
| 1.0 | 2025-11-21 | Claude | 초기 작성 - API 문서화 |
