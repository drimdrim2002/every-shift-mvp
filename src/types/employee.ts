export interface Employee {
  id: string // UUID
  organizationId: string // UUID
  employeeId: string // 직번 (예: "40627")
  name: string // 이름 (예: "박지현")
  availableShifts: string[] // ["D", "E", "N", "O"]
  createdAt?: string
  updatedAt?: string
}

// 직원 입력용 타입 (Step3에서 사용)
export interface EmployeeInput {
  employeeId: string // 직번 (선택 - 미입력 시 자동 생성)
  name: string // 이름
  availableShifts: string[] // ["D", "E", "N", "O"]
}
