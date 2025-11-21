# Seed Data Documentation

EveryShift MVP의 초기 데이터(Seed Data) 구조와 관리 방법을 설명합니다.

## 목차

1. [개요](#개요)
2. [Seed 데이터 구조](#seed-데이터-구조)
3. [데이터 로드 방법](#데이터-로드-방법)
4. [데이터 수정 방법](#데이터-수정-방법)
5. [주의사항](#주의사항)

## 개요

### Seed 데이터의 목적

EveryShift MVP는 **읽기 전용(Read-Only) Seed 데이터**를 사용하여 개발 및 데모 환경을 구성합니다.

**핵심 특징**:
- 🏥 1개 조직 (세브란스병원)
- 👥 30명의 간호사
- ⏰ 4개 교대 타입 (D/E/N/O)
- 📊 요일별 교대별 필요 인원 설정
- 🔒 MVP에서는 CRUD 없이 읽기만 수행

### 데이터 관리 방식

현재 프로젝트는 Supabase 웹 대시보드를 통해 직접 데이터를 관리하고 있습니다.
- ❌ **로컬 seed.sql 파일 없음**
- ✅ **Supabase Dashboard에서 직접 INSERT**
- ✅ **Migration 시스템 미사용** (MVP 범위)

## Seed 데이터 구조

### 1. Organizations (조직)

**테이블**: `organizations`
**레코드 수**: 1개

```sql
-- 고정 UUID 사용 (00000000-0000-0000-0000-000000000001)
{
  "id": "00000000-0000-0000-0000-000000000001",
  "name": "세브란스병원",
  "type": "hospital",
  "created_at": "2025-11-15T03:52:23.787103+00:00",
  "updated_at": "2025-11-15T03:52:23.787103+00:00"
}
```

**스키마**:
| 컬럼 | 타입 | 설명 | 기본값 |
|------|------|------|--------|
| `id` | UUID | 조직 ID | `gen_random_uuid()` |
| `name` | VARCHAR | 조직명 | - |
| `type` | VARCHAR | 조직 유형 ('hospital', 'fire', 'police') | - |
| `created_at` | TIMESTAMPTZ | 생성 시각 | `now()` |
| `updated_at` | TIMESTAMPTZ | 수정 시각 | `now()` |

**비즈니스 규칙**:
- MVP에서는 1개 조직만 지원
- 고정 UUID(`00000000-0000-0000-0000-000000000001`) 사용으로 외래키 참조 간소화

---

### 2. Shifts (교대 타입)

**테이블**: `shifts`
**레코드 수**: 4개

```sql
-- D (Day Shift)
{
  "id": "a5bcb7c0-b9b1-408d-9add-fd08c13b951c",
  "organization_id": "00000000-0000-0000-0000-000000000001",
  "code": "D",
  "name": "Day",
  "color_code": "#92D050",
  "start_time": "08:00:00",
  "end_time": "16:00:00"
}

-- E (Evening Shift)
{
  "id": "9ba021e7-1c4a-4f38-a577-ffc6dbcda56d",
  "organization_id": "00000000-0000-0000-0000-000000000001",
  "code": "E",
  "name": "Evening",
  "color_code": "#FFC000",
  "start_time": "16:00:00",
  "end_time": "00:00:00"
}

-- N (Night Shift)
{
  "id": "493edb73-a7a0-4751-8bc1-92745c8bf729",
  "organization_id": "00000000-0000-0000-0000-000000000001",
  "code": "N",
  "name": "Night",
  "color_code": "#4472C4",
  "start_time": "00:00:00",
  "end_time": "08:00:00"
}

-- O (Off)
{
  "id": "c78341f7-84ef-474e-b6e9-6944de473d7a",
  "organization_id": "00000000-0000-0000-0000-000000000001",
  "code": "O",
  "name": "Off",
  "color_code": "#D9D9D9",
  "start_time": null,
  "end_time": null
}
```

**스키마**:
| 컬럼 | 타입 | 설명 | 예시 |
|------|------|------|------|
| `id` | UUID | 교대 ID | - |
| `organization_id` | UUID | 조직 ID (FK) | `00000000-0000-0000-0000-000000000001` |
| `code` | VARCHAR | 교대 코드 | 'D', 'E', 'N', 'O' |
| `name` | VARCHAR | 교대명 | 'Day', 'Evening', 'Night', 'Off' |
| `color_code` | VARCHAR | 색상 코드 (HEX) | '#92D050' |
| `start_time` | TIME | 시작 시간 | '08:00:00' |
| `end_time` | TIME | 종료 시간 | '16:00:00' |
| `created_at` | TIMESTAMPTZ | 생성 시각 | - |

**비즈니스 규칙**:
- 'O' (Off)는 `start_time`, `end_time`이 NULL
- 색상 코드는 UI에서 버튼 색상으로 사용
- 교대 코드는 단일 문자 ('D', 'E', 'N', 'O')

---

### 3. Employees (직원)

**테이블**: `employees`
**레코드 수**: 30개

```sql
-- 샘플 데이터 (30명 중 5명)
[
  {
    "id": "96a66cdc-cb08-49ef-82ed-ecfb9b624c94",
    "organization_id": "00000000-0000-0000-0000-000000000001",
    "employee_id": "40627",
    "name": "박지현",
    "available_shifts": ["D", "E", "N", "O"]
  },
  {
    "id": "fc98eb27-46d7-4ede-866e-c7b047465000",
    "organization_id": "00000000-0000-0000-0000-000000000001",
    "employee_id": "41482",
    "name": "김수빈",
    "available_shifts": ["D", "E", "N", "O"]
  },
  {
    "id": "9fe65343-6f10-4324-9c57-b10754bfbd6c",
    "organization_id": "00000000-0000-0000-0000-000000000001",
    "employee_id": "42635",
    "name": "김다래",
    "available_shifts": ["D", "E", "N", "O"]
  },
  {
    "id": "3064db39-093b-428d-9874-d221b762abce",
    "organization_id": "00000000-0000-0000-0000-000000000001",
    "employee_id": "43891",
    "name": "이서연",
    "available_shifts": ["D", "E", "N", "O"]
  },
  {
    "id": "c9b74310-d6c7-4432-96d2-fec0167bc58f",
    "organization_id": "00000000-0000-0000-0000-000000000001",
    "employee_id": "44205",
    "name": "최유진",
    "available_shifts": ["D", "E", "N", "O"]
  }
]
```

**스키마**:
| 컬럼 | 타입 | 설명 | 예시 |
|------|------|------|------|
| `id` | UUID | 직원 ID | - |
| `organization_id` | UUID | 조직 ID (FK) | `00000000-0000-0000-0000-000000000001` |
| `employee_id` | VARCHAR | 사원번호 | '40627' |
| `name` | VARCHAR | 이름 | '박지현' |
| `available_shifts` | JSONB | 가능한 교대 배열 | `["D", "E", "N", "O"]` |
| `created_at` | TIMESTAMPTZ | 생성 시각 | - |
| `updated_at` | TIMESTAMPTZ | 수정 시각 | - |

**비즈니스 규칙**:
- 총 30명의 간호사
- 모든 직원이 모든 교대 가능 (`["D", "E", "N", "O"]`)
- MVP에서는 교대 제약 없음 (향후 확장 가능)
- `employee_id`는 5자리 숫자 문자열

---

### 4. Site Requirements (사이트 필요 인원)

**테이블**: `site_requirements`
**레코드 수**: 28개 (7일 × 4교대)

```sql
-- 샘플 데이터 (일요일 = 0)
[
  {
    "id": "73d5acf3-de18-4699-9386-df8159c49efa",
    "organization_id": "00000000-0000-0000-0000-000000000001",
    "shift_id": "a5bcb7c0-b9b1-408d-9add-fd08c13b951c", -- D
    "day_of_week": 0, -- 일요일
    "required_count": 3
  },
  {
    "id": "a613b270-1bbb-4308-a441-4d0b4ade8d21",
    "organization_id": "00000000-0000-0000-0000-000000000001",
    "shift_id": "9ba021e7-1c4a-4f38-a577-ffc6dbcda56d", -- E
    "day_of_week": 0, -- 일요일
    "required_count": 3
  },
  {
    "id": "c8a64e6f-b163-47ad-9cf7-718be5c47949",
    "organization_id": "00000000-0000-0000-0000-000000000001",
    "shift_id": "493edb73-a7a0-4751-8bc1-92745c8bf729", -- N
    "day_of_week": 0, -- 일요일
    "required_count": 3
  },
  {
    "id": "0e3f7a78-306b-4ceb-ab48-d141e5dbedfe",
    "organization_id": "00000000-0000-0000-0000-000000000001",
    "shift_id": "c78341f7-84ef-474e-b6e9-6944de473d7a", -- O
    "day_of_week": 0, -- 일요일
    "required_count": 3
  }
]
```

**스키마**:
| 컬럼 | 타입 | 설명 | 예시 |
|------|------|------|------|
| `id` | UUID | 필요 인원 ID | - |
| `organization_id` | UUID | 조직 ID (FK) | `00000000-0000-0000-0000-000000000001` |
| `shift_id` | UUID | 교대 ID (FK) | - |
| `day_of_week` | INTEGER | 요일 (0=일요일, 6=토요일) | 0, 1, 2, ..., 6 |
| `required_count` | INTEGER | 필요 인원 수 | 2, 3 |
| `created_at` | TIMESTAMPTZ | 생성 시각 | - |

**비즈니스 규칙**:
- 요일별, 교대별 필요 인원 정의
- `day_of_week`: 0 = 일요일, 1 = 월요일, ..., 6 = 토요일
- MVP에서는 대부분 3명, 월요일 Day는 2명
- AI Solver가 이 제약 조건을 기반으로 스케줄 생성

---

### 5. Schedules (스케줄 메타데이터)

**테이블**: `schedules`
**레코드 수**: 데모용 1개 (사용자 생성 시 증가)

**스키마**:
| 컬럼 | 타입 | 설명 | 예시 |
|------|------|------|------|
| `id` | UUID | 스케줄 ID | - |
| `organization_id` | UUID | 조직 ID (FK) | `00000000-0000-0000-0000-000000000001` |
| `month` | VARCHAR | 대상 월 (YYYY-MM) | '2025-12' |
| `status` | VARCHAR | 상태 | 'created', 'running', 'complete', 'changed', 'error' |
| `hard_score` | INTEGER | Hard 제약 점수 (AI Solver) | 0 |
| `soft_score` | INTEGER | Soft 제약 점수 (AI Solver) | 0 |
| `created_at` | TIMESTAMPTZ | 생성 시각 | - |
| `updated_at` | TIMESTAMPTZ | 수정 시각 | - |

**비즈니스 규칙**:
- `status` 전이: `created` → `running` → `complete` (또는 `error`)
- 수동 수정 시: `complete` → `changed`
- RLS 정책 활성화 (Admin만 접근)

---

### 6. Schedule Assignments (개별 배정)

**테이블**: `schedule_assignments`
**레코드 수**: 데모용 1,080개 (30명 × 36일)

**스키마**:
| 컬럼 | 타입 | 설명 | 예시 |
|------|------|------|------|
| `id` | UUID | 배정 ID | - |
| `schedule_id` | UUID | 스케줄 ID (FK) | - |
| `employee_id` | UUID | 직원 ID (FK) | - |
| `shift_id` | UUID | 교대 ID (FK) | - |
| `date` | DATE | 배정 날짜 | '2025-12-01' |
| `is_locked` | BOOLEAN | 수정 금지 여부 | false |
| `created_at` | TIMESTAMPTZ | 생성 시각 | - |
| `updated_at` | TIMESTAMPTZ | 수정 시각 | - |

**비즈니스 규칙**:
- 1개 스케줄 = 30명 × 36일 = 1,080개 레코드
- 36일 = 전월 마지막 5일 + 당월 31일
- `is_locked`: Step 3에서 입력한 전월 데이터는 잠금 (수정 불가)
- AI Solver가 생성한 데이터는 Step 4에서 수동 수정 가능

---

## 데이터 로드 방법

### 방법 1: Supabase Dashboard (권장)

현재 프로젝트는 Supabase 웹 대시보드를 통해 Seed 데이터를 관리합니다.

**단계**:

1. **Supabase Dashboard 접속**
   ```
   https://supabase.com/dashboard/project/vjmerqaxguovnojinxfq
   ```

2. **Table Editor로 이동**
   - 좌측 메뉴에서 `Table Editor` 클릭

3. **테이블별 데이터 확인**
   - `organizations` → 1개 레코드
   - `shifts` → 4개 레코드
   - `employees` → 30개 레코드
   - `site_requirements` → 28개 레코드

4. **데이터 추가 (필요 시)**
   - `Insert row` 버튼 클릭
   - 필드 입력 후 `Save` 클릭

---

### 방법 2: SQL Editor (개발자용)

Supabase Dashboard의 SQL Editor를 사용하여 일괄 INSERT 가능합니다.

**예시 - Organizations 추가**:
```sql
INSERT INTO organizations (id, name, type)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '세브란스병원',
  'hospital'
);
```

**예시 - Shifts 추가**:
```sql
INSERT INTO shifts (organization_id, code, name, color_code, start_time, end_time)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'D', 'Day', '#92D050', '08:00:00', '16:00:00'),
  ('00000000-0000-0000-0000-000000000001', 'E', 'Evening', '#FFC000', '16:00:00', '00:00:00'),
  ('00000000-0000-0000-0000-000000000001', 'N', 'Night', '#4472C4', '00:00:00', '08:00:00'),
  ('00000000-0000-0000-0000-000000000001', 'O', 'Off', '#D9D9D9', NULL, NULL);
```

**예시 - Employees 추가**:
```sql
INSERT INTO employees (organization_id, employee_id, name, available_shifts)
VALUES
  ('00000000-0000-0000-0000-000000000001', '40627', '박지현', '["D","E","N","O"]'::jsonb),
  ('00000000-0000-0000-0000-000000000001', '41482', '김수빈', '["D","E","N","O"]'::jsonb),
  ('00000000-0000-0000-0000-000000000001', '42635', '김다래', '["D","E","N","O"]'::jsonb);
-- ... 27명 추가
```

**예시 - Site Requirements 추가**:
```sql
-- 일요일 (day_of_week = 0)
INSERT INTO site_requirements (organization_id, shift_id, day_of_week, required_count)
SELECT
  '00000000-0000-0000-0000-000000000001',
  id,
  0,
  CASE
    WHEN code = 'D' THEN 3
    WHEN code = 'E' THEN 3
    WHEN code = 'N' THEN 3
    WHEN code = 'O' THEN 3
  END
FROM shifts
WHERE organization_id = '00000000-0000-0000-0000-000000000001';

-- 월요일 ~ 토요일 반복 (day_of_week = 1~6)
-- ... 각 요일별 반복
```

---

### 방법 3: Supabase CLI (향후 확장)

현재는 사용하지 않지만, 향후 로컬 개발 환경 구축 시 활용 가능합니다.

```bash
# Supabase CLI 설치
npm install -g supabase

# 프로젝트 초기화
supabase init

# seed.sql 작성 (supabase/seed.sql)
# 테이블 데이터 INSERT 스크립트 작성

# Seed 데이터 로드
supabase db reset
```

**참고**: MVP에서는 Supabase CLI를 사용하지 않으며, 향후 확장 시 고려할 수 있습니다.

---

## 데이터 수정 방법

### 1. Organizations 수정

**시나리오**: 조직명 변경

```sql
-- Dashboard SQL Editor 사용
UPDATE organizations
SET
  name = '신촌세브란스병원',
  updated_at = NOW()
WHERE id = '00000000-0000-0000-0000-000000000001';
```

**주의사항**:
- `id`는 고정 UUID이므로 변경하지 말 것
- `type`은 'hospital', 'fire', 'police' 중 하나만 사용
- MVP에서는 1개 조직만 지원하므로 추가 INSERT 권장하지 않음

---

### 2. Shifts 수정

**시나리오**: Day Shift 시작 시간 변경 (08:00 → 09:00)

```sql
UPDATE shifts
SET
  start_time = '09:00:00',
  end_time = '17:00:00'
WHERE code = 'D'
  AND organization_id = '00000000-0000-0000-0000-000000000001';
```

**시나리오**: 색상 코드 변경

```sql
UPDATE shifts
SET color_code = '#00FF00' -- 밝은 녹색
WHERE code = 'D'
  AND organization_id = '00000000-0000-0000-0000-000000000001';
```

**주의사항**:
- 색상 코드는 HEX 형식 (`#RRGGBB`)
- 'O' (Off)의 `start_time`, `end_time`은 NULL 유지
- UI에서 즉시 반영되므로 브라우저 새로고침 필요

---

### 3. Employees 수정

**시나리오**: 특정 직원의 가능한 교대 변경

```sql
-- 박지현(40627)을 Day, Evening만 가능하도록 변경
UPDATE employees
SET
  available_shifts = '["D","E"]'::jsonb,
  updated_at = NOW()
WHERE employee_id = '40627'
  AND organization_id = '00000000-0000-0000-0000-000000000001';
```

**시나리오**: 직원 추가

```sql
INSERT INTO employees (organization_id, employee_id, name, available_shifts)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '50001',
  '신규직원',
  '["D","E","N","O"]'::jsonb
);
```

**주의사항**:
- `available_shifts`는 JSONB 배열 형식
- 반드시 `::jsonb` 캐스팅 필요
- `employee_id`는 중복 없어야 함 (UNIQUE 제약 없으므로 수동 확인)

---

### 4. Site Requirements 수정

**시나리오**: 일요일 Day Shift 필요 인원 변경 (3명 → 4명)

```sql
UPDATE site_requirements
SET required_count = 4
WHERE day_of_week = 0
  AND shift_id = (
    SELECT id FROM shifts
    WHERE code = 'D'
      AND organization_id = '00000000-0000-0000-0000-000000000001'
  );
```

**시나리오**: 특정 요일의 모든 교대 필요 인원 변경

```sql
-- 토요일(6) 모든 교대를 2명으로 변경
UPDATE site_requirements
SET required_count = 2
WHERE day_of_week = 6
  AND organization_id = '00000000-0000-0000-0000-000000000001';
```

**주의사항**:
- `day_of_week`: 0=일요일, 1=월요일, ..., 6=토요일
- AI Solver가 이 제약을 기반으로 스케줄 생성하므로 신중히 수정
- 필요 인원 < 직원 수 확인 필요

---

### 5. Schedules 및 Assignments 수정

**시나리오**: 스케줄 상태 변경

```sql
-- 스케줄을 'error' 상태로 변경
UPDATE schedules
SET
  status = 'error',
  updated_at = NOW()
WHERE month = '2025-12'
  AND organization_id = '00000000-0000-0000-0000-000000000001';
```

**시나리오**: 특정 날짜의 배정 변경

```sql
-- 박지현의 2025-12-01 교대를 D → E로 변경
UPDATE schedule_assignments sa
SET
  shift_id = (SELECT id FROM shifts WHERE code = 'E' LIMIT 1),
  updated_at = NOW()
WHERE sa.employee_id = (
    SELECT id FROM employees WHERE employee_id = '40627' LIMIT 1
  )
  AND sa.date = '2025-12-01'
  AND sa.schedule_id = (
    SELECT id FROM schedules WHERE month = '2025-12' LIMIT 1
  );
```

**주의사항**:
- `is_locked = true`인 레코드는 UI에서 수정 불가 (SQL로는 가능)
- 배정 변경 후 스케줄 상태는 자동으로 `changed`로 변경되지 않음 (수동 업데이트 필요)
- 대량 수정 시 트랜잭션 사용 권장

---

## 주의사항

### 1. 외래키 무결성

모든 테이블이 `organization_id`로 연결되어 있으므로, 조직 삭제 시 **CASCADE** 동작에 주의하세요.

```sql
-- ⚠️ 조직 삭제 시 모든 관련 데이터 삭제됨
DELETE FROM organizations WHERE id = '00000000-0000-0000-0000-000000000001';
-- → employees, shifts, schedules, schedule_assignments, site_requirements 모두 삭제
```

### 2. UUID 생성

- 새 레코드 추가 시 `id`는 자동 생성 (`gen_random_uuid()`)
- 고정 UUID가 필요한 경우에만 수동 지정 (예: organizations)

### 3. JSONB 형식

`employees.available_shifts`는 JSONB 배열이므로:
- ✅ 올바른 형식: `'["D","E","N"]'::jsonb`
- ❌ 잘못된 형식: `["D","E","N"]` (따옴표 누락)
- ❌ 잘못된 형식: `'["D","E","N"]'` (캐스팅 누락)

### 4. RLS (Row Level Security)

`schedules` 테이블만 RLS 활성화:
- Dashboard에서는 Admin 권한으로 모든 데이터 접근 가능
- 앱에서는 인증된 사용자만 자신의 조직 데이터 접근

### 5. 데이터 일관성

- 직원 수 ≥ 필요 인원 합계 확인
- 교대 코드는 'D', 'E', 'N', 'O'만 사용
- 날짜 형식: `YYYY-MM-DD`, 시간 형식: `HH:MM:SS`

### 6. MVP 제약사항

- **CRUD 없음**: 프론트엔드에서 Seed 데이터 수정 불가
- **고정 조직**: 1개 조직만 지원
- **고정 직원**: 30명 고정 (추가/삭제 불가)
- **읽기 전용**: `organization.ts`, `schedule.ts` 스토어에서 읽기만 수행

---

## 참고 자료

- [Supabase Dashboard](https://supabase.com/dashboard/project/vjmerqaxguovnojinxfq)
- [Supabase SQL Editor](https://supabase.com/dashboard/project/vjmerqaxguovnojinxfq/sql)
- [CLAUDE.md](./CLAUDE.md) - 프로젝트 개요 및 기술 스택
- [DEVELOPMENT.md](./DEVELOPMENT.md) - 개발 가이드
- [README.md](./README.md) - 프로젝트 소개

---

## 문서 히스토리

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|----------|
| 1.0 | 2025-11-21 | Claude | 초기 작성 - Seed 데이터 구조 문서화 |
