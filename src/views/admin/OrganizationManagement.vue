<template>
  <div class="mx-auto max-w-6xl space-y-6">
    <section class="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:flex-row lg:items-start lg:justify-between">
      <div class="space-y-3">
        <div class="flex flex-wrap items-center gap-2">
          <span class="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">Admin</span>
          <span class="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            {{ scopeRoleLabel }}
          </span>
          <n-tag
            round
            size="small"
            type="info"
          >
            6-탭 IA 확정
          </n-tag>
        </div>
        <div>
          <h1 class="text-3xl font-semibold tracking-tight text-slate-900">
            조직 관리
          </h1>
          <p class="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            조직 정보, 시프트, 근무 제약, 스킬, 직급, 사이트를 단일 라우트에서 관리하는 Phase 5 관리자 셸입니다.
            시프트 탭은 CRUD 연결까지 활성화하고, 나머지 탭은 각 도메인 책임과 저장 경계를 단계적으로 확정합니다.
          </p>
        </div>
      </div>

      <div class="grid min-w-full gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 lg:min-w-[320px]">
        <div>
          <p class="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
            접근 범위
          </p>
          <p class="mt-1 font-semibold text-slate-900">
            {{ scopeSummaryLabel }}
          </p>
        </div>
        <div>
          <p class="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
            현재 조직
          </p>
          <p class="mt-1 font-semibold text-slate-900">
            {{ selectedOrganizationLabel }}
          </p>
        </div>
        <div>
          <p class="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
            데이터 상태
          </p>
          <p class="mt-1 font-semibold text-slate-900">
            {{ dataLoadSummary }}
          </p>
        </div>
        <n-button
          secondary
          type="primary"
          class="justify-self-start"
          @click="handleDeferredAction('슈퍼 관리자 조직 선택과 저장 연결은 P5-1.3 이후 태스크에서 활성화됩니다.')"
        >
          연결 예정 기능 보기
        </n-button>
      </div>
    </section>

    <n-alert
      type="warning"
      :show-icon="true"
      class="rounded-2xl"
    >
      삭제는 soft delete 컬럼이 없는 한 차단 우선 정책을 유지합니다.
      Step wizard 컴포넌트 리팩터는 P7로 미루며, 관리자 화면은 `site_staffing_requirements`를 목표 경계로 삼습니다.
    </n-alert>

    <n-alert
      v-if="organizationContextMessage"
      type="info"
      :show-icon="true"
      class="rounded-2xl"
    >
      {{ organizationContextMessage }}
    </n-alert>

    <n-alert
      v-if="masterDataLoadError"
      type="error"
      :show-icon="true"
      class="rounded-2xl"
    >
      {{ masterDataLoadError }}
    </n-alert>

    <n-card
      title="화면 운영 원칙"
      class="rounded-3xl"
    >
      <div class="grid gap-4 md:grid-cols-2">
        <div
          v-for="principle in managementPrinciples"
          :key="principle.title"
          class="rounded-2xl border border-slate-200 bg-slate-50 p-4"
        >
          <p class="text-sm font-semibold text-slate-900">
            {{ principle.title }}
          </p>
          <p class="mt-2 text-sm leading-6 text-slate-600">
            {{ principle.description }}
          </p>
        </div>
      </div>
    </n-card>

    <n-card class="rounded-3xl">
      <template #header>
        <div class="flex flex-col gap-1">
          <h2 class="text-xl font-semibold text-slate-900">
            조직 관리 작업 영역
          </h2>
          <p class="text-sm text-slate-500">
            단일 라우트(`/admin/organization`) 안에서 6개 탭으로 도메인을 분리합니다.
          </p>
        </div>
      </template>

      <template #header-extra>
        <n-tag
          round
          :type="masterDataLoading ? 'warning' : 'success'"
          size="small"
        >
          {{ masterDataLoading ? '데이터 동기화 중' : 'UX 셸 준비 완료' }}
        </n-tag>
      </template>

      <n-tabs
        v-model:value="activeTab"
        type="line"
        animated
      >
        <n-tab-pane
          v-for="tab in tabDefinitions"
          :key="tab.key"
          :name="tab.key"
          :tab="tab.label"
        >
          <div
            v-if="tab.key === 'info'"
            class="space-y-4"
          >
            <section class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 class="text-lg font-semibold text-slate-900">
                    기본 정보 탭
                  </h3>
                  <p class="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                    조직명/유형 수정 폼이 들어갈 위치를 고정하고, 슈퍼 관리자 조직 선택 UX와 저장 연결 지점을 상단 컨텍스트에 모읍니다.
                  </p>
                </div>
                <n-button
                  tertiary
                  type="primary"
                  @click="handleDeferredAction('기본 정보 저장 로직은 organizationStore.updateCurrentOrganization() 경계로 연결됩니다.')"
                >
                  저장 경계 보기
                </n-button>
              </div>
            </section>

            <section class="grid gap-4 lg:grid-cols-3">
              <article
                v-for="card in infoCards"
                :key="card.title"
                class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <p class="text-base font-semibold text-slate-900">
                  {{ card.title }}
                </p>
                <p class="mt-2 text-sm leading-6 text-slate-600">
                  {{ card.description }}
                </p>
                <ul class="mt-4 space-y-2 text-sm text-slate-700">
                  <li
                    v-for="item in card.items"
                    :key="item"
                    class="flex gap-2"
                  >
                    <span class="mt-1 size-1.5 rounded-full bg-slate-400" />
                    <span>{{ item }}</span>
                  </li>
                </ul>
              </article>
            </section>
          </div>

          <div
            v-else-if="tab.key === 'shifts'"
            class="space-y-4"
          >
            <section class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div class="flex flex-wrap items-center gap-2">
                    <h3 class="text-lg font-semibold text-slate-900">
                      시프트 마스터
                    </h3>
                    <n-tag
                      size="small"
                      :type="isShiftPreview ? 'warning' : 'success'"
                    >
                      {{ isShiftPreview ? '기본 프리셋 표시' : `실데이터 ${shiftTableRows.length}건` }}
                    </n-tag>
                  </div>
                  <p class="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                    코드, 이름, 색상, 시작/종료 시각을 한 표에서 관리합니다. D/E/N/O 운영 계약은 유지하고,
                    추가 코드는 관리자 마스터에 저장하되 Step wizard와 결과 화면의 실사용 확장은 P7로 미룹니다.
                  </p>
                </div>
                <n-button
                  tertiary
                  type="primary"
                  @click="handleDeferredAction('D/E/N/O는 현재 운영 호환 범위이며, 추가 코드의 실사용 반영은 P7에서 확장합니다.')"
                >
                  운영 호환 정책 보기
                </n-button>
              </div>
            </section>

            <n-alert
              v-if="nonOperationalShiftCodes.length > 0"
              type="warning"
              :show-icon="true"
              class="rounded-2xl"
            >
              현재 {{ nonOperationalShiftCodes.join(', ') }} 코드는 관리자 시프트 마스터에 저장되어 있습니다.
              하지만 `/schedule/step1`, `/schedule/step2`, `/schedule/step5` 흐름의 운영 반영은 아직 D/E/N/O 기준입니다.
            </n-alert>

            <section class="grid gap-4 xl:grid-cols-[minmax(0,1.8fr)_minmax(300px,1fr)]">
              <n-card
                title="시프트 목록"
                class="rounded-3xl"
              >
                <template #header-extra>
                  <n-button
                    tertiary
                    type="primary"
                    :disabled="!canManageShifts || shiftSaving"
                    @click="handleCreateShift"
                  >
                    + 추가
                  </n-button>
                </template>

                <n-data-table
                  :columns="shiftColumns"
                  :data="shiftTableRows"
                  :bordered="false"
                  :pagination="false"
                  :single-line="false"
                  :row-key="getRowKey"
                />
              </n-card>

              <div class="space-y-4">
                <article
                  v-for="card in shiftCards"
                  :key="card.title"
                  class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <p class="text-base font-semibold text-slate-900">
                    {{ card.title }}
                  </p>
                  <ul class="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                    <li
                      v-for="item in card.items"
                      :key="item"
                      class="flex gap-2"
                    >
                      <span class="mt-1 size-1.5 rounded-full bg-slate-400" />
                      <span>{{ item }}</span>
                    </li>
                  </ul>
                </article>
              </div>
            </section>
          </div>

          <div
            v-else-if="tab.key === 'constraints'"
            class="space-y-4"
          >
            <section class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div class="flex flex-wrap items-center gap-2">
                    <h3 class="text-lg font-semibold text-slate-900">
                      근무 제약 설정
                    </h3>
                    <n-tag
                      size="small"
                      :type="organizationMasterStore.settings ? 'success' : 'warning'"
                    >
                      {{ organizationMasterStore.settings ? 'organization_settings 로드됨' : '기본 제약값 표시' }}
                    </n-tag>
                  </div>
                  <p class="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                    `organization_settings` 단일 레코드에 연속 N, 주간 근무시간, 휴무 기준, 시프트별 최소 휴식시간을 저장합니다.
                    휴식시간 행은 현재 시프트 정의를 기반으로 동적으로 표시됩니다.
                  </p>
                </div>
                <n-button
                  tertiary
                  type="primary"
                  @click="handleDeferredAction('근무 제약 규칙은 P5-2.3 spec에 따라 organization_settings 저장 모델과 organizationMasterStore.saveSettings() 경계로 고정되었습니다.')"
                >
                  제약 규칙 보기
                </n-button>
              </div>
            </section>

            <section class="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,1fr)]">
              <n-card
                title="근무 제약 입력 셸"
                class="rounded-3xl"
              >
                <div class="grid gap-4 md:grid-cols-2">
                  <label class="space-y-2">
                    <span class="text-sm font-medium text-slate-700">최대 연속 N근무</span>
                    <n-input-number
                      :value="constraintSnapshot.maxConsecutiveNightShifts"
                      :min="0"
                      class="w-full"
                      readonly
                    />
                  </label>
                  <label class="space-y-2">
                    <span class="text-sm font-medium text-slate-700">주 평균 근무시간</span>
                    <n-input-number
                      :value="constraintSnapshot.weeklyTargetHours"
                      :min="0"
                      class="w-full"
                      readonly
                    />
                  </label>
                  <label class="space-y-2">
                    <span class="text-sm font-medium text-slate-700">주 최대 근무시간</span>
                    <n-input-number
                      :value="constraintSnapshot.weeklyMaxHours"
                      :min="0"
                      class="w-full"
                      readonly
                    />
                  </label>
                  <label class="space-y-2">
                    <span class="text-sm font-medium text-slate-700">주 휴무일</span>
                    <n-input-number
                      :value="constraintSnapshot.weeklyOffDays"
                      :min="0"
                      class="w-full"
                      readonly
                    />
                  </label>
                </div>

                <div class="mt-6 space-y-3">
                  <div class="flex items-center justify-between">
                    <p class="text-sm font-semibold text-slate-900">
                      시프트별 최소 휴식시간
                    </p>
                    <n-tag
                      size="small"
                      type="info"
                    >
                      시프트 목록 연동
                    </n-tag>
                  </div>
                  <div class="grid gap-3">
                    <div
                      v-for="shift in restHourShiftRows"
                      :key="shift.id"
                      class="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[120px_minmax(0,1fr)] md:items-center"
                    >
                      <div class="flex items-center gap-2">
                        <span
                          class="size-3 rounded-full border border-slate-200"
                          :style="{ backgroundColor: shift.colorCode }"
                        />
                        <span class="text-sm font-medium text-slate-700">
                          {{ shift.code }} 근무 후
                        </span>
                      </div>
                      <n-input-number
                        :value="constraintSnapshot.minimumRestHours[shift.code] ?? 0"
                        :min="0"
                        class="w-full"
                        readonly
                      />
                    </div>
                  </div>
                </div>

                <div class="mt-6 flex justify-end">
                  <n-button
                    type="primary"
                    tertiary
                    @click="handleDeferredAction('근무 제약 저장 경계는 organizationMasterStore.saveSettings()를 통해 organization_settings upsert로 연결되도록 고정되어 있습니다.')"
                  >
                    저장 경계 보기
                  </n-button>
                </div>
              </n-card>

              <div class="space-y-4">
                <article
                  v-for="card in constraintCards"
                  :key="card.title"
                  class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <p class="text-base font-semibold text-slate-900">
                    {{ card.title }}
                  </p>
                  <ul class="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                    <li
                      v-for="item in card.items"
                      :key="item"
                      class="flex gap-2"
                    >
                      <span class="mt-1 size-1.5 rounded-full bg-slate-400" />
                      <span>{{ item }}</span>
                    </li>
                  </ul>
                </article>
              </div>
            </section>
          </div>

          <div
            v-else-if="tab.key === 'skills'"
            class="space-y-4"
          >
            <section class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div class="flex flex-wrap items-center gap-2">
                    <h3 class="text-lg font-semibold text-slate-900">
                      스킬 마스터
                    </h3>
                    <n-tag
                      size="small"
                      :type="isSkillPreview ? 'warning' : 'success'"
                    >
                      {{ isSkillPreview ? '기본 GENERAL 프리셋' : `실데이터 ${skillTableRows.length}건` }}
                    </n-tag>
                  </div>
                  <p class="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                    스킬 코드는 조직 내 고유값으로 관리하고, 직원 스킬 및 사이트 요구인원과 연결될 것을 전제로 삭제 차단 UX를 선행합니다.
                  </p>
                </div>
                <n-button
                  tertiary
                  type="primary"
                  @click="handleDeferredAction('스킬 CRUD 연결은 이후 마스터 데이터 태스크에서 활성화됩니다.')"
                >
                  연결 포인트 확인
                </n-button>
              </div>
            </section>

            <section class="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(300px,1fr)]">
              <n-card
                title="스킬 목록"
                class="rounded-3xl"
              >
                <template #header-extra>
                  <n-button
                    tertiary
                    type="primary"
                    @click="handleDeferredAction('스킬 추가 모달은 후속 CRUD 태스크에서 활성화됩니다.')"
                  >
                    + 추가
                  </n-button>
                </template>

                <n-data-table
                  :columns="skillColumns"
                  :data="skillTableRows"
                  :bordered="false"
                  :pagination="false"
                  :single-line="false"
                  :row-key="getRowKey"
                />
              </n-card>

              <div class="space-y-4">
                <article
                  v-for="card in skillCards"
                  :key="card.title"
                  class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <p class="text-base font-semibold text-slate-900">
                    {{ card.title }}
                  </p>
                  <ul class="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                    <li
                      v-for="item in card.items"
                      :key="item"
                      class="flex gap-2"
                    >
                      <span class="mt-1 size-1.5 rounded-full bg-slate-400" />
                      <span>{{ item }}</span>
                    </li>
                  </ul>
                </article>
              </div>
            </section>
          </div>

          <div
            v-else-if="tab.key === 'ranks'"
            class="space-y-4"
          >
            <section class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div class="flex flex-wrap items-center gap-2">
                    <h3 class="text-lg font-semibold text-slate-900">
                      직급 마스터
                    </h3>
                    <n-tag
                      size="small"
                      :type="isRankPreview ? 'warning' : 'success'"
                    >
                      {{ isRankPreview ? '기본 RN 프리셋' : `실데이터 ${rankTableRows.length}건` }}
                    </n-tag>
                  </div>
                  <p class="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                    직급 코드, 이름, 크레딧을 표로 관리합니다. 크레딧은 필수 전환 규칙이 정리되기 전까지 nullable로 유지하고, 참조 중 삭제는 막습니다.
                  </p>
                </div>
                <n-button
                  tertiary
                  type="primary"
                  @click="handleDeferredAction('직급/크레딧 상세 규칙은 P5-2.4에서 확정합니다.')"
                >
                  상세 요구사항 보기
                </n-button>
              </div>
            </section>

            <section class="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(300px,1fr)]">
              <n-card
                title="직급 목록"
                class="rounded-3xl"
              >
                <template #header-extra>
                  <n-button
                    tertiary
                    type="primary"
                    @click="handleDeferredAction('직급 추가 모달은 P5-2.4 이후 태스크에서 활성화됩니다.')"
                  >
                    + 추가
                  </n-button>
                </template>

                <n-data-table
                  :columns="rankColumns"
                  :data="rankTableRows"
                  :bordered="false"
                  :pagination="false"
                  :single-line="false"
                  :row-key="getRowKey"
                />
              </n-card>

              <div class="space-y-4">
                <article
                  v-for="card in rankCards"
                  :key="card.title"
                  class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <p class="text-base font-semibold text-slate-900">
                    {{ card.title }}
                  </p>
                  <ul class="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                    <li
                      v-for="item in card.items"
                      :key="item"
                      class="flex gap-2"
                    >
                      <span class="mt-1 size-1.5 rounded-full bg-slate-400" />
                      <span>{{ item }}</span>
                    </li>
                  </ul>
                </article>
              </div>
            </section>
          </div>

          <div
            v-else-if="tab.key === 'sites'"
            class="space-y-4"
          >
            <section class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div class="flex flex-wrap items-center gap-2">
                    <h3 class="text-lg font-semibold text-slate-900">
                      사이트 마스터
                    </h3>
                    <n-tag
                      size="small"
                      :type="siteTableRows.length > 0 ? 'success' : 'warning'"
                    >
                      {{ siteTableRows.length > 0 ? `실데이터 ${siteTableRows.length}건` : '상세 UX는 P5-3.2 예정' }}
                    </n-tag>
                  </div>
                  <p class="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                    사이트 자체는 이 탭에서 관리하고, 사이트별 요일/직급/스킬 요구인원 편집은 `site_staffing_requirements` 전용 후속 화면으로 분리합니다.
                  </p>
                </div>
                <n-button
                  tertiary
                  type="primary"
                  @click="handleDeferredAction('사이트 상세 CRUD UX는 P5-3.2, 요일별 요구인원 편집은 P5-3.3에서 설계합니다.')"
                >
                  후속 태스크 보기
                </n-button>
              </div>
            </section>

            <section class="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,1fr)]">
              <n-card
                title="사이트 목록"
                class="rounded-3xl"
              >
                <template #header-extra>
                  <n-button
                    tertiary
                    type="primary"
                    @click="handleDeferredAction('사이트 추가는 P5-3.2에서 활성화됩니다.')"
                  >
                    + 추가
                  </n-button>
                </template>

                <n-data-table
                  :columns="siteColumns"
                  :data="siteTableRows"
                  :bordered="false"
                  :pagination="false"
                  :single-line="false"
                  :row-key="getRowKey"
                />
              </n-card>

              <div class="space-y-4">
                <article
                  v-for="card in siteCards"
                  :key="card.title"
                  class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <p class="text-base font-semibold text-slate-900">
                    {{ card.title }}
                  </p>
                  <ul class="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                    <li
                      v-for="item in card.items"
                      :key="item"
                      class="flex gap-2"
                    >
                      <span class="mt-1 size-1.5 rounded-full bg-slate-400" />
                      <span>{{ item }}</span>
                    </li>
                  </ul>
                </article>
              </div>
            </section>
          </div>
        </n-tab-pane>
      </n-tabs>
    </n-card>

    <ShiftManagementModal
      :visible="showShiftModal"
      :editing-shift="editingShift"
      :existing-shifts="organizationStore.shifts"
      :saving="shiftSaving"
      @update:visible="handleShiftModalVisibilityChange"
      @submit="handleShiftSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, h, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NAlert,
  NButton,
  NCard,
  NDataTable,
  NInputNumber,
  NPopconfirm,
  NTabPane,
  NTabs,
  NTag,
  type DataTableColumns,
} from 'naive-ui'
import ShiftManagementModal from '@/components/admin/ShiftManagementModal.vue'
import { useOrganizationMasterStore } from '@/stores/organization-master'
import { useOrganizationStore } from '@/stores/organization'
import { useRbacStore } from '@/stores/rbac'
import type { WorkConstraints } from '@/types/organization'
import type { Rank } from '@/types/rank'
import type { Shift } from '@/types/shift'
import type { Site } from '@/types/site'
import type { Skill } from '@/types/skill'
import { showError, showInfo, showSuccess, showWarning } from '@/utils/message'

