<script setup lang="ts">
import HelloWorld from './components/HelloWorld.vue'
import { NButton, NSpace } from 'naive-ui'
</script>

<template>
  <div>
    <a href="https://vite.dev" target="_blank">
      <img src="/vite.svg" class="logo" alt="Vite logo" />
    </a>
    <a href="https://vuejs.org/" target="_blank">
      <img src="./assets/vue.svg" class="logo vue" alt="Vue logo" />
    </a>
  </div>
  <HelloWorld msg="Vite + Vue" />

  <!-- Test Tailwind CSS and Naive UI -->
  <div class="mt-8 p-4 bg-blue-100 rounded-lg">
    <p class="text-blue-600 font-bold mb-4">Tailwind CSS Test: This text should be blue and bold</p>
    <NSpace>
      <NButton type="primary">Naive UI Primary Button</NButton>
      <NButton type="success">Naive UI Success Button</NButton>
    </NSpace>
  </div>

  <!-- Test Shift Colors -->
  <div class="mt-8 p-4 border-2 border-gray-300 rounded-lg">
    <p class="text-gray-800 font-bold mb-4">시프트 색상 테스트 (Shift Colors Test)</p>
    <div class="grid grid-cols-4 gap-4">
      <div class="text-center">
        <div class="bg-shift-day h-20 rounded-lg mb-2"></div>
        <p class="text-sm font-semibold">D (Day)</p>
        <p class="text-xs text-gray-500">#92D050</p>
      </div>
      <div class="text-center">
        <div class="bg-shift-evening h-20 rounded-lg mb-2"></div>
        <p class="text-sm font-semibold">E (Evening)</p>
        <p class="text-xs text-gray-500">#FFC000</p>
      </div>
      <div class="text-center">
        <div class="bg-shift-night h-20 rounded-lg mb-2"></div>
        <p class="text-sm font-semibold">N (Night)</p>
        <p class="text-xs text-gray-500">#4472C4</p>
      </div>
      <div class="text-center">
        <div class="bg-shift-off h-20 rounded-lg mb-2"></div>
        <p class="text-sm font-semibold">O (Off)</p>
        <p class="text-xs text-gray-500">#D9D9D9</p>
      </div>
    </div>
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
