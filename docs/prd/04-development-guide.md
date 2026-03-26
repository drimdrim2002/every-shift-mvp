# EveryShift MVP PRD - 개발 가이드

> **문서 상태**: Phase1 Legacy Reference
>
> 이 문서는 초기 8주 MVP 개발 계획 기준으로 작성된 역사적 문서입니다.
> 현재 우선순위 및 배포 판단은 `PHASE2_PRD_KR.md`를 기준으로 합니다.

## 문서 정보

- **버전**: MVP 1.0
- **작성일**: 2025-11-12
- **목적**: 8주 개발 계획 및 단계별 구현 가이드

---

# 목차

1. [개발 환경 설정](#1-개발-환경-설정)
2. [기본 구조 및 인증](#2-기본-구조-및-인증)
3. [Step 1-2 구현](#3-step-1-2-구현)
4. [Step 3 - 그리드 구현](#4-step-3-그리드-구현)
5. [Step 4 및 AI 연동](#5-step-4-및-ai-연동)
6. [마무리 및 개선](#6-마무리-및-개선)
7. [부록 - 참고 자료](#7-부록-참고-자료)

---

# 7. 개발 가이드 (8주 계획)

## 7.1 개발 환경 설정 (Week 1)

### Day 1-2: 프로젝트 초기화

#### 1. Vite + Vue3 + TypeScript 프로젝트 생성

```bash
npm create vite@latest everyshift-mvp -- --template vue-ts
cd everyshift-mvp
npm install
```

#### 2. 필수 패키지 설치

```bash
# UI & Styling
npm install naive-ui
npm install -D tailwindcss@3.4.17 postcss autoprefixer
npx tailwindcss init -p

# Table
npm install @tanstack/vue-table

# State & Router
npm install pinia vue-router@4

# Supabase
npm install @supabase/supabase-js

# Date & Utils
npm install dayjs
npm install @vueuse/core

# Excel export
npm install xlsx
```

#### 3. Tailwind CSS 설정

```javascript
// tailwind.config.js
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'shift-day': '#92D050',
        'shift-evening': '#FFC000',
        'shift-night': '#4472C4',
        'shift-off': '#D9D9D9',
      },
    },
  },
  plugins: [],
};
```

#### 4. 프로젝트 구조 생성

```bash
mkdir -p src/{components/{layout,schedule,ui},composables,stores,router,views/{auth,schedule},api,types,utils,assets}
```

### Day 3-5: Supabase 설정

#### 1. Supabase 프로젝트 생성

- https://supabase.com 접속
- "New Project" 생성
- Database password 설정
- URL 및 anon key 복사

#### 2. 환경 변수 설정

```bash
# .env.local
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxxxx...
```

#### 3. DB 마이그레이션 실행

```bash
# Supabase CLI 설치 (선택)
npm install -g supabase

# 또는 SQL Editor에서 직접 실행
```

## 7.2 기본 구조 및 인증 (Week 2)

### Day 1-2: 레이아웃 및 라우팅

#### 1. 레이아웃 컴포넌트

```
src/components/layout/
├── DefaultLayout.vue
├── Header.vue
└── Sidebar.vue
```

**DefaultLayout.vue**:

- Naive UI의 `n-layout` 사용
- Header + Sidebar + Content 구조
- Vben Admin의 레이아웃 참고 (단순화)

#### 2. 라우터 설정

```typescript
// router/index.ts
import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const routes = [
  {
    path: '/login',
    component: () => import('@/views/auth/Login.vue'),
  },
  {
    path: '/',
    component: () => import('@/components/layout/DefaultLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/schedule/step1',
      },
      {
        path: 'schedule/step1',
        name: 'ScheduleStep1',
        component: () => import('@/views/schedule/Step1BasicInfo.vue'),
      },
      {
        path: 'schedule/step2',
        name: 'ScheduleStep2',
        component: () => import('@/views/schedule/Step2SiteInfo.vue'),
      },
      {
        path: 'schedule/step3',
        name: 'ScheduleStep3',
        component: () => import('@/views/schedule/Step3InitialData.vue'),
      },
      {
        path: 'schedule/step4/:id',
        name: 'ScheduleStep4',
        component: () => import('@/views/schedule/Step4Result.vue'),
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// 인증 가드
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next('/login');
  } else {
    next();
  }
});

export default router;
```

### Day 3-4: 인증 (간소화)

#### 1. Auth Store

```typescript
// stores/auth.ts
import { defineStore } from 'pinia';
import { supabase } from '@/api/supabase';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as User | null,
    session: null as Session | null,
  }),

  getters: {
    isAuthenticated: (state) => !!state.session,
  },

  actions: {
    async login(email: string, password: string) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      this.user = data.user;
      this.session = data.session;
    },

    async logout() {
      await supabase.auth.signOut();
      this.user = null;
      this.session = null;
    },

    async checkSession() {
      const { data } = await supabase.auth.getSession();
      this.session = data.session;
      this.user = data.session?.user || null;
    },
  },
});
```

#### 2. Login 페이지

```vue
<!-- views/auth/Login.vue -->
<template>
  <div class="flex min-h-screen items-center justify-center bg-gray-100">
    <n-card title="EveryShift 로그인" style="width: 400px">
      <n-form ref="formRef" :model="form" :rules="rules" @submit.prevent="handleLogin">
        <n-form-item label="이메일" path="email">
          <n-input v-model:value="form.email" type="email" />
        </n-form-item>

        <n-form-item label="비밀번호" path="password">
          <n-input v-model:value="form.password" type="password" show-password-on="click" />
        </n-form-item>

        <n-button type="primary" block :loading="loading" @click="handleLogin"> 로그인 </n-button>
      </n-form>
    </n-card>
  </div>
</template>

<script setup lang="ts">
// 구현 생략 (Naive UI Form 사용)
</script>
```

### Day 5: Organization Store

```typescript
// stores/organization.ts
import { defineStore } from 'pinia';
import { supabase } from '@/api/supabase';

export const useOrganizationStore = defineStore('organization', {
  state: () => ({
    current: null as Organization | null,
    employees: [] as Employee[],
    shifts: [] as Shift[],
  }),

  actions: {
    async loadOrganization(id: string) {
      const { data, error } = await supabase
        .from('organizations')
        .select(
          `
          *,
          employees(*),
          shifts(*)
        `
        )
        .eq('id', id)
        .single();

      if (error) throw error;

      this.current = data;
      this.employees = data.employees;
      this.shifts = data.shifts;
    },
  },
});
```

### Week 2 체크리스트

- [ ] 레이아웃 컴포넌트 완성
- [ ] 라우터 및 인증 가드 설정
- [ ] 로그인 페이지 동작
- [ ] Organization Store 구현
- [ ] 로그인 → 대시보드 플로우 확인

---

## 7.3 Step 1-2 구현 (Week 3)

### Day 1-2: Step 1 - 기본 정보 설정

#### 컴포넌트 구현

```vue
<!-- views/schedule/Step1BasicInfo.vue -->
<template>
  <div class="p-8">
    <StepIndicator :current-step="1" :steps="steps" />

    <n-card title="기본 정보 설정" class="mt-6">
      <!-- 계획 월 선택 -->
      <n-form-item label="계획 월">
        <n-select v-model:value="selectedMonth" :options="monthOptions" />
      </n-form-item>

      <!-- 조직 정보 표시 -->
      <n-descriptions bordered :column="2" class="mt-4">
        <n-descriptions-item label="조직">
          {{ organization?.name }}
        </n-descriptions-item>
        <n-descriptions-item label="유형">
          {{ organization?.type }}
        </n-descriptions-item>
        <n-descriptions-item label="등록 직원"> {{ employees.length }}명 </n-descriptions-item>
      </n-descriptions>

      <!-- 시프트 목록 -->
      <div class="mt-4">
        <h3 class="mb-2 font-semibold">등록된 시프트</h3>
        <div v-for="shift in shifts" :key="shift.id" class="mb-1 flex items-center gap-2">
          <div class="h-4 w-4 rounded" :style="{ backgroundColor: shift.colorCode }"></div>
          <span>{{ shift.name }}</span>
          <span class="text-sm text-gray-500"> ({{ shift.startTime }} - {{ shift.endTime }}) </span>
        </div>
      </div>
    </n-card>

    <div class="mt-6 flex justify-end gap-4">
      <n-button @click="router.back()">취소</n-button>
      <n-button type="primary" @click="handleNext">다음 단계 →</n-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useScheduleStore } from '@/stores/schedule';
import { useOrganizationStore } from '@/stores/organization';
import StepIndicator from '@/components/schedule/StepIndicator.vue';

const router = useRouter();
const scheduleStore = useScheduleStore();
const orgStore = useOrganizationStore();

const selectedMonth = ref(getNextMonth());
const organization = computed(() => orgStore.current);
const employees = computed(() => orgStore.employees);
const shifts = computed(() => orgStore.shifts);

// 초기 로드
orgStore.loadOrganization('00000000-0000-0000-0000-000000000001');

function handleNext() {
  scheduleStore.setBasicInfo({
    month: selectedMonth.value,
    organizationId: organization.value!.id,
    // ...
  });

  router.push('/schedule/step2');
}
</script>
```

### Day 3-5: Step 2 - 사이트 정보 설정

#### 구현 가이드

1. `useSiteRequirements` composable 작성 (4.2 참고)
2. 3-level 헤더 그리드 HTML table로 구현
3. 인라인 편집 (셀 클릭 → input 표시)
4. 합계 자동 계산

### Week 3 체크리스트

- [ ] Step 1 완성 및 테스트
- [ ] Step 2 완성 및 테스트
- [ ] Step 1 → Step 2 네비게이션 동작
- [ ] Pinia 스토어에 데이터 저장 확인

---

## 7.4 Step 3 - 그리드 구현 (Week 4-5) ⭐

### Week 4: 그리드 기본 구조

#### Day 1-2: TanStack Table 설정

1. Column 정의
2. 데이터 준비
3. 기본 렌더링 테스트

#### Day 3-4: ShiftSelector 컴포넌트

1. 버튼 그룹 UI
2. 선택 로직
3. 색상 및 상태 표시

#### Day 5: 고정 컬럼 및 헤더

1. Sticky CSS 적용
2. 3-level 헤더 구현

### Week 5: 그리드 고급 기능

#### Day 1-2: 통계 계산

1. `useScheduleGridStatistics` composable
2. 행 통계 (근무자별)
3. 열 통계 (날짜별)

#### Day 3-4: 전월 데이터 검증

1. 전월 5일 필수 입력 체크
2. 미입력 셀 하이라이트
3. 검증 실패 시 경고

#### Day 5: 임시 저장

1. LocalStorage 연동
2. 페이지 새로고침 시 복원
3. 디바운스 적용

### Week 4-5 체크리스트

- [ ] 그리드 기본 렌더링 (30×36)
- [ ] ShiftSelector 동작
- [ ] 고정 컬럼 및 헤더
- [ ] 통계 자동 계산
- [ ] 전월 데이터 검증
- [ ] 임시 저장 동작

---

## 7.5 Step 4 및 AI 연동 (Week 6-7)

### Week 6: AI Solver 연동 (Mock)

#### Day 1-2: API 구조

1. `requestAISolver` 함수 (Mock)
2. `generateMockAssignments` 로직
3. Supabase에 결과 저장

#### Day 3-4: Polling

1. `useAISolver` composable
2. 5초마다 상태 체크
3. 상태 전이 (created → running → complete)

#### Day 5: Step 4 기본 UI

1. 상태 표시 (Status Badge)
2. 스코어 표시
3. 진행률 표시

### Week 7: Step 4 완성

#### Day 1-2: 결과 그리드

1. Step 3 그리드 컴포넌트 재사용
2. AI 결과 로드 및 표시
3. 수동 수정 가능 (readonly=false)

#### Day 3-4: 액션 버튼

1. "더 개선하기": AI 재실행
2. "엑셀 다운로드": XLSX export
3. "저장": 최종 저장

#### Day 5: 통합 테스트

1. Step 1 → 2 → 3 → 4 전체 플로우
2. Mock AI Solver 동작 확인
3. 엑셀 다운로드 테스트

### Week 6-7 체크리스트

- [ ] Mock AI Solver 동작
- [ ] Polling 구현
- [ ] Step 4 UI 완성
- [ ] 수동 수정 동작
- [ ] 엑셀 다운로드 동작
- [ ] 전체 플로우 테스트

---

## 7.6 마무리 및 개선 (Week 8)

### Day 1-2: 버그 수정 및 개선

1. 그리드 스크롤 성능 개선
2. 통계 계산 오류 수정
3. UI 개선 (여백, 색상, 폰트)

### Day 3-4: 문서화

1. README.md 작성
2. 설치 및 실행 가이드
3. Seed 데이터 설명

### Day 5: 데모 준비

1. 시나리오 작성
2. 테스트 데이터 준비
3. 실행 영상 녹화 (선택)

### Week 8 체크리스트

- [ ] 주요 버그 수정
- [ ] 성능 개선
- [ ] README 작성
- [ ] 데모 준비

---

# 8. 부록

## 8.1 Supabase 설정 가이드

### 1. 프로젝트 생성

1. https://supabase.com 접속
2. "New Project" 클릭
3. Organization 선택 또는 생성
4. Project name: `everyshift-mvp`
5. Database Password 설정 (안전하게 보관)
6. Region: Northeast Asia (Seoul)
7. "Create new project" 클릭

### 2. 연결 정보 확인

- Project Settings → API
- URL: `https://xxxxx.supabase.co`
- anon public key: `eyJxxxxx...`

### 3. SQL Editor에서 마이그레이션 실행

1. SQL Editor 메뉴 클릭
2. "New query" 클릭
3. 마이그레이션 SQL 붙여넣기
4. "Run" 클릭

### 4. Table Editor에서 데이터 확인

- Table Editor → organizations 확인
- 1개 조직 (세브란스병원) 존재 확인

## 8.2 TanStack Table 주요 개념

### Column Helper

```typescript
const columnHelper = createColumnHelper<RowData>();

columnHelper.accessor('field', {
  id: 'unique-id',
  header: 'Header Label',
  cell: (info) => info.getValue(),
  size: 100,
});

columnHelper.display({
  id: 'actions',
  header: 'Actions',
  cell: (info) => CustomComponent,
});
```

### Table Instance

```typescript
import { useVueTable, getCoreRowModel } from '@tanstack/vue-table';

const table = useVueTable({
  data: computed(() => data.value),
  columns: columns.value,
  getCoreRowModel: getCoreRowModel(),
});
```

### 렌더링

```vue
<table>
  <thead>
    <tr v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
      <th v-for="header in headerGroup.headers" :key="header.id">
        {{ header.column.columnDef.header }}
      </th>
    </tr>
  </thead>
  <tbody>
    <tr v-for="row in table.getRowModel().rows" :key="row.id">
      <td v-for="cell in row.getVisibleCells()" :key="cell.id">
        <component :is="cell.column.columnDef.cell" :info="cell.getContext()" />
      </td>
    </tr>
  </tbody>
</table>
```

## 8.3 트러블슈팅

### 문제 1: Supabase 연결 오류

**증상**: "Failed to fetch" **원인**: 환경 변수 누락 또는 잘못된 URL/Key **해결**:

```bash
# .env.local 확인
cat .env.local

# Vite 재시작
npm run dev
```

### 문제 2: 그리드 렌더링 느림

**증상**: 30명×36일 그리드가 2초 이상 소요 **원인**: 불필요한 re-render **해결**:

- `v-memo` 사용
- `computed` 값 캐싱
- ShiftSelector 컴포넌트 최적화

### 문제 3: 통계 계산 오류

**증상**: 합계가 맞지 않음 **원인**: 반응성 문제 또는 로직 오류 **해결**:

- `watch`로 assignments 변경 감지
- `deep: true` 옵션 추가
- 디버깅: `console.log(assignments.value)`

### 문제 4: Polling 멈춤

**증상**: AI Solver 상태가 업데이트되지 않음 **원인**: 컴포넌트 unmount 시 interval 미정리 **해결**:

```typescript
onUnmounted(() => {
  stopPolling();
});
```

---

# 마무리

이 PRD는 **EveryShift MVP - 근무표 생성** 시스템의 구현을 위한 매우 상세한 가이드입니다.

## 핵심 요약

1. **목표**: 엑셀 근무표 작성 시간 90% 단축
2. **범위**: 7장(근무표 생성) 4단계 전체
3. **기술**: Vue3 + TanStack Table + Supabase
4. **기간**: 8주
5. **핵심**: Step 3의 30×36 그리드 UI

## 다음 단계

1. Week 1: 환경 설정 및 Supabase 구축
2. Week 2: 인증 및 기본 구조
3. Week 3: Step 1-2 구현
4. Week 4-5: **Step 3 그리드 구현** (가장 중요)
5. Week 6-7: Step 4 및 AI 연동
6. Week 8: 마무리

## Claude Code / Cursor 활용 팁

이 PRD를 AI 코딩 도구에 제공할 때:

1. **섹션별로 나누어 요청**: "4.3 Step 3 그리드 구현해줘"
2. **컴포넌트 단위로 요청**: "ShiftSelector.vue 컴포넌트 작성해줘"
3. **명확한 요구사항**: "TanStack Table로 30×36 그리드 만들어줘"
4. **참고 자료 제공**: "5.1 ScheduleGrid.vue 참고해서..."

---

**문서 버전**: MVP 1.0  
**최종 수정**: 2025-11-12  
**작성자**: 브라운 + Claude  
**라이선스**: MIT

---

---

**문서 버전**: MVP 1.0
**최종 수정**: 2025-11-12
**작성자**: 브라운 + Claude
**라이선스**: MIT
