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
