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
        <div class="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
          <div class="mx-auto max-w-4xl text-center">
            <p class="text-sm font-semibold text-emerald-700">
              {{ publicLandingHero.kicker }}
            </p>
            <h1
              data-test="public-hero-slogan"
              class="mt-5 flex flex-col items-center gap-y-[0.28em] text-3xl font-bold leading-none text-gray-950 sm:text-5xl lg:text-6xl"
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
              class="mx-auto mt-5 max-w-3xl whitespace-pre-line break-keep text-sm leading-6 text-gray-600 sm:mt-6 sm:text-lg sm:leading-7"
            >
              {{ publicLandingHero.body }}
            </p>
            <div class="mt-6 grid grid-cols-2 items-center justify-center gap-3 sm:mt-7 sm:flex sm:flex-wrap">
              <RouterLink
                data-test="public-hero-signup"
                :to="signupRouteLocation"
                class="inline-flex min-h-11 items-center justify-center rounded-md bg-gray-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
              >
                회원 가입
              </RouterLink>
              <a
                data-test="public-hero-inquiry"
                :href="inquiryFormUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex min-h-11 items-center justify-center rounded-md border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-800 transition hover:border-gray-400 hover:bg-gray-50"
              >
                도입 문의
              </a>
            </div>
          </div>
        </div>
      </section>

      <section
        v-for="(section, index) in visiblePublicLandingSections"
        :id="section.id"
        :key="section.id"
        :ref="(element) => setSectionRef(section.id, element)"
        data-test="public-value-section"
        class="scroll-mt-16 border-b border-gray-200 sm:scroll-mt-20"
        :class="index % 2 === 0 ? 'bg-white' : 'bg-gray-50'"
      >
        <div class="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-9 sm:gap-8 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
          <div
            data-test="public-value-section-copy"
            class="min-w-0 max-w-4xl"
            :class="getTextRevealClasses(section.id)"
          >
            <p
              data-test="public-value-section-nav-label"
              class="text-sm font-semibold text-emerald-900 sm:text-2xl"
            >
              {{ section.navLabel }}
            </p>
            <h2 class="mt-3 max-w-4xl break-keep text-xl font-bold leading-tight text-gray-950 sm:mt-4 sm:text-4xl">
              {{ section.headline }}
            </h2>
            <p
              data-test="public-value-section-description"
              class="mt-3 max-w-4xl whitespace-pre-line break-keep text-sm leading-6 text-gray-600 sm:mt-5 sm:text-base sm:leading-7"
            >
              {{ section.description }}
            </p>
          </div>

          <div
            data-test="public-value-section-preview"
            class="w-full"
            :class="[getMobilePreviewClasses(section.preview), getPreviewRevealClasses(section.id)]"
          >
            <LandingProductPreview :variant="section.preview" />
          </div>
        </div>
      </section>

      <section
        id="inquiry"
        data-test="public-inquiry-section"
        class="scroll-mt-16 bg-gray-950 text-white sm:scroll-mt-20"
      >
        <div class="mx-auto grid w-full max-w-6xl gap-6 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[1fr_auto] lg:items-center lg:px-8">
          <div>
            <p class="text-sm font-semibold text-emerald-300">
              EveryShift 공개 베타
            </p>
            <h2 class="mt-3 text-2xl font-bold sm:text-3xl">
              도입 문의
            </h2>
            <p class="mt-4 max-w-3xl break-keep text-sm leading-6 text-gray-300 sm:text-base">
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
              class="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-white px-5 py-3 text-sm font-semibold text-gray-950 transition hover:bg-gray-100 sm:w-auto"
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
import { onBeforeUnmount, onMounted, ref, type ComponentPublicInstance } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import PublicHeader from '@/components/public/PublicHeader.vue'
import LandingProductPreview from '@/components/public/LandingProductPreview.vue'
import { getPublicInquiryFormUrl } from '@/config/publicInquiry'
import { SIGNUP_ROUTE_PATH } from '@/constants/routes'
import {
  publicLandingHero,
  publicLandingSections,
  type LandingPreviewVariant,
} from '@/data/publicLandingContent'

const signupRouteLocation: RouteLocationRaw = {
  path: SIGNUP_ROUTE_PATH,
  query: { role: 'admin' },
}

const inquiryFormUrl = getPublicInquiryFormUrl()
const visiblePublicLandingSections = publicLandingSections.filter((section) => section.preview !== 'compare')
const sectionRefs = new Map<string, Element>()
const visibleSectionIds = ref<Set<string>>(createVisibleSectionIds())
const isRevealEnabled = ref(false)
let sectionObserver: IntersectionObserver | null = null

function createVisibleSectionIds() {
  return new Set(visiblePublicLandingSections.map((section) => section.id))
}

function shouldReduceMotion() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function setSectionRef(id: string, element: Element | ComponentPublicInstance | null) {
  if (typeof Element !== 'undefined' && element instanceof Element) {
    sectionRefs.set(id, element)
    return
  }

  sectionRefs.delete(id)
}

function isSectionVisible(id: string) {
  return visibleSectionIds.value.has(id)
}

function getMobilePreviewClasses(preview: LandingPreviewVariant) {
  return preview === 'ai' ? 'block' : 'hidden sm:block'
}

function getTextRevealClasses(id: string) {
  if (!isRevealEnabled.value) {
    return ''
  }

  return [
    'transition-all duration-300 ease-out will-change-transform',
    isSectionVisible(id) ? 'translate-y-0 opacity-100 delay-0' : 'translate-y-3 opacity-0',
  ]
}

function getPreviewRevealClasses(id: string) {
  if (!isRevealEnabled.value) {
    return ''
  }

  return [
    'transition-all duration-300 ease-out will-change-transform',
    isSectionVisible(id) ? 'translate-y-0 opacity-100 delay-100' : 'translate-y-4 opacity-0',
  ]
}

onMounted(() => {
  if (
    typeof window === 'undefined'
    || shouldReduceMotion()
    || typeof window.IntersectionObserver === 'undefined'
  ) {
    return
  }

  let observer: IntersectionObserver | null = null

  try {
    observer = new window.IntersectionObserver((entries, activeObserver) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return
        }

        const id = entry.target.id
        visibleSectionIds.value = new Set(visibleSectionIds.value).add(id)
        activeObserver.unobserve(entry.target)
      })
    }, { threshold: 0.18 })

    sectionRefs.forEach((element) => {
      observer?.observe(element)
    })

    sectionObserver = observer
    isRevealEnabled.value = true
    visibleSectionIds.value = new Set()
  }
  catch {
    observer?.disconnect()
    sectionObserver = null
    isRevealEnabled.value = false
    visibleSectionIds.value = createVisibleSectionIds()
  }
})

onBeforeUnmount(() => {
  sectionObserver?.disconnect()
  sectionObserver = null
})
</script>