type OrganizationManagementTabKey =
  | 'info'
  | 'shifts'
  | 'constraints'
  | 'skills'
  | 'ranks'
  | 'sites'

interface ManagementPrinciple {
  title: string
  description: string
}

interface TabDefinition {
  key: OrganizationManagementTabKey
  label: string
}

interface ContentCard {
  title: string
  description?: string
  items: string[]
}

const DEFAULT_WORK_CONSTRAINTS: WorkConstraints = {
  weeklyTargetHours: 40,
  weeklyMaxHours: 52,
  weeklyOffDays: 2,
}

const DEFAULT_MINIMUM_REST_HOURS: Record<string, number> = {
  D: 24,
  E: 24,
  N: 36,
}

const CORE_OPERATIONAL_SHIFT_CODES = ['D', 'E', 'N', 'O'] as const

const DEFAULT_SHIFT_ROWS: Shift[] = [
  {
    id: 'preview-shift-d',
    organizationId: 'preview',
    code: 'D',
    name: '낮',
    colorCode: '#FF6B6B',
    startTime: '07:00',
    endTime: '15:00',
  },
  {
    id: 'preview-shift-e',
    organizationId: 'preview',
    code: 'E',
    name: '저녁',
    colorCode: '#4ECDC4',
    startTime: '15:00',
    endTime: '23:00',
  },
  {
    id: 'preview-shift-n',
    organizationId: 'preview',
    code: 'N',
    name: '밤',
    colorCode: '#45B7D1',
    startTime: '23:00',
    endTime: '07:00',
  },
  {
    id: 'preview-shift-o',
    organizationId: 'preview',
    code: 'O',
    name: '휴무',
    colorCode: '#96CEB4',
    startTime: null,
    endTime: null,
  },
]

