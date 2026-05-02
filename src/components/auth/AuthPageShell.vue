<template>
  <main
    data-test="auth-shell-root"
    :class="rootClasses"
  >
    <div class="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-3xl flex-col justify-center gap-8">
      <section class="space-y-5 text-center">
        <p class="text-sm font-semibold text-teal-700">
          {{ eyebrow }}
        </p>
        <div class="space-y-3">
          <p
            data-test="auth-shell-product"
            class="text-4xl font-bold leading-tight sm:text-5xl"
          >
            EveryShift
          </p>
          <h1
            data-test="auth-shell-title"
            class="text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl"
          >
            {{ title }}
          </h1>
          <p
            data-test="auth-shell-description"
            class="mx-auto max-w-2xl text-base leading-7 text-slate-600 sm:text-lg"
          >
            {{ description }}
          </p>
        </div>
      </section>

      <div class="w-full">
        <slot />
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  eyebrow: string
  title: string
  description: string
  variant?: 'default' | 'compact'
}>(), {
  variant: 'default',
})

const rootClasses = computed(() => [
  'min-h-screen px-5 text-slate-950 sm:px-6 lg:px-8',
  props.variant === 'compact' ? 'bg-white py-8' : 'bg-slate-50 py-10',
])
</script>
