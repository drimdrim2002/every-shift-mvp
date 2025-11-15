<template>
  <div class="min-h-screen bg-gray-50 p-8">
    <div class="mx-auto max-w-4xl">
      <h1 class="mb-8 text-3xl font-bold text-gray-900">
        StepIndicator 컴포넌트 테스트
      </h1>

      <!-- StepIndicator 컴포넌트 -->
      <div class="mb-8 rounded-lg bg-white p-8 shadow">
        <h2 class="mb-4 text-xl font-semibold text-gray-700">
          현재 단계: {{ currentStep }}
        </h2>
        <StepIndicator :current-step="currentStep" />
      </div>

      <!-- 컨트롤 패널 -->
      <div class="rounded-lg bg-white p-8 shadow">
        <h2 class="mb-4 text-xl font-semibold text-gray-700">
          컨트롤
        </h2>

        <div class="space-y-4">
          <!-- 단계 선택 버튼 -->
          <div class="flex gap-2">
            <button
              v-for="step in [1, 2, 3, 4]"
              :key="step"
              :class="[
                'rounded px-4 py-2 font-medium transition-colors',
                currentStep === step
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300',
              ]"
              @click="currentStep = step"
            >
              단계 {{ step }}
            </button>
          </div>

          <!-- 이전/다음 버튼 -->
          <div class="flex gap-2">
            <button
              :disabled="currentStep === 1"
              :class="[
                'rounded px-4 py-2 font-medium transition-colors',
                currentStep === 1
                  ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                  : 'bg-green-500 text-white hover:bg-green-600',
              ]"
              @click="currentStep--"
            >
              ← 이전 단계
            </button>
            <button
              :disabled="currentStep === 4"
              :class="[
                'rounded px-4 py-2 font-medium transition-colors',
                currentStep === 4
                  ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                  : 'bg-green-500 text-white hover:bg-green-600',
              ]"
              @click="currentStep++"
            >
              다음 단계 →
            </button>
          </div>

          <!-- 초기화 버튼 -->
          <div>
            <button
              class="rounded bg-red-500 px-4 py-2 font-medium text-white transition-colors hover:bg-red-600"
              @click="currentStep = 1"
            >
              초기화
            </button>
          </div>
        </div>
      </div>

      <!-- 설명 -->
      <div class="mt-8 rounded-lg bg-blue-50 p-6">
        <h3 class="mb-2 font-semibold text-blue-900">
          테스트 방법
        </h3>
        <ul class="space-y-1 text-sm text-blue-800">
          <li>• 위의 "단계 1~4" 버튼을 클릭하여 직접 단계를 선택할 수 있습니다</li>
          <li>• "이전/다음 단계" 버튼으로 순차적으로 이동할 수 있습니다</li>
          <li>
            • 활성 단계는 파란색, 완료된 단계는 초록색, 미완료 단계는 회색으로
            표시됩니다
          </li>
          <li>• 연결선도 완료 상태에 따라 색상이 변경됩니다</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import StepIndicator from '@/components/schedule/StepIndicator.vue';

const currentStep = ref(1);
</script>