const DEFAULT_SKILL_ROWS: Skill[] = [
  {
    id: 'preview-skill-general',
    organizationId: 'preview',
    code: 'GENERAL',
    name: '일반',
  },
]

const DEFAULT_RANK_ROWS: Rank[] = [
  {
    id: 'preview-rank-rn',
    organizationId: 'preview',
    code: 'RN',
    name: '일반 간호사',
    credit: null,
  },
]

const VALID_TAB_KEYS: OrganizationManagementTabKey[] = ['info', 'shifts', 'constraints', 'skills', 'ranks', 'sites']
const LEGACY_TAB_MAP: Record<string, OrganizationManagementTabKey> = {
  overview: 'info',
  settings: 'constraints',
  'master-data': 'shifts',
  staffing: 'sites',
}

const managementPrinciples: ManagementPrinciple[] = [
  {
    title: '6-탭 단일 페이지',
    description: '`/admin/organization` 한 페이지 안에서 기본 정보, 시프트, 근무 제약, 스킬, 직급, 사이트를 탭으로 분리합니다.',
  },
  {
    title: '삭제 차단 우선',
    description: 'soft delete 컬럼이 없는 한 즉시 비활성화 대신 FK 참조 차단을 먼저 적용하고, UX 문구도 같은 정책을 따릅니다.',
  },
  {
    title: '기본값 프리셋 제공',
    description: '새 조직은 3교대(D/E/N/O), GENERAL 스킬, RN 직급을 기본으로 시작하는 정책을 화면에서도 명시합니다.',
  },
  {
    title: '서비스 전환 경계 고정',
    description: '사이트 탭은 `site_staffing_requirements` 중심의 관리자 경계를 준비하고, 기존 wizard의 `site_requirements`는 건드리지 않습니다.',
  },
]

