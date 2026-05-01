<template>
  <main class="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
    <div class="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl gap-8 lg:grid-cols-[0.9fr_1fr] lg:items-center">
      <section class="space-y-5">
        <p class="text-sm font-semibold text-teal-700">
          {{ eyebrow }}
        </p>
        <div class="space-y-3">
          <p class="text-3xl font-bold leading-tight sm:text-4xl">
            EveryShift
          </p>
          <h1 class="text-2xl font-semibold leading-tight text-slate-900 sm:text-3xl">
            {{ title }}
          </h1>
          <p class="max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
            {{ description }}
          </p>
        </div>
      </section>

      <section class="w-full">
        <slot />
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
defineProps<{
  eyebrow: string
  title: string
  description: string
}>()
</script>
