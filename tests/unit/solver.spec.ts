import { describe, it, expect, vi } from 'vitest'
import { requestAISolver, type SolverPayload } from '@/api/solver'
import type { Employee } from '@/types/employee'

// Mock employee data
const mockEmployees: Employee[] = [
  {
    id: 'emp-1',
    organization_id: 'org-1',
    name: '김간호',
    employee_number: 'N001',
    available_shifts: ['D', 'E', 'N', 'O'],
    is_active: true,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
  {
    id: 'emp-2',
    organization_id: 'org-1',
    name: '이간호',
    employee_number: 'N002',
    available_shifts: ['D', 'E', 'N', 'O'],
    is_active: true,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
  {
    id: 'emp-3',
    organization_id: 'org-1',
    name: '박간호',
    employee_number: 'N003',
    available_shifts: ['D', 'N'],
    is_active: true,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
]

// Mock payload
function createMockPayload(overrides?: Partial<SolverPayload>): SolverPayload {
  return {
    scheduleId: 'schedule-123',
    employees: mockEmployees,
    requirements: {
      '2024-01-01': { D: 10, E: 8, N: 5, O: 7 },
      '2024-01-02': { D: 10, E: 8, N: 5, O: 7 },
      '2024-01-03': { D: 10, E: 8, N: 5, O: 7 },
    },
    lastMonthAssignments: {
      'emp-1': { '2023-12-27': 'D', '2023-12-28': 'E', '2023-12-29': 'N', '2023-12-30': 'O', '2023-12-31': 'D' },
      'emp-2': { '2023-12-27': 'E', '2023-12-28': 'N', '2023-12-29': 'O', '2023-12-30': 'D', '2023-12-31': 'E' },
      'emp-3': { '2023-12-27': 'D', '2023-12-28': 'N', '2023-12-29': 'D', '2023-12-30': 'N', '2023-12-31': 'D' },
    },
    thisMonthAssignments: {
      'emp-1': { '2024-01-01': 'D' },
      'emp-2': {},
      'emp-3': {},
    },
    ...overrides,
  }
}

describe('Mock AI Solver', () => {
  describe('requestAISolver', () => {
    it('should return complete status after delay', async () => {
      vi.useFakeTimers()
      const payload = createMockPayload()

      const promise = requestAISolver(payload)
      vi.advanceTimersByTime(5000)

      const result = await promise

      expect(result.status).toBe('complete')
      expect(result.scheduleId).toBe(payload.scheduleId)

      vi.useRealTimers()
    }, 10000)

    it('should return valid hardScore and softScore', async () => {
      vi.useFakeTimers()
      const payload = createMockPayload()

      const promise = requestAISolver(payload)
      vi.advanceTimersByTime(5000)

      const result = await promise

      expect(result.hardScore).toBe(0)
      expect(result.softScore).toBeGreaterThanOrEqual(100)
      expect(result.softScore).toBeLessThan(200)

      vi.useRealTimers()
    }, 10000)
  })

  describe('generateMockAssignments', () => {
    it('should generate assignments for all employees', async () => {
      vi.useFakeTimers()
      const payload = createMockPayload()

      const promise = requestAISolver(payload)
      vi.advanceTimersByTime(5000)

      const result = await promise

      // All employees should have assignments
      expect(Object.keys(result.assignments)).toHaveLength(mockEmployees.length)

      for (const emp of mockEmployees) {
        expect(result.assignments[emp.id]).toBeDefined()
      }

      vi.useRealTimers()
    }, 10000)

    it('should preserve last month assignments', async () => {
      vi.useFakeTimers()
      const payload = createMockPayload()

      const promise = requestAISolver(payload)
      vi.advanceTimersByTime(5000)

      const result = await promise

      // Check that last month data is preserved
      expect(result.assignments['emp-1']['2023-12-27']).toBe('D')
      expect(result.assignments['emp-1']['2023-12-28']).toBe('E')
      expect(result.assignments['emp-1']['2023-12-29']).toBe('N')
      expect(result.assignments['emp-1']['2023-12-30']).toBe('O')
      expect(result.assignments['emp-1']['2023-12-31']).toBe('D')

      expect(result.assignments['emp-2']['2023-12-27']).toBe('E')
      expect(result.assignments['emp-3']['2023-12-31']).toBe('D')

      vi.useRealTimers()
    }, 10000)

    it('should preserve this month partial assignments', async () => {
      vi.useFakeTimers()
      const payload = createMockPayload()

      const promise = requestAISolver(payload)
      vi.advanceTimersByTime(5000)

      const result = await promise

      // Check that partial this month data is preserved
      expect(result.assignments['emp-1']['2024-01-01']).toBe('D')

      vi.useRealTimers()
    }, 10000)

    it('should fill empty dates with valid shifts', async () => {
      vi.useFakeTimers()
      const payload = createMockPayload()

      const promise = requestAISolver(payload)
      vi.advanceTimersByTime(5000)

      const result = await promise
      const validShifts = ['D', 'E', 'N', 'O']

      // Check that empty dates are filled with valid shifts
      for (const emp of mockEmployees) {
        for (const date of Object.keys(payload.requirements)) {
          const shift = result.assignments[emp.id][date]
          expect(validShifts).toContain(shift)
        }
      }

      vi.useRealTimers()
    }, 10000)

    it('should respect available_shifts constraints', async () => {
      vi.useFakeTimers()
      const payload = createMockPayload()

      const promise = requestAISolver(payload)
      vi.advanceTimersByTime(5000)

      const result = await promise

      // Check that only available shifts are assigned
      for (const emp of mockEmployees) {
        const availableShifts = emp.available_shifts || ['D', 'E', 'N', 'O']

        for (const date of Object.keys(payload.requirements)) {
          const shift = result.assignments[emp.id][date]
          expect(availableShifts).toContain(shift)
        }
      }

      // Specifically check emp-3 who only has ['D', 'N']
      const emp3Assignments = result.assignments['emp-3']
      for (const date of Object.keys(payload.requirements)) {
        const shift = emp3Assignments[date]
        expect(['D', 'N']).toContain(shift)
      }

      vi.useRealTimers()
    }, 10000)

    it('should handle empty lastMonthAssignments', async () => {
      vi.useFakeTimers()
      const payload = createMockPayload({
        lastMonthAssignments: {},
      })

      const promise = requestAISolver(payload)
      vi.advanceTimersByTime(5000)

      const result = await promise

      // Should still generate assignments without errors
      expect(result.status).toBe('complete')
      expect(Object.keys(result.assignments)).toHaveLength(mockEmployees.length)

      vi.useRealTimers()
    }, 10000)

    it('should handle empty thisMonthAssignments', async () => {
      vi.useFakeTimers()
      const payload = createMockPayload({
        thisMonthAssignments: {},
      })

      const promise = requestAISolver(payload)
      vi.advanceTimersByTime(5000)

      const result = await promise

      // Should still generate assignments without errors
      expect(result.status).toBe('complete')
      expect(Object.keys(result.assignments)).toHaveLength(mockEmployees.length)

      vi.useRealTimers()
    }, 10000)
  })

  describe('data integrity', () => {
    it('should not mutate original payload', async () => {
      vi.useFakeTimers()
      const payload = createMockPayload()
      const originalPayload = JSON.parse(JSON.stringify(payload))

      const promise = requestAISolver(payload)
      vi.advanceTimersByTime(5000)

      await promise

      expect(payload).toEqual(originalPayload)

      vi.useRealTimers()
    }, 10000)

    it('should return consistent structure', async () => {
      vi.useFakeTimers()
      const payload = createMockPayload()

      const promise = requestAISolver(payload)
      vi.advanceTimersByTime(5000)

      const result = await promise

      // Check response structure
      expect(result).toHaveProperty('scheduleId')
      expect(result).toHaveProperty('status')
      expect(result).toHaveProperty('hardScore')
      expect(result).toHaveProperty('softScore')
      expect(result).toHaveProperty('assignments')

      expect(typeof result.scheduleId).toBe('string')
      expect(typeof result.status).toBe('string')
      expect(typeof result.hardScore).toBe('number')
      expect(typeof result.softScore).toBe('number')
      expect(typeof result.assignments).toBe('object')

      vi.useRealTimers()
    }, 10000)
  })
})