const tabDefinitions: TabDefinition[] = [
  { key: 'info', label: '기본 정보' },
  { key: 'shifts', label: '시프트' },
  { key: 'constraints', label: '근무 제약' },
  { key: 'skills', label: '스킬' },
  { key: 'ranks', label: '직급' },
  { key: 'sites', label: '사이트' },
]

const infoCards: ContentCard[] = [
  {
    title: '기본 정보 책임',
    description: '조직명과 유형 수정은 이 탭이 맡고, 조직 생성/삭제는 Phase 5 범위에서 제외합니다.',
    items: [
      '조직명은 organizations.name에 직접 연결됩니다.',
      '조직 유형은 persisted type(hospital/fire/police)만 저장합니다.',
      '저장 API는 organizationStore.updateCurrentOrganization() 경계를 재사용합니다.',
    ],
  },
  {
    title: '권한/범위',
    description: '슈퍼 관리자와 조직 관리자의 책임을 UI에서 분리합니다.',
    items: [
      '슈퍼 관리자는 조직 선택 UX가 연결되면 대상 조직을 전환합니다.',
      '조직 관리자는 자기 조직만 수정합니다.',
      'user 역할은 메뉴 미노출과 라우터 가드로 차단합니다.',
    ],
  },
  {
    title: '후속 연결 포인트',
    description: '이 태스크는 입력 필드 배치와 화면 책임만 고정합니다.',
    items: [
      '상단 컨텍스트 영역에 조직 선택 UI 배치',
      '저장 성공/실패는 글로벌 메시지 패턴으로 통일',
      'P5-1.4 테스트 시나리오와 접근 제어 계약 유지',
    ],
  },
]

