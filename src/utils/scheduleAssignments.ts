import type { AssignmentMap } from '@/types/schedule';

/**
 * True when at least one non-empty shift code exists.
 * When `month` is provided (YYYY-MM), only dates for that month count.
 * Saved `O` counts as usable data; empty/whitespace cells do not.
 */
export function hasUsableAssignments(
  assignments: AssignmentMap | null | undefined,
  month?: string | null,
): boolean {
  if (!assignments) {
    return false;
  }

  const monthPrefix = typeof month === 'string' && month.trim() !== '' ? month.trim() : null;

  return Object.values(assignments).some((dateMap) => {
    return Object.entries(dateMap || {}).some(([date, shiftCode]) => {
      if (monthPrefix && !date.startsWith(monthPrefix)) {
        return false;
      }

      return Boolean(typeof shiftCode === 'string' ? shiftCode.trim() : shiftCode);
    });
  });
}
