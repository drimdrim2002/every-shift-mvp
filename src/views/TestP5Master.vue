<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useOrganizationMasterStore } from '@/stores/organization-master'
import { useSiteStaffingRequirements } from '@/composables/useSiteStaffingRequirements'
import type { Site } from '@/types/site'
import type { Skill } from '@/types/skill'
import type { Rank } from '@/types/rank'

const SEED_ORG_ID = '00000000-0000-0000-0000-000000000001'

const masterStore = useOrganizationMasterStore()
const { expandToMonth } = useSiteStaffingRequirements()

// Test state
const status = ref<Record<string, string>>({})
const expanded = ref<string>('')

function setStatus(key: string, msg: string) {
  status.value = { ...status.value, [key]: msg }
}

// ─── Settings ────────────────────────────────────────────────────────────────

async function testLoadSettings() {
  setStatus('settings', '⏳ 로딩 중...')
  const result = await masterStore.loadSettings(SEED_ORG_ID)
  setStatus('settings', result.success ? '✅ 로드 성공' : `❌ ${result.error}`)
}

async function testSaveSettings() {
  setStatus('saveSettings', '⏳ 저장 중...')
  const result = await masterStore.saveSettings(SEED_ORG_ID, {
    maxConsecutiveNightShifts: 3,
    minimumRestHours: { D: 24, E: 24, N: 36 },
    workConstraints: { weeklyTargetHours: 40, weeklyMaxHours: 52, weeklyOffDays: 2 },
  })
  setStatus('saveSettings', result.success ? '✅ 저장 성공' : `❌ ${result.error}`)
}

// ─── Sites ───────────────────────────────────────────────────────────────────

const newSite = ref<Omit<Site, 'id' | 'organizationId' | 'createdAt'>>({ code: 'TEST', name: '테스트 사이트' })
const createdSiteId = ref<string | null>(null)

async function testLoadSites() {
  setStatus('sites', '⏳ 로딩 중...')
  const result = await masterStore.loadSites(SEED_ORG_ID)
  setStatus('sites', result.success ? `✅ ${masterStore.sites.length}개 로드` : `❌ ${result.error}`)
}

async function testCreateSite() {
  setStatus('createSite', '⏳ 생성 중...')
  const result = await masterStore.addSite(SEED_ORG_ID, newSite.value)
  if (result.success && result.site) {
    createdSiteId.value = result.site.id
    setStatus('createSite', `✅ 생성됨: ${result.site.id}`)
  } else {
    setStatus('createSite', `❌ ${result.error}`)
  }
}

async function testDeleteSite() {
  if (!createdSiteId.value) {
    setStatus('deleteSite', '⚠️ 먼저 사이트를 생성하세요')
    return
  }
  setStatus('deleteSite', '⏳ 삭제 중...')
  const result = await masterStore.removeSite(createdSiteId.value)
  if (result.success) {
    createdSiteId.value = null
    setStatus('deleteSite', '✅ 삭제 성공')
  } else {
    setStatus('deleteSite', `❌ ${result.error}`)
  }
}

// ─── Skills ──────────────────────────────────────────────────────────────────

const newSkill = ref<Omit<Skill, 'id' | 'organizationId' | 'createdAt'>>({ code: 'TESTSKL', name: '테스트 스킬' })
const createdSkillId = ref<string | null>(null)

async function testLoadSkills() {
  setStatus('skills', '⏳ 로딩 중...')
  const result = await masterStore.loadSkills(SEED_ORG_ID)
  setStatus('skills', result.success ? `✅ ${masterStore.skills.length}개 로드` : `❌ ${result.error}`)
}

async function testCreateSkill() {
  setStatus('createSkill', '⏳ 생성 중...')
  const result = await masterStore.addSkill(SEED_ORG_ID, newSkill.value)
  if (result.success && result.skill) {
    createdSkillId.value = result.skill.id
    setStatus('createSkill', `✅ 생성됨: ${result.skill.id}`)
  } else {
    setStatus('createSkill', `❌ ${result.error}`)
  }
}

async function testDeleteSkill() {
  if (!createdSkillId.value) {
    setStatus('deleteSkill', '⚠️ 먼저 스킬을 생성하세요')
    return
  }
  setStatus('deleteSkill', '⏳ 삭제 중...')
  const result = await masterStore.removeSkill(createdSkillId.value)
  if (result.success) {
    createdSkillId.value = null
    setStatus('deleteSkill', '✅ 삭제 성공')
  } else {
    setStatus('deleteSkill', `❌ ${result.error}`)
  }
}

// ─── Ranks ───────────────────────────────────────────────────────────────────