const shiftCards: ContentCard[] = [
  {
    title: '운영 호환 범위',
    items: [
      '현재 planning/result 흐름의 운영 코어는 D, E, N, O',
      '추가 코드는 관리자 마스터에 저장할 수 있지만 실사용 반영은 P7에서 확장',
      'O(휴무)는 시간 없이 유지 가능',
    ],
  },
  {
    title: '삭제 정책',
    items: [
      'schedule_assignments, site_requirements, site_staffing_requirements 참조가 있으면 삭제 차단',
      'soft delete 컬럼이 생기기 전까지 숨김 처리 대신 명시적 오류 메시지 사용',
      '공유 shift API가 모든 호출 경로에서 동일한 차단 규칙을 사용',
    ],
  },
  {
    title: '저장 경계',
    items: [
      '조회/생성/수정/삭제는 shift API 경계를 그대로 사용',
      '관리 화면은 전용 모달에서 코드/시간/색상 검증을 선행',
      '실제 데이터가 없으면 기본 프리셋을 미리보기로 노출',
    ],
  },
]

const constraintCards: ContentCard[] = [
  {
    title: '저장 모델',
    items: [
      '단일 organization_settings 레코드에 저장',
      'maxConsecutiveNightShifts와 workConstraints를 함께 관리',
      '최소 휴식시간은 shift code 기반 JSONB로 유지',
    ],
  },
  {
    title: '동적 렌더링',
    items: [
      '최소 휴식시간 행은 현재 시프트 목록 기준으로 생성',
      '시간이 없는 휴무(O)는 휴식시간 입력 행에서 제외',
      '기본값은 D/E/N = 24/24/36시간',
    ],
  },
  {
    title: '검증 기준',
    items: [
      '주 40/52, 휴무일, 연속 N 검증 규칙은 P5-2.3 spec에 고정',
      '저장 실패 메시지는 Naive UI 글로벌 메시지로 통일',
      '현재 화면은 read-only 셸이지만 폼 책임과 저장 경계는 확정',
    ],
  },
]

