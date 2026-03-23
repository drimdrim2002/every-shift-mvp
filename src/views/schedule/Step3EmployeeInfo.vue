<template>
  <div class="mx-auto max-w-7xl px-4">
    <StepIndicator
      v-if="!isOnboardingEmployeeSeedMode"
      :current-step="3"
    />

    <n-card title="근무표 생성 - 직원 정보 입력">
      <div
        v-if="showOnboardingBanner"
        class="mb-6 rounded-2xl border border-sky-200 bg-sky-50 px-5 py-4"
      >
        <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p class="text-sm font-semibold text-sky-700">
              2단계: 첫 직원 등록
            </p>
            <p class="mt-1 text-sm leading-6 text-slate-600">
              직원을 1명 이상 저장하면 온보딩으로 돌아가 다음 단계를 진행할 수 있습니다.
            </p>
          </div>
          <n-button
            secondary
            @click="handleReturnToOnboarding"
          >
            온보딩으로 돌아가기
          </n-button>
        </div>
      </div>

      <n-alert
        type="info"
        class="mb-6"
      >
        {{
          activeTab === 'excel'
            ? '직원 정보를 엑셀로 업로드한 뒤 저장하세요.'
            : '직원 정보를 입력하세요. 엑셀 파일을 업로드하거나 직접 입력할 수 있습니다.'
        }}
      </n-alert>

      <n-tabs
        v-model:value="activeTab"
        type="line"
        class="mb-6"
      >
        <n-tab-pane
          name="manual"
          tab="직접 입력"
        >
          <EmployeeTable
            :employees="employees"
            :shifts="shifts"
            @add="handleAddEmployee"
            @edit="handleEditEmployee"
            @delete="handleDeleteEmployee"
          />
        </n-tab-pane>

        <n-tab-pane
          name="excel"
          tab="엑셀 업로드"
        >
          <EmployeeExcelUpload
            :shifts="shifts"
            @upload="handleExcelUpload"
          />

          <div
            v-if="employees.length > 0"
            class="mt-6"
          >
            <h4 class="mb-4 text-lg font-medium">
              업로드된 직원 목록 ({{ employees.length }}명)
            </h4>
            <EmployeeTable
              :employees="employees"
              :shifts="shifts"
              @add="handleAddEmployee"
              @edit="handleEditEmployee"
              @delete="handleDeleteEmployee"
            />
          </div>
        </n-tab-pane>
      </n-tabs>

      <div class="flex justify-between pt-6">
        <div>
          <n-popconfirm
            v-if="!isOnboardingEmployeeSeedMode"
            @positive-click="handlePrev"
          >
            <template #trigger>
              <n-button size="medium">
                ← 이전
              </n-button>
            </template>
            이전 단계로 돌아가면 현재 입력한 데이터가 초기화됩니다. 계속하시겠습니까?
          </n-popconfirm>
        </div>
        <div class="flex gap-4">
          <n-button
            size="medium"
            :disabled="!canProceed"
            :loading="isSaving"
            @click="handleSave"
          >
            {{ hasUnsavedChanges ? '저장 *' : '저장' }}
          </n-button>
          <n-button
            v-if="isOnboardingEmployeeSeedMode"
            type="primary"
            size="medium"
            :disabled="hasUnsavedChanges"
            @click="handleReturnToOnboarding"
          >
            온보딩으로 돌아가기
          </n-button>
          <n-button
            v-else
            type="primary"
            size="medium"
            :disabled="!canProceed || hasUnsavedChanges"
            @click="handleNext"
          >
            다음 단계 →
          </n-button>
        </div>
      </div>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NAlert, NButton, NCard, NPopconfirm, NTabPane, NTabs } from 'naive-ui'
import StepIndicator from '@/components/schedule/StepIndicator.vue'
import EmployeeExcelUpload from '@/components/schedule/EmployeeExcelUpload.vue'
import EmployeeTable from '@/components/schedule/EmployeeTable.vue'
import { deleteOrganizationEmployees, createEmployeesBatch } from '@/api/employee'
import { getScheduleStatus } from '@/api/schedule'
import { supabase } from '@/api/supabase'
import { useOrganizationStore } from '@/stores/organization'
import { useRbacStore } from '@/stores/rbac'
import { useScheduleStore } from '@/stores/schedule'
import type { EmployeeInput } from '@/types/employee'
import type { Shift } from '@/types/shift'
import { buildOnboardingQuery, resolveOnboardingRouteContext } from '@/utils/onboarding-context'
import { showError, showInfo, showSuccess, showWarning } from '@/utils/message'

const route = useRoute()
const router = useRouter()
const rbacStore = useRbacStore()
const scheduleStore = useScheduleStore()
const orgStore = useOrganizationStore()

const activeTab = ref<'manual' | 'excel'>('manual')
const employees = ref<EmployeeInput[]>([])
const isSaving = ref(false)
const hasUnsavedChanges = ref(false)

