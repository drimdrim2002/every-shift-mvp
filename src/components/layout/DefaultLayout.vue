<template>
  <n-layout class="h-screen">
    <n-layout-header
      bordered
      class="sticky top-0 z-20 flex h-16 items-center border-b border-gray-200 bg-white shadow-none"
    >
      <AppContainer
        data-test="app-shell-header-container"
        class="h-full"
      >
        <Header />
      </AppContainer>
    </n-layout-header>
    <n-layout-content
      class="h-[calc(100vh-4rem)] overflow-auto py-6"
    >
      <router-view />
    </n-layout-content>
  </n-layout>
</template>

<script setup lang="ts">
import { NLayout, NLayoutHeader, NLayoutContent } from 'naive-ui'
import AppContainer from './AppContainer.vue'
import Header from './Header.vue'
</script>
