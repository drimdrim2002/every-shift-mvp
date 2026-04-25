<template>
  <div
    data-test="public-landing"
    class="min-h-screen bg-white text-gray-950"
  >
    <PublicHeader />

    <main>
      <section
        data-test="public-hero"
        class="border-b border-gray-200 bg-white"
      >
        <div class="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
          <div class="mx-auto max-w-4xl text-center">
            <p class="text-sm font-semibold text-emerald-700">
              {{ publicLandingHero.kicker }}
            </p>
            <h1
              data-test="public-hero-slogan"
              class="mt-5 flex flex-col items-center gap-y-[0.18em] text-4xl font-bold leading-none text-gray-950 sm:text-5xl lg:text-6xl"
            >
              <span
                v-for="line in publicLandingHero.sloganLines"
                :key="line"
                data-test="public-hero-slogan-line"
                class="block"
              >
                {{ line }}
              </span>
            </h1>
            <p
              data-test="public-hero-body"
              class="mx-auto mt-6 max-w-3xl whitespace-pre-line text-base leading-7 text-gray-600 sm:text-lg"
            >
              {{ publicLandingHero.body }}
            </p>
            <div class="mt-7 flex flex-wrap items-center justify-center gap-3">
              <RouterLink
                data-test="public-hero-signup"
                :to="signupRouteLocation"
                class="rounded-md bg-gray-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
              >
                회원 가입
              </RouterLink>
              <a
                data-test="public-hero-inquiry"
                :href="inquiryFormUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="rounded-md border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-800 transition hover:border-gray-400 hover:bg-gray-50"
              >
                도입 문의
              </a>
            </div>
          </div>

          <div class="mx-auto mt-8 max-h-44 w-full max-w-5xl overflow-hidden rounded-lg sm:max-h-56 lg:max-h-60">
            <LandingProductPreview variant="overview" />
          </div>
        </div>
      </section>

      <section
        v-for="(section, index) in publicLandingSections"
        :id="section.id"
        :key="section.id"
        data-test="public-value-section"
        class="scroll-mt-20 border-b border-gray-200"
        :class="index % 2 === 0 ? 'bg-white' : 'bg-gray-50'"
      >
        <div class="mx-auto grid w-full max-w-6xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-8 lg:py-20">
          <div class="min-w-0">
            <p class="text-sm font-semibold text-emerald-700">
              {{ section.navLabel }}
            </p>
            <h2 class="mt-4 max-w-2xl text-3xl font-bold leading-tight text-gray-950 sm:text-4xl">
              {{ section.headline }}
            </h2>
            <p class="mt-5 max-w-2xl text-base leading-7 text-gray-600">
              {{ section.description }}
            </p>
            <ul class="mt-6 grid gap-3">
              <li
                v-for="detail in section.details"
                :key="detail"
                class="flex items-start gap-3 text-sm leading-6 text-gray-700"
              >
                <span class="mt-2 size-1.5 shrink-0 rounded-full bg-emerald-600" />
                <span>{{ detail }}</span>
              </li>
            </ul>
          </div>

          <LandingProductPreview :variant="section.preview" />
        </div>
      </section>

      <section
        id="inquiry"
        data-test="public-inquiry-section"
        class="scroll-mt-20 bg-gray-950 text-white"
      >
        <div class="mx-auto grid w-full max-w-6xl gap-6 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-center lg:px-8">
          <div>
            <p class="text-sm font-semibold text-emerald-300">
              EveryShift 공개 베타
            </p>
            <h2 class="mt-3 text-3xl font-bold">
              도입 문의
            </h2>
            <p class="mt-4 max-w-3xl text-sm leading-6 text-gray-300 sm:text-base">
              EveryShift에 관심이 있으시다면 언제든지 연락주세요.
              2026년까지 베타 버전으로 무료로 서비스를 제공합니다.
            </p>
          </div>
          <div class="flex flex-wrap gap-3 lg:justify-end">
            <a
              data-test="public-bottom-inquiry"
              :href="inquiryFormUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="rounded-md bg-white px-5 py-3 text-sm font-semibold text-gray-950 transition hover:bg-gray-100"
            >
              도입 문의
            </a>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import PublicHeader from '@/components/public/PublicHeader.vue'
import LandingProductPreview from '@/components/public/LandingProductPreview.vue'
import { getPublicInquiryFormUrl } from '@/config/publicInquiry'
import { SIGNUP_ROUTE_PATH } from '@/constants/routes'
import { publicLandingHero, publicLandingSections } from '@/data/publicLandingContent'

const signupRouteLocation: RouteLocationRaw = {
  path: SIGNUP_ROUTE_PATH,
  query: { role: 'admin' },
}

const inquiryFormUrl = getPublicInquiryFormUrl()
</script>