interface EmployeeDbRow {
  employee_id: string
  name: string
  available_shifts: string[] | null
}

function isEmployeeDbRow(value: unknown): value is EmployeeDbRow {
  if (!value || typeof value !== 'object') {
    return false
  }

  const row = value as Record<string, unknown>
  return (
    typeof row.employee_id === 'string' &&
    typeof row.name === 'string' &&
    (row.available_shifts === null || Array.isArray(row.available_shifts))
  )
}

function getQueryText(value: unknown): string | null {
  if (Array.isArray(value)) {
    const candidate = value.find((item) => typeof item === 'string' && item.trim().length > 0)
    return typeof candidate === 'string' ? candidate : null
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    return value
  }

  return null
}

const onboardingContext = computed(() => resolveOnboardingRouteContext(route.query))
const isOnboardingEmployeeSeedMode = computed(
  () => onboardingContext.value.isOnboardingSource && onboardingContext.value.step === 'employee_seed',
)
const showOnboardingBanner = computed(() => isOnboardingEmployeeSeedMode.value)
const activeOrganizationId = computed(
  () => scheduleStore.basicInfo?.organizationId ?? rbacStore.effectiveMembership?.organizationId ?? null,
)
const shifts = computed<Shift[]>(() => scheduleStore.basicInfo?.shifts || orgStore.shifts || [])
const canProceed = computed(() => employees.value.length > 0)

async function initializePage() {
  const organizationId = activeOrganizationId.value
  if (!organizationId) {
    showError('조직 정보를 확인할 수 없습니다.')
    return
  }

  if (!scheduleStore.basicInfo && !isOnboardingEmployeeSeedMode.value) {
    await router.push('/schedule/step1')
    return
  }

  if (!orgStore.current || orgStore.current.id !== organizationId) {
    await orgStore.loadOrganization(organizationId)
  }

  if (isOnboardingEmployeeSeedMode.value) {
    activeTab.value = onboardingContext.value.entry === 'excel' ? 'excel' : 'manual'

    const rawEntry = getQueryText(route.query.entry)
    if (rawEntry && onboardingContext.value.entry === null) {
      showInfo(
        '직원 등록 화면으로 이동했습니다. 엑셀 업로드 경로를 확인할 수 없어 직접 입력 화면을 먼저 보여드립니다.',
      )
    }

    const rawReturnTo = getQueryText(route.query.returnTo)
    if (rawReturnTo && rawReturnTo !== onboardingContext.value.returnTo) {
      showInfo('온보딩 복귀 경로를 확인할 수 없어 온보딩 첫 화면으로 돌아가도록 안내합니다.')
    }
  }

  if (scheduleStore.employees.length > 0) {
    employees.value = [...scheduleStore.employees]
    hasUnsavedChanges.value = false
    return
  }

  await loadEmployeesFromDatabase(organizationId)
}

async function loadEmployeesFromDatabase(organizationId: string) {
  try {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('organization_id', organizationId)
      .order('employee_id')

    if (error) {
      console.error('[Step3] Load employees error:', error)
      return
    }

    if (data && data.length > 0) {
      employees.value = (data as unknown[]).filter(isEmployeeDbRow).map((emp) => ({
        employeeId: emp.employee_id,
        name: emp.name,
        availableShifts: emp.available_shifts ?? [],
      }))
      hasUnsavedChanges.value = false
    } else {
      hasUnsavedChanges.value = false
    }
  } catch (error) {
    console.error('[Step3] Failed to load employees:', error)
  }
}

function handleAddEmployee(employee: EmployeeInput) {
  employees.value = [...employees.value, employee]
  hasUnsavedChanges.value = true
}

function handleEditEmployee(index: number, employee: EmployeeInput) {
  const updated = [...employees.value]
  updated[index] = employee
  employees.value = updated
  hasUnsavedChanges.value = true
}

function handleDeleteEmployee(index: number) {
  employees.value = employees.value.filter((_, currentIndex) => currentIndex !== index)
  hasUnsavedChanges.value = true
}

function handleExcelUpload(uploadedEmployees: EmployeeInput[]) {
  employees.value = uploadedEmployees
  hasUnsavedChanges.value = true
  showSuccess(`${uploadedEmployees.length}명의 직원이 업로드되었습니다.`)
}

