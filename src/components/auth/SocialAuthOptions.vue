<template>
  <div
    data-test="social-auth-options"
    class="space-y-3"
  >
    <NButton
      data-test="social-auth-kakao"
      block
      size="large"
      :disabled="isDisabled"
      :loading="loadingProvider === 'kakao'"
      @click="emit('start-social', 'kakao')"
    >
      카카오로 시작하기
    </NButton>

    <NButton
      data-test="social-auth-id"
      block
      size="large"
      :disabled="isDisabled"
      @click="emit('start-id')"
    >
      아이디로 시작하기
    </NButton>

    <div class="grid grid-cols-2 gap-3">
      <NButton
        data-test="social-auth-naver"
        block
        size="large"
        :disabled="isDisabled"
        :loading="loadingProvider === 'custom:naver'"
        @click="emit('start-social', 'custom:naver')"
      >
        Naver
      </NButton>

      <NButton
        data-test="social-auth-google"
        block
        size="large"
        :disabled="isDisabled"
        :loading="loadingProvider === 'google'"
        @click="emit('start-social', 'google')"
      >
        Google
      </NButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NButton } from 'naive-ui'
import type { SocialAuthProviderId } from '@/types/auth'

const props = withDefaults(defineProps<{
  disabled?: boolean
  loadingProvider?: SocialAuthProviderId | null
}>(), {
  disabled: false,
  loadingProvider: null,
})

const emit = defineEmits<{
  'start-id': []
  'start-social': [provider: SocialAuthProviderId]
}>()

const isDisabled = computed(() => props.disabled || props.loadingProvider !== null)
</script>
