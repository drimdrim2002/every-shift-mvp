<script setup lang="ts">
import { computed } from 'vue'
import mainLogo from '@/assets/brand/main_logo.png'
import solidLogo from '@/assets/brand/solid_log.png'

const props = withDefaults(defineProps<{
  size?: 'sm' | 'md'
  alt?: string
}>(), {
  size: 'sm',
  alt: 'everyshift',
})

const imageClass = computed(() => {
  if (props.size === 'md') {
    return 'h-9 w-auto max-w-[160px] object-contain'
  }

  return 'h-8 w-auto object-contain'
})
</script>

<template>
  <picture>
    <source
      :srcset="solidLogo"
      media="(prefers-color-scheme: dark)"
    >
    <img
      data-test="brand-logo"
      :src="mainLogo"
      :alt="alt"
      :class="imageClass"
      class="brand-logo-image"
    >
  </picture>
</template>

<style scoped>
.brand-logo-image {
  color-scheme: only light;
}
</style>
