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
    return 'brand-logo brand-logo--md h-10 w-auto object-contain object-center'
  }

  return 'brand-logo brand-logo--sm h-8 w-auto object-contain object-center'
})
</script>

<template>
  <img
    data-test="brand-logo"
    :src="mainLogo"
    :alt="alt"
    :class="imageClass"
    class="brand-logo-image block shrink-0"
    :aria-hidden="alt ? undefined : 'true'"
    decoding="async"
  >
</template>

<style scoped>
.brand-logo-image {
  color-scheme: only light;
  background-color: #ffffff;
  border-radius: 6px;
  padding: 2px 4px;
}

.brand-logo--md {
  max-height: 2.5rem;
}

.brand-logo--sm {
  max-height: 2rem;
}
</style>
