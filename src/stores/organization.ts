import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/api/supabase'
import * as organizationApi from '@/api/organization'
import * as shiftApi from '@/api/shift'
import type { Organization } from '@/types/organization'
import type { Employee } from '@/types/employee'
import type { Shift } from '@/types/shift'
import { resolveAuthScope } from '@/utils/authScope'

// Supabase 응답 타입 정의 (snake_case)
interface OrganizationRow {
  id: string
  name: string
  type: string
  created_at?: string
  updated_at?: string
}

interface EmployeeRow {
  id: string
  organization_id: string
  employee_id: string
  name: string
  available_shifts: string[]
  created_at?: string
  updated_at?: string
}

interface ShiftRow {
  id: string
  organization_id: string
  code: string
  name: string
  color_code: string
  start_time: string | null
  end_time: string | null
  created_at?: string
}

type OrganizationMetadata = Record<string, unknown> | null | undefined

export const useOrganizationStore = defineStore('organization', () => {
  const current = ref<Organization | null>(null)
  const employees = ref<Employee[]>([])
  const shifts = ref<Shift[]>([])
  const loading = ref(false)

  function readOrganizationIdFromMetadata(metadata: OrganizationMetadata): string | null {
    const keys = [
      'organizationId',
      'organization_id',
      'currentOrganizationId',
      'current_organization_id',
    ] as const

    for (const key of keys) {
      const value = metadata?.[key]
      if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim()
      }
    }

    return null
  }

  async function fetchOrganizationById(orgId: string): Promise<OrganizationRow | null> {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .limit(1)

    if (error) throw error

    return (data as OrganizationRow[])[0] ?? null
  }

  async function resolveOrganization(orgId?: string): Promise<OrganizationRow> {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

    if (sessionError) throw sessionError

    const sessionUser = sessionData.session?.user
    const authScope = resolveAuthScope(sessionUser)
    const explicitOrgId = typeof orgId === 'string' && orgId.trim().length > 0 ? orgId.trim() : null
    const metadataOrgIds = [
      readOrganizationIdFromMetadata(sessionUser?.app_metadata as OrganizationMetadata),
      readOrganizationIdFromMetadata(sessionUser?.user_metadata as OrganizationMetadata),
    ].filter((value): value is string => !!value)

    if (sessionUser && !authScope?.organizationId) {
      throw new Error('로그인 계정에 organization_id 메타데이터가 없습니다.')
    }

    if (explicitOrgId && metadataOrgIds.length > 0 && !metadataOrgIds.includes(explicitOrgId)) {
      throw new Error('요청한 조직과 로그인 계정의 organization_id가 일치하지 않습니다.')
    }

    const resolvedOrgId = explicitOrgId ?? authScope?.organizationId ?? metadataOrgIds[0] ?? null

    if (!resolvedOrgId) {
      throw new Error('접근 가능한 조직 정보가 없습니다.')
    }

    const organization = await fetchOrganizationById(resolvedOrgId)

    if (!organization) {
      throw new Error('로그인 계정의 organization_id에 해당하는 조직을 찾을 수 없습니다.')
    }

    return organization
  }

  /**
   * 조직 정보 로드 (직원, 시프트 포함)
   */
  async function loadOrganization(orgId?: string) {
    loading.value = true
    try {
      // 조직 정보
      const org = await resolveOrganization(orgId)
      const resolvedOrgId = org.id

      current.value = {
        id: org.id,
        name: org.name,
        type: org.type,
        createdAt: org.created_at,
        updatedAt: org.updated_at,
      }

      // 직원 목록
      const { data: empData, error: empError } = await supabase
        .from('employees')
        .select('*')
        .eq('organization_id', resolvedOrgId)

      if (empError) throw empError

      // Snake_case to camelCase 변환
      employees.value = (empData as EmployeeRow[]).map((emp) => ({
        id: emp.id,
        organizationId: emp.organization_id,
        employeeId: emp.employee_id,
        name: emp.name,
        availableShifts: emp.available_shifts,
        createdAt: emp.created_at,
        updatedAt: emp.updated_at,
      }))

      // 시프트 정의
      const { data: shiftData, error: shiftError } = await supabase
        .from('shifts')
        .select('*')
        .eq('organization_id', resolvedOrgId)

      if (shiftError) throw shiftError

      // Snake_case to camelCase 변환
      // hh:mm:ss 형태를 hh:mm로 변환
      const formatTime = (time: string | null): string | null => {
        if (!time) return null
        const parts = time.split(':')
        return `${parts[0]}:${parts[1]}`
      }

      shifts.value = (shiftData as ShiftRow[]).map((shift) => ({
        id: shift.id,
        organizationId: shift.organization_id,
        code: shift.code,
        name: shift.name,
        colorCode: shift.color_code,
        startTime: formatTime(shift.start_time),
        endTime: formatTime(shift.end_time),
        createdAt: shift.created_at,
      }))

      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, error: message }
    } finally {
      loading.value = false
    }
  }

  /**
   * 새 조직 생성
   */
  async function createOrganization(orgData: Omit<Organization, 'id' | 'createdAt' | 'updatedAt'>) {
    loading.value = true
    try {
      const newOrg = await organizationApi.createOrganization(orgData)
      current.value = newOrg
      employees.value = []
      shifts.value = []
      return { success: true, organization: newOrg }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, error: message }
    } finally {
      loading.value = false
    }
  }

  /**
   * 현재 조직 수정
   */
  async function updateCurrentOrganization(orgData: Partial<Omit<Organization, 'id' | 'createdAt' | 'updatedAt'>>) {
    if (!current.value) {
      return { success: false, error: '수정할 조직이 선택되지 않았습니다.' }
    }

    loading.value = true
    try {
      await organizationApi.updateOrganization(current.value.id, orgData)
      // 로컬 상태 업데이트
      current.value = {
        ...current.value,
        ...orgData,
      }
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, error: message }
    } finally {
      loading.value = false
    }
  }

  /**
   * 시프트만 로드
   */
  async function loadShifts(orgId: string) {
    try {
      const loadedShifts = await shiftApi.loadShifts(orgId)
      shifts.value = loadedShifts
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, error: message }
    }
  }

  /**
   * 시프트 추가
   */
  async function addShift(shiftData: Omit<Shift, 'id' | 'organizationId' | 'createdAt'>) {
    if (!current.value) {
      return { success: false, error: '조직이 선택되지 않았습니다.' }
    }

    try {
      const newShift = await shiftApi.createShift(current.value.id, shiftData)
      shifts.value = [...shifts.value, newShift]
      return { success: true, shift: newShift }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, error: message }
    }
  }

  /**
   * 시프트 수정
   */
  async function updateShift(
    shiftId: string,
    shiftData: Partial<Omit<Shift, 'id' | 'organizationId' | 'createdAt'>>
  ) {
    try {
      await shiftApi.updateShift(shiftId, shiftData)
      // 로컬 상태 업데이트
      shifts.value = shifts.value.map((shift) =>
        shift.id === shiftId ? { ...shift, ...shiftData } : shift
      )
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, error: message }
    }
  }

  /**
   * 시프트 삭제
   */
  async function deleteShift(shiftId: string) {
    try {
      await shiftApi.deleteShift(shiftId)
      // 로컬 상태에서 제거
      shifts.value = shifts.value.filter((shift) => shift.id !== shiftId)
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, error: message }
    }
  }

  /**
   * 모든 시프트를 새 목록으로 교체
   */
  async function replaceAllShifts(newShifts: Omit<Shift, 'id' | 'organizationId' | 'createdAt'>[]) {
    if (!current.value) {
      return { success: false, error: '조직이 선택되지 않았습니다.' }
    }

    try {
      const replacedShifts = await shiftApi.replaceAllShifts(current.value.id, newShifts)
      shifts.value = replacedShifts
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, error: message }
    }
  }

  /**
   * 로컬 시프트 추가 (DB 저장 없이)
   */
  function addLocalShift(shiftData: Omit<Shift, 'id' | 'organizationId' | 'createdAt'>) {
    const tempShift: Shift = {
      ...shiftData,
      id: `temp-${Date.now()}`,
      organizationId: current.value?.id || '',
    }
    shifts.value = [...shifts.value, tempShift]
    return tempShift
  }

  /**
   * 로컬 시프트 수정 (DB 저장 없이)
   */
  function updateLocalShift(shiftId: string, shiftData: Partial<Omit<Shift, 'id' | 'organizationId' | 'createdAt'>>) {
    shifts.value = shifts.value.map((shift) =>
      shift.id === shiftId ? { ...shift, ...shiftData } : shift
    )
  }

  /**
   * 로컬 시프트 삭제 (DB 저장 없이)
   */
  function deleteLocalShift(shiftId: string) {
    shifts.value = shifts.value.filter((shift) => shift.id !== shiftId)
  }

  /**
   * 스토어 초기화
   */
  function resetStore() {
    current.value = null
    employees.value = []
    shifts.value = []
    loading.value = false
  }

  return {
    // State
    current,
    employees,
    shifts,
    loading,
    // Actions - Organization
    loadOrganization,
    createOrganization,
    updateCurrentOrganization,
    // Actions - Shifts (DB)
    loadShifts,
    addShift,
    updateShift,
    deleteShift,
    replaceAllShifts,
    // Actions - Shifts (Local only)
    addLocalShift,
    updateLocalShift,
    deleteLocalShift,
    // Actions - Reset
    resetStore,
  }
})