const skillCards: ContentCard[] = [
  {
    title: '기본 프리셋',
    items: [
      '신규 조직 기본 스킬은 GENERAL 1종',
      '코드는 조직 내 유일값으로 대문자 저장',
      '이름은 한국어 표시명을 기준으로 관리',
    ],
  },
  {
    title: '삭제 정책',
    items: [
      '직원 스킬 또는 사이트 요구인원에서 참조 중이면 삭제 차단',
      '참조 해제 후 삭제하도록 유도하는 문구 사용',
      'soft delete 없이 물리 삭제를 유지하되 UX는 차단 우선',
    ],
  },
  {
    title: '저장 경계',
    items: [
      'CRUD는 skill API 경계를 그대로 사용',
      '추가/수정 모달은 후속 마스터 태스크에서 연결',
      '데이터가 없을 때는 GENERAL 프리셋을 기준 예시로 노출',
    ],
  },
]

const rankCards: ContentCard[] = [
  {
    title: '기본 프리셋',
    items: [
      '신규 조직 기본 직급은 RN',
      'LV1~4 같은 운영 레벨은 추후 조직 정책에 맞춰 추가',
      'credit 컬럼은 nullable을 허용하고 표시 규칙만 먼저 고정',
    ],
  },
  {
    title: '삭제 정책',
    items: [
      '직원 또는 site_staffing_requirements 참조가 있으면 삭제 차단',
      'FK 오류를 사용자 친화적 문구로 변환',
      '사용 중인 직급은 숨기지 않고 명시적으로 보호',
    ],
  },
  {
    title: '저장 경계',
    items: [
      'CRUD는 rank API 경계를 유지',
      '크레딧 기본값/표시 포맷은 P5-2.4에서 확정',
      '실데이터가 비어 있으면 RN 예시 행으로 UX를 고정',
    ],
  },
]

const siteCards: ContentCard[] = [
  {
    title: '사이트 자체 책임',
    items: [
      '이 탭은 사이트 코드/이름 CRUD 책임만 가집니다.',
      '사이트 상세 UX는 P5-3.2에서 확정합니다.',
      '테넌트 범위는 organization_id로 고정합니다.',
    ],
  },
  {
    title: '요구인원 경계',
    items: [
      '요일별 요구인원 편집은 별도 후속 UX로 분리',
      'canonical 소스는 site_staffing_requirements',
      '기존 Step 2용 site_requirements는 이 화면에서 직접 수정하지 않음',
    ],
  },
  {
    title: '삭제 정책',
    items: [
      '연결된 요구인원 데이터가 있으면 삭제 차단 검토',
      '사이트 삭제 전 영향 범위 경고가 필요',
      '물리 삭제 전제라도 차단 우선 UX를 유지',
    ],
  },
]

const route = useRoute()
const router = useRouter()
const rbacStore = useRbacStore()
const organizationStore = useOrganizationStore()
const organizationMasterStore = useOrganizationMasterStore()

const masterDataLoadError = ref<string | null>(null)
const lastLoadedOrganizationId = ref<string | null>(null)
const showShiftModal = ref(false)
const editingShift = ref<Shift | null>(null)
const shiftSaving = ref(false)
const shiftDeletingId = ref<string | null>(null)

function parseTabKey(value: unknown): OrganizationManagementTabKey {
  if (typeof value === 'string') {
    const normalized = LEGACY_TAB_MAP[value] ?? value
    if (VALID_TAB_KEYS.includes(normalized as OrganizationManagementTabKey)) {
      return normalized as OrganizationManagementTabKey
    }
  }

  if (Array.isArray(value)) {
    const candidate = value.find((item) => typeof item === 'string')
    if (candidate) {
      return parseTabKey(candidate)
    }
  }

  return 'info'
}

const activeTab = ref<OrganizationManagementTabKey>(parseTabKey(route.query.tab))

const resolvedOrganizationId = computed(() => {
  if (rbacStore.accessState === 'super_active') {
    return organizationStore.current?.id ?? null
  }

  return rbacStore.effectiveMembership?.organizationId ?? organizationStore.current?.id ?? null
})

const scopeRoleLabel = computed(() => {
  if (rbacStore.accessState === 'super_active') {
    return '슈퍼 관리자'
  }

  return '조직 관리자'
})

const selectedOrganizationLabel = computed(() => {
  if (organizationStore.current?.id && organizationStore.current?.name) {
    return `${organizationStore.current.name} (${organizationStore.current.id})`
  }

  if (rbacStore.accessState === 'super_active') {
    return '전체 조직 대상 선택 예정'
  }

  return rbacStore.effectiveMembership?.organizationId ?? '조직 정보 확인 필요'
})

const scopeSummaryLabel = computed(() => {
  if (rbacStore.accessState === 'super_active') {
    return '선택된 조직 기준 조회/수정'
  }

  return '현재 소속 조직만 수정'
})

