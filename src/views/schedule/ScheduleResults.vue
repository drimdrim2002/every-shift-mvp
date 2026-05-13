<template>
  <div class="mx-auto max-w-6xl px-4">
    <section class="space-y-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="text-sm font-medium tracking-wide text-slate-500">
            근무표 조회
          </p>
          <h1 class="mt-1 text-2xl font-bold text-slate-900">
            생성된 근무표
          </h1>
        </div>
        <div>
          <select
            v-if="availableYears.length > 1"
            v-model.number="selectedYear"
            data-test="schedule-results-year-select"
            class="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            aria-label="조회 연도"
          >
            <option
              v-for="year in availableYears"
              :key="year"
              :value="year"
            >
              {{ year }}년
            </option>
          </select>
          <div
            v-else
            data-test="schedule-results-year"
            class="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
          >
            {{ selectedYear }}년
          </div>
        </div>
      </div>

      <div
        v-if="loading"
        class="rounded-lg border border-slate-200 bg-white px-5 py-12 text-center"
      >
        <n-spin size="medium" />
        <p class="mt-4 text-sm text-slate-500">
          생성된 근무표를 불러오는 중입니다.
        </p>
      </div>

      <div
        v-else-if="loadError"
        data-test="schedule-results-error"
        class="rounded-lg border border-red-200 bg-red-50 px-5 py-10 text-center"
      >
        <h2 class="text-xl font-semibold text-red-900">
          근무표를 불러오지 못했습니다
        </h2>
        <p class="mt-2 text-sm text-red-700">
          잠시 후 다시 시도해 주세요.
        </p>
        <n-button
          data-test="schedule-results-retry"
          class="mt-6"
          type="primary"
          size="large"
          @click="loadSchedules"
        >
          다시 시도
        </n-button>
      </div>

      <div
        v-else-if="schedules.length === 0"
        data-test="schedule-results-empty"
        class="rounded-lg border border-slate-200 bg-slate-50/70 px-5 py-10 text-center"
      >
        <h2 class="text-xl font-semibold text-slate-900">
          아직 생성된 근무표가 없습니다
        </h2>
        <p class="mt-2 text-sm text-slate-500">
          새 근무표를 생성하면 월별 조회에서 바로 확인할 수 있습니다.
        </p>
        <n-button
          data-test="schedule-results-create"
          class="mt-6"
          type="primary"
          size="large"
          @click="goToCreateSchedule"
        >
          새 근무표 생성
        </n-button>
      </div>

      <div
        v-else
        class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
      >
        <div
          v-for="month in monthTiles"
          :key="month.month"
          data-test="schedule-results-month-tile"
        >
          <button
            :data-test="`schedule-results-month-${month.monthNumber}`"
            :data-month="month.month"
            type="button"
            :disabled="!month.schedule"
            class="min-h-28 w-full rounded-lg border p-4 text-left transition-colors disabled:cursor-not-allowed"
            :class="month.schedule
              ? 'border-slate-300 bg-white hover:border-teal-500 hover:bg-teal-50'
              : 'border-slate-200 bg-slate-50 text-slate-400'"
            @click="openSchedule(month)"
          >
            <span class="text-lg font-semibold">
              {{ Number(month.monthNumber) }}월
            </span>
            <span class="mt-3 block text-sm">
              {{ month.schedule ? '결과 보기' : '생성 전' }}
            </span>
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { NButton, NSpin } from 'naive-ui';
import { getScheduleList } from '@/api/schedule';
import { useOrganizationStore } from '@/stores/organization';
import { buildCanonicalStep5RouteLocation, getScheduleStepRoutePath } from '@/constants/routes';

interface ScheduleListItem {
  id: string;
  public_id: string | null;
  organization_id: string;
  month: string;
  status: 'created' | 'running' | 'complete' | 'changed' | 'error';
  hard_score: number | null;
  soft_score: number | null;
  created_at: string;
  updated_at: string;
}

interface MonthTile {
  month: string;
  monthNumber: string;
  schedule: ScheduleListItem | null;
}

const router = useRouter();
const orgStore = useOrganizationStore();

const loading = ref(false);
const loadError = ref<string | null>(null);
const schedules = ref<ScheduleListItem[]>([]);
const currentCalendarYear = new Date().getFullYear();
const selectedYear = ref(currentCalendarYear);

function getScheduleYear(schedule: ScheduleListItem) {
  const match = /^(\d{4})-\d{2}$/.exec(schedule.month);
  return match ? Number(match[1]) : null;
}

const availableYears = computed(() => {
  const years = new Set<number>();

  schedules.value.forEach((schedule) => {
    const year = getScheduleYear(schedule);
    if (year !== null) {
      years.add(year);
    }
  });

  if (years.size === 0) {
    years.add(currentCalendarYear);
  }

  return Array.from(years).sort((a, b) => b - a);
});

const scheduleByMonth = computed(() => {
  return new Map(schedules.value.map((schedule) => [schedule.month, schedule]));
});

const monthTiles = computed<MonthTile[]>(() => {
  return Array.from({ length: 12 }, (_, index) => {
    const monthNumber = String(index + 1).padStart(2, '0');
    const month = `${selectedYear.value}-${monthNumber}`;

    return {
      month,
      monthNumber,
      schedule: scheduleByMonth.value.get(month) ?? null,
    };
  });
});

async function loadSchedules() {
  loading.value = true;
  loadError.value = null;

  try {
    if (!orgStore.current?.id && typeof orgStore.loadOrganization === 'function') {
      await orgStore.loadOrganization();
    }

    if (!orgStore.current?.id) {
      schedules.value = [];
      return;
    }

    const data = await getScheduleList(orgStore.current.id);
    schedules.value = data as ScheduleListItem[];
    selectedYear.value = availableYears.value[0] ?? currentCalendarYear;
  } catch (error) {
    console.warn('근무표 목록 로드 실패:', error);
    schedules.value = [];
    loadError.value = 'load_failed';
  } finally {
    loading.value = false;
  }
}

function openSchedule(month: MonthTile) {
  if (!month.schedule) {
    return;
  }

  void router.push(buildCanonicalStep5RouteLocation(month.schedule.public_id ?? month.schedule.id));
}

function goToCreateSchedule() {
  void router.push(getScheduleStepRoutePath(1));
}

onMounted(() => {
  void loadSchedules();
});
</script>