const newRank = ref<Omit<Rank, 'id' | 'organizationId' | 'createdAt'>>({ code: 'TESTRNK', name: '테스트 직급', credit: 1.5 })
const createdRankId = ref<string | null>(null)

async function testLoadRanks() {
  setStatus('ranks', '⏳ 로딩 중...')
  const result = await masterStore.loadRanks(SEED_ORG_ID)
  setStatus('ranks', result.success ? `✅ ${masterStore.ranks.length}개 로드` : `❌ ${result.error}`)
}

async function testCreateRank() {
  setStatus('createRank', '⏳ 생성 중...')
  const result = await masterStore.addRank(SEED_ORG_ID, newRank.value)
  if (result.success && result.rank) {
    createdRankId.value = result.rank.id
    setStatus('createRank', `✅ 생성됨 (credit=${result.rank.credit})`)
  } else {
    setStatus('createRank', `❌ ${result.error}`)
  }
}

async function testDeleteRank() {
  if (!createdRankId.value) {
    setStatus('deleteRank', '⚠️ 먼저 직급을 생성하세요')
    return
  }
  setStatus('deleteRank', '⏳ 삭제 중...')
  const result = await masterStore.removeRank(createdRankId.value)
  if (result.success) {
    createdRankId.value = null
    setStatus('deleteRank', '✅ 삭제 성공')
  } else {
    setStatus('deleteRank', `❌ ${result.error}`)
  }
}

// ─── expandToMonth ────────────────────────────────────────────────────────────

function testExpandToMonth() {
  // Mock requirements (all Mondays = shift 'D', count=3)
  const mockReqs = [
    {
      id: 'mock-1',
      organizationId: SEED_ORG_ID,
      siteId: 'site-mock',
      shiftId: 'shift-d-mock',
      dayOfWeek: 1, // Monday
      requiredCount: 3,
      skillId: null,
      rankId: null,
    },
  ]
  const result = expandToMonth(mockReqs, '2026-03')
  // March 2026 has 5 Mondays: 2,9,16,23,30
  const mondays = result.filter((r) => r.dayOfWeek === 1)
  expanded.value = `2026-03 확장: 총 ${result.length}개 엔트리, 월요일 ${mondays.length}개 (기대값: 5)`
}

// ─── Load all on mount ────────────────────────────────────────────────────────
onMounted(async () => {
  await masterStore.loadAll(SEED_ORG_ID)
  setStatus('init', `✅ 초기 로드 완료 — sites:${masterStore.sites.length} skills:${masterStore.skills.length} ranks:${masterStore.ranks.length}`)
})
</script>

