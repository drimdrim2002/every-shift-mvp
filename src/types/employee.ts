export interface Employee {
  id: string // UUID
  organizationId: string // UUID
  employeeId: string // 직번 (예: "40627")
  name: string // 이름 (예: "박지현")
  availableShifts: string[] // ["D", "E", "N", "O"]
  createdAt?: string
  updatedAt?: string
}
