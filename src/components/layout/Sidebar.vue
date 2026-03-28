<template>
  <div class="flex h-full flex-col">
    <div class="border-b p-4 text-center font-bold">
      메뉴
    </div>
    <n-menu
      :options="menuOptions"
      :default-value="currentRoute"
      @update:value="handleMenuClick"
    />
  </div>
</template>

<script setup lang="ts">
import { NMenu } from 'naive-ui'
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const router = useRouter()
const route = useRoute()

const menuOptions = ref([
  {
    label: '근무표 생성',
    key: '/schedule/step1',
  },
])

const currentRoute = computed(() => route.path)

function handleMenuClick(key: string) {
  router.push(key)
}
</script>
