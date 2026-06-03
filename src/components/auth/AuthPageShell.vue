<template>
  <main
    data-test="auth-shell-root"
    :class="rootClasses"
  >
    <div class="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-3xl flex-col justify-center gap-8">
      <section class="space-y-5 text-center">
        <p :class="eyebrowClasses">
          {{ eyebrow }}
        </p>
        <div class="space-y-3">
          <p
            data-test="auth-shell-product"
            :class="productClasses"
          >
            {{ productLabel }}
          </p>
          <h1
            data-test="auth-shell-title"
            :class="titleClasses"
          >
            {{ title }}
          </h1>
          <p
            data-test="auth-shell-description"
            :class="descriptionClasses"
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
  productLabel?: string
  title: string
  description: string
  variant?: 'default' | 'compact'
}>(), {
  productLabel: 'EveryShift',
  variant: 'default',
})

const rootClasses = computed(() => [
  'min-h-screen px-5 text-slate-950 [color-scheme:light] sm:px-6 lg:px-8',
  props.variant === 'compact' ? 'bg-white py-8' : 'bg-slate-50 py-10',
])

const eyebrowClasses = computed(() => [
  'font-semibold text-teal-700',
  props.variant === 'compact' ? 'text-base' : 'text-sm',
])

const productClasses = computed(() => [
  'font-bold leading-tight',
  props.variant === 'compact' ? 'text-2xl sm:text-3xl' : 'text-4xl sm:text-5xl',
])

const titleClasses = computed(() => [
  'font-semibold leading-tight text-slate-900',
  props.variant === 'compact' ? 'text-2xl sm:text-3xl' : 'text-3xl sm:text-4xl',
])

const descriptionClasses = computed(() => [
  'mx-auto max-w-2xl leading-7 text-slate-600',
  props.variant === 'compact' ? 'text-sm sm:text-base' : 'text-base sm:text-lg',
])
</script>
