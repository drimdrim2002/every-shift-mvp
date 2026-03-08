import { ref } from 'vue'
import * as requirementsApi from '@/api/site-staffing-requirement'
import type {
  SiteStaffingRequirement,
  SiteStaffingRequirementInput,
  MonthlyRequirement,
} from '@/types/site-staffing-requirement'

/**
 * useSiteStaffingRequirements
 *
 * Manages loading, editing, and monthly expansion of site_staffing_requirements.
 * This composable targets the service-native `site_staffing_requirements` table
 * (migration 007). The legacy `useSiteRequirements` composable targets the
 * `site_requirements` table and is used by the schedule wizard until P6.
 *
 * Usage:
 *   const { requirements, loadForSite, saveAll, expandToMonth } =
 *     useSiteStaffingRequirements()
 */
export function useSiteStaffingRequirements() {
  const requirements = ref<SiteStaffingRequirement[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Load requirements for a specific site (or entire org if siteId omitted).
   *
   * @param orgId   - Organization ID
   * @param siteId  - Optional site ID filter
   */
  async function loadForSite(orgId: string, siteId?: string | null): Promise<void> {
    loading.value = true
    error.value = null
    try {
      requirements.value = await requirementsApi.loadRequirements(orgId, siteId)
    } catch (err) {
      error.value = err instanceof Error ? err.message : '데이터 로드 실패'
    } finally {
      loading.value = false
    }
  }

  /**
   * Bulk-save (upsert) a set of requirements.
   * Unique constraint: uq_site_staffing_requirements_scope
   *
   * @param inputs - Requirements to upsert
   * @returns      - Success/error result
   */
  async function saveAll(
    inputs: SiteStaffingRequirementInput[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const saved = await requirementsApi.upsertRequirements(inputs)
      // Merge saved rows back into local state
      const savedIds = new Set(saved.map((r) => r.id))
      requirements.value = [
        ...requirements.value.filter((r) => !savedIds.has(r.id)),
        ...saved,
      ]
      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : '저장 실패'
      return { success: false, error: message }
    }
  }

  /**
   * Expand weekly requirements to every calendar day of a given month.
   *
   * Each requirement has a `dayOfWeek` (0=Sunday … 6=Saturday).
   * This function iterates each calendar day of the target month and emits
   * one MonthlyRequirement entry per matching requirement row.
   *
   * @param reqs       - Day-of-week requirements to expand
   * @param yearMonth  - Target month in "YYYY-MM" format (e.g. "2026-03")
   * @returns          - One entry per (date × shift × skill × rank)
   *
   * Edge cases:
   *  - Leap year February → 29 days emitted correctly via Date(year, month, 0)
   *  - Empty requirements → returns []
   *  - Month boundary alignment: day 1 always uses the correct day-of-week
   */
  function expandToMonth(
    reqs: SiteStaffingRequirement[],
    yearMonth: string
  ): MonthlyRequirement[] {
    const [year, month] = yearMonth.split('-').map(Number)
    const daysInMonth = new Date(year, month, 0).getDate()
    const result: MonthlyRequirement[] = []

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day)
      const dow = date.getDay() // 0 = Sunday, 6 = Saturday
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

      const matchingReqs = reqs.filter((r) => r.dayOfWeek === dow)

      for (const req of matchingReqs) {
        result.push({
          date: dateStr,
          dayOfWeek: dow,
          siteId: req.siteId,
          shiftId: req.shiftId,
          requiredCount: req.requiredCount,
          skillId: req.skillId,
          rankId: req.rankId,
        })
      }
    }

    return result
  }

  return {
    requirements,
    loading,
    error,
    loadForSite,
    saveAll,
    expandToMonth,
  }
}
