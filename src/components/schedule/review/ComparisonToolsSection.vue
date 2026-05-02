<script setup lang="ts">
defineProps<{
  collapsed: boolean
  candidateCount: number
  compareCount: number
}>()

const emit = defineEmits<{
  (event: 'toggle-collapsed'): void
}>()
</script>

<template>
  <section
    data-test="comparison-tools-section"
    class="mb-6 rounded-2xl border border-slate-200 bg-white p-4"
  >
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p class="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
          근무표안 비교
        </p>
        <h3 class="text-base font-semibold text-slate-900">
          여러 안을 나란히 비교해 보세요
        </h3>
        <p
          v-if="collapsed"
          class="mt-1 text-sm text-slate-600"
        >
          후보 {{ candidateCount }}개, 비교 중 {{ compareCount }}개
        </p>
        <p
          v-else
          class="mt-1 text-sm text-slate-600"
        >
          비교 후보와 비교 영역을 보고, 필요한 경우 잠시 숨길 수 있습니다.
        </p>
      </div>

      <button
        data-test="comparison-tools-toggle"
        type="button"
        class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        @click="emit('toggle-collapsed')"
      >
        {{ collapsed ? '다시 보기' : '숨기기' }}
      </button>
    </div>

    <div
      v-if="!collapsed"
      data-test="comparison-tools-body"
      class="mt-6"
    >
      <slot />
    </div>
  </section>
</template>
