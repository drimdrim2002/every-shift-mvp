# EveryShift MVP PRD - 기능 명세, 컴포넌트 설계, API 설계

## 문서 정보

- **버전**: MVP 1.0
- **작성일**: 2025-11-12
- **목적**: 4단계 워크플로우 상세 기능 명세 및 기술 구현 가이드

---

# 목차

1. [기능 명세](#1-기능-명세)
2. [컴포넌트 설계](#2-컴포넌트-설계)
3. [API 설계](#3-api-설계)

---

# 4. 기능 명세

## 4.1 Step 1: 기본 정보 설정

### 목적

근무표 생성의 **계획 월**과 **조직 기본 정보**를 확인하는 단계

### 화면 구성

```
┌─────────────────────────────────────────────────────┐
│  [단계 표시] 1. 기본 정보 ● ○ ○ ○                      │
├─────────────────────────────────────────────────────┤
│                                                     │
│  근무표 생성 - 기본 정보 설정                        │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │ 계획 월 선택                                   │ │
│  │                                               │ │
│  │  [ 2025년 12월 ▼ ]                           │ │
│  │                                               │ │
│  │  ℹ️ 다음 달 근무표를 생성합니다                 │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │ 조직 정보 확인                                 │ │
│  │                                               │ │
│  │  조직: 세브란스병원 (병원)                     │ │
│  │  등록 직원: 30명                               │ │
│  │                                               │ │
│  │  등록된 시프트:                                │ │
│  │  • D (Day): 08:00 - 16:00                    │ │
│  │  • E (Evening): 16:00 - 00:00                │ │
│  │  • N (Night): 00:00 - 08:00                  │ │
│  │  • O (Off): 휴무                              │ │
│  │                                               │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  [취소]                            [다음 단계 →]    │
└─────────────────────────────────────────────────────┘
```

### 기능 요구사항

#### FR-1.1: 계획 월 선택

- 기본값: 다음 달 (예: 현재 11월이면 12월)
- 선택 가능: 이번 달, 다음 달, 다다음 달
- 드롭다운 형식
- 선택 시 즉시 반영

#### FR-1.2: 조직 정보 표시

- Supabase에서 organizations 조회
- 읽기 전용 (수정 불가)
- 표시 항목:
    - 조직명
    - 조직 유형
    - 등록 직원 수
    - 시프트 정의 (shifts 테이블 조회)

#### FR-1.3: 네비게이션

- "다음 단계" 버튼 클릭 → Step 2로 이동
- 선택한 월을 Pinia 스토어에 저장

### 데이터 모델

```typescript
// types/schedule.ts
export interface ScheduleBasicInfo {
  month: string;           // "2025-12"
  organizationId: string;  // UUID
  organizationName: string;
  organizationType: string;
  employeeCount: number;
  shifts: Shift[];
}

export interface Shift {
  id: string;
  code: string;      // "D", "E", "N", "O"
  name: string;      // "Day", "Evening", ...
  colorCode: string; // "#92D050"
  startTime: string | null;  // "08:00:00"
  endTime: string | null;    // "16:00:00"
}
```

### API

#### GET /api/organizations/:id

**응답**:

```json
{
  "id": "00000000-0000-0000-0000-000000000001",
  "name": "세브란스병원",
  "type": "hospital",
  "employeeCount": 30,
  "shifts": [
    {
      "id": "...",
      "code": "D",
      "name": "Day",
      "colorCode": "#92D050",
      "startTime": "08:00:00",
      "endTime": "16:00:00"
    }
  ]
}
```

### 구현 가이드

#### 1. 컴포넌트 구조

```
Step1BasicInfo.vue
├── MonthSelector.vue      # 월 선택 드롭다운
├── OrganizationInfo.vue   # 조직 정보 카드
└── ShiftList.vue          # 시프트 목록
```

#### 2. 상태 관리 (Pinia)

```typescript
// stores/schedule.ts
export const useScheduleStore = defineStore('schedule', {
  state: () => ({
    basicInfo: null as ScheduleBasicInfo | null,
    currentStep: 1,
  }),
  
  actions: {
    setBasicInfo(info: ScheduleBasicInfo) {
      this.basicInfo = info;
    },
    
    async loadOrganization(orgId: string) {
      // Supabase 조회
      const { data } = await supabase
        .from('organizations')
        .select(`
          *,
          employees(count),
          shifts(*)
        `)
        .eq('id', orgId)
        .single();
      
      this.setBasicInfo({
        month: getNextMonth(),
        organizationId: data.id,
        organizationName: data.name,
        organizationType: data.type,
        employeeCount: data.employees[0].count,
        shifts: data.shifts,
      });
    },
  },
});
```

#### 3. 월 계산 로직

```typescript
// utils/date.ts
import dayjs from 'dayjs';

export function getNextMonth(): string {
  return dayjs().add(1, 'month').format('YYYY-MM');
}

export function getAvailableMonths(): string[] {
  return [
    dayjs().format('YYYY-MM'),        // 이번 달
    dayjs().add(1, 'month').format('YYYY-MM'),  // 다음 달
    dayjs().add(2, 'month').format('YYYY-MM'),  // 다다음 달
  ];
}
```

---

## 4.2 Step 2: 사이트 정보 설정

### 목적

선택한 **계획 월**의 **일별 필요 인력**을 확인하고 수정하는 단계

### 화면 구성

```
┌─────────────────────────────────────────────────────────────┐
│  [단계 표시] 1. 기본 정보 ● 2. 사이트 정보 ● ○ ○               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  근무표 생성 - 사이트 정보 설정                              │
│                                                             │
│  2025년 12월 필요 인력 (31일)                               │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  [그리드: 3-level 헤더]                              │  │
│  │                                                      │  │
│  │    Dec    Dec    Dec    Dec    Dec   ...            │  │
│  │    1일    2일    3일    4일    5일                   │  │
│  │    (일)   (월)   (화)   (수)   (목)                   │  │
│  │  ───────────────────────────────────────────────── │  │
│  │  Total  11     11     11     11     11     ...     │  │
│  │  D       3      3      3      3      3              │  │
│  │  E       4      4      4      4      4              │  │
│  │  N       3      3      3      3      3              │  │
│  │  O       1      1      1      1      1              │  │
│  │                                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ℹ️ 셀을 클릭하여 필요 인력 수를 수정할 수 있습니다            │
│                                                             │
│  [← 이전]                                   [다음 단계 →]   │
└─────────────────────────────────────────────────────────────┘
```

### 기능 요구사항

#### FR-2.1: 3-level 헤더 그리드

- **Level 1**: 월 이름 (예: "Dec")
- **Level 2**: 날짜 (1, 2, 3, ...)
- **Level 3**: 요일 (일, 월, 화, ...)
- Tailwind CSS + HTML table 사용 (TanStack Table 불필요)

#### FR-2.2: 자동 계산

- `site_requirements` 테이블에서 요일별 필요 인력 조회
- 선택한 월의 각 날짜에 맞는 요일 매핑
- 예: 12월 1일(일요일) → day_of_week=0의 데이터 적용

#### FR-2.3: 인라인 편집

- 셀 클릭 → 숫자 입력 가능
- Enter 또는 외부 클릭 시 저장
- 음수 불가 (최소 0)

#### FR-2.4: 합계 계산

- Total 행: D + E + N + O의 합
- 실시간 업데이트

### 데이터 모델

```typescript
// types/schedule.ts
export interface SiteRequirements {
  [date: string]: DailyRequirement;  // "2025-12-01": { D: 3, E: 4, ... }
}

export interface DailyRequirement {
  D: number;
  E: number;
  N: number;
  O: number;
  total: number;
}
```

### API

#### GET /api/site-requirements?organizationId=xxx&month=2025-12

**응답**:

```json
{
  "2025-12-01": { "D": 3, "E": 4, "N": 3, "O": 1, "total": 11 },
  "2025-12-02": { "D": 3, "E": 4, "N": 3, "O": 1, "total": 11 },
  ...
}
```

### 구현 가이드

#### 1. 요일 매핑 로직

```typescript
// utils/date.ts
import dayjs from 'dayjs';

export function getDaysInMonth(month: string): DayInfo[] {
  const start = dayjs(month + '-01');
  const daysCount = start.daysInMonth();
  
  return Array.from({ length: daysCount }, (_, i) => {
    const date = start.add(i, 'day');
    return {
      date: date.format('YYYY-MM-DD'),
      day: date.date(),
      dayOfWeek: date.day(),  // 0(일) ~ 6(토)
      dayName: date.format('ddd'),  // 일, 월, 화, ...
    };
  });
}

export interface DayInfo {
  date: string;      // "2025-12-01"
  day: number;       // 1
  dayOfWeek: number; // 0
  dayName: string;   // "일"
}
```

#### 2. 필요 인력 계산

```typescript
// composables/useSiteRequirements.ts
export function useSiteRequirements(month: string) {
  const requirements = ref<SiteRequirements>({});
  
  async function loadRequirements() {
    // 1. site_requirements 테이블 조회 (요일별)
    const { data: weeklyReqs } = await supabase
      .from('site_requirements')
      .select('day_of_week, shift_id, required_count, shifts(code)')
      .eq('organization_id', orgId);
    
    // 2. 월의 각 날짜에 매핑
    const days = getDaysInMonth(month);
    
    days.forEach(day => {
      const dailyReq: DailyRequirement = { D: 0, E: 0, N: 0, O: 0, total: 0 };
      
      weeklyReqs
        .filter(r => r.day_of_week === day.dayOfWeek)
        .forEach(r => {
          const shiftCode = r.shifts.code;
          dailyReq[shiftCode] = r.required_count;
        });
      
      dailyReq.total = dailyReq.D + dailyReq.E + dailyReq.N + dailyReq.O;
      requirements.value[day.date] = dailyReq;
    });
  }
  
  return { requirements, loadRequirements };
}
```

#### 3. 그리드 렌더링

- 일반 HTML `<table>` 사용
- Tailwind CSS로 스타일링
- 3-level 헤더: `<thead>` 내 3개 `<tr>`

---

## 4.3 Step 3: 근무표 초기 정보 입력 ⭐

### 목적

**전월 5일 + 당월 31일 = 36일** 동안의 근무자별 시프트를 입력하는 **핵심 단계**

이 단계가 **MVP의 가장 복잡하고 중요한 부분**입니다.

### 화면 구성

```
┌──────────────────────────────────────────────────────────────────────┐
│  [단계 표시] 1. 기본 정보 ● 2. 사이트 정보 ● 3. 초기 정보 ● ○          │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  근무표 생성 - 초기 정보 입력                                         │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  [TanStack Table 그리드]                                        │ │
│  │                                                                 │ │
│  │  [고정] 근무자   │ Last Month  │ This Month │ ... │ 통계 →      │ │
│  │  이름(ID)      │ 11/27 11/28 │ 12/1  12/2 │     │ D  E  N  Tot│ │
│  │  ────────────────────────────────────────────────────────────  │ │
│  │  박지현(40627) │ [D][E][N][O] │ [ ][ ][ ][ ] │ ... │ 0  0  0  0│ │
│  │  김수빈(41482) │ [D][E][N][O] │ [ ][ ][ ][ ] │ ... │ 0  0  0  0│ │
│  │  ...                                                            │ │
│  │  ────────────────────────────────────────────────────────────  │ │
│  │  Total         │ 0   0       │ 0   0      │     │             │ │
│  │  D             │ 0   0       │ 0   0      │     │             │ │
│  │  E             │ 0   0       │ 0   0      │     │             │ │
│  │  N             │ 0   0       │ 0   0      │     │             │ │
│  │                                                                 │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  [← 이전]  [임시 저장]                             [근무표 생성 →]   │
└──────────────────────────────────────────────────────────────────────┘
```

### 기능 요구사항

#### FR-3.1: TanStack Table 그리드 구성

- **행(Rows)**: 근무자 30명
- **열(Columns)**: 36일 (전월 5일 + 당월 31일) + 통계 4열
- **총 셀 수**: 30 × 40 = 1,200개
- **헤더**: 3-level
- **고정 컬럼**: 근무자 이름 (좌측 1개 컬럼)

#### FR-3.2: 시프트 선택 UI

각 셀은 **시프트 선택 버튼 그룹**:

```
┌─────────────────┐
│ [D] [E] [N] [O] │  ← 근무자가 가능한 시프트만 표시
└─────────────────┘
```

**상태**:

- **미선택**: 반투명 (opacity: 0.4), 테두리만
- **선택**: 불투명 (opacity: 1.0), 배경색 채움
- **선택 방식**: 라디오 버튼 (1개만 선택)

**색상**:

- D: `bg-lime-400` (#92D050)
- E: `bg-orange-400` (#FFC000)
- N: `bg-blue-600` (#4472C4)
- O: `bg-gray-400` (#D9D9D9)

#### FR-3.3: 전월 데이터 입력 (필수)

- **전월 마지막 5일 데이터는 반드시 입력**
- 배경색으로 구분: 전월은 `bg-gray-50`
- 모든 근무자의 5일 데이터 필수
- 입력 완료 전까지 "다음 단계" 비활성화

#### FR-3.4: 당월 데이터 입력 (선택)

- **미입력 가능**: AI Solver가 자동 배치
- **부분 입력 가능**: 확정된 근무만 입력
- 배경색: 당월은 흰색 (`bg-white`)

#### FR-3.5: 통계 (하단 및 우측)

- **하단 통계 (열별)**:
    - Total: 해당 일의 총 배정 근무자
    - D/E/N: 각 시프트별 배정 근무자
- **우측 통계 (행별)**:
    - D/E/N: 각 근무자의 시프트별 합계
    - Total: 전체 근무일 수

#### FR-3.6: 임시 저장

- Pinia 스토어에 현재 상태 저장
- 페이지 새로고침 시에도 복원 (localStorage 활용)

### 데이터 모델

```typescript
// types/schedule.ts
export interface ScheduleGridData {
  employees: Employee[];
  columns: GridColumn[];
  assignments: AssignmentMap;  // { employeeId: { date: shiftCode } }
  statistics: GridStatistics;
}

export interface Employee {
  id: string;
  employeeId: string;  // 직번
  name: string;
  availableShifts: string[];  // ["D", "E", "N", "O"]
}

export interface GridColumn {
  date: string;         // "2025-11-27"
  day: number;          // 27
  dayOfWeek: number;    // 0-6
  dayName: string;      // "일", "월", ...
  isLastMonth: boolean; // true/false
}

export type AssignmentMap = Record<string, Record<string, string>>;
// { "employee-1": { "2025-11-27": "D", "2025-11-28": "E" } }

export interface GridStatistics {
  rowStats: Record<string, RowStat>;    // 근무자별
  columnStats: Record<string, ColumnStat>;  // 날짜별
}

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
```

### TanStack Table 구성

#### 1. Column 정의

```typescript
// composables/useScheduleGrid.ts
import { createColumnHelper } from '@tanstack/vue-table';

const columnHelper = createColumnHelper<Employee>();

export function useScheduleGridColumns(dates: GridColumn[]) {
  const columns = [
    // 고정 컬럼: 근무자 정보
    columnHelper.accessor('name', {
      id: 'employee',
      header: '근무자',
      cell: (info) => {
        const row = info.row.original;
        return `${row.name} (${row.employeeId})`;
      },
      size: 150,
      enableSorting: false,
      meta: {
        sticky: 'left',  // 고정
      },
    }),
    
    // 날짜 컬럼 (36개)
    ...dates.map((date) => 
      columnHelper.display({
        id: date.date,
        header: () => date.day,
        cell: (info) => ShiftSelector,  // 컴포넌트
        size: 120,
        meta: {
          date: date.date,
          isLastMonth: date.isLastMonth,
        },
      })
    ),
    
    // 통계 컬럼 (4개)
    columnHelper.display({
      id: 'stat-D',
      header: 'D',
      cell: (info) => info.row.original.stats.D,
      size: 50,
    }),
    // E, N, Total 동일...
  ];
  
  return columns;
}
```

#### 2. 헤더 그룹 (3-level)

```typescript
export function useScheduleGridHeaders(dates: GridColumn[]) {
  // Level 1: Last Month / This Month
  const level1 = dates.reduce((acc, date) => {
    const key = date.isLastMonth ? 'Last Month' : 'This Month';
    if (!acc[key]) acc[key] = [];
    acc[key].push(date);
    return acc;
  }, {} as Record<string, GridColumn[]>);
  
  // Level 2: 월 이름 (11월, 12월)
  // Level 3: 요일 (일, 월, 화, ...)
  
  return {
    headerGroups: [
      { level: 1, groups: level1 },
      // ... Level 2, 3
    ],
  };
}
```

#### 3. 데이터 준비

```typescript
export function useScheduleGridData() {
  const employees = ref<Employee[]>([]);
  const assignments = ref<AssignmentMap>({});
  
  async function loadEmployees() {
    const { data } = await supabase
      .from('employees')
      .select('*')
      .eq('organization_id', orgId);
    
    employees.value = data;
    
    // 초기 assignments 객체 생성
    data.forEach(emp => {
      assignments.value[emp.id] = {};
    });
  }
  
  function setAssignment(employeeId: string, date: string, shiftCode: string) {
    if (!assignments.value[employeeId]) {
      assignments.value[employeeId] = {};
    }
    assignments.value[employeeId][date] = shiftCode;
    
    // 통계 재계산
    updateStatistics();
  }
  
  return { employees, assignments, loadEmployees, setAssignment };
}
```

#### 4. 통계 계산

```typescript
function updateStatistics() {
  const rowStats: Record<string, RowStat> = {};
  const columnStats: Record<string, ColumnStat> = {};
  
  // 행 통계 (근무자별)
  Object.entries(assignments.value).forEach(([employeeId, empAssignments]) => {
    const stat: RowStat = { D: 0, E: 0, N: 0, total: 0 };
    
    Object.values(empAssignments).forEach(shiftCode => {
      if (shiftCode === 'D') stat.D++;
      if (shiftCode === 'E') stat.E++;
      if (shiftCode === 'N') stat.N++;
      if (shiftCode !== 'O') stat.total++;
    });
    
    rowStats[employeeId] = stat;
  });
  
  // 열 통계 (날짜별)
  dates.forEach(date => {
    const stat: ColumnStat = { D: 0, E: 0, N: 0, total: 0 };
    
    Object.values(assignments.value).forEach(empAssignments => {
      const shiftCode = empAssignments[date.date];
      if (shiftCode === 'D') stat.D++;
      if (shiftCode === 'E') stat.E++;
      if (shiftCode === 'N') stat.N++;
      if (shiftCode && shiftCode !== 'O') stat.total++;
    });
    
    columnStats[date.date] = stat;
  });
  
  statistics.value = { rowStats, columnStats };
}
```

### ShiftSelector 컴포넌트 설계

#### 목적

각 그리드 셀에서 시프트를 선택하는 버튼 그룹

#### Props

```typescript
interface ShiftSelectorProps {
  employeeId: string;
  date: string;
  availableShifts: string[];  // ["D", "E", "N", "O"]
  currentShift: string | null;
  onSelect: (shiftCode: string) => void;
}
```

#### 템플릿 구조

```vue
<template>
  <div class="flex gap-1 p-1">
    <button
      v-for="shift in availableShifts"
      :key="shift"
      :class="getShiftButtonClass(shift)"
      @click="() => onSelect(shift)"
    >
      {{ shift }}
    </button>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<ShiftSelectorProps>();

function getShiftButtonClass(shiftCode: string) {
  const isSelected = props.currentShift === shiftCode;
  const baseClass = 'w-8 h-8 rounded text-xs font-semibold border-2';
  
  const colorMap = {
    D: 'border-lime-400 text-lime-700',
    E: 'border-orange-400 text-orange-700',
    N: 'border-blue-600 text-blue-700',
    O: 'border-gray-400 text-gray-700',
  };
  
  const selectedColorMap = {
    D: 'bg-lime-400 text-white',
    E: 'bg-orange-400 text-white',
    N: 'bg-blue-600 text-white',
    O: 'bg-gray-400 text-white',
  };
  
  const color = isSelected ? selectedColorMap[shiftCode] : colorMap[shiftCode];
  const opacity = isSelected ? 'opacity-100' : 'opacity-40';
  
  return `${baseClass} ${color} ${opacity} hover:opacity-80 transition-opacity`;
}
</script>
```

### 고정 컬럼 (Sticky Column)

Tailwind CSS의 `sticky` 유틸리티 사용:

```vue
<template>
  <table class="border-collapse">
    <thead>
      <!-- 헤더 -->
    </thead>
    <tbody>
      <tr v-for="employee in employees" :key="employee.id">
        <!-- 고정 컬럼 -->
        <td class="sticky left-0 bg-white z-10 border-r-2">
          {{ employee.name }} ({{ employee.employeeId }})
        </td>
        
        <!-- 날짜 컬럼 -->
        <td v-for="date in dates" :key="date.date">
          <ShiftSelector ... />
        </td>
        
        <!-- 통계 컬럼 -->
        <td>{{ statistics.rowStats[employee.id]?.D }}</td>
        <!-- ... -->
      </tr>
    </tbody>
  </table>
</template>
```

### 전월 데이터 검증

```typescript
function validateLastMonthData(): boolean {
  const lastMonthDates = dates.filter(d => d.isLastMonth).map(d => d.date);
  
  for (const employee of employees.value) {
    for (const date of lastMonthDates) {
      const shift = assignments.value[employee.id]?.[date];
      if (!shift) {
        // 경고 표시
        console.error(`전월 데이터 미입력: ${employee.name}, ${date}`);
        return false;
      }
    }
  }
  
  return true;
}
```

### 임시 저장 (LocalStorage)

```typescript
// composables/useScheduleGrid.ts
import { watchDebounced } from '@vueuse/core';

export function useScheduleGrid() {
  const STORAGE_KEY = 'schedule-grid-draft';
  
  // assignments가 변경될 때마다 저장 (2초 디바운스)
  watchDebounced(
    assignments,
    (newVal) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newVal));
    },
    { debounce: 2000, deep: true }
  );
  
  // 초기 로드 시 복원
  function restoreFromStorage() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      assignments.value = JSON.parse(saved);
      updateStatistics();
    }
  }
  
  return { restoreFromStorage };
}
```

---

## 4.4 Step 4: 근무표 생성 결과 확인

### 목적

AI Solver가 생성한 근무표 결과를 확인하고, 필요시 수동 수정하는 단계

### 화면 구성

```
┌──────────────────────────────────────────────────────────────────────┐
│  [단계 표시] 1. 기본 정보 ● 2. 사이트 정보 ● 3. 초기 정보 ● 4. 결과 ●│
├──────────────────────────────────────────────────────────────────────┤
│  ┌────────────────┐                                                  │
│  │ 상태: ● Running │  Hard Score: 0  Soft Score: 127                │
│  │ 진행률: 68%     │                                                  │
│  └────────────────┘                        [🔄 새로고침] [⏹ 중지]   │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  [그리드: Step 3과 동일, 하지만 AI 결과가 채워짐]                 │ │
│  │                                                                 │ │
│  │  근무자        │ Last Month  │ This Month │ ... │ 통계           │ │
│  │  박지현(40627) │ [D]         │ [D][E]     │ ... │ 8  6  5  19  │ │
│  │  김수빈(41482) │ [N]         │ [N][D]     │ ... │ 7  7  5  19  │ │
│  │  ...                                                            │ │
│  │                                                                 │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  [← 이전]  [더 개선하기]  [엑셀 다운로드]                [저장 →]   │
└──────────────────────────────────────────────────────────────────────┘
```

### 기능 요구사항

#### FR-4.1: 상태 표시

- **Status Badge**:
    - Running: 파란색, 애니메이션
    - Complete: 초록색
    - Error: 빨간색
- **스코어 표시**:
    - Hard Score: 필수 제약 위반 (0이 목표)
    - Soft Score: 선호도 점수 (높을수록 좋음)
- **진행률**: Running 상태일 때만 표시

#### FR-4.2: Polling

- Status가 'running'일 때 5초마다 Supabase 조회
- 상태 변경 감지 시 그리드 업데이트

#### FR-4.3: 그리드 표시

- Step 3과 동일한 그리드 컴포넌트 재사용
- AI 결과로 `assignments` 채우기
- 수동 수정 가능

#### FR-4.4: 액션

- **더 개선하기**: 현재 결과를 기반으로 AI Solver 재실행
- **엑셀 다운로드**: 결과를 XLSX 파일로 다운로드
- **저장**: Supabase에 최종 저장 및 status를 'complete'로 변경

### AI Solver 연동 (Mock)

#### 1. API 호출 구조 (추정)

```typescript
// api/solver.ts
export async function requestAISolver(
  scheduleId: string,
  payload: SolverPayload
): Promise<SolverResponse> {
  // MVP에서는 실제 호출 대신 Mock
  // 실제 환경에서는:
  // const response = await fetch(CLOUD_RUN_URL + '/solve', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(payload),
  // });
  
  // Mock: 5초 후 완료
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  return {
    scheduleId,
    status: 'complete',
    hardScore: 0,
    softScore: 127,
    assignments: generateMockAssignments(),
  };
}

interface SolverPayload {
  scheduleId: string;
  employees: Employee[];
  requirements: SiteRequirements;
  lastMonthAssignments: AssignmentMap;
  thisMonthAssignments: AssignmentMap;  // 부분 입력된 데이터
}

interface SolverResponse {
  scheduleId: string;
  status: 'complete' | 'error';
  hardScore: number;
  softScore: number;
  assignments: AssignmentMap;  // 전체 결과
}
```

#### 2. Mock 데이터 생성

```typescript
function generateMockAssignments(): AssignmentMap {
  const assignments: AssignmentMap = {};
  const shifts = ['D', 'E', 'N', 'O'];
  
  employees.value.forEach(emp => {
    assignments[emp.id] = {};
    
    dates
      .filter(d => !d.isLastMonth)  // 당월만
      .forEach(date => {
        // 랜덤 시프트 배정 (실제로는 최적화 결과)
        const randomShift = shifts[Math.floor(Math.random() * shifts.length)];
        assignments[emp.id][date.date] = randomShift;
      });
  });
  
  return assignments;
}
```

#### 3. Polling 구현

```typescript
// composables/useAISolver.ts
export function useAISolver() {
  const status = ref<string>('created');
  const hardScore = ref<number>(0);
  const softScore = ref<number>(0);
  
  let pollingInterval: number | null = null;
  
  async function startSolver(scheduleId: string, payload: SolverPayload) {
    // 1. Status를 'running'으로 변경
    await supabase
      .from('schedules')
      .update({ status: 'running' })
      .eq('id', scheduleId);
    
    status.value = 'running';
    
    // 2. AI Solver 호출 (비동기)
    requestAISolver(scheduleId, payload)
      .then(result => {
        // 결과를 Supabase에 저장
        saveResult(scheduleId, result);
      })
      .catch(error => {
        supabase
          .from('schedules')
          .update({ status: 'error' })
          .eq('id', scheduleId);
      });
    
    // 3. Polling 시작
    startPolling(scheduleId);
  }
  
  function startPolling(scheduleId: string) {
    pollingInterval = setInterval(async () => {
      const { data } = await supabase
        .from('schedules')
        .select('status, hard_score, soft_score')
        .eq('id', scheduleId)
        .single();
      
      status.value = data.status;
      hardScore.value = data.hard_score;
      softScore.value = data.soft_score;
      
      if (data.status !== 'running') {
        stopPolling();
      }
    }, 5000);  // 5초마다
  }
  
  function stopPolling() {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  }
  
  return { status, hardScore, softScore, startSolver, stopPolling };
}
```

#### 4. 결과 로드

```typescript
async function loadResult(scheduleId: string) {
  // schedule_assignments 테이블 조회
  const { data } = await supabase
    .from('schedule_assignments')
    .select('employee_id, date, shifts(code)')
    .eq('schedule_id', scheduleId);
  
  // AssignmentMap 형식으로 변환
  const assignments: AssignmentMap = {};
  data.forEach(row => {
    if (!assignments[row.employee_id]) {
      assignments[row.employee_id] = {};
    }
    assignments[row.employee_id][row.date] = row.shifts.code;
  });
  
  return assignments;
}
```

### 엑셀 다운로드

#### 라이브러리

```bash
npm install xlsx
```

#### 구현

```typescript
// utils/excel.ts
import * as XLSX from 'xlsx';

export function exportToExcel(
  employees: Employee[],
  dates: GridColumn[],
  assignments: AssignmentMap,
  filename: string
) {
  // 1. 데이터 변환
  const rows = employees.map(emp => {
    const row: any = {
      '직번': emp.employeeId,
      '이름': emp.name,
    };
    
    dates.forEach(date => {
      const shift = assignments[emp.id]?.[date.date] || '';
      row[`${date.day}일`] = shift;
    });
    
    return row;
  });
  
  // 2. 워크시트 생성
  const ws = XLSX.utils.json_to_sheet(rows);
  
  // 3. 워크북 생성
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '근무표');
  
  // 4. 다운로드
  XLSX.writeFile(wb, filename);
}
```

---

# 5. 컴포넌트 설계

## 5.1 ScheduleGrid.vue (핵심 컴포넌트)

### 역할

Step 3와 Step 4에서 사용하는 **메인 그리드 컴포넌트**

### Props

```typescript
interface ScheduleGridProps {
  employees: Employee[];
  dates: GridColumn[];
  assignments: AssignmentMap;
  readonly?: boolean;  // Step 4에서는 수정 가능
  showLastMonth?: boolean;
}
```

### Events

```typescript
interface ScheduleGridEmits {
  (e: 'update:assignment', payload: {
    employeeId: string;
    date: string;
    shiftCode: string;
  }): void;
}
```

### 구조

```vue
<template>
  <div class="schedule-grid-container overflow-x-auto">
    <table class="schedule-grid border-collapse w-full">
      <!-- 3-level 헤더 -->
      <thead>
        <tr>
          <th rowspan="3" class="sticky-column">근무자</th>
          <th
            v-for="group in headerLevel1"
            :colspan="group.count"
            class="header-level-1"
          >
            {{ group.label }}
          </th>
          <th rowspan="3" colspan="4" class="header-stats">통계</th>
        </tr>
        <tr>
          <th
            v-for="group in headerLevel2"
            :colspan="group.count"
            class="header-level-2"
          >
            {{ group.label }}
          </th>
        </tr>
        <tr>
          <th
            v-for="date in dates"
            class="header-level-3"
          >
            {{ date.day }}일<br />
            <span class="text-xs">{{ date.dayName }}</span>
          </th>
        </tr>
      </thead>
      
      <!-- 데이터 행 -->
      <tbody>
        <tr
          v-for="employee in employees"
          :key="employee.id"
          class="data-row"
        >
          <!-- 고정 컬럼 -->
          <td class="sticky-column employee-cell">
            <div class="font-semibold">{{ employee.name }}</div>
            <div class="text-xs text-gray-500">{{ employee.employeeId }}</div>
          </td>
          
          <!-- 날짜 셀 -->
          <td
            v-for="date in dates"
            :key="date.date"
            :class="getCellClass(date)"
          >
            <ShiftSelector
              :employee-id="employee.id"
              :date="date.date"
              :available-shifts="employee.availableShifts"
              :current-shift="assignments[employee.id]?.[date.date]"
              :readonly="readonly"
              @select="handleShiftSelect(employee.id, date.date, $event)"
            />
          </td>
          
          <!-- 통계 셀 -->
          <td class="stat-cell">{{ statistics.rowStats[employee.id]?.D || 0 }}</td>
          <td class="stat-cell">{{ statistics.rowStats[employee.id]?.E || 0 }}</td>
          <td class="stat-cell">{{ statistics.rowStats[employee.id]?.N || 0 }}</td>
          <td class="stat-cell font-bold">{{ statistics.rowStats[employee.id]?.total || 0 }}</td>
        </tr>
      </tbody>
      
      <!-- 통계 행 -->
      <tfoot>
        <tr class="stat-row">
          <td class="sticky-column font-bold">Total</td>
          <td
            v-for="date in dates"
            :key="date.date"
            class="stat-cell"
          >
            {{ statistics.columnStats[date.date]?.total || 0 }}
          </td>
          <td colspan="4"></td>
        </tr>
        <tr class="stat-row">
          <td class="sticky-column font-bold">D</td>
          <td
            v-for="date in dates"
            :key="date.date"
            class="stat-cell"
          >
            {{ statistics.columnStats[date.date]?.D || 0 }}
          </td>
          <td colspan="4"></td>
        </tr>
        <!-- E, N 동일 -->
      </tfoot>
    </table>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import ShiftSelector from './ShiftSelector.vue';
import { useScheduleGridStatistics } from '@/composables/useScheduleGrid';

const props = defineProps<ScheduleGridProps>();
const emit = defineEmits<ScheduleGridEmits>();

const statistics = useScheduleGridStatistics(
  () => props.employees,
  () => props.dates,
  () => props.assignments
);

function getCellClass(date: GridColumn) {
  return {
    'bg-gray-50': date.isLastMonth,
    'bg-white': !date.isLastMonth,
    'border border-gray-300': true,
  };
}

function handleShiftSelect(employeeId: string, date: string, shiftCode: string) {
  if (!props.readonly) {
    emit('update:assignment', { employeeId, date, shiftCode });
  }
}

// 헤더 그룹 계산
const headerLevel1 = computed(() => {
  const lastMonthCount = props.dates.filter(d => d.isLastMonth).length;
  const thisMonthCount = props.dates.filter(d => !d.isLastMonth).length;
  
  const groups = [];
  if (props.showLastMonth && lastMonthCount > 0) {
    groups.push({ label: 'Last Month', count: lastMonthCount });
  }
  groups.push({ label: 'This Month', count: thisMonthCount });
  
  return groups;
});

const headerLevel2 = computed(() => {
  // 월별 그룹핑
  const groups: any[] = [];
  let currentMonth = '';
  let count = 0;
  
  props.dates.forEach((date, index) => {
    const month = date.date.substring(5, 7) + '월';
    
    if (month !== currentMonth) {
      if (count > 0) {
        groups.push({ label: currentMonth, count });
      }
      currentMonth = month;
      count = 1;
    } else {
      count++;
    }
    
    if (index === props.dates.length - 1) {
      groups.push({ label: currentMonth, count });
    }
  });
  
  return groups;
});
</script>

<style scoped>
.schedule-grid-container {
  max-height: 70vh;
  position: relative;
}

.schedule-grid {
  font-size: 14px;
}

.sticky-column {
  position: sticky;
  left: 0;
  z-index: 20;
  background: white;
  border-right: 2px solid #e5e7eb;
}

.header-level-1,
.header-level-2,
.header-level-3 {
  border: 1px solid #d1d5db;
  padding: 8px;
  background: #f9fafb;
  font-weight: 600;
}

.header-level-1 {
  font-size: 16px;
}

.header-level-2 {
  font-size: 14px;
}

.header-level-3 {
  font-size: 12px;
}

.employee-cell {
  padding: 12px;
  min-width: 150px;
}

.stat-cell {
  text-align: center;
  padding: 8px;
  font-size: 13px;
}

.stat-row {
  background: #f3f4f6;
  font-weight: 500;
}

thead tr {
  position: sticky;
  top: 0;
  z-index: 10;
  background: white;
}
</style>
```

## 5.2 ShiftSelector.vue

### 역할

각 그리드 셀에서 시프트를 선택하는 버튼 그룹 (앞서 설명한 내용과 동일)

## 5.3 StepIndicator.vue

### 역할

현재 단계를 시각적으로 표시

### Props

```typescript
interface StepIndicatorProps {
  currentStep: number;  // 1, 2, 3, 4
  steps: StepInfo[];
}

interface StepInfo {
  number: number;
  label: string;
}
```

### 템플릿

```vue
<template>
  <div class="flex items-center justify-center gap-8 py-6">
    <div
      v-for="step in steps"
      :key="step.number"
      class="flex items-center"
    >
      <div class="flex flex-col items-center">
        <div
          :class="getStepCircleClass(step.number)"
        >
          {{ step.number }}
        </div>
        <div class="text-sm mt-2" :class="getStepLabelClass(step.number)">
          {{ step.label }}
        </div>
      </div>
      
      <div
        v-if="step.number < steps.length"
        :class="getStepLineClass(step.number)"
        class="w-16 h-1 mx-4"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<StepIndicatorProps>();

function getStepCircleClass(stepNumber: number) {
  const isActive = stepNumber === props.currentStep;
  const isCompleted = stepNumber < props.currentStep;
  
  const base = 'w-10 h-10 rounded-full flex items-center justify-center font-bold';
  
  if (isActive) {
    return `${base} bg-blue-600 text-white`;
  } else if (isCompleted) {
    return `${base} bg-green-500 text-white`;
  } else {
    return `${base} bg-gray-300 text-gray-600`;
  }
}

function getStepLabelClass(stepNumber: number) {
  const isActive = stepNumber === props.currentStep;
  return isActive ? 'text-blue-600 font-semibold' : 'text-gray-500';
}

function getStepLineClass(stepNumber: number) {
  const isCompleted = stepNumber < props.currentStep;
  return isCompleted ? 'bg-green-500' : 'bg-gray-300';
}
</script>
```

---

# 6. API 설계

## 6.1 Supabase 클라이언트 설정

```typescript
// api/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

// 타입 정의
export type Database = {
  public: {
    Tables: {
      organizations: { Row: Organization; Insert: ...; Update: ... };
      employees: { Row: Employee; Insert: ...; Update: ... };
      // ...
    };
  };
};
```

## 6.2 Schedule API

```typescript
// api/schedule.ts
import { supabase } from './supabase';

// 근무표 생성 요청
export async function createSchedule(data: CreateScheduleData) {
  const { data: schedule, error } = await supabase
    .from('schedules')
    .insert({
      organization_id: data.organizationId,
      month: data.month,
      status: 'created',
    })
    .select()
    .single();
  
  if (error) throw error;
  return schedule;
}

// 초기 데이터 저장 (전월 + 당월 부분 입력)
export async function saveInitialAssignments(
  scheduleId: string,
  assignments: AssignmentMap
) {
  const rows = Object.entries(assignments).flatMap(([employeeId, empAssignments]) =>
    Object.entries(empAssignments).map(([date, shiftCode]) => ({
      schedule_id: scheduleId,
      employee_id: employeeId,
      date,
      shift_id: getShiftIdByCode(shiftCode),  // helper 함수
    }))
  );
  
  const { error } = await supabase
    .from('schedule_assignments')
    .insert(rows);
  
  if (error) throw error;
}

// 근무표 상태 조회
export async function getScheduleStatus(scheduleId: string) {
  const { data, error } = await supabase
    .from('schedules')
    .select('status, hard_score, soft_score')
    .eq('id', scheduleId)
    .single();
  
  if (error) throw error;
  return data;
}

// 결과 조회
export async function getScheduleAssignments(scheduleId: string) {
  const { data, error } = await supabase
    .from('schedule_assignments')
    .select(`
      employee_id,
      date,
      shifts (code, name, color_code)
    `)
    .eq('schedule_id', scheduleId);
  
  if (error) throw error;
  
  // AssignmentMap 형식으로 변환
  const assignments: AssignmentMap = {};
  data.forEach(row => {
    if (!assignments[row.employee_id]) {
      assignments[row.employee_id] = {};
    }
    assignments[row.employee_id][row.date] = row.shifts.code;
  });
  
  return assignments;
}

// 수동 수정
export async function updateAssignment(
  scheduleId: string,
  employeeId: string,
  date: string,
  shiftCode: string
) {
  const { error } = await supabase
    .from('schedule_assignments')
    .upsert({
      schedule_id: scheduleId,
      employee_id: employeeId,
      date,
      shift_id: getShiftIdByCode(shiftCode),
      updated_at: new Date().toISOString(),
    });
  
  if (error) throw error;
  
  // Schedule 상태를 'changed'로 변경
  await supabase
    .from('schedules')
    .update({ status: 'changed' })
    .eq('id', scheduleId);
}
```

## 6.3 AI Solver API (Mock)

```typescript
// api/solver.ts
export async function requestAISolver(payload: SolverPayload): Promise<void> {
  // MVP에서는 Mock 응답
  // 실제 환경에서는:
  // const response = await fetch(CLOUD_RUN_URL, { ... });
  
  console.log('[Mock] AI Solver 호출:', payload);
  
  // 5초 후 Mock 결과 생성
  setTimeout(async () => {
    const mockAssignments = generateMockAssignments(payload);
    await saveSolverResult(payload.scheduleId, mockAssignments);
  }, 5000);
}

function generateMockAssignments(payload: SolverPayload): AssignmentMap {
  // 단순 로직: D, E, N을 번갈아 배정
  const shifts = ['D', 'E', 'N', 'O'];
  const assignments: AssignmentMap = {};
  
  payload.employees.forEach((emp, empIndex) => {
    assignments[emp.id] = { ...payload.lastMonthAssignments[emp.id] };
    
    payload.dates
      .filter(d => !d.isLastMonth)
      .forEach((date, dateIndex) => {
        // 기존 입력 데이터 유지
        if (payload.thisMonthAssignments[emp.id]?.[date.date]) {
          assignments[emp.id][date.date] = payload.thisMonthAssignments[emp.id][date.date];
        } else {
          // 미입력 데이터만 자동 배정
          const shiftIndex = (empIndex + dateIndex) % shifts.length;
          assignments[emp.id][date.date] = shifts[shiftIndex];
        }
      });
  });
  
  return assignments;
}

async function saveSolverResult(scheduleId: string, assignments: AssignmentMap) {
  // schedule_assignments에 저장
  await saveInitialAssignments(scheduleId, assignments);
  
  // Schedule 상태를 'complete'로 변경
  await supabase
    .from('schedules')
    .update({
      status: 'complete',
      hard_score: 0,
      soft_score: Math.floor(Math.random() * 200),
    })
    .eq('id', scheduleId);
}
```

---

---

**문서 버전**: MVP 1.0
**최종 수정**: 2025-11-12
**작성자**: 브라운 + Claude
**라이선스**: MIT
