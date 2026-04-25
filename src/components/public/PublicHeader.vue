<template>
  <header
    data-test="public-header"
    class="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur"
  >
    <div
      class="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8"
    >
      <RouterLink
        :to="PUBLIC_ROOT_ROUTE_PATH"
        class="flex shrink-0 items-center"
      >
        <img
          :src="mainLogo"
          alt=""
          class="h-8 w-auto"
        >
        <span class="sr-only">EveryShift</span>
      </RouterLink>

      <nav
        aria-label="공개 페이지 메뉴"
        class="flex min-w-0 items-center justify-end gap-2"
      >
        <RouterLink
          data-test="public-header-login"
          :to="LOGIN_ROUTE_PATH"
          class="rounded-md px-2.5 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 hover:text-gray-950 sm:px-3"
        >
          로그인
        </RouterLink>
        <RouterLink
          data-test="public-header-signup"
          :to="signupRouteLocation"
          class="rounded-md px-2.5 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-950 sm:px-3"
        >
          회원 가입
        </RouterLink>
        <a
          data-test="public-header-inquiry"
          href="#inquiry"
          class="inline-flex rounded-md bg-gray-950 px-2.5 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 sm:px-3"
        >
          도입 문의
        </a>
      </nav>
    </div>
  </header>
</template>

<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import mainLogo from '@/assets/brand/main_logo.png'
import {
  LOGIN_ROUTE_PATH,
  PUBLIC_ROOT_ROUTE_PATH,
  SIGNUP_ROUTE_PATH,
} from '@/constants/routes'

const signupRouteLocation: RouteLocationRaw = {
  path: SIGNUP_ROUTE_PATH,
  query: { role: 'admin' },
}
</script>
