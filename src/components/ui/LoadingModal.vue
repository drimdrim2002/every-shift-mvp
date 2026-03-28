<template>
  <n-modal
    :show="show"
    :mask-closable="false"
    title="근무표 생성 중"
    preset="card"
    style="width: 500px"
  >
    <div class="py-6 text-center">
      <n-spin size="large" />

      <p class="mt-6 text-lg font-semibold">
        {{ message }}
      </p>

      <div class="mt-4 text-sm text-gray-500">
        경과 시간: {{ elapsedTime }}초
      </div>

      <n-progress
        v-if="status === 'running'"
        type="line"
        :percentage="progress"
        status="info"
        class="mt-4"
      />

      <n-button
        class="mt-6"
        @click="handleCancel"
      >
        취소
      </n-button>
    </div>
  </n-modal>
</template>

<script setup lang="ts">
interface Props {
  show: boolean;
  status: string;
  message: string;
  elapsedTime: number;
  progress: number;
}

defineProps<Props>();

const emit = defineEmits<{
  cancel: [];
}>();

function handleCancel() {
  emit('cancel');
}
</script>
