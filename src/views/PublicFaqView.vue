<template>
  <div class="min-h-screen bg-gray-50 text-gray-950 [color-scheme:only_light]">
    <PublicHeader />

    <main class="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <!-- Header Title Section -->
      <div class="mb-16 text-center">
        <p class="text-sm font-semibold uppercase tracking-wider text-emerald-700">
          자주 묻는 질문 (FAQ)
        </p>
        <h1 class="mt-3 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
          everyshift는 무엇이 다를까요?
        </h1>
        <p class="mx-auto mt-4 max-w-2xl break-keep text-base text-gray-500">
          단순한 스케줄 생성을 넘어 병원 운영의 표준을 제시합니다. 기존 방식 및 타사 솔루션 대비 everyshift가 가진 차별화된 핵심 강점을 확인해보세요.
        </p>
      </div>

      <!-- FAQ Accordion Section -->
      <div class="mb-20 space-y-4">
        <div
          v-for="(faq, index) in faqItems"
          :key="index"
          class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all duration-300"
          :class="{'border-transparent ring-2 ring-emerald-500': activeIndex === index}"
        >
          <button
            class="flex w-full items-center justify-between gap-4 px-6 py-5 text-left font-medium text-gray-900 transition-colors hover:bg-gray-50/50 focus:outline-none"
            :aria-expanded="activeIndex === index"
            @click="toggleFaq(index)"
          >
            <span class="break-keep text-base font-bold leading-7 text-gray-900 sm:text-lg">
              <span class="mr-2 text-emerald-600">Q.</span> {{ faq.question }}
            </span>
            <span class="ml-2 shrink-0">
              <svg
                class="size-5 text-gray-400 transition-transform duration-300"
                :class="{'rotate-180 text-emerald-600': activeIndex === index}"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </span>
          </button>

          <div
            class="overflow-hidden transition-all duration-300 ease-in-out"
            :style="{ maxHeight: activeIndex === index ? '500px' : '0px' }"
          >
            <div class="whitespace-pre-line break-keep border-t border-gray-100 px-6 pb-6 pt-2 text-sm leading-7 text-gray-600 sm:text-base">
              <div class="flex gap-2">
                <span class="font-bold text-emerald-600">A.</span>
                <div>{{ faq.answer }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Core Strengths Comparison Section -->
      <div class="mb-20">
        <h2 class="mb-8 text-center text-2xl font-bold text-gray-900">
          한눈에 보는 비교 (기존 방식 vs everyshift)
        </h2>
        <div class="grid gap-6 md:grid-cols-2">
          <!-- 기존 방식 -->
          <div class="flex flex-col justify-between rounded-2xl border border-gray-200 bg-gray-100/70 p-6 sm:p-8">
            <div>
              <div class="mb-6 flex items-center gap-3">
                <span class="rounded-lg bg-gray-200 p-2 text-gray-600">
                  <svg
                    class="size-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </span>
                <div>
                  <h3 class="text-lg font-bold text-gray-800">
                    기존 방식
                  </h3>
                  <p class="text-xs text-gray-500">
                    엑셀 수작업 또는 표면적인 단순 AI
                  </p>
                </div>
              </div>

              <ul class="space-y-4">
                <li
                  v-for="(item, i) in comparisonList"
                  :key="i"
                  class="flex gap-3 text-sm leading-6 text-gray-600"
                >
                  <span class="mt-1 shrink-0 text-red-500">✕</span>
                  <div class="break-keep">
                    <strong class="font-semibold text-gray-800">{{ item.title }}</strong>: {{ item.legacy }}
                  </div>
                </li>
              </ul>
            </div>

            <div class="mt-8 border-t border-gray-200 pt-6">
              <p class="break-keep text-xs leading-relaxed text-gray-500">
                * 10초 내 생성을 내세우지만 결국 수작업 보정이 필수적이고, 근무 배정의 장기적인 형평성이 누락되기 쉽습니다.
              </p>
            </div>
          </div>

          <!-- everyshift -->
          <div class="flex flex-col justify-between rounded-2xl border-2 border-emerald-500 bg-emerald-50/50 p-6 shadow-md shadow-emerald-100 sm:p-8">
            <div>
              <div class="mb-6 flex items-center gap-3">
                <span class="rounded-lg bg-emerald-500 p-2 text-white">
                  <svg
                    class="size-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </span>
                <div>
                  <h3 class="text-lg font-bold text-emerald-900">
                    everyshift
                  </h3>
                  <p class="text-xs font-semibold text-emerald-700">
                    진짜 현장을 아는 최적화 엔진
                  </p>
                </div>
              </div>

              <ul class="space-y-4">
                <li
                  v-for="(item, i) in comparisonList"
                  :key="i"
                  class="flex gap-3 text-sm leading-6 text-gray-700"
                >
                  <span class="mt-1 shrink-0 text-emerald-600">✓</span>
                  <div class="break-keep">
                    <strong class="font-bold text-emerald-900">{{ item.title }}</strong>: {{ item.everyshift }}
                  </div>
                </li>
              </ul>
            </div>

            <div class="mt-8 border-t border-emerald-100 pt-6">
              <p class="break-keep text-xs font-semibold leading-relaxed text-emerald-800">
                * 수간호사님께 '수정 없는 완벽한 퇴근'을 선사하며, 누적 데이터를 통해 구성원 모두가 신뢰하는 장기적 공정성을 보장합니다.
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom CTA Banner Section -->
      <section class="rounded-2xl bg-gray-950 p-8 text-center text-white shadow-lg sm:p-12">
        <p class="text-sm font-semibold text-emerald-400">
          everyshift와 함께하는 업무 효율화
        </p>
        <h2 class="mt-4 break-keep text-2xl font-bold leading-snug sm:text-3xl">
          복잡한 근무표 스트레스,<br class="sm:hidden"> 이제 완전히 끝내세요
        </h2>
        <p class="mx-auto mt-4 max-w-2xl break-keep text-sm leading-relaxed text-gray-300 sm:text-base">
          10년 차 전문가의 노하우가 담긴 최적화 엔진으로 수간호사님께 완벽한 퇴근을 선물해 드립니다. 지금 무료 베타 서비스로 체험해 보세요.
        </p>
        <div class="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <RouterLink
            :to="signupRouteLocation"
            class="inline-flex w-full items-center justify-center rounded-md bg-emerald-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 sm:w-auto"
          >
            회원 가입
          </RouterLink>
          <a
            :href="inquiryFormUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex w-full items-center justify-center rounded-md border border-gray-700 bg-gray-900 px-6 py-3 text-sm font-semibold text-gray-300 transition hover:bg-gray-800 hover:text-white sm:w-auto"
          >
            도입 문의
          </a>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import PublicHeader from '@/components/public/PublicHeader.vue'
import { getPublicInquiryFormUrl } from '@/config/publicInquiry'
import { SIGNUP_ROUTE_PATH } from '@/constants/routes'
import { faqSeoMeta } from '@/seo/siteMeta'
import { usePublicRouteSeo } from '@/seo/usePublicRouteSeo'

usePublicRouteSeo(faqSeoMeta)

const signupRouteLocation: RouteLocationRaw = {
  path: SIGNUP_ROUTE_PATH,
  query: { role: 'admin' },
}

const inquiryFormUrl = getPublicInquiryFormUrl()

const activeIndex = ref<number | null>(null)

function toggleFaq(index: number) {
  if (activeIndex.value === index) {
    activeIndex.value = null
  }
  else {
    activeIndex.value = index
  }
}

const faqItems = [
  {
    question: '기존의 자동 스케줄링 솔루션들은 왜 결국 수작업으로 다시 고쳐야 하나요? \'everyshift\'는 무엇이 다른가요?',
    answer: `기존 솔루션들의 가장 큰 한계는 단순히 '신청 오프(휴무)' 날짜를 기계적으로 맞추는 데만 치중한다는 점입니다. 하지만 간호 현장에서의 휴식은 단순히 쉬는 날의 숫자가 아니라 '삶의 질(Quality of Life)'과 직결되는 디테일에 있습니다.

예를 들어, 월요일 휴무를 신청한 직원에게 일요일 야간 근무(나이트)를 배정한다면, 해당 직원은 월요일 아침에 퇴근하여 잠만 자다 휴일을 보내게 됩니다. 이는 진정한 의미의 휴식이라 볼 수 없습니다.

'everyshift'는 이러한 현장의 디테일을 알고리즘의 핵심 로직으로 포함했습니다. "일요일 나이트 후 월요일 오프 배제"와 같은 상식적이고 구체적인 조건을 완벽히 준수함으로써, 수간호사님의 별도 수정 없이 당장 사용 가능한 결과물을 도출하여 실질적인 업무 효율화를 실현합니다.`,
  },
  {
    question: '한 달 단위의 배분을 넘어, 장기적인 관점에서의 공정성은 어떻게 보장하나요?',
    answer: `간호 업무의 특성상 특정 달에 야간 근무나 주말 근무가 집중되는 인원이 발생할 수밖에 없습니다. 단기적인 한 달 스케줄만으로는 완벽한 형평성을 맞추기 어렵습니다. 'everyshift'는 이를 해결하기 위해 데이터를 정량화하여 관리하는 장기적 공정성 메커니즘을 도입했습니다.

시스템은 1년 단위의 데이터를 축적하며 각 직원의 근무 이력을 추적합니다. 만약 특정 직원이 지난달에 고된 근무를 수행하며 희생했다면, 시스템은 이를 데이터로 기억하고 이번 달 스케줄링 시 해당 직원에게 적절한 배려(Benefit)를 우선적으로 할당합니다.

이는 수작업으로는 계산하기 힘든 복잡한 보상 체계를 10년 차 SCM 및 물류 최적화 전문가의 노하우로 시스템화한 결과입니다. 모든 직원의 노고를 잊지 않고 챙기는 꼼꼼한 수간호사님의 마음을 담은 시스템이 구성원 모두가 납득할 수 있는 공정성을 제공합니다.`,
  },
  {
    question: '\'10초 완성\'을 강조하는 다른 솔루션들과 비교했을 때, \'everyshift\' 알고리즘은 어떤 기술적 우위가 있나요?',
    answer: `간호사 근무 배정은 수학적으로 수만 가지의 제약 조건을 동시에 만족시켜야 하는 고난도의 최적화 문제(NP-hard)입니다. 시중의 일부 솔루션들이 내세우는 '표면적인 신속함'은 전체적인 조화를 고려하지 않은 단순 로직이나 꼼수를 사용한 결과인 경우가 많습니다.

'everyshift'는 대기업에서 활동한 10년 차 SCM 및 물류 최적화 전문가가 직접 설계한 독보적인 엔진을 탑재했습니다. 단순히 속도에만 치중하지 않고, 시간이 조금 더 소요되더라도 모든 경우의 수를 정밀하게 검토하여 실질적인 완성도가 극대화된 해답을 찾아냅니다.

단순히 빠른 결과보다 중요한 것은 현장 구성원 모두가 신뢰할 수 있는 '최적의 해답'입니다. 'everyshift'는 묵직한 전문 엔진을 통해 현장의 혼란을 최소화하고 운영의 안정성을 보장합니다.`,
  },
]

const comparisonList = [
  {
    title: '현장 디테일',
    legacy: '단순 신청 오프만 반영하여 실제 근무 스케줄은 수작업 보정이 필수적입니다.',
    everyshift: '현장의 상식과 휴식의 질(예: 일요일 N 후 월요일 OFF 방지 등)까지 고려한 완전한 결과물을 도출합니다.',
  },
  {
    title: '공정성 기준',
    legacy: '당월 기준의 단기적이고 단편적인 배분으로 인하여 누락이나 형평성 어긋남이 빈번하게 발생합니다.',
    everyshift: '누적 데이터를 통해 연간 단위로 장기적인 공정성을 유지하고 고된 근무자에 대한 보상(Benefit)을 체계적으로 관리합니다.',
  },
  {
    title: '엔진의 전문성',
    legacy: '조화롭지 못하고 꼼수를 사용한 단순 로직으로, 표면적인 10초대 생성 속도에만 집중합니다.',
    everyshift: '대기업 출신 10년 차 SCM 및 물류 최적화 전문가가 정밀 설계하여 고난도의 제약 조건들을 완벽히 해소하는 전문 엔진을 활용합니다.',
  },
]
</script>
