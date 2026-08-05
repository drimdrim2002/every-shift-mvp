# Empty Finalized Schedules — Ops Report

## What this is

A schedule month can be **finalized** (or marked complete) while
`schedule_assignments` for that finalized version has **zero rows**.

- **생성된 근무표** lists months from `schedules` (container/status).
- **근무 기록** aggregates from `schedule_assignments` on `finalized_version_id`.

Empty finalized months therefore appear in the list UI but show no performance rows.

Guards added in `migrations/20260805_120000_empty_assignment_guards.sql` block **new**
empty completes/finalizes. Existing bad rows need manual recovery.

## Find affected months

```sql
SELECT
  s.organization_id,
  s.month,
  s.id AS schedule_id,
  s.finalized_version_id,
  count(sa.id) AS assignment_count
FROM schedules s
LEFT JOIN schedule_assignments sa
  ON sa.schedule_version_id = s.finalized_version_id
WHERE s.finalized_version_id IS NOT NULL
GROUP BY 1, 2, 3, 4
HAVING count(sa.id) = 0
ORDER BY s.month;
```

## Recovery steps

1. Open **생성된 근무표** for the month (tile may show **배정 없음**).
2. Prefer **unfinalize** if the product action is available for that version.
3. Re-run AI generation (or restore assignments) so `schedule_assignments` has rows.
4. Recheck → finalize again (finalize now fails with `empty_assignments` if still empty).

Do **not** auto-unfinalize in bulk migrations without product approval.