const masterDataLoading = computed(() => organizationStore.loading || organizationMasterStore.loading)

const dataLoadSummary = computed(() => {
  if (masterDataLoading.value) {
    return '동기화 중'
  }

  if (!resolvedOrganizationId.value) {
    return '조직 선택 대기'
  }

  if (masterDataLoadError.value) {
    return '일부 로드 실패'
  }

  return '기본 셸 + 실데이터 준비'
})

const canManageShifts = computed(() => Boolean(resolvedOrganizationId.value))

const organizationContextMessage = computed(() => {
  if (!resolvedOrganizationId.value) {
    return '선택된 조직이 없어서 기본 프리셋 기준 UX만 표시합니다. 슈퍼 관리자용 조직 선택기는 후속 태스크에서 연결됩니다.'
  }

  return null
})

const shiftTableRows = computed(() => {
  if (organizationStore.shifts.length > 0) {
    return organizationStore.shifts
  }

  return DEFAULT_SHIFT_ROWS
})

const skillTableRows = computed(() => {
  if (organizationMasterStore.skills.length > 0) {
    return organizationMasterStore.skills
  }

  return DEFAULT_SKILL_ROWS
})

const rankTableRows = computed(() => {
  if (organizationMasterStore.ranks.length > 0) {
    return organizationMasterStore.ranks
  }

  return DEFAULT_RANK_ROWS
})

const siteTableRows = computed(() => organizationMasterStore.sites)

const isShiftPreview = computed(() => organizationStore.shifts.length === 0)
const isSkillPreview = computed(() => organizationMasterStore.skills.length === 0)
const isRankPreview = computed(() => organizationMasterStore.ranks.length === 0)
const nonOperationalShiftCodes = computed(() =>
  organizationStore.shifts
    .map((shift) => shift.code.toUpperCase())
    .filter((code) => !CORE_OPERATIONAL_SHIFT_CODES.includes(code as (typeof CORE_OPERATIONAL_SHIFT_CODES)[number])),
)

const constraintSnapshot = computed(() => {
  const settings = organizationMasterStore.settings
  const minimumRestHours = settings?.minimumRestHours ?? DEFAULT_MINIMUM_REST_HOURS
  const workConstraints = settings?.workConstraints ?? DEFAULT_WORK_CONSTRAINTS

  return {
    maxConsecutiveNightShifts: settings?.maxConsecutiveNightShifts ?? 3,
    weeklyTargetHours: workConstraints.weeklyTargetHours,
    weeklyMaxHours: workConstraints.weeklyMaxHours,
    weeklyOffDays: workConstraints.weeklyOffDays,
    minimumRestHours,
  }
})

const restHourShiftRows = computed(() =>
  shiftTableRows.value.filter((shift) => shift.startTime !== null && shift.endTime !== null),
)

function getRowKey(row: { id: string }) {
  return row.id
}

function formatTimeRange(shift: Shift) {
  if (!shift.startTime || !shift.endTime) {
    return '휴무/시간 없음'
  }

  return `${shift.startTime} - ${shift.endTime}`
}

function formatCredit(value: Rank['credit']) {
  if (value === null || value === undefined) {
    return '-'
  }

  return Number(value).toFixed(2)
}

function isPreviewShiftRow(shift: Shift) {
  return shift.organizationId === 'preview' || shift.id.startsWith('preview-')
}

function handleCreateShift() {
  if (!canManageShifts.value) {
    showWarning('수정할 조직을 먼저 선택해주세요.')
    return
  }

  editingShift.value = null
  showShiftModal.value = true
}

function handleEditShift(shift: Shift) {
  if (isPreviewShiftRow(shift)) {
    showInfo('미리보기 시프트는 수정할 수 없습니다. 실제 조직 데이터를 먼저 불러와주세요.')
    return
  }

  editingShift.value = { ...shift }
  showShiftModal.value = true
}

async function handleDeleteShift(shift: Shift) {
  if (isPreviewShiftRow(shift)) {
    showInfo('미리보기 시프트는 삭제할 수 없습니다.')
    return
  }

  shiftDeletingId.value = shift.id
  try {
    const result = await organizationStore.deleteShift(shift.id)
    if (!result.success) {
      showError(result.error ?? '시프트 삭제 중 오류가 발생했습니다.')
      return
    }

    if (editingShift.value?.id === shift.id) {
      editingShift.value = null
      showShiftModal.value = false
    }
    showSuccess(`시프트 ${shift.code}가 삭제되었습니다.`)
  } finally {
    shiftDeletingId.value = null
  }
}

function handleShiftModalVisibilityChange(value: boolean) {
  showShiftModal.value = value
  if (!value) {
    editingShift.value = null
  }
}

async function handleShiftSubmit(shiftData: Omit<Shift, 'id' | 'organizationId' | 'createdAt'>) {
  if (!canManageShifts.value) {
    showError('조직 정보를 확인한 후 다시 시도해주세요.')
    return
  }

  shiftSaving.value = true
  try {
    if (editingShift.value) {
      const result = await organizationStore.updateShift(editingShift.value.id, shiftData)
      if (!result.success) {
        showError(result.error ?? '시프트 수정 중 오류가 발생했습니다.')
        return
      }

      showSuccess(`시프트 ${shiftData.code}가 수정되었습니다.`)
    } else {
      const result = await organizationStore.addShift(shiftData)
      if (!result.success) {
        showError(result.error ?? '시프트 추가 중 오류가 발생했습니다.')
        return
      }

      showSuccess(`시프트 ${shiftData.code}가 추가되었습니다.`)
    }

    editingShift.value = null
    showShiftModal.value = false
  } finally {
    shiftSaving.value = false
  }
}

