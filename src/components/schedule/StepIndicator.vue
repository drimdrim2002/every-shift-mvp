<template>
  <div class="flex items-center justify-center gap-8 py-6">
    <template v-for="step in steps" :key="step.number">
      <div class="flex flex-col items-center">
        <div
          :class="getStepCircleClass(step.number)"
          class="flex size-10 items-center justify-center rounded-full font-bold"
        >
          {{ step.number }}
        </div>
        <div class="mt-2 text-sm" :class="getStepLabelClass(step.number)">
          {{ step.label }}
        </div>
      </div>

      <div
        v-if="step.number < steps.length"
        :class="getStepLineClass(step.number)"
        class="mx-4 h-1 w-16"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
interface Props {
  currentStep: number;
}

const props = defineProps<Props>();

const steps = [
  { number: 1, label: '기본 정보' },
  { number: 2, label: '사이트 정보' },
  { number: 3, label: '직원 정보' },
  { number: 4, label: '근무 제외 정보' },
  { number: 5, label: '결과 확인' },
];

function getStepCircleClass(stepNumber: number) {
  const isActive = stepNumber === props.currentStep;
  const isCompleted = stepNumber < props.currentStep;

  if (isActive) {
    return 'bg-blue-600 text-white';
  } else if (isCompleted) {
    return 'bg-green-500 text-white';
  } else {
    return 'bg-gray-300 text-gray-600';
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