async function handleSave() {
  if (employees.value.length === 0) {
    showWarning('최소 1명 이상의 직원을 등록해주세요.')
    return
  }

  const organizationId = activeOrganizationId.value
  if (!organizationId) {
    showError('조직 정보를 확인할 수 없습니다.')
    return
  }

  isSaving.value = true

  try {
    const { data: existingEmployees } = await supabase
      .from('employees')
      .select('id')
      .eq('organization_id', organizationId)

    if (existingEmployees && existingEmployees.length > 0) {
      const employeeIds = existingEmployees.map((employee) => employee.id)
      const { error: assignmentError } = await supabase
        .from('schedule_assignments')
        .delete()
        .in('employee_id', employeeIds)

      if (assignmentError) {
        console.error('[handleSave] Assignment delete error:', assignmentError)
        throw new Error(`배정 데이터 삭제 실패: ${assignmentError.message}`)
      }
    }

    if (scheduleStore.basicInfo) {
      const { error: scheduleDeleteError } = await supabase
        .from('schedules')
        .delete()
        .eq('organization_id', organizationId)
        .eq('month', scheduleStore.basicInfo.month)

      if (scheduleDeleteError) {
        console.error('[Step3] Schedule delete error:', scheduleDeleteError)
        console.warn('[Step3] Failed to delete schedules, continuing...')
      }
    }

    await deleteOrganizationEmployees(organizationId)
    await createEmployeesBatch(organizationId, employees.value)

    scheduleStore.setEmployees(employees.value)
    if (scheduleStore.basicInfo) {
      scheduleStore.setBasicInfo({
        ...scheduleStore.basicInfo,
        employeeCount: employees.value.length,
      })
    }

    if (scheduleStore.basicInfo) {
      const storageKey = `everyshift_temp_schedule_${scheduleStore.basicInfo.month}`
      localStorage.removeItem(storageKey)
    }

    scheduleStore.setAssignments({})
    hasUnsavedChanges.value = false

    showSuccess('직원 정보가 저장되었습니다.')
  } catch (error) {
    showError(error instanceof Error ? error.message : '저장 중 오류가 발생했습니다.')
  } finally {
    isSaving.value = false
  }
}

function handlePrev() {
  scheduleStore.prevStep()
  router.push('/schedule/step2')
}

async function getTargetScheduleForNextStep(): Promise<{ id: string; status: string } | null> {
  const basicInfo = scheduleStore.basicInfo
  if (!basicInfo) return null

  if (basicInfo.scheduleId) {
    try {
      const schedule = await getScheduleStatus(basicInfo.scheduleId)
      if (schedule?.id && schedule?.status) {
        return { id: schedule.id, status: schedule.status }
      }
    } catch (error) {
      console.warn('[Step3] Failed to load schedule by id:', error)
    }
  }

  try {
    const { data, error } = await supabase
      .from('schedules')
      .select('id, status')
      .eq('organization_id', basicInfo.organizationId)
      .eq('month', basicInfo.month)
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) {
      console.warn('[Step3] Failed to load latest schedule:', error)
      return null
    }

    const latest = data?.[0]
    if (!latest || !latest.id || !latest.status) return null

    return { id: latest.id, status: latest.status }
  } catch (error) {
    console.warn('[Step3] Failed to query latest schedule:', error)
    return null
  }
}

async function handleNext() {
  if (employees.value.length === 0) {
    showWarning('최소 1명 이상의 직원을 등록해주세요.')
    return
  }

  if (hasUnsavedChanges.value) {
    showWarning('변경사항을 먼저 저장해주세요.')
    return
  }

  if (scheduleStore.basicInfo) {
    scheduleStore.setEmployees(employees.value)
    scheduleStore.setBasicInfo({
      ...scheduleStore.basicInfo,
      employeeCount: employees.value.length,
    })
  }

  const targetSchedule = await getTargetScheduleForNextStep()

  if (targetSchedule && (targetSchedule.status === 'complete' || targetSchedule.status === 'changed')) {
    if (scheduleStore.basicInfo) {
      scheduleStore.setBasicInfo({
        ...scheduleStore.basicInfo,
        scheduleId: targetSchedule.id,
      })
    }
    scheduleStore.currentStep = 5
    router.push(`/schedule/step5/${targetSchedule.id}`)
    return
  }

  scheduleStore.nextStep()
  router.push('/schedule/step4')
}

function navigateBackToOnboarding() {
  router.push({
    path: onboardingContext.value.returnTo,
    query: buildOnboardingQuery({
      step: 'employee_seed',
      returnTo: onboardingContext.value.returnTo,
      returnStep: onboardingContext.value.returnStep ?? 'employee_seed',
      resumeStep: onboardingContext.value.returnStep ?? 'employee_seed',
    }),
  })
}

function handleReturnToOnboarding() {
  if (!isOnboardingEmployeeSeedMode.value) {
    return
  }

  if (hasUnsavedChanges.value) {
    window.$dialog?.warning({
      title: '저장되지 않은 변경사항',
      content: '저장되지 않은 직원 정보가 있습니다. 온보딩으로 돌아가면 현재 변경사항이 사라질 수 있습니다.',
      positiveText: '그래도 돌아가기',
      negativeText: '계속 편집',
      onPositiveClick: () => {
        navigateBackToOnboarding()
      },
    })
    return
  }

  navigateBackToOnboarding()
}

onMounted(() => {
  void initializePage()
})
</script>
