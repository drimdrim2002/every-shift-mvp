# EveryShift MVP - 개발자 가이드

> 간호사 근무표 자동 생성 시스템 개발자 가이드

## 목차

- [프로젝트 개요](#프로젝트-개요)
- [프로젝트 구조](#프로젝트-구조)
- [주요 컴포넌트](#주요-컴포넌트)
- [데이터 플로우](#데이터-플로우)
- [개발 패턴](#개발-패턴)
- [코딩 컨벤션](#코딩-컨벤션)
- [상태 관리](#상태-관리)
- [테스팅](#테스팅)
- [트러블슈팅](#트러블슈팅)
- [참고 자료](#참고-자료)

---

## 프로젝트 개요

**EveryShift MVP**는 병원의 간호사 근무표 생성을 자동화하는 시스템입니다.

### 핵심 목표
- ✅ 수동 Excel 작업 4-8시간 → 자동 생성 몇 초로 단축 (90% 시간 절감)
- ✅ 공정성 제약 조건 보장
- ✅ 4단계 워크플로우로 간단한 UX

### 기술 스택

**Frontend**
- Vue 3.5.17 (Composition API)
- TypeScript 5.8.3
- Vite 6.3.5
- Tailwind CSS 3.4.17
- TanStack Table v8 (30×36 그리드)
- Naive UI 2.42.0
- Pinia 2.x

**Backend**
- Supabase PostgreSQL
- Supabase Auth (email/password)
- RLS (Admin-only in MVP)

**AI Solver**
- Google Cloud Run
- OptaPlanner (Java)
- MVP에서는 Mock 응답 사용

---

## 프로젝트 구조

### 디렉토리 구조

```
every-shift-mvp/
├── src/
│   ├── components/
│   │   ├── layout/           # 레이아웃 컴포넌트
│   │   │   ├── DefaultLayout.vue
│   │   │   ├── Header.vue
│   │   │   └── Sidebar.vue
│   │   └── schedule/         # 핵심 스케줄링 컴포넌트 (80% 복잡도)
│   │       ├── ScheduleGrid.vue        # TanStack Table 그리드 [CRITICAL]
│   │       ├── ShiftSelector.vue       # 시프트 선택 UI
│   │       ├── StatisticsSummary.vue   # 통계 요약
│   │       └── StepIndicator.vue       # 워크플로우 진행 표시
│   │
│   ├── composables/          # 재사용 가능한 로직
│   │   ├── useScheduleGrid.ts            # 그리드 데이터 관리
│   │   ├── useScheduleGridStatistics.ts  # 통계 계산
│   │   ├── useAISolver.ts                # AI Solver 연동 및 Polling
│   │   └── useAuth.ts                    # 인증 래퍼
│   │
│   ├── stores/               # Pinia 상태 관리
│   │   ├── auth.ts           # Supabase 인증
│   │   ├── organization.ts   # 조직/직원/시프트 (읽기 전용)
│   │   └── schedule.ts       # 워크플로우 상태, 임시 데이터
│   │
│   ├── views/schedule/       # 4단계 워크플로우 페이지
│   │   ├── Step1BasicInfo.vue    # 기본 정보
│   │   ├── Step2SiteInfo.vue     # 사이트 정보
│   │   ├── Step3InitialData.vue  # 초기 데이터 (핵심)
│   │   └── Step4Result.vue       # 결과 확인
│   │
│   ├── api/                  # Backend 통신 레이어
│   │   ├── supabase.ts       # Supabase 클라이언트
│   │   ├── organization.ts   # 조직/직원/시프트 API
│   │   ├── schedule.ts       # 근무표 CRUD
│   │   └── solver.ts         # AI Solver Mock API
│   │
│   ├── types/                # TypeScript 타입 정의
│   │   ├── database.ts       # Supabase 스키마 타입
│   │   ├── schedule.ts       # 근무표 관련 타입
│   │   └── global.d.ts       # 전역 타입
│   │
│   ├── utils/                # 유틸리티 함수
│   │   └── message.ts        # Naive UI 메시지 래퍼
│   │
│   ├── router/               # Vue Router 설정
│   │   └── index.ts          # 라우트 정의 + 가드
│   │
│   ├── App.vue               # 루트 컴포넌트
│   └── main.ts               # 앱 진입점
│
├── supabase/
│   ├── migrations/           # DB 마이그레이션
│   └── seed.sql              # 초기 데이터 (30명 간호사)
│
├── docs/
│   ├── prd/                  # 프로젝트 요구사항
│   ├── naive/                # Naive UI 문서
│   └── vben/                 # Vben Admin 참고 문서
│
├── README.md                 # 프로젝트 소개
├── DEVELOPMENT.md            # 개발자 가이드 (이 문서)
├── CLAUDE.md                 # Claude Code 가이드
└── package.json
```

### 핵심 파일

| 파일 | 역할 | 복잡도 |
|------|------|--------|
| `src/components/schedule/ScheduleGrid.vue` | TanStack Table 그리드 (30×36) | ⭐⭐⭐⭐⭐ |
| `src/composables/useScheduleGrid.ts` | 그리드 데이터 관리 | ⭐⭐⭐⭐ |
| `src/composables/useAISolver.ts` | AI Solver 연동 | ⭐⭐⭐ |
| `src/stores/schedule.ts` | 워크플로우 상태 관리 | ⭐⭐⭐ |
| `src/views/schedule/Step3InitialData.vue` | 초기 데이터 입력 페이지 | ⭐⭐⭐⭐ |

---

## 주요 컴포넌트

### 1. ScheduleGrid.vue [CRITICAL]

**역할**: 30명 × 36일 그리드 렌더링 및 시프트 배정

**위치**: `src/components/schedule/ScheduleGrid.vue`

**Props**:
```typescript
interface Props {
  employees: Employee[];           // 직원 목록
  dates: GridColumn[];             // 날짜 컬럼
  assignments: AssignmentMap;      // 시프트 배정 데이터
  readonly?: boolean;              // 편집 가능 여부 (기본: false)
  highlightPreviousMonth?: boolean; // 전월 하이라이트 (기본: false)
}
```

**Events**:
```typescript
emit('update:assignment', {
  employeeId: string,
  date: string,
  shiftCode: string | null
})
```

**주요 기능**:
- TanStack Table v8 기반 그리드
- 1080개 셀 (30 employees × 36 days)
- ShiftSelector 컴포넌트 통합
- 실시간 통계 계산

**최적화 기법**:
```vue
<!-- v-memo로 행 렌더링 최적화 -->
<tr v-memo="[row.id, assignments]">
  <!-- ... -->
</tr>
```

```typescript
// computed로 통계 캐싱
const statistics = computed(() => {
  return calculateStatistics(assignments.value);
});
```

### 2. ShiftSelector.vue

**역할**: D/E/N/O 시프트 선택 UI (색상 코딩 버튼 그룹)

**위치**: `src/components/schedule/ShiftSelector.vue`

**Props**:
```typescript
interface Props {
  employeeId: string;              // 직원 ID
  date: string;                    // 날짜 (YYYY-MM-DD)
  availableShifts: string[];       // 배정 가능한 시프트 목록
  currentShift: string | null;     // 현재 배정된 시프트
  readonly?: boolean;              // 읽기 전용 모드
}
```

**Events**:
```typescript
emit('select', {
  employeeId: string,
  date: string,
  shiftCode: string | null
})
```

**시프트 색상**:
- **D (Day)**: 파란색 (#3B82F6)
- **E (Evening)**: 주황색 (#F59E0B)
- **N (Night)**: 보라색 (#8B5CF6)
- **O (Off)**: 회색 (#6B7280)

### 3. StatisticsSummary.vue

**역할**: 실시간 시프트 통계 표시

**위치**: `src/components/schedule/StatisticsSummary.vue`

**Props**:
```typescript
interface Props {
  assignments: AssignmentMap;      // 시프트 배정 데이터
  employees: Employee[];           // 직원 목록
  targetMonth: string;             // 대상 월 (YYYY-MM)
}
```

**표시 정보**:
- 직원별 시프트 카운트 (D/E/N/O)
- 일별 시프트 배치 현황
- 미배정 셀 개수
- 공정성 지표 (추후 확장)

### 4. StepIndicator.vue

**역할**: 4단계 워크플로우 진행 상태 표시

**위치**: `src/components/schedule/StepIndicator.vue`

**Props**:
```typescript
interface Props {
  currentStep: 1 | 2 | 3 | 4;      // 현재 단계
}
```

**단계 정의**:
1. **기본 정보** - 월 선택, 조직 확인
2. **사이트 정보** - 요일별 필요 인원 설정
3. **초기 데이터** - 전월 근무표 입력
4. **결과 확인** - AI 생성 결과 검토 및 수정

---

## 데이터 플로우

### 전체 워크플로우

```
[Step 1] → [Step 2] → [Step 3] → [AI Solver] → [Step 4]
   ↓          ↓           ↓            ↓            ↓
 월 선택    사이트    전월 데이터    생성 요청    결과 확인
           정보      입력 (핵심)    + Polling    + 수정
```

### Step 1 → Step 2: 기본 정보 설정

```typescript
// Step1BasicInfo.vue
const goToStep2 = () => {
  scheduleStore.setBasicInfo({
    targetMonth: selectedMonth.value,
    organizationId: currentOrg.value.id
  });

  router.push('/schedule/step2');
};
```

**데이터 저장**:
- `scheduleStore.targetMonth` ← 선택된 월
- `scheduleStore.organizationId` ← 조직 ID

### Step 2 → Step 3: 사이트 정보 설정

```typescript
// Step2SiteInfo.vue
const goToStep3 = async () => {
  await saveSiteRequirements(requirements.value);

  scheduleStore.setSiteRequirements(requirements.value);
  router.push('/schedule/step3');
};
```

**데이터 저장**:
- Supabase `site_requirements` 테이블에 저장
- `scheduleStore.siteRequirements` ← 요일별 필요 인원

### Step 3 → AI Solver → Step 4: 근무표 생성

```
┌─────────────────────────────────────────────────────────────┐
│ Step 3: 사용자가 전월 데이터 입력                              │
│  - 30×36 그리드에 시프트 배정                                  │
│  - LocalStorage에 자동 저장 (500ms debounce)                  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ "근무표 생성" 버튼 클릭                                        │
│  1. 전월 마지막 5일 검증 (필수 입력)                           │
│  2. Supabase에 schedule 레코드 생성 (status='created')       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ AI Solver API 호출 (MVP: Mock)                               │
│  - requestAISolver(scheduleId)                               │
│  - Mock: 5초 후 complete 상태로 변경                          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ Polling 시작 (5초 간격)                                       │
│  - checkSolverStatus(scheduleId)                             │
│  - status: created → running → complete/error                │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ status='complete' 감지                                       │
│  - LocalStorage 임시 데이터 삭제                              │
│  - router.push('/schedule/step4')                            │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 4: 결과 확인                                             │
│  - schedule_assignments 테이블 조회                           │
│  - 그리드에 표시 (편집 가능)                                   │
│  - Excel 내보내기                                             │
└─────────────────────────────────────────────────────────────┘
```

**코드 예시**:

```typescript
// Step3InitialData.vue
const generateSchedule = async () => {
  // 1. 검증
  const validation = validatePreviousMonthData(assignments.value);
  if (!validation.valid) {
    window.$message?.error('전월 마지막 5일 데이터를 모두 입력해주세요.');
    return;
  }

  // 2. Schedule 레코드 생성
  const schedule = await createSchedule({
    target_month: scheduleStore.targetMonth,
    organization_id: scheduleStore.organizationId,
    status: 'created'
  });

  // 3. AI Solver 요청 (Mock)
  await requestAISolver(schedule.id, {
    previousMonthData: getPreviousMonthData(assignments.value),
    siteRequirements: scheduleStore.siteRequirements
  });

  // 4. Polling 시작
  startPolling(schedule.id);
};

// composables/useAISolver.ts
const startPolling = (scheduleId: string) => {
  pollingInterval = setInterval(async () => {
    const status = await checkSolverStatus(scheduleId);

    if (status === 'complete') {
      stopPolling();
      clearLocalStorage();
      router.push('/schedule/step4');
    } else if (status === 'error') {
      stopPolling();
      window.$message?.error('근무표 생성 중 오류가 발생했습니다.');
    }
  }, 5000); // 5초
};
```

### Step 4: 결과 수정 및 저장

```typescript
// Step4Result.vue
const loadSchedule = async () => {
  const scheduleId = route.query.scheduleId;

  // schedule_assignments 조회
  const assignments = await getScheduleAssignments(scheduleId);

  // 그리드에 표시
  gridData.value = transformToGridData(assignments);
};

const handleAssignmentChange = async (change: AssignmentChange) => {
  // DB 업데이트
  await updateAssignment({
    schedule_id: scheduleId,
    employee_id: change.employeeId,
    date: change.date,
    shift_code: change.shiftCode
  });

  // schedule 상태 변경
  await updateScheduleStatus(scheduleId, 'changed');
};
```

---

## 개발 패턴

### 1. Composable 패턴

**정의**: 재사용 가능한 로직을 캡슐화

```typescript
// composables/useExample.ts
import { ref, computed } from 'vue';

export function useExample() {
  // State
  const state = ref<string>('');
  const loading = ref(false);

  // Computed
  const isEmpty = computed(() => state.value === '');

  // Methods
  async function loadData() {
    loading.value = true;
    try {
      // 데이터 로딩 로직
    } finally {
      loading.value = false;
    }
  }

  // Lifecycle
  onMounted(() => {
    loadData();
  });

  return {
    state,
    loading,
    isEmpty,
    loadData
  };
}
```

**사용 예시**:
```vue
<script setup lang="ts">
import { useExample } from '@/composables/useExample';

const { state, loading, loadData } = useExample();
</script>
```

### 2. Pinia Store 패턴

**정의**: 전역 상태 관리

```typescript
// stores/example.ts
import { defineStore } from 'pinia';

export const useExampleStore = defineStore('example', {
  state: () => ({
    data: [] as Item[],
    loading: false
  }),

  getters: {
    isEmpty: (state) => state.data.length === 0
  },

  actions: {
    async loadData() {
      this.loading = true;
      try {
        const response = await api.getData();
        this.data = response.data;
      } finally {
        this.loading = false;
      }
    }
  }
});
```

**사용 예시**:
```vue
<script setup lang="ts">
import { useExampleStore } from '@/stores/example';

const exampleStore = useExampleStore();

onMounted(() => {
  exampleStore.loadData();
});
</script>
```

### 3. API 레이어 패턴

**정의**: Supabase 통신을 추상화

```typescript
// api/example.ts
import { supabase } from './supabase';
import type { Item } from '@/types';

export async function getItems(): Promise<Item[]> {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function createItem(item: Partial<Item>): Promise<Item> {
  const { data, error } = await supabase
    .from('items')
    .insert(item)
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

### 4. Route Guard 패턴

**정의**: 네비게이션 전 검증

```typescript
// router/index.ts
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();

  // 인증 체크
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next('/login');
    return;
  }

  // Step 진행 검증
  if (to.path.startsWith('/schedule/step')) {
    const currentStep = parseInt(to.path.split('step')[1]);
    const scheduleStore = useScheduleStore();

    if (!scheduleStore.canAccessStep(currentStep)) {
      next('/schedule/step1');
      return;
    }
  }

  next();
});
```

---

## 코딩 컨벤션

### 네이밍 규칙

| 대상 | 규칙 | 예시 |
|------|------|------|
| 컴포넌트 | PascalCase | `ScheduleGrid.vue` |
| Composables | camelCase + "use" prefix | `useScheduleGrid.ts` |
| Stores | camelCase | `scheduleStore` |
| API 함수 | camelCase | `loadSchedule()` |
| 타입/인터페이스 | PascalCase | `Schedule`, `Employee` |
| 상수 | UPPER_SNAKE_CASE | `MAX_EMPLOYEES` |
| 변수/함수 | camelCase | `employeeList`, `calculateStats()` |

### Vue 3 Composition API

**✅ 권장**:
```vue
<script setup lang="ts">
import { ref, computed } from 'vue';

// ref for primitives
const count = ref(0);

// computed for derived state
const doubled = computed(() => count.value * 2);

// watch for side effects only
watch(count, (newVal) => {
  console.log('Count changed:', newVal);
});
</script>
```

**❌ 비권장**:
```vue
<script setup lang="ts">
import { reactive } from 'vue';

// Don't use reactive for primitives
const state = reactive({ count: 0 }); // ❌
</script>
```

### TypeScript

**✅ 권장**:
```typescript
// 명시적 타입 정의
interface Employee {
  id: string;
  name: string;
  available_shifts: string[];
}

// 제네릭 활용
function processItems<T>(items: T[]): T[] {
  return items.filter(item => item !== null);
}

// unknown 사용 (any 대신)
function parse(data: unknown) {
  if (typeof data === 'string') {
    return JSON.parse(data);
  }
  throw new Error('Invalid data');
}
```

**❌ 비권장**:
```typescript
// any 타입 사용
function process(data: any) { // ❌
  return data.something;
}
```

### 파일 구조

**단일 파일 컴포넌트 (SFC) 순서**:
```vue
<!-- 1. Template -->
<template>
  <!-- ... -->
</template>

<!-- 2. Script -->
<script setup lang="ts">
// Imports
import { ref } from 'vue';

// Props & Emits
const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// State
const state = ref();

// Computed
const computed = computed(() => {});

// Methods
function method() {}

// Lifecycle
onMounted(() => {});
</script>

<!-- 3. Style -->
<style scoped>
/* ... */
</style>
```

---

## 상태 관리

### Pinia Stores

#### 1. authStore (`stores/auth.ts`)

**역할**: Supabase 인증 상태 관리

```typescript
interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

// 주요 Actions
- login(email, password)
- logout()
- refreshSession()
```

#### 2. organizationStore (`stores/organization.ts`)

**역할**: 조직/직원/시프트 데이터 (읽기 전용, Seed 데이터)

```typescript
interface OrganizationState {
  organization: Organization | null;
  employees: Employee[];
  shifts: Shift[];
  loading: boolean;
}

// 주요 Actions
- loadOrganization()
- loadEmployees()
- loadShifts()
```

#### 3. scheduleStore (`stores/schedule.ts`)

**역할**: 워크플로우 상태 및 임시 데이터

```typescript
interface ScheduleState {
  // 워크플로우 상태
  currentStep: 1 | 2 | 3 | 4;
  targetMonth: string;
  organizationId: string;

  // Step 2 데이터
  siteRequirements: SiteRequirement[];

  // Step 3 임시 데이터
  tempAssignments: AssignmentMap;

  // Step 4 결과
  currentScheduleId: string | null;
}

// 주요 Actions
- setBasicInfo(month, orgId)
- setSiteRequirements(requirements)
- saveTempAssignments(assignments)
- clearTempData()
```

### LocalStorage 사용

**키 컨벤션**: `everyshift_temp_schedule_{YYYY-MM}`

```typescript
// 저장
const saveToLocalStorage = (month: string, assignments: AssignmentMap) => {
  const key = `everyshift_temp_schedule_${month}`;
  localStorage.setItem(key, JSON.stringify(assignments));
};

// 복원
const restoreFromLocalStorage = (month: string): AssignmentMap | null => {
  const key = `everyshift_temp_schedule_${month}`;
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : null;
};

// 삭제 (생성 완료 시)
const clearLocalStorage = (month: string) => {
  const key = `everyshift_temp_schedule_${month}`;
  localStorage.removeItem(key);
};
```

**Debounce 적용**:
```typescript
import { useDebounceFn } from '@vueuse/core';

const debouncedSave = useDebounceFn((assignments: AssignmentMap) => {
  saveToLocalStorage(targetMonth.value, assignments);
}, 500); // 500ms

watch(assignments, (newVal) => {
  debouncedSave(newVal);
}, { deep: true });
```

---

## 테스팅

### 단위 테스트

**프레임워크**: Vitest

**실행**:
```bash
pnpm test:unit
```

**예시**:
```typescript
// composables/__tests__/useScheduleGrid.test.ts
import { describe, it, expect } from 'vitest';
import { useScheduleGrid } from '../useScheduleGrid';

describe('useScheduleGrid', () => {
  it('should initialize grid data', () => {
    const { gridData } = useScheduleGrid();
    expect(gridData.value).toBeDefined();
  });

  it('should update assignment', () => {
    const { updateAssignment, getAssignment } = useScheduleGrid();

    updateAssignment('emp-1', '2024-03-01', 'D');
    const assignment = getAssignment('emp-1', '2024-03-01');

    expect(assignment).toBe('D');
  });
});
```

### E2E 테스트

**프레임워크**: Playwright

**실행**:
```bash
pnpm test:e2e
```

**예시**:
```typescript
// e2e/schedule-workflow.spec.ts
import { test, expect } from '@playwright/test';

test('complete schedule workflow', async ({ page }) => {
  // 로그인
  await page.goto('/login');
  await page.fill('input[type="email"]', 'admin@test.com');
  await page.fill('input[type="password"]', 'password');
  await page.click('button[type="submit"]');

  // Step 1
  await page.goto('/schedule/step1');
  await page.selectOption('select[name="month"]', '2024-03');
  await page.click('button:has-text("다음")');

  // Step 2
  await expect(page).toHaveURL('/schedule/step2');
  // ... 사이트 정보 입력

  // Step 3
  await page.goto('/schedule/step3');
  // ... 그리드 데이터 입력

  // Step 4
  await page.click('button:has-text("근무표 생성")');
  await expect(page).toHaveURL('/schedule/step4');
});
```

---

## 트러블슈팅

### 그리드 성능 문제

**증상**: 그리드가 느리게 렌더링되거나 입력 반응이 느림

**원인**:
1. `v-memo` 미적용
2. `watch`에서 불필요한 `deep: true` 사용
3. 통계 계산이 매 렌더링마다 실행됨

**해결**:

```vue
<!-- ✅ v-memo 적용 -->
<tr v-for="row in rows" :key="row.id" v-memo="[row.id, assignments[row.id]]">
  <!-- ... -->
</tr>

<!-- ✅ computed로 통계 캐싱 -->
<script setup lang="ts">
const statistics = computed(() => {
  return calculateStatistics(assignments.value);
});
</script>

<!-- ❌ watch deep: true 최소화 -->
watch(assignments, () => {
  // ...
}, { deep: true }); // 필요한 경우에만 사용
```

### 통계 계산 오류

**증상**: 시프트 카운트가 정확하지 않음

**원인**:
1. `assignments` 객체의 반응성 손실
2. Deep watch 미설정

**해결**:

```typescript
// ✅ ref/reactive로 반응성 보장
const assignments = ref<AssignmentMap>({});

// ✅ Deep watch 설정
watch(assignments, () => {
  recalculateStatistics();
}, { deep: true });
```

### AI Solver Polling 멈춤

**증상**: 근무표 생성 중 무한 대기

**원인**: Polling 정리 누락

**해결**:

```typescript
// composables/useAISolver.ts
let pollingInterval: NodeJS.Timeout | null = null;

const startPolling = (scheduleId: string) => {
  pollingInterval = setInterval(async () => {
    // ...
  }, 5000);
};

const stopPolling = () => {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
};

// ✅ 컴포넌트 언마운트 시 정리
onUnmounted(() => {
  stopPolling();
});
```

### Supabase 연결 오류

**증상**: API 호출 실패

**원인**: 환경 변수 미설정

**해결**:

1. `.env.local` 파일 확인:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

2. Vite 서버 재시작:
```bash
pnpm run dev
```

### Naive UI Provider 에러

**증상**: `window.$message` undefined 에러

**원인**: `createDiscreteApi` 패턴 미사용

**해결**:

```typescript
// ❌ 템플릿에서 직접 접근
<template>
  <button @click="window.$message.success('OK')">Click</button>
</template>

// ✅ 메서드로 래핑 + 옵셔널 체이닝
<template>
  <button @click="showMessage">Click</button>
</template>

<script setup lang="ts">
const showMessage = () => {
  window.$message?.success('OK');
};
</script>
```

**참고**: `docs/naive/05-discrete-api.md`, `docs/naive/07-troubleshooting.md`

### 라우트 가드 무한 루프

**증상**: 페이지가 계속 리다이렉트됨

**원인**: `next()` 호출 누락 또는 조건 오류

**해결**:

```typescript
// ❌ next() 누락
router.beforeEach((to, from, next) => {
  if (condition) {
    next('/other');
    // next() 누락!
  }
});

// ✅ 모든 경로에서 next() 호출
router.beforeEach((to, from, next) => {
  if (condition) {
    next('/other');
    return;
  }
  next(); // ✅
});
```

---

## 참고 자료

### 공식 문서

- [Vue 3 Docs](https://vuejs.org/guide/introduction.html)
- [TypeScript Docs](https://www.typescriptlang.org/docs/)
- [Vite Docs](https://vite.dev/)
- [TanStack Table v8](https://tanstack.com/table/v8/docs/guide/introduction)
- [Naive UI](https://www.naiveui.com/en-US/os-theme)
- [Supabase Docs](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Pinia](https://pinia.vuejs.org/)

### 프로젝트 내부 문서

- `CLAUDE.md` - Claude Code 가이드
- `README.md` - 프로젝트 소개 및 시작 가이드
- `docs/prd/` - 프로젝트 요구사항 문서
- `docs/naive/` - Naive UI 사용 가이드 (7개 파일)
  - `00-quick-reference.md` - 빠른 참조
  - `05-discrete-api.md` - createDiscreteApi 패턴 ⭐
  - `07-troubleshooting.md` - 문제 해결
- `docs/vben/en/` - Vben Admin 참고 문서

### 유용한 도구

- [Vue DevTools](https://devtools.vuejs.org/)
- [Supabase Studio](https://supabase.com/dashboard)
- [Tailwind CSS IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss)
- [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) - Vue 3 LSP

---

## 추가 질문?

문서에서 다루지 않은 내용이나 추가 질문은:

1. **CLAUDE.md** 확인 - Claude Code 사용 시 참고
2. **docs/** 디렉토리 내부 문서 검색
3. **GitHub Issues** - 프로젝트 이슈 트래커

---

**마지막 업데이트**: 2025-11-21
**버전**: 1.0.0

---

## Skills Operations

### Skill source and mirror
- Source of truth: `.claude/skills/`
- Codex mirror: `tools/skills/codex-mirror/`
- Codex install target: `~/.codex/skills/everyshift-*`

### Validation
```bash
bash tools/skills/validate-skills.sh
```

### Sync to Codex
```bash
bash tools/skills/sync-to-codex.sh
```

### Recommended checks after skill updates
```bash
pnpm lint
pnpm test:unit
bash tools/skills/validate-skills.sh
```
