<template>
  <header
    data-test="public-header"
    class="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur [color-scheme:light]"
  >
    <div
      class="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8"
    >
      <RouterLink
        :to="PUBLIC_ROOT_ROUTE_PATH"
        class="flex shrink-0 items-center"
      >
        <BrandLogo
          size="sm"
          alt=""
        />
        <span class="sr-only">EveryShift</span>
      </RouterLink>

      <nav
        aria-label="공개 페이지 메뉴"
        class="flex min-w-0 items-center justify-end gap-1 sm:gap-2"
      >
        <RouterLink
          data-test="public-header-login"
          :to="LOGIN_ROUTE_PATH"
          class="whitespace-nowrap rounded-md px-1.5 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-100 hover:text-gray-950 sm:px-3 sm:text-sm"
        >
          로그인
        </RouterLink>
        <RouterLink
          data-test="public-header-signup"
          :to="signupRouteLocation"
          class="whitespace-nowrap rounded-md px-1.5 py-2 text-xs font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-950 sm:px-3 sm:text-sm"
        >
          회원 가입
        </RouterLink>
        <a
          data-test="public-header-inquiry"
          :href="inquiryFormUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex whitespace-nowrap rounded-md bg-gray-950 px-1.5 py-2 text-xs font-semibold text-white transition hover:bg-gray-800 sm:px-3 sm:text-sm"
        >
          도입 문의
        </a>
      </nav>
    </div>
  </header>
</template>

<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import BrandLogo from '@/components/brand/BrandLogo.vue'
import { getPublicInquiryFormUrl } from '@/config/publicInquiry'
import {
  LOGIN_ROUTE_PATH,
  PUBLIC_ROOT_ROUTE_PATH,
  SIGNUP_ROUTE_PATH,
} from '@/constants/routes'

const signupRouteLocation: RouteLocationRaw = {
  path: SIGNUP_ROUTE_PATH,
  query: { role: 'admin' },
}

const inquiryFormUrl = getPublicInquiryFormUrl()
</script>
