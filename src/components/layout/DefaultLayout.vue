<template>
  <n-layout
    has-sider
    class="h-screen"
  >
    <n-layout-sider
      bordered
      collapse-mode="width"
      :collapsed-width="64"
      :width="240"
      show-trigger
    >
      <Sidebar />
    </n-layout-sider>
    <n-layout>
      <n-layout-header
        bordered
        class="flex h-16 items-center px-6"
      >
        <Header />
      </n-layout-header>
      <n-layout-content class="p-6">
        <router-view />
      </n-layout-content>
    </n-layout>
  </n-layout>
</template>

<script setup lang="ts">
import { NLayout, NLayoutHeader, NLayoutSider, NLayoutContent } from 'naive-ui';
import Header from './Header.vue';
import Sidebar from './Sidebar.vue';
</script>
