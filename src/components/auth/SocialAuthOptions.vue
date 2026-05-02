<template>
  <div
    data-test="social-auth-options"
    class="flex items-center justify-center gap-3"
  >
    <button
      data-test="social-auth-kakao"
      type="button"
      aria-label="카카오로 시작하기"
      :aria-busy="loadingProvider === 'kakao'"
      class="flex size-9 items-center justify-center !rounded-full !border-transparent bg-[#FEE500] !p-0 text-[#191919] shadow-sm transition hover:!border-transparent hover:bg-[#F4DB00] focus:outline-none focus:ring-2 focus:ring-[#FEE500] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      :disabled="isDisabled"
      @click="emit('start-social', 'kakao')"
    >
      <span
        v-if="loadingProvider === 'kakao'"
        class="size-5 animate-spin rounded-full border-2 border-[#191919]/20 border-t-[#191919]"
      />
      <svg
        v-else
        aria-hidden="true"
        class="block size-[22px]"
        viewBox="0 0 32 32"
      >
        <path
          fill="currentColor"
          d="M16 5C8.82 5 3 9.54 3 15.15c0 3.57 2.36 6.7 5.91 8.51l-1.17 4.31a.85.85 0 0 0 1.27.94l5.2-3.47c.58.07 1.18.1 1.79.1 7.18 0 13-4.54 13-10.15S23.18 5 16 5Z"
        />
      </svg>
    </button>

    <button
      data-test="social-auth-google"
      type="button"
      aria-label="Google로 시작하기"
      :aria-busy="loadingProvider === 'google'"
      class="flex size-9 items-center justify-center !rounded-full !border-slate-200 bg-white !p-0 shadow-sm transition hover:!border-slate-200 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      :disabled="isDisabled"
      @click="emit('start-social', 'google')"
    >
      <span
        v-if="loadingProvider === 'google'"
        class="size-5 animate-spin rounded-full border-2 border-slate-200 border-t-slate-700"
      />
      <svg
        v-else
        aria-hidden="true"
        class="block size-[22px]"
        viewBox="0 0 48 48"
      >
        <path
          fill="#EA4335"
          d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"
        />
        <path
          fill="#4285F4"
          d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65Z"
        />
        <path
          fill="#FBBC05"
          d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.97-6.19Z"
        />
        <path
          fill="#34A853"
          d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"
        />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { SocialAuthProviderId } from '@/types/auth'

const props = withDefaults(defineProps<{
  disabled?: boolean
  loadingProvider?: SocialAuthProviderId | null
}>(), {
  disabled: false,
  loadingProvider: null,
})

const emit = defineEmits<{
  'start-social': [provider: SocialAuthProviderId]
}>()

const isDisabled = computed(() => props.disabled || props.loadingProvider !== null)
</script>