function renderDeferredActions(label: string) {
  return h('div', { class: 'flex flex-wrap gap-2' }, [
    h(
      NButton,
      {
        text: true,
        type: 'primary',
        onClick: () => handleDeferredAction(`${label} 수정 UI는 후속 태스크에서 활성화됩니다.`),
      },
      { default: () => '수정' },
    ),
    h(
      NButton,
      {
        text: true,
        type: 'error',
        onClick: () => handleDeferredAction(`${label} 삭제는 참조 차단 정책과 함께 후속 태스크에서 활성화됩니다.`),
      },
      { default: () => '삭제' },
    ),
  ])
}

function renderShiftActions(shift: Shift) {
  if (isPreviewShiftRow(shift)) {
    return h('span', { class: 'text-xs text-slate-400' }, '미리보기')
  }

  return h('div', { class: 'flex flex-wrap gap-2' }, [
    h(
      NButton,
      {
        text: true,
        type: 'primary',
        disabled: shiftSaving.value || shiftDeletingId.value === shift.id,
        onClick: () => handleEditShift(shift),
      },
      { default: () => '수정' },
    ),
    h(
      NPopconfirm,
      {
        positiveText: '삭제',
        negativeText: '취소',
        onPositiveClick: () => handleDeleteShift(shift),
      },
      {
        trigger: () =>
          h(
            NButton,
            {
              text: true,
              type: 'error',
              loading: shiftDeletingId.value === shift.id,
              disabled: shiftSaving.value,
            },
            { default: () => '삭제' },
          ),
        default: () => `${shift.code} 시프트를 삭제하시겠습니까? 참조 중이면 삭제가 차단됩니다.`,
      },
    ),
  ])
}

const shiftColumns: DataTableColumns<Shift> = [
  {
    title: '코드',
    key: 'code',
    width: 90,
  },
  {
    title: '이름',
    key: 'name',
    width: 120,
  },
  {
    title: '색상',
    key: 'colorCode',
    width: 150,
    render: (row) =>
      h('div', { class: 'flex items-center gap-2 text-sm text-slate-700' }, [
        h('span', {
          class: 'inline-flex size-4 rounded border border-slate-200',
          style: { backgroundColor: row.colorCode },
        }),
        h('span', row.colorCode),
      ]),
  },
  {
    title: '시간',
    key: 'timeRange',
    minWidth: 180,
    render: (row) => formatTimeRange(row),
  },
  {
    title: '작업',
    key: 'actions',
    width: 120,
    render: (row) => renderShiftActions(row),
  },
]

const skillColumns: DataTableColumns<Skill> = [
  {
    title: '코드',
    key: 'code',
    width: 140,
  },
  {
    title: '이름',
    key: 'name',
    minWidth: 180,
  },
  {
    title: '작업',
    key: 'actions',
    width: 120,
    render: (row) => renderDeferredActions(`스킬 ${row.code}`),
  },
]

const rankColumns: DataTableColumns<Rank> = [
  {
    title: '코드',
    key: 'code',
    width: 120,
  },
  {
    title: '이름',
    key: 'name',
    minWidth: 180,
  },
  {
    title: '크레딧',
    key: 'credit',
    width: 100,
    render: (row) => formatCredit(row.credit),
  },
  {
    title: '작업',
    key: 'actions',
    width: 120,
    render: (row) => renderDeferredActions(`직급 ${row.code}`),
  },
]

const siteColumns: DataTableColumns<Site> = [
  {
    title: '코드',
    key: 'code',
    width: 140,
  },
  {
    title: '이름',
    key: 'name',
    minWidth: 220,
  },
  {
    title: '작업',
    key: 'actions',
    width: 120,
    render: (row) => renderDeferredActions(`사이트 ${row.code}`),
  },
]

watch(
  () => route.query.tab,
  (nextTab) => {
    const resolvedTab = parseTabKey(nextTab)
    if (resolvedTab !== activeTab.value) {
      activeTab.value = resolvedTab
    }
  },
)

watch(activeTab, async (nextTab) => {
  if (route.query.tab === nextTab) {
    return
  }

  await router.replace({
    query: {
      ...route.query,
      tab: nextTab,
    },
  })
})

watch(
  resolvedOrganizationId,
  async (nextOrganizationId) => {
    if (!nextOrganizationId) {
      masterDataLoadError.value = null
      lastLoadedOrganizationId.value = null
      return
    }

    masterDataLoadError.value = null

    if (organizationStore.current?.id !== nextOrganizationId) {
      const organizationResult = await organizationStore.loadOrganization(nextOrganizationId)
      if (!organizationResult.success) {
        masterDataLoadError.value = organizationResult.error ?? '조직 정보를 불러오지 못했습니다.'
        return
      }
    }

    if (lastLoadedOrganizationId.value === nextOrganizationId) {
      return
    }

    const masterResult = await organizationMasterStore.loadAll(nextOrganizationId)
    if (!masterResult.success) {
      masterDataLoadError.value = masterResult.error ?? '마스터 데이터를 불러오지 못했습니다.'
      return
    }

    lastLoadedOrganizationId.value = nextOrganizationId
  },
  { immediate: true },
)

function handleDeferredAction(message: string) {
  showInfo(message)
}
</script>
