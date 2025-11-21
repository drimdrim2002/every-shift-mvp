<template>
  <div class="mx-auto max-w-6xl px-4">
    <n-card>
      <template #header>
        <div class="flex items-center justify-between">
          <h1 class="text-2xl font-bold">
            근무표 관리
          </h1>
          <n-button
            type="primary"
            @click="handleCreateNew"
          >
            <template #icon>
              <span class="text-lg">+</span>
            </template>
            새 근무표 생성
          </n-button>
        </div>
      </template>

      <!-- 로딩 상태 -->
      <div
        v-if="loading"
        class="py-12 text-center"
      >
        <n-spin size="large" />
        <p class="mt-4 text-gray-500">
          근무표 목록을 불러오는 중...
        </p>
      </div>

      <!-- 목록이 비어있을 때 -->
      <div
        v-else-if="schedules.length === 0"
        class="py-16 text-center"
      >
        <div class="mb-4 text-6xl">
          📅
        </div>
        <h2 class="mb-2 text-xl font-semibold text-gray-700">
          생성된 근무표가 없습니다
        </h2>
        <p class="mb-6 text-gray-500">
          새 근무표를 생성하여 시작하세요
        </p>
        <n-button
          type="primary"
          size="large"
          @click="handleCreateNew"
        >
          첫 근무표 생성하기
        </n-button>
      </div>

      <!-- 근무표 목록 -->
      <div
        v-else
        class="space-y-4"
      >
        <n-card
          v-for="schedule in schedules"
          :key="schedule.id"
          :bordered="true"
          class="cursor-pointer transition-shadow hover:shadow-md"
          @click="handleViewSchedule(schedule)"
        >
          <div class="flex items-center justify-between">
            <div class="flex-1">
              <div class="flex items-center gap-3">
                <h3 class="text-lg font-semibold">
                  {{ schedule.month }} 근무표
                </h3>
                <n-badge
                  :value="getStatusText(schedule.status)"
                  :type="getStatusType(schedule.status)"
                />
              </div>
              <div class="mt-2 flex gap-6 text-sm text-gray-600">
                <span>생성일: {{ formatDate(schedule.created_at) }}</span>
                <span v-if="schedule.hard_score !== null && schedule.soft_score !== null">
                  Hard Score: {{ schedule.hard_score }} / Soft Score: {{ schedule.soft_score }}
                </span>
              </div>
            </div>
            <div class="flex gap-2">
              <n-button
                secondary
                @click.stop="handleEdit(schedule)"
              >
                수정
              </n-button>
              <n-button
                secondary
                type="error"
                @click.stop="handleDelete(schedule)"
              >
                삭제
              </n-button>
            </div>
          </div>
        </n-card>
      </div>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { NCard, NButton, NSpin, NBadge } from 'naive-ui';
import { useOrganizationStore } from '@/stores/organization';
import { useScheduleStore } from '@/stores/schedule';
import { getScheduleList } from '@/api/schedule';
import { supabase } from '@/api/supabase';
import { showSuccess, showError } from '@/utils/message';
import dayjs from 'dayjs';

interface Schedule {
  id: string;
  organization_id: string;
  month: string;
  status: 'created' | 'running' | 'complete' | 'changed' | 'error';
  hard_score: number | null;
  soft_score: number | null;
  created_at: string;
  updated_at: string;
}

const router = useRouter();
const orgStore = useOrganizationStore();
const scheduleStore = useScheduleStore();

const loading = ref(true);
const schedules = ref<Schedule[]>([]);

onMounted(async () => {
  // 조직 정보 로드
  if (!orgStore.current) {
    await orgStore.loadOrganization('00000000-0000-0000-0000-000000000001');
  }

  // 근무표 목록 로드
  await loadSchedules();
});

async function loadSchedules() {
  try {
    loading.value = true;
    const data = await getScheduleList(orgStore.current!.id);
    schedules.value = data as Schedule[];
  } catch (error) {
    console.warn('근무표 목록 로드 실패:', error);
    window.$message?.error('근무표 목록을 불러오는데 실패했습니다');
  } finally {
    loading.value = false;
  }
}

function handleCreateNew() {
  // Store 초기화
  scheduleStore.reset();
  // Step 1로 이동
  router.push('/schedule/step1');
}

function handleViewSchedule(schedule: Schedule) {
  if (schedule.status === 'complete' || schedule.status === 'changed') {
    router.push(`/schedule/step4/${schedule.id}`);
  } else if (schedule.status === 'created' || schedule.status === 'running') {
    router.push(`/schedule/step4/${schedule.id}`);
  } else {
    window.$message?.info('해당 근무표를 조회할 수 없습니다');
  }
}

function handleEdit(schedule: Schedule) {
  if (schedule.status === 'complete' || schedule.status === 'changed') {
    router.push(`/schedule/step4/${schedule.id}`);
  } else {
    window.$message?.info('완료되지 않은 근무표는 수정할 수 없습니다');
  }
}

function handleDelete(schedule: Schedule) {
  window.$dialog?.warning({
    title: '근무표 삭제',
    content: `${schedule.month} 근무표를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`,
    positiveText: '삭제',
    negativeText: '취소',
    onPositiveClick: async () => {
      try {
        // schedule_assignments 먼저 삭제 (FK 제약)
        await supabase.from('schedule_assignments').delete().eq('schedule_id', schedule.id);

        // schedule 삭제
        const { error } = await supabase.from('schedules').delete().eq('id', schedule.id);

        if (error) throw error;

        showSuccess('근무표가 삭제되었습니다');
        await loadSchedules();
      } catch (error) {
        console.warn('삭제 실패:', error);
        showError('삭제 중 오류가 발생했습니다');
      }
    },
  });
}

function getStatusText(status: string): string {
  const map: Record<string, string> = {
    created: '생성됨',
    running: '생성 중',
    complete: '완료',
    changed: '수정됨',
    error: '오류',
  };
  return map[status] || status;
}

function getStatusType(status: string): 'info' | 'success' | 'error' | 'warning' | 'default' {
  const map: Record<string, 'info' | 'success' | 'error' | 'warning' | 'default'> = {
    created: 'info',
    running: 'info',
    complete: 'success',
    changed: 'warning',
    error: 'error',
  };
  return map[status] || 'default';
}

function formatDate(dateStr: string): string {
  return dayjs(dateStr).format('YYYY-MM-DD HH:mm');
}
</script>
