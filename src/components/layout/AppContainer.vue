<template>
  <div :class="containerClass">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type AppContainerWidth = 'default' | 'full'

interface AppContainerProps {
  width?: AppContainerWidth
  padded?: boolean
}

const props = withDefaults(defineProps<AppContainerProps>(), {
  width: 'default',
  padded: true,
})

const containerClass = computed(() => [
  'mx-auto w-full',
  props.width === 'full' ? 'max-w-none' : 'max-w-7xl',
  props.padded ? 'px-4 sm:px-6 lg:px-8' : null,
])
</script>
