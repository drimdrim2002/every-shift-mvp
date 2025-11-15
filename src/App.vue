<script setup lang="ts">
import HelloWorld from './components/HelloWorld.vue';
import { NButton, NSpace } from 'naive-ui';
import { useGlobalMessage } from '@/composables/useGlobalMessage';
import { supabase } from '@/api/supabase';
import { onMounted } from 'vue';

// Naive UI 전역 메시지 API 사용
// useGlobalMessage composable로 안전하게 래핑됨
const { success, error, warning, info } = useGlobalMessage();

// Supabase 연결 테스트
onMounted(async () => {
  const { data, error: supabaseError } = await supabase.from('organizations').select('*');

  if (supabaseError) {
    console.error('Supabase connection error:', supabaseError);
    error(`Supabase 연결 실패: ${supabaseError.message}`);
  } else {
    console.log('Supabase connected! Organizations:', data);
    success(`Supabase 연결 성공! ${data?.length || 0}개 조직 조회됨`);
  }
});

// 테스트용 메서드들
const showSuccess = () => {
  success('성공 메시지!');
};

const showError = () => {
  error('에러 메시지!');
};

const showWarning = () => {
  warning('경고 메시지!');
};

const showInfo = () => {
  info('정보 메시지!');
};
</script>

<template>
  <div>
    <a
      href="https://vite.dev"
      target="_blank"
    >
      <img
        src="/vite.svg"
        class="logo"
        alt="Vite logo"
      >
    </a>
    <a
      href="https://vuejs.org/"
      target="_blank"
    >
      <img
        src="./assets/vue.svg"
        class="logo vue"
        alt="Vue logo"
      >
    </a>
  </div>
  <HelloWorld msg="Vite + Vue" />

  <!-- Test Tailwind CSS and Naive UI -->
  <div class="mt-8 rounded-lg bg-blue-100 p-4">
    <p class="mb-4 font-bold text-blue-600">
      Tailwind CSS Test: This text should be blue and bold
    </p>
    <NSpace>
      <NButton type="primary">
        Naive UI Primary Button
      </NButton>
      <NButton type="success">
        Naive UI Success Button
      </NButton>
    </NSpace>
  </div>

  <!-- Test Shift Colors -->
  <div class="mt-8 rounded-lg border-2 border-gray-300 p-4">
    <p class="mb-4 font-bold text-gray-800">
      시프트 색상 테스트 (Shift Colors Test)
    </p>
    <div class="grid grid-cols-4 gap-4">
      <div class="text-center">
        <div class="mb-2 h-20 rounded-lg bg-shift-day" />
        <p class="text-sm font-semibold">
          D (Day)
        </p>
        <p class="text-xs text-gray-500">
          #92D050
        </p>
      </div>
      <div class="text-center">
        <div class="mb-2 h-20 rounded-lg bg-shift-evening" />
        <p class="text-sm font-semibold">
          E (Evening)
        </p>
        <p class="text-xs text-gray-500">
          #FFC000
        </p>
      </div>
      <div class="text-center">
        <div class="mb-2 h-20 rounded-lg bg-shift-night" />
        <p class="text-sm font-semibold">
          N (Night)
        </p>
        <p class="text-xs text-gray-500">
          #4472C4
        </p>
      </div>
      <div class="text-center">
        <div class="mb-2 h-20 rounded-lg bg-shift-off" />
        <p class="text-sm font-semibold">
          O (Off)
        </p>
        <p class="text-xs text-gray-500">
          #D9D9D9
        </p>
      </div>
    </div>
  </div>

  <!-- Test Global Message -->
  <div class="mt-8 rounded-lg border-2 border-green-300 bg-green-50 p-4">
    <p class="mb-4 font-bold text-green-800">
      Naive UI Global Message 테스트
    </p>
    <NSpace>
      <NButton @click="showSuccess">
        Success Message
      </NButton>
      <NButton @click="showError">
        Error Message
      </NButton>
      <NButton @click="showWarning">
        Warning Message
      </NButton>
      <NButton @click="showInfo">
        Info Message
      </NButton>
    </NSpace>
  </div>
</template>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>
