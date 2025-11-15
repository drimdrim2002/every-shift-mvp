import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/api/supabase'
import type { Organization } from '@/types/organization'
import type { Employee } from '@/types/employee'
import type { Shift } from '@/types/shift'

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

export const useOrganizationStore = defineStore('organization', () => {
  const current = ref<Organization | null>(null)
  const employees = ref<Employee[]>([])
  const shifts = ref<Shift[]>([])
  const loading = ref(false)

  /**
   * 조직 정보 로드 (직원, 시프트 포함)
   */
  async function loadOrganization(orgId: string) {
    loading.value = true
    try {
      // 조직 정보
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single()

      if (orgError) throw orgError

      // Snake_case to camelCase 변환
      const org = orgData as OrganizationRow
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
        .eq('organization_id', orgId)

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
        .eq('organization_id', orgId)

      if (shiftError) throw shiftError

      // Snake_case to camelCase 변환
      shifts.value = (shiftData as ShiftRow[]).map((shift) => ({
        id: shift.id,
        organizationId: shift.organization_id,
        code: shift.code,
        name: shift.name,
        colorCode: shift.color_code,
        startTime: shift.start_time,
        endTime: shift.end_time,
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

  return {
    current,
    employees,
    shifts,
    loading,
    loadOrganization,
  }
})
