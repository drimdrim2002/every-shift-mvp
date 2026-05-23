# 근무자 상세 근무 기록 미니 캘린더 팝업 구현 계획서

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 근무 기록 페이지(`WorkPerformance.vue`)에서 특정 근무자를 클릭할 때, 상세한 야간/주말 근무 및 Off 요청(수락, 반려, 대기 상태 모두 포함) 내역을 월별 미니 캘린더 팝업으로 시각화하여 형평성 검토를 고도화합니다.

**Architecture:**

1. Naive UI의 `<n-modal>`을 기반으로 한 `WorkPerformanceDetailModal.vue` 컴포넌트를 신규 작성합니다. 해당 컴포넌트는 조회 기간 내에서 이전/다음 달 이동을 지원하며, 7열 그리드로 달력을 생성해 상태 배지를 표시합니다.
2. `WorkPerformance.vue` 테이블에서 직원의 이름 및 우측 '상세 보기' 버튼을 모달 트리거로 연결하고, 기존의 텍스트 기반 아코디언 컴포넌트를 제거하여 UI 복잡성을 해소합니다.

**Tech Stack:** Vue 3 (<script setup>, TypeScript), Naive UI, Tailwind CSS, Pinia (organization store)

---

## User Review Required

> [!IMPORTANT]
> **기존 아코디언 UI 제거 및 모달 팝업 단일화**
>
> - 기존 표 하단의 접고 펴는 식의 텍스트 날짜 아코디언 영역(`expandedEmployeeId` 및 관련 하위 DOM)을 깔끔하게 제거하고, 보다 높은 사용성을 제공하는 **캘린더 팝업으로 대체 단일화**합니다.

> [!TIP]
> **Off 요청 상태 세분화**
>
> - 단순 합산에 포함되었던 수락(fulfilled) 상태뿐만 아니라, **반려(unfulfilled) 상태와 대기(pending) 상태의 오프 신청도 캘린더 상에 취소선 및 점선 배지로 각각 구분해 렌더링**하여 스케줄 형평성을 더 정확하게 판단하도록 돕습니다.

---

### Task 1: [NEW] WorkPerformanceDetailModal 컴포넌트 개발

**Files:**

