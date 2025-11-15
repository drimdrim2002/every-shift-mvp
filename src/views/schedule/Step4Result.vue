<template>
  <div class="p-6">
    <h1 class="mb-4 text-2xl font-bold">
      Step 4: 결과 확인
    </h1>
    <p class="text-gray-600">
      결과 확인 페이지 (구현 예정)
    </p>
    <p class="mt-2 text-sm text-gray-500">
      Schedule ID: {{ scheduleId }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router';

const route = useRoute();
const scheduleId = route.params.id;

// TODO: Step 4 기능 구현
</script>