<template>
  <div class="container mx-auto min-h-screen max-w-4xl bg-white p-8 text-gray-900">
    <h1 class="mb-2 text-3xl font-bold">
      P5 Organization Master 테스트
    </h1>
    <p class="mb-8 text-sm text-gray-500">
      ⚠️ migration 012 실행 후 사용 가능 (work_constraints, credit 컬럼 필요)
    </p>

    <!-- Init status -->
    <div
      v-if="status.init"
      class="mb-6 rounded bg-blue-50 p-3 text-sm text-blue-800"
    >
      {{ status.init }}
    </div>

    <!-- Settings -->
    <section class="mb-8">
      <h2 class="mb-3 border-b pb-1 text-xl font-semibold">
        조직 설정 (organization_settings)
      </h2>
      <div class="mb-2 flex gap-2">
        <button
          class="rounded bg-blue-500 px-3 py-1 text-sm text-white hover:bg-blue-600"
          @click="testLoadSettings"
        >
          설정 로드
        </button>
        <button
          class="rounded bg-green-500 px-3 py-1 text-sm text-white hover:bg-green-600"
          @click="testSaveSettings"
        >
          설정 저장 (N최대=3, 주40h)
        </button>
      </div>
      <div class="text-sm">
        <p>로드: {{ status.settings ?? '-' }}</p>
        <p>저장: {{ status.saveSettings ?? '-' }}</p>
      </div>
      <div
        v-if="masterStore.settings"
        class="mt-2 rounded bg-gray-100 p-3 font-mono text-xs"
      >
        <pre>{{ JSON.stringify(masterStore.settings, null, 2) }}</pre>
      </div>
    </section>

    <!-- Sites -->
    <section class="mb-8">
      <h2 class="mb-3 border-b pb-1 text-xl font-semibold">
        사이트 (sites)
      </h2>
      <div class="mb-2 flex flex-wrap gap-2">
        <button
          class="rounded bg-blue-500 px-3 py-1 text-sm text-white hover:bg-blue-600"
          @click="testLoadSites"
        >
          사이트 목록
        </button>
        <button
          class="rounded bg-green-500 px-3 py-1 text-sm text-white hover:bg-green-600"
          @click="testCreateSite"
        >
          테스트 사이트 생성 (TEST)
        </button>
        <button
          class="rounded bg-red-500 px-3 py-1 text-sm text-white hover:bg-red-600"
          :disabled="!createdSiteId"
          @click="testDeleteSite"
        >
          생성된 사이트 삭제
        </button>
      </div>
      <div class="text-sm">
        <p>목록: {{ status.sites ?? '-' }}</p>
        <p>생성: {{ status.createSite ?? '-' }}</p>
        <p>삭제: {{ status.deleteSite ?? '-' }}</p>
      </div>
      <ul
        v-if="masterStore.sites.length"
        class="mt-2 list-disc pl-4 text-xs"
      >
        <li
          v-for="s in masterStore.sites"
          :key="s.id"
        >
          [{{ s.code }}] {{ s.name }}
        </li>
      </ul>
    </section>

    <!-- Skills -->
    <section class="mb-8">
      <h2 class="mb-3 border-b pb-1 text-xl font-semibold">
        스킬 (skills)
      </h2>
      <div class="mb-2 flex flex-wrap gap-2">
        <button
          class="rounded bg-blue-500 px-3 py-1 text-sm text-white hover:bg-blue-600"
          @click="testLoadSkills"
        >
          스킬 목록
        </button>
        <button
          class="rounded bg-green-500 px-3 py-1 text-sm text-white hover:bg-green-600"
          @click="testCreateSkill"
        >
          테스트 스킬 생성 (TESTSKL)
        </button>
        <button
          class="rounded bg-red-500 px-3 py-1 text-sm text-white hover:bg-red-600"
          :disabled="!createdSkillId"
          @click="testDeleteSkill"
        >
          생성된 스킬 삭제
        </button>
      </div>
      <div class="text-sm">
        <p>목록: {{ status.skills ?? '-' }}</p>
        <p>생성: {{ status.createSkill ?? '-' }}</p>
        <p>삭제: {{ status.deleteSkill ?? '-' }}</p>
      </div>
      <ul
        v-if="masterStore.skills.length"
        class="mt-2 list-disc pl-4 text-xs"
      >
        <li
          v-for="sk in masterStore.skills"
          :key="sk.id"
        >
          [{{ sk.code }}] {{ sk.name }}
        </li>
      </ul>
    </section>

    <!-- Ranks -->
    <section class="mb-8">
      <h2 class="mb-3 border-b pb-1 text-xl font-semibold">
        직급 (ranks + credit)
      </h2>
      <p class="mb-2 text-xs text-yellow-700">
        ⚠️ credit 컬럼은 migration 012 실행 후 표시됩니다
      </p>
      <div class="mb-2 flex flex-wrap gap-2">
        <button
          class="rounded bg-blue-500 px-3 py-1 text-sm text-white hover:bg-blue-600"
          @click="testLoadRanks"
        >
          직급 목록
        </button>
        <button
          class="rounded bg-green-500 px-3 py-1 text-sm text-white hover:bg-green-600"
          @click="testCreateRank"
        >
          테스트 직급 생성 (TESTRNK, credit=1.5)
        </button>
        <button
          class="rounded bg-red-500 px-3 py-1 text-sm text-white hover:bg-red-600"
          :disabled="!createdRankId"
          @click="testDeleteRank"
        >
          생성된 직급 삭제
        </button>
      </div>
      <div class="text-sm">
        <p>목록: {{ status.ranks ?? '-' }}</p>
        <p>생성: {{ status.createRank ?? '-' }}</p>
        <p>삭제: {{ status.deleteRank ?? '-' }}</p>
      </div>
      <ul
        v-if="masterStore.ranks.length"
        class="mt-2 list-disc pl-4 text-xs"
      >
        <li
          v-for="r in masterStore.ranks"
          :key="r.id"
        >
          [{{ r.code }}] {{ r.name }}
          <span
            v-if="r.credit != null"
            class="text-purple-600"
          > credit={{ r.credit }}</span>
        </li>
      </ul>
    </section>

    <!-- expandToMonth -->
    <section class="mb-8">
      <h2 class="mb-3 border-b pb-1 text-xl font-semibold">
        월별 확장 (expandToMonth — DB 불필요)
      </h2>
      <p class="mb-2 text-xs text-gray-500">
        Mock 데이터로 2026-03의 월요일 D시프트 3명 → 5개 엔트리 기대
      </p>
      <button
        class="mb-2 rounded bg-purple-500 px-3 py-1 text-sm text-white hover:bg-purple-600"
        @click="testExpandToMonth"
      >
        expandToMonth 실행
      </button>
      <p
        v-if="expanded"
        class="text-sm"
      >
        {{ expanded }}
      </p>
    </section>
  </div>
</template>