- Create: [WorkPerformanceDetailModal.vue](file:///Users/brown/workspace/every-shift-mvp/src/components/schedule/WorkPerformanceDetailModal.vue)

- [ ] **Step 1: 컴포넌트 작성 (Script Setup & Template)**
  - 아래의 고품질 소스코드를 작성합니다.

```html
<template>
  <n-modal
    v-model:show="showModal"
    preset="card"
    class="w-full max-w-2xl rounded-2xl border border-slate-200/80 bg-slate-50 shadow-xl"
    :title="`${employee?.name || ''}님의 상세 근무/Off 기록`"
    @after-leave="handleClose"
  >
    <div class="space-y-6">
      <!-- 1. 프로필 및 월별 요약 요약 카드 -->
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <!-- 야간 근무 -->
        <div class="rounded-xl border border-blue-100 bg-blue-50/40 p-3 text-center">
          <p class="text-xs font-medium text-slate-500">야간 근무</p>
          <p class="mt-1 text-xl font-bold tabular-nums text-blue-900">
            {{ currentMonthMetrics.night }}회
          </p>
        </div>
        <!-- 주말/휴일 -->
        <div class="rounded-xl border border-amber-100 bg-amber-50/40 p-3 text-center">
          <p class="text-xs font-medium text-slate-500">주말·휴일</p>
          <p class="mt-1 text-xl font-bold tabular-nums text-amber-900">
            {{ currentMonthMetrics.weekendHoliday }}회
          </p>
        </div>
        <!-- Off 수락 -->
        <div class="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3 text-center">
          <p class="text-xs font-medium text-slate-500">Off 수락</p>
          <p class="mt-1 text-xl font-bold tabular-nums text-emerald-900">
            {{ currentMonthMetrics.offFulfilled }}건
          </p>
        </div>
        <!-- Off 미수락/대기 -->
        <div class="rounded-xl border border-slate-200 bg-white p-3 text-center">
          <p class="text-xs font-medium text-slate-500">Off 반려/대기</p>
          <p class="mt-1 text-xl font-bold tabular-nums text-slate-700">
            {{ currentMonthMetrics.offOthers }}건
          </p>
        </div>
      </div>

      <!-- 2. 월 선택 컨트롤러 -->
      <div class="flex items-center justify-between border-b border-t border-slate-200/60 py-3">
        <n-button
          circle
          secondary
          size="small"
          :disabled="!hasPrevMonth"
          @click="navigateMonth(-1)"
        >
          &lt;
        </n-button>
        <span class="text-lg font-bold tabular-nums text-slate-800">
          {{ currentYear }}년 {{ currentMonth }}월
        </span>
        <n-button circle secondary size="small" :disabled="!hasNextMonth" @click="navigateMonth(1)">
          &gt;
        </n-button>
      </div>

      <!-- 3. 미니 캘린더 그리드 -->
      <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <!-- 요일 헤더 -->
        <div
          class="grid grid-cols-7 gap-2 border-b border-slate-100 pb-2 text-center text-xs font-semibold text-slate-500"
        >
          <div class="text-red-500">일</div>
          <div>월</div>
          <div>화</div>
          <div>수</div>
          <div>목</div>
          <div>금</div>
          <div class="text-blue-500">토</div>
        </div>

        <!-- 날짜 셀 그리드 -->
        <div class="grid grid-cols-7 gap-2 pt-2">
          <!-- 이전 달 공백 패딩 -->
          <div
            v-for="empty in emptyCellsBefore"
            :key="`empty-${empty}`"
            class="min-h-[5.5rem] rounded-lg border border-dashed border-slate-100 bg-slate-50/40"
          />

          <!-- 실제 날짜 셀 -->
          <div
            v-for="day in daysInMonth"
            :key="`day-${day}`"
            class="flex min-h-[5.5rem] flex-col justify-between rounded-lg border border-slate-100 bg-white p-1.5 transition-all hover:border-teal-500/40"
          >
            <!-- 날짜 숫자 -->
            <span class="text-xs font-bold tabular-nums" :class="getDayNumberClass(day)">
              {{ day }}
              <span
                v-if="getDayDetails(day).isHoliday"
                class="ml-0.5 text-[9px] font-medium text-red-500"
                >공휴</span
              >
            </span>

            <!-- 당일 배지 리스트 -->
            <div class="mt-1 flex flex-col gap-0.5">
              <!-- 근무 배지 -->
              <span
                v-if="getDayDetails(day).workBadge"
                class="rounded px-1 py-0.5 text-center text-[10px] font-semibold leading-none"
                :class="getDayDetails(day).workBadgeClass"
              >
                {{ getDayDetails(day).workBadge }}
              </span>

              <!-- Off 요청 상태 배지 -->
              <span
                v-if="getDayDetails(day).offBadge"
                class="rounded px-1 py-0.5 text-center text-[10px] font-semibold leading-none"
                :class="getDayDetails(day).offBadgeClass"
              >
                {{ getDayDetails(day).offBadge }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 4. 컬러 범례 (Legend) -->
      <div
        class="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 rounded-xl bg-slate-100/60 p-3 text-xs font-medium text-slate-500"
      >
        <span class="inline-flex items-center gap-1"
          ><span class="size-2 rounded bg-blue-500" />야간 근무 (N)</span
        >
        <span class="inline-flex items-center gap-1"
          ><span class="size-2 rounded bg-amber-500" />주말/휴일 근무</span
        >
        <span class="inline-flex items-center gap-1"
          ><span class="size-2 rounded bg-slate-300" />평일 근무</span
        >
        <span class="inline-flex items-center gap-1"
          ><span class="size-2 rounded bg-emerald-500" />Off 수락</span
        >
        <span class="inline-flex items-center gap-1"
          ><span
            class="size-2 rounded border border-emerald-400 text-emerald-600 line-through"
          />Off 반려</span
        >
        <span class="inline-flex items-center gap-1"
          ><span class="size-2 rounded border border-dashed border-slate-400 bg-slate-50" />Off
          대기</span
        >
      </div>
    </div>
  </n-modal>
</template>

<script setup lang="ts">
  import { computed, ref, watch } from 'vue';
  import { NModal, NButton } from 'naive-ui';
  import type {
    WorkPerformanceAssignmentRow,
    WorkPerformanceEmployeeRow,
    WorkPerformancePeriod,
    WorkPerformancePreferenceRow,
  } from '@/types/workPerformance';

  interface Props {
    show: boolean;
    employee: WorkPerformanceEmployeeRow | null;
    assignments: WorkPerformanceAssignmentRow[];
    offRequests: WorkPerformancePreferenceRow[];
    publicHolidayDates: string[];
    period: WorkPerformancePeriod | null;
  }

  interface Emits {
    (e: 'update:show', value: boolean): void;
  }

  const props = defineProps<Props>();
  const emit = defineEmits<Emits>();

  const currentYear = ref(2026);
  const currentMonth = ref(5);

  const showModal = computed({
    get: () => props.show,
    set: (value) => emit('update:show', value),
  });

  // 모달 오픈 시 현재 조회 기간의 시작 월로 자동 동기화
  watch(
    () => props.show,
    (isOpen) => {
      if (isOpen && props.period) {
        currentYear.value = props.period.year;
        currentMonth.value = props.period.startMonth;
      }
    }
  );

  const hasPrevMonth = computed(() => {
    if (!props.period) return false;
    return currentYear.value > props.period.year || currentMonth.value > props.period.startMonth;
  });

  const hasNextMonth = computed(() => {
    if (!props.period) return false;
    return currentYear.value < props.period.year || currentMonth.value < props.period.endMonth;
  });

  function navigateMonth(delta: number) {
    if (!props.period) return;
    let nextMonth = currentMonth.value + delta;
    let nextYear = currentYear.value;

    if (nextMonth < 1) {
      nextMonth = 12;
      nextYear -= 1;
    } else if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    }

    // 검색 범위를 벗어나지 않도록 방어 코드 추가
    const isValid =
      (nextYear > props.period.year ||
        (nextYear === props.period.year && nextMonth >= props.period.startMonth)) &&
      (nextYear < props.period.year ||
        (nextYear === props.period.year && nextMonth <= props.period.endMonth));

    if (isValid) {
      currentYear.value = nextYear;
      currentMonth.value = nextMonth;
    }
  }

  // 캘린더 생성 관련 계산 로직
  const daysInMonth = computed(() => {
    return new Date(currentYear.value, currentMonth.value, 0).getDate();
  });

  const emptyCellsBefore = computed(() => {
    const firstDayOfWeek = new Date(currentYear.value, currentMonth.value - 1, 1).getDay();
    return firstDayOfWeek;
  });

  function getIsoDateStr(day: number): string {
    const monthStr = String(currentMonth.value).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    return `${currentYear.value}-${monthStr}-${dayStr}`;
  }

  function getDayOfWeek(day: number): number {
    return new Date(currentYear.value, currentMonth.value - 1, day).getDay();
  }

  function isHolidayDate(isoDate: string): boolean {
    return props.publicHolidayDates.includes(isoDate);
  }

  function getDayNumberClass(day: number) {
    const dayOfWeek = getDayOfWeek(day);
    const isoDate = getIsoDateStr(day);
    if (isHolidayDate(isoDate) || dayOfWeek === 0) return 'text-red-500';
    if (dayOfWeek === 6) return 'text-blue-500';
    return 'text-slate-700';
  }

  // 개별 날짜에 렌더링할 정보와 클래스 구성
  function getDayDetails(day: number) {
    const isoDate = getIsoDateStr(day);
    const dayOfWeek = getDayOfWeek(day);
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isHoliday = isHolidayDate(isoDate);

    // 1. 근무 정보 추출
    const assignment = props.assignments.find((a) => a.date === isoDate);
    const hasWorked =
      assignment && assignment.shiftCode && assignment.shiftCode.trim().toUpperCase() !== 'O';

    let workBadge = '';
    let workBadgeClass = '';

    if (hasWorked) {
      const shiftCode = assignment.shiftCode!.trim().toUpperCase();
      if (shiftCode === 'N') {
        workBadge = '야간';
        workBadgeClass = 'bg-blue-500 text-white shadow-sm shadow-blue-100';
      } else if (isWeekend || isHoliday) {
        workBadge = isHoliday ? '휴일근무' : '주말근무';
        workBadgeClass = 'bg-amber-500 text-white shadow-sm shadow-amber-100';
      } else {
        workBadge = shiftCode; // D, E 등
        workBadgeClass = 'bg-slate-100 text-slate-600 border border-slate-200';
      }
    }

    // 2. Off 요청 정보 추출
    const offRequest = props.offRequests.find(
      (req) => req.date === isoDate && req.requestCode === 'O'
    );
    let offBadge = '';
    let offBadgeClass = '';

    if (offRequest) {
      const status = offRequest.resolutionStatus || 'pending';
      if (status === 'fulfilled') {
        offBadge = 'Off';
        offBadgeClass = 'bg-emerald-500 text-white shadow-sm shadow-emerald-100';
      } else if (status === 'unfulfilled') {
        offBadge = 'Off 반려';
        offBadgeClass =
          'border border-emerald-400 text-emerald-600 line-through bg-emerald-50/40 opacity-70';
      } else {
        offBadge = 'Off 대기';
        offBadgeClass = 'border border-dashed border-slate-300 text-slate-500 bg-slate-50';
      }
    }

    return {
      isHoliday,
      workBadge,
      workBadgeClass,
      offBadge,
      offBadgeClass,
    };
  }

  // 통계 집계 연산
  const currentMonthMetrics = computed(() => {
    let night = 0;
    let weekendHoliday = 0;
    let offFulfilled = 0;
    let offOthers = 0;

    const totalDays = daysInMonth.value;
    for (let d = 1; d <= totalDays; d++) {
      const isoDate = getIsoDateStr(d);
      const dayOfWeek = getDayOfWeek(d);
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isHoliday = isHolidayDate(isoDate);

      const assignment = props.assignments.find((a) => a.date === isoDate);
      const hasWorked =
        assignment && assignment.shiftCode && assignment.shiftCode.trim().toUpperCase() !== 'O';

      if (hasWorked) {
        const shiftCode = assignment.shiftCode!.trim().toUpperCase();
        if (shiftCode === 'N') {
          night++;
        }
        if (isWeekend || isHoliday) {
          weekendHoliday++;
        }
      }

      const offRequest = props.offRequests.find(
        (req) => req.date === isoDate && req.requestCode === 'O'
      );
      if (offRequest) {
        if (offRequest.resolutionStatus === 'fulfilled') {
          offFulfilled++;
        } else {
          offOthers++;
        }
      }
    }

    return {
      night,
      weekendHoliday,
      offFulfilled,
      offOthers,
    };
  });

  function handleClose() {
    // 모달 닫힐 때 추가 리셋 작업이 필요한 경우
  }
</script>
```

- [ ] **Step 2: 수동 린트 체크**
  - CLI 명령어는 아직 실행하지 않고 정적 분석 호환성 여부만 구조적으로 검토합니다.

---

### Task 2: [MODIFY] WorkPerformance 뷰 연동 및 아코디언 제거

**Files:**

- Modify: [WorkPerformance.vue](file:///Users/brown/workspace/every-shift-mvp/src/views/schedule/WorkPerformance.vue)

- [ ] **Step 1: 아코디언 제거 및 신규 상태 바인딩**
  - `expandedEmployeeId` 관련 로직(`toggleDetail`, `isDetailExpanded`, `getDetailId` 등)을 소스에서 삭제합니다.
  - 모달 팝업 제어를 위해 아래 상태값들을 선언합니다:

  ```typescript
  import WorkPerformanceDetailModal from '@/components/schedule/WorkPerformanceDetailModal.vue';

  const showDetailModal = ref(false);
  const selectedEmployeeRow = ref<WorkPerformanceEmployeeRow | null>(null);

  // 선택된 직원의 근무 기록 필터링
  const selectedEmployeeAssignments = computed(() => {
    if (!selectedEmployeeRow.value || !successResult.value) return [];
    return successResult.value.assignments.filter(
      (a) => a.employeeId === selectedEmployeeRow.value!.id
    );
  });

  // 선택된 직원의 오프 신청 기록 필터링
  const selectedEmployeeOffRequests = computed(() => {
    if (!selectedEmployeeRow.value || !successResult.value) return [];
    return successResult.value.offRequests.filter(
      (o) => o.employeeId === selectedEmployeeRow.value!.id
    );
  });

  function handleOpenDetailModal(row: any) {
    selectedEmployeeRow.value = {
      id: row.employeeId,
      employeeId: row.employeeDisplayId,
      name: row.employeeName,
    };
    showDetailModal.value = true;
  }
  ```

- [ ] **Step 2: 템플릿 수정 및 트리거 연결**
  - 기존 직원 이름 출력 부분(라인 509 부근)을 클릭 가능한 형태의 링크로 변경합니다:
  ```html
  <span
    data-test="work-performance-employee-name"
    class="block cursor-pointer truncate font-semibold text-teal-600 hover:text-teal-700 hover:underline"
    :title="row.employeeName"
    @click="handleOpenDetailModal(row)"
  >
    {{ row.employeeName }}
  </span>
  ```

  - 기존 '상세 보기' 버튼(라인 585 부근)을 팝업 오픈 트리거로 대체하고 라벨을 '기록 달력'으로 변경합니다:
  ```html
  <button
    type="button"
    class="min-h-11 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500"
    @click="handleOpenDetailModal(row)"
  >
    기록 달력
  </button>
  ```

  - 기존 표 하단 아코디언 `<div v-if="isDetailExpanded(row.employeeId)" ...>` (라인 598-636) 영역을 완전히 제거합니다.
  - 최하단 템플릿 내에 `<WorkPerformanceDetailModal>` 컴포넌트를 마크업합니다:
  ```html
  <WorkPerformanceDetailModal
    v-model:show="showDetailModal"
    :employee="selectedEmployeeRow"
    :assignments="selectedEmployeeAssignments"
    :offRequests="selectedEmployeeOffRequests"
    :public-holiday-dates="successResult?.publicHolidayDates || []"
    :period="successResult?.period || null"
  />
  ```

---

## Verification Plan

### Automated Tests

- 코드 통합 완료 후, 프로젝트 전체가 정상적으로 컴파일 및 빌드되고 린트에 걸리는 항목이 없는지 확인하기 위해 다음을 수행합니다.

  ```bash
  # 린트 및 스타일 에러 체크
  pnpm lint:check

  # 프로덕션 번들 빌드 에러 체크
  pnpm run build
  ```

### Manual Verification

- 로컬 브라우저 구동 후 다음 유즈케이스 시나리오를 점검합니다:
  1. 근무 기록 표에서 직원 이름을 누르거나 '기록 달력' 버튼 클릭 시 모달이 정해진 트랜지션 애니메이션과 함께 정상 로출되는가?
  2. 조회한 월별로 미니 캘린더가 1일의 요일부터 마지막 날까지 어긋남 없이 꽉 차게 렌더링되는가?
  3. 달력 하단의 요약 카드 4종의 통계 횟수가 실제 달력에 노출된 배지의 합산과 일치하는가?
  4. 다중 월 조회 시 달력 좌우의 `<` 및 `>` 화살표 클릭을 통해 검색 기간 내부에서만 월 이동이 자연스럽게 수행되는가?
  5. Off 요청의 수락(Fulfilled)은 녹색 배지, 반려(Unfulfilled)는 취소선 배지, 대기(Pending)는 점선 배지로 사양에 정비례하게 시각화되는가?
