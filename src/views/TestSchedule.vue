<script setup lang="ts">
import { ref, computed } from 'vue';
import { useScheduleStore } from '@/stores/schedule';
import type { ScheduleBasicInfo, SiteRequirementList, AssignmentMap } from '@/types/schedule';

const scheduleStore = useScheduleStore();
const actionLog = ref<string[]>([]);

// 샘플 데이터
const sampleBasicInfo: ScheduleBasicInfo = {
  month: '2025-12',
  organizationId: '00000000-0000-0000-0000-000000000001',
  organizationName: '테스트 병원',
  organizationType: 'hospital',
  employeeCount: 30,
  shifts: [],
};

const sampleSiteRequirements: SiteRequirementList = [
  { dayOfWeek: 1, dayName: '월요일', shiftCode: 'D', requiredCount: 3 },
  { dayOfWeek: 1, dayName: '월요일', shiftCode: 'E', requiredCount: 4 },
  { dayOfWeek: 1, dayName: '월요일', shiftCode: 'N', requiredCount: 2 },
  { dayOfWeek: 2, dayName: '화요일', shiftCode: 'D', requiredCount: 3 },
  { dayOfWeek: 2, dayName: '화요일', shiftCode: 'E', requiredCount: 4 },
  { dayOfWeek: 2, dayName: '화요일', shiftCode: 'N', requiredCount: 2 },
];

const sampleAssignments: AssignmentMap = {
  'emp-001': {
    '2025-12-01': 'D',
    '2025-12-02': 'E',
  },
  'emp-002': {
    '2025-12-01': 'N',
    '2025-12-02': 'O',
  },
};

// 액션 함수들
function testSetBasicInfo() {
  scheduleStore.setBasicInfo(sampleBasicInfo);
  addLog('✅ setBasicInfo() 호출 완료');
}

function testSetSiteRequirements() {
  scheduleStore.setSiteRequirements(sampleSiteRequirements);
  addLog('✅ setSiteRequirements() 호출 완료');
}

function testSetAssignments() {
  scheduleStore.setAssignments(sampleAssignments);
  addLog('✅ setAssignments() 호출 완료');
}

function testNextStep() {
  scheduleStore.nextStep();
  addLog(`✅ nextStep() 호출 - 현재 단계: ${scheduleStore.currentStep}`);
}

function testPrevStep() {
  scheduleStore.prevStep();
  addLog(`✅ prevStep() 호출 - 현재 단계: ${scheduleStore.currentStep}`);
}

function testReset() {
  scheduleStore.reset();
  addLog('🔄 reset() 호출 완료 - 모든 상태 초기화');
}

function addLog(message: string) {
  const timestamp = new Date().toLocaleTimeString();
  actionLog.value.unshift(`[${timestamp}] ${message}`);
}

// 계산된 속성
const basicInfoJson = computed(() => JSON.stringify(scheduleStore.basicInfo, null, 2));
const siteRequirementsJson = computed(() =>
  JSON.stringify(scheduleStore.siteRequirements, null, 2),
);
const assignmentsJson = computed(() => JSON.stringify(scheduleStore.assignments, null, 2));
</script>

<template>
  <div class="container mx-auto p-8">
    <h1 class="mb-6 text-3xl font-bold">
      Schedule Store 테스트
    </h1>

    <!-- 현재 단계 표시 -->
    <div class="mb-8 rounded-lg bg-blue-50 p-6">
      <h2 class="mb-4 text-2xl font-semibold">
        현재 단계
      </h2>
      <div class="flex items-center gap-4">
        <div
          v-for="step in 4"
          :key="step"
          class="flex size-16 items-center justify-center rounded-full text-2xl font-bold"
          :class="
            scheduleStore.currentStep === step
              ? 'bg-blue-600 text-white'
              : 'bg-gray-300 text-gray-600'
          "
        >
          {{ step }}
        </div>
      </div>
      <p class="mt-4 text-lg">
        <strong>currentStep:</strong> {{ scheduleStore.currentStep }}
      </p>
    </div>

    <!-- 액션 버튼들 -->
    <div class="mb-8">
      <h2 class="mb-4 text-2xl font-semibold">
        액션 테스트
      </h2>
      <div class="grid grid-cols-2 gap-4 md:grid-cols-3">
        <button
          class="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700"
          @click="testSetBasicInfo"
        >
          setBasicInfo()
        </button>
        <button
          class="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700"
          @click="testSetSiteRequirements"
        >
          setSiteRequirements()
        </button>
        <button
          class="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700"
          @click="testSetAssignments"
        >
          setAssignments()
        </button>
        <button
          class="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          @click="testNextStep"
        >
          nextStep()
        </button>
        <button
          class="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          @click="testPrevStep"
        >
          prevStep()
        </button>
        <button
          class="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
          @click="testReset"
        >
          reset()
        </button>
      </div>
    </div>

    <!-- 액션 로그 -->
    <div class="mb-8">
      <h2 class="mb-4 text-2xl font-semibold">
        액션 로그
      </h2>
      <div class="max-h-48 overflow-y-auto rounded bg-gray-100 p-4">
        <div
          v-if="actionLog.length === 0"
          class="text-gray-500"
        >
          아직 액션이 없습니다.
        </div>
        <div
          v-for="(log, index) in actionLog"
          :key="index"
          class="mb-1 font-mono text-sm"
        >
          {{ log }}
        </div>
      </div>
    </div>

    <!-- 상태 표시 -->
    <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
      <!-- basicInfo -->
      <div>
        <h2 class="mb-4 text-2xl font-semibold">
          basicInfo
        </h2>
        <pre
          class="max-h-64 overflow-auto rounded bg-gray-100 p-4 text-sm"
        ><code>{{ basicInfoJson }}</code></pre>
      </div>

      <!-- siteRequirements -->
      <div>
        <h2 class="mb-4 text-2xl font-semibold">
          siteRequirements
        </h2>
        <pre
          class="max-h-64 overflow-auto rounded bg-gray-100 p-4 text-sm"
        ><code>{{ siteRequirementsJson }}</code></pre>
      </div>

      <!-- assignments -->
      <div class="md:col-span-2">
        <h2 class="mb-4 text-2xl font-semibold">
          assignments
        </h2>
        <pre
          class="max-h-64 overflow-auto rounded bg-gray-100 p-4 text-sm"
        ><code>{{ assignmentsJson }}</code></pre>
      </div>
    </div>
  </div>
</template>
