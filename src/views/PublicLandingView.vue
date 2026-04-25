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
        <div
          class="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_440px] lg:px-8 lg:py-20"
        >
          <div class="flex flex-col justify-center">
            <p class="text-sm font-semibold text-emerald-700">
              EveryShift
            </p>
            <h1 class="mt-4 max-w-3xl text-4xl font-bold leading-tight text-gray-950 sm:text-5xl">
              간호사 근무표 생성을 더 빠르고 신뢰할 수 있게
            </h1>
            <p class="mt-5 max-w-2xl text-base leading-7 text-gray-600 sm:text-lg">
              EveryShift는 병동 운영자가 기본 정보, 사이트 조건, 직원 데이터를 입력하고 생성
              결과를 검토해 Excel로 내보낼 수 있는 근무표 생성 도구입니다.
            </p>
            <div class="mt-8 flex flex-wrap gap-3">
              <RouterLink
                data-test="public-hero-signup"
                :to="signupRouteLocation"
                class="rounded-md bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
              >
                회원 가입
              </RouterLink>
              <a
                data-test="public-hero-inquiry"
                href="#inquiry"
                class="rounded-md border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-100"
              >
                도입 문의
              </a>
            </div>
          </div>

          <div
            aria-hidden="true"
            class="rounded-lg border border-gray-200 bg-gray-50 p-4 shadow-sm"
          >
            <div class="rounded-md border border-gray-200 bg-white p-4">
              <div class="flex items-center justify-between border-b border-gray-200 pb-3">
                <div>
                  <div class="h-2 w-24 rounded bg-emerald-700" />
                  <div class="mt-2 h-2 w-36 rounded bg-gray-200" />
                </div>
                <div class="rounded-md bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                  공개 베타
                </div>
              </div>
              <div class="mt-4 grid grid-cols-6 gap-2">
                <div
                  v-for="day in previewDays"
                  :key="day"
                  class="rounded bg-gray-100 p-2 text-center text-xs font-semibold text-gray-600"
                >
                  {{ day }}
                </div>
                <template
                  v-for="row in previewRows"
                  :key="row.name"
                >
                  <div class="col-span-2 rounded bg-gray-100 p-2 text-xs font-medium text-gray-700">
                    {{ row.name }}
                  </div>
                  <div
                    v-for="shift in row.shifts"
                    :key="`${row.name}-${shift}`"
                    class="rounded p-2 text-center text-xs font-semibold"
                    :class="shiftClassMap[shift]"
                  >
                    {{ shift }}
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        data-test="public-workflow-summary"
        class="bg-gray-50"
      >
        <div class="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <h2 class="text-2xl font-bold text-gray-950">
            생성 흐름
          </h2>
          <div class="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div
              v-for="(label, index) in workflowLabels"
              :key="label"
              class="rounded-lg border border-gray-200 bg-white p-4"
            >
              <p class="text-sm font-semibold text-emerald-700">
                {{ index + 1 }}
              </p>
              <p class="mt-2 text-base font-semibold text-gray-950">
                {{ label }}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        data-test="public-trust-signals"
        class="border-y border-gray-200 bg-white"
      >
        <div class="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <h2 class="text-2xl font-bold text-gray-950">
            신뢰 기준
          </h2>
          <div class="mt-6 grid gap-4 md:grid-cols-3">
            <div
              v-for="signal in trustSignals"
              :key="signal.label"
              class="rounded-lg border border-gray-200 p-5"
            >
              <p class="text-base font-semibold text-gray-950">
                {{ signal.label }}
              </p>
              <p class="mt-2 text-sm leading-6 text-gray-600">
                {{ signal.description }}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        id="inquiry"
        data-test="public-inquiry-section"
        class="bg-emerald-950 text-white"
      >
        <div class="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <h2 class="text-2xl font-bold">
            도입 문의
          </h2>
          <p class="mt-4 max-w-3xl text-sm leading-6 text-emerald-50 sm:text-base">
            공개 베타 기간에는 실제 신청 흐름이 연결되기 전까지 이 영역을 도입 문의 안내
            지점으로 운영합니다. 현재 화면에서는 외부 신청 URL 없이 문의 위치를 확인할 수
            있습니다.
          </p>
        </div>
      </section>
    </main>

    <footer
      data-test="public-footer"
      class="border-t border-gray-200 bg-white"
    >
      <div
        class="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-gray-600 sm:px-6 lg:px-8"
      >
        <p class="font-semibold text-gray-950">
          EveryShift
        </p>
        <p>간호사 근무표 생성 공개 베타</p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import PublicHeader from '@/components/public/PublicHeader.vue'
import { SIGNUP_ROUTE_PATH } from '@/constants/routes'

type PreviewShift = 'D' | 'E' | 'N' | 'OFF'

interface PreviewRow {
  name: string
  shifts: PreviewShift[]
}

interface TrustSignal {
  label: string
  description: string
}

const signupRouteLocation: RouteLocationRaw = {
  path: SIGNUP_ROUTE_PATH,
  query: { role: 'admin' },
}

const previewDays = ['월', '화', '수', '목'] as const

const previewRows: PreviewRow[] = [
  { name: '김간호', shifts: ['D', 'E', 'OFF', 'N'] },
  { name: '이간호', shifts: ['N', 'OFF', 'D', 'E'] },
  { name: '박간호', shifts: ['E', 'D', 'N', 'OFF'] },
]

const shiftClassMap: Record<PreviewShift, string> = {
  D: 'bg-emerald-100 text-emerald-800',
  E: 'bg-sky-100 text-sky-800',
  N: 'bg-violet-100 text-violet-800',
  OFF: 'bg-gray-200 text-gray-700',
}

const workflowLabels = [
  '기본 정보',
  '사이트 정보',
  '직원 정보',
  '초기 데이터',
  '결과 확인 / 수정 / 내보내기',
] as const

const trustSignals: TrustSignal[] = [
  {
    label: '보호된 작업 공간',
    description: '승인된 사용자만 병동 근무표 생성 흐름에 접근하도록 공개 영역과 분리합니다.',
  },
  {
    label: '관리자 승인 절차',
    description: '병원 운영 관리자는 가입 후 승인 절차를 거쳐 작업 공간을 사용할 수 있습니다.',
  },
  {
    label: '공개 베타 운영',
    description: '현재 MVP 범위는 근무표 생성, 결과 검토, Excel 내보내기에 집중합니다.',
  },
]
</script>
