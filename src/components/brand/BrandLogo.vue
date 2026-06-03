<script setup lang="ts">
import { computed } from 'vue'
import mainLogo from '@/assets/brand/main_logo.png'

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
  <img
    data-test="brand-logo"
    :src="mainLogo"
    :alt="alt"
    :class="imageClass"
    class="brand-logo-image"
  >
</template>

<style scoped>
.brand-logo-image {
  color-scheme: only light;
}
</style>
