<template>
  <header
    data-test="public-header"
    class="border-b border-gray-200 bg-white"
  >
    <div
      class="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 p-4 sm:px-6 lg:px-8"
    >
      <RouterLink
        :to="PUBLIC_ROOT_ROUTE_PATH"
        class="text-lg font-bold text-gray-950"
      >
        EveryShift
      </RouterLink>

      <nav
        aria-label="공개 페이지 메뉴"
        class="flex flex-wrap items-center justify-end gap-2"
      >
        <RouterLink
          data-test="public-header-login"
          :to="LOGIN_ROUTE_PATH"
          class="rounded-md px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 hover:text-gray-950"
        >
          로그인
        </RouterLink>
        <RouterLink
          data-test="public-header-signup"
          :to="signupRouteLocation"
          class="rounded-md border border-emerald-700 px-3 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50"
        >
          회원 가입
        </RouterLink>
        <a
          data-test="public-header-inquiry"
          href="#inquiry"
          class="rounded-md bg-gray-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-gray-800"
        >
          도입 문의
        </a>
      </nav>
    </div>
  </header>
</template>

<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
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
