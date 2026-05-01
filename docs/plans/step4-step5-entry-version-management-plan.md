# Step4/Step5 Entry and Version Management Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix Step4/Step5 entry behavior so existing run history is checked before editing or solving, and require explicit version naming with overwrite confirmation before creating or re-running schedule versions.

**Architecture:** Keep `schedules` as the monthly container and `schedule_versions` as the source of truth for each generated candidate. Step4 owns Off-request editing and version handoff decisions; Step5 owns result review, comparison, and solver execution only when there is no existing result to show. Shared resolver helpers decide whether a version counts as an executed history and which versions should be focused or compared by default.

**Tech Stack:** Vue 3, TypeScript, Vite, Naive UI, Pinia, Supabase Edge Functions, Vitest.

---

## Summary

Step4 and Step5 must both check existing schedule/version history before continuing. If existing execution history exists, Step4 asks whether the user wants to edit Off requests or review results. Step5 shows existing results instead of immediately running the solver. When Step4 proceeds to Step5 with a solve or re-solve intent, the user must enter a version name; if that name already exists, the user must choose whether to overwrite the existing version or enter a different name.

## Product Behavior

- Step4 entry:
  - On load, call the existing schedule ensure/compare path and inspect versions.
  - If no executed history exists, stay on Step4 and allow Off input as today.
  - If executed history exists, show a modal before normal editing:
    - `Off 수정 후 다시 실행`: stay on Step4, load the selected/current version's Off requests, and allow edits.
    - `결과 확인`: navigate to Step5 with the default result focus.
  - Do not auto-create another version just because Step4 was opened.

- Step5 entry:
  - Hydrate compare/review state first.
  - If executed history exists, show the result/review hub and do not start the solver automatically.
  - If multiple executed versions exist, default comparison should show the selected version and the most recent other executed candidate.
  - If no executed history exists and the focused version is a draft with no current-month assignments, keep the current first-run behavior and allow `autoStart=1` to start solving.

- Version naming:
  - Step4 must require a version name before moving to Step5 when the move will create, overwrite, or run a version.
  - First run default: `V1`.
  - Re-run default: `V{latestVersionNo + 1}`.
  - Empty or whitespace-only names are invalid.
  - Names are compared after `trim().toLowerCase()` so `V1`, `v1`, and `v1` are duplicates.
  - Archived versions still reserve their names until this plan explicitly adds a rename/archive-name release workflow.
  - If the entered name matches an existing version, show a confirmation choice:
    - overwrite that existing version; or
    - return to the name input.
  - Finalized or currently solving versions cannot be overwritten.

## Scope and Contract Decisions

- Keep the work inside the Step4/Step5 schedule-generation flow.
- Do not add version CRUD outside the Step4 handoff and Step5 review surfaces.
- Do not wire a real solver. Keep the existing mocked solver path and current Step5 solver orchestration.
- Add the explicit Step4 edit intent as route query `intent=edit-off`. Step4 should show the existing-history modal unless this intent is present for the current entry.
- Treat "executed history" as version-level solver or review activity, not schedule container existence.
- Treat overwrite as reusing the target version row for another draft/run. Historical `schedule_evaluations` rows stay append-only, but the overwritten version must clear `latest_evaluation_id` so old evaluations are not surfaced as the current review artifact.
- Do not allow overwrite when a schedule month is finalized, when the target version is finalized, when the target version is archived, or when any version in the schedule is actively solving.
- Keep `selected_version_id` authoritative. Query parameters may change preview/focus only; they must not select the finalization target.

## File Ownership Map

- `src/utils/scheduleVersionResolver.ts`: pure resolver functions for executed-history detection, default focus, default compare IDs, and Step5 route canonicalization.
- `src/views/schedule/Step4InitialData.vue`: Step4 entry modal, edit intent handling, version name modal, duplicate-name confirmation, and Step4-to-Step5 routing.
- `src/views/schedule/Step5Result.vue`: auto-start guard after review-hub hydration.
- `src/composables/useScheduleReviewHub.ts`: central compare/focus defaulting if keeping this logic out of the view reduces duplication.
- `src/types/schedule.ts` and `src/api/schedule.ts`: frontend request/response contract for create-version.
- `supabase/functions/phase2-schedule/contracts.ts`: Edge Function parser and response contract.
- `supabase/functions/phase2-schedule/repository.ts`: duplicate-name enforcement, overwrite validation, and write operations.
- `migrations/20260501_step4_step5_version_management.sql`: SQL authority changes for normalized unique version names, create-version RPC input snapshot support, and any overwrite helper needed for atomic writes.

## Implementation Plan

### Task 0: Add SQL Authority for Version Names and Input Snapshots

**Files:**

- Create: `migrations/20260501_step4_step5_version_management.sql`
- Test: `tests/unit/phase2-schedule-write-repository.spec.ts`

- [ ] Write failing repository tests for:
  - duplicate name rejected with `version_name_exists`
  - duplicate check is trim/case-insensitive
  - create-version passes `inputSnapshot` into the SQL write path
  - overwrite is rejected when finalized, solving, archived, or when another version is solving
- [ ] Run tests to verify they fail:

```bash
pnpm test:unit -- tests/unit/phase2-schedule-write-repository.spec.ts
```

Expected: FAIL because the current Edge repository/RPC path has no normalized name contract and does not persist `inputSnapshot`.

- [ ] Add migration changes:
  - add a partial unique index for active version names using `lower(btrim(name))`
  - update `create_schedule_version_atomic` to accept `p_input_snapshot jsonb DEFAULT '{}'::jsonb`
  - insert `input_snapshot` into `schedule_versions`
  - update `REVOKE` and `GRANT` signatures for the new RPC argument list
- [ ] Add repository-side conflict remapping for the new unique index to `409 version_name_exists`.
- [ ] Run the targeted repository test again.

Expected: PASS for duplicate-name and input-snapshot contract tests.

### Task 1: Add Shared Version History Helpers

**Files:**

- Modify: `src/utils/scheduleVersionResolver.ts`
- Test: `tests/unit/schedule-version-resolver.spec.ts`

- [ ] Write failing resolver tests for no-history, single-history, multiple-history, selected/finalized precedence, active solving, and draft-with-assignments-not-counted cases.
- [ ] Run the resolver tests to verify they fail:

```bash
pnpm test:unit -- tests/unit/schedule-version-resolver.spec.ts
```

Expected: FAIL because the new helper functions are missing.

- [ ] Add `hasExecutedVersionHistory(compare)` to detect any version with one of:
  - status other than `draft`
  - `latestEvaluationId`
  - `activeSolverExecutionId`
  - comparison metrics or finalization gate
- [ ] Add `getDefaultExecutedFocusVersionId(compare)`:
  - finalized version first
  - selected executed version second
  - latest executed version by `versionNo` third
  - existing default fallback last
- [ ] Add `getDefaultCompareVersionIds(compare, focusVersionId)`:
  - no comparison for finalized month
  - include focus version plus most recent other executed candidate
  - max two IDs
- [ ] Update `resolveStep5VersionState()` to use executed-history defaults when route query does not specify a compare target.
- [ ] Run the resolver tests again.

Expected: PASS.

### Task 2: Gate Step4 Entry With Existing History Choice

**Files:**

- Modify: `src/views/schedule/Step4InitialData.vue`
- Test: `tests/unit/step4-initial-data.spec.ts`

- [ ] Write failing Step4 tests for:
  - existing history opens the choice modal on normal entry
  - `?intent=edit-off` suppresses the modal
  - `Off 수정 후 다시 실행` keeps Step4 editable and loads version preferences
  - `결과 확인` routes to Step5 with default focus and compare IDs
  - opening Step4 alone does not call `createPhase2ScheduleVersion()`
- [ ] Run the Step4 tests to verify they fail:

```bash
pnpm test:unit -- tests/unit/step4-initial-data.spec.ts
```

Expected: FAIL because Step4 has no executed-history gate yet.

- [ ] Extend baseline state with `hasExecutedHistory`, `versions`, and the default Step5 focus/compare IDs from the resolver.
- [ ] Add a Naive UI modal/dialog shown once per Step4 entry when executed history exists and the user did not arrive with an explicit edit intent.
- [ ] Add route intent handling:
  - `intent=edit-off` means user explicitly chose editing/re-run
  - any other value is ignored and should not bypass the modal
  - after the user chooses edit, replace the route with `intent=edit-off` so refresh behavior is stable
- [ ] Implement `Off 수정 후 다시 실행` to close the modal and keep Step4 editable.
- [ ] Implement `결과 확인` to route to Step5 using the default focus and compare IDs.
- [ ] Preserve existing Step4 preference restore order: version preferences, selected version preferences, legacy schedule preferences, local storage fallback.
- [ ] Run the Step4 tests again.

Expected: PASS.

### Task 3: Add Version Name and Overwrite Confirmation to Step4 Handoff

**Files:**

- Modify: `src/views/schedule/Step4InitialData.vue`
- Modify: `src/types/schedule.ts`
- Modify: `src/api/schedule.ts`
- Test: `tests/unit/step4-initial-data.spec.ts`
- Test: `tests/unit/phase2-schedule-api.spec.ts`

- [ ] Write failing frontend tests for:
  - first run defaults to `V1`
  - re-run defaults to `V{latestVersionNo + 1}`
  - empty or whitespace-only names are blocked before API call
  - duplicate names are detected by `trim().toLowerCase()`
  - duplicate finalized/solving/archived versions cannot be selected for overwrite
  - overwrite sends `creationMode: 'overwrite'` and `overwriteVersionId`
  - new version sends `creationMode: 'new'`
  - note-only changes save preferences without creating a version
- [ ] Run frontend tests to verify they fail:

```bash
pnpm test:unit -- tests/unit/step4-initial-data.spec.ts tests/unit/phase2-schedule-api.spec.ts
```

Expected: FAIL because the name/overwrite UI and request fields do not exist yet.

- [ ] Add local state for version-name modal:
  - `pendingVersionName`
  - `isVersionNameModalOpen`
  - `duplicateVersionCandidate`
  - `pendingHandoffAction`
- [ ] Model `pendingHandoffAction` explicitly as:
  - `first_run`
  - `new_re_solve`
  - `overwrite_re_solve`
- [ ] Before creating or re-running a version, require the modal to collect a non-empty name.
- [ ] Use `V1` as first-run default and `V{latestVersionNo + 1}` for new re-run default.
- [ ] If name duplicates an existing version, show overwrite confirmation instead of immediately calling create.
- [ ] For new version creation, call `createPhase2ScheduleVersion()` with:
  - `name`
  - `creationMode: 'new'`
  - `inputSnapshot`
  - `inputDiffSummary`
- [ ] For overwrite, call `createPhase2ScheduleVersion()` with:
  - `name`
  - `creationMode: 'overwrite'`
  - `overwriteVersionId`
  - `inputSnapshot`
  - `inputDiffSummary`
- [ ] Keep note-only changes on the current version without creating a new version, unless the user explicitly chooses overwrite for a re-run.
- [ ] Run frontend tests again.

Expected: PASS.

### Task 4: Align Edge Function Create-Version Contract and Repository Writes

**Files:**

- Modify: `supabase/functions/phase2-schedule/contracts.ts`
- Modify: `supabase/functions/phase2-schedule/repository.ts`
- Modify: `supabase/functions/phase2-schedule/index.ts` only if route handling needs new parsed fields
- Test: `tests/unit/phase2-schedule-contracts.spec.ts`
- Test: `tests/unit/phase2-schedule-write-repository.spec.ts`

- [ ] Write failing contract tests for:
  - trimmed `name` is required and length-limited to 100 characters
  - `creationMode` is required and must be `new` or `overwrite`
  - `overwriteVersionId` is required only for overwrite
  - `baseVersionId` remains required for new version creation
  - `inputSnapshot` is accepted as a JSON object and defaults to `{}`
- [ ] Run contract/repository tests to verify they fail:

```bash
pnpm test:unit -- tests/unit/phase2-schedule-contracts.spec.ts tests/unit/phase2-schedule-write-repository.spec.ts
```

Expected: FAIL because the Edge contract still accepts nullable `name` and has no `creationMode`.

- [ ] Update `CreateVersionRequest` to include:
  - `baseVersionId?: string`
  - `name: string`
  - `creationMode: 'new' | 'overwrite'`
  - `overwriteVersionId?: string`
  - `inputSnapshot?: ScheduleInputSnapshot`
- [ ] Update parser validation:
  - trim name
  - require name length 1-100
  - validate overwrite version UUID when `creationMode` is `overwrite`
- [ ] Update `CreateVersionResponse` to include `wasCreated: boolean`.
- [ ] For `creationMode: 'new'`, reject duplicate version names within the schedule with `409 version_name_exists`.
- [ ] For `creationMode: 'overwrite'`, verify the target version belongs to the same schedule and is not finalized, solving, or archived.
- [ ] For overwrite, reject the request if `activeSolvingVersionId` is set for any version in the schedule.
- [ ] Persist `inputSnapshot` into `schedule_versions.input_snapshot` for new and overwritten versions.
- [ ] When overwriting, in one transaction or a repository sequence guarded by row locks:
  - clear current-month assignments for the overwritten version
  - reset `active_solver_execution_id`
  - clear `latest_evaluation_id`
  - set status to `draft`
  - reset `current_revision` to `0`
  - reset `manual_edit_count` to `0`
  - update `name`, `input_diff_summary`, and `input_snapshot`
  - leave historical `schedule_evaluations` rows append-only but detached from current review by clearing `latest_evaluation_id`
  - return `wasCreated: false` and `createdVersionId` equal to `overwriteVersionId`
- [ ] Keep existing create-version atomic RPC path for pure new version creation where possible.
- [ ] Run contract/repository tests again.

Expected: PASS.

### Task 5: Prevent Step5 Auto-Run When Results Exist

**Files:**

- Modify: `src/views/schedule/Step5Result.vue`
- Modify: `src/composables/useScheduleReviewHub.ts` if default compare state is better centralized there
- Test: `tests/unit/step5-result.spec.ts`
- Test: `tests/unit/use-schedule-review-hub.spec.ts`

- [ ] Write failing Step5 tests for:
  - `autoStart=1` ignored when any executed history exists
  - `autoStart=1` still starts solver on true first run
  - `autoStart=1` ignored when any other version is actively solving
  - multiple executed versions default to selected plus latest other executed candidate
  - finalized month has no default compare IDs
- [ ] Run Step5/review hub tests to verify they fail:

```bash
pnpm test:unit -- tests/unit/step5-result.spec.ts tests/unit/use-schedule-review-hub.spec.ts
```

Expected: FAIL because `consumeRouteAutoStart()` only checks mutability and current-month assignments today.

- [ ] After `hub.hydrate()`, determine whether executed history exists from compare state.
- [ ] In `consumeRouteAutoStart()`, strip or canonicalize `autoStart` but do not call `handleStartSolver()` when executed history exists.
- [ ] Keep auto-start only when:
  - no executed history exists
  - focused version is mutable draft
  - no current-month assignments exist
  - no other version is actively solving
- [ ] Default compare IDs to selected version plus the latest other executed candidate.
- [ ] Add tests for:
  - `autoStart=1` ignored when results exist
  - `autoStart=1` still starts solver on true first run
  - multiple versions default to selected plus latest candidate
  - finalized month does not show comparison tools by default
- [ ] Run Step5/review hub tests again.

Expected: PASS.

## Acceptance Criteria

- Opening Step4 for a month with prior execution history does not silently enter editing; it asks whether to edit Off requests or review results.
- Choosing result review from Step4 opens Step5 and shows existing results without solver execution.
- Opening Step5 for a month with existing results never starts the solver automatically.
- Opening Step5 for a true first run can still auto-start from the Step4 handoff.
- Re-running from Step4 requires a version name.
- Duplicate version names require explicit overwrite confirmation.
- Finalized or solving versions cannot be overwritten.
- Multiple existing versions default to a focused result plus one comparison candidate.

## Verification

- [ ] Run targeted unit tests:

```bash
pnpm test:unit -- tests/unit/schedule-version-resolver.spec.ts tests/unit/step4-initial-data.spec.ts tests/unit/step5-result.spec.ts tests/unit/use-schedule-review-hub.spec.ts tests/unit/phase2-schedule-api.spec.ts tests/unit/phase2-schedule-contracts.spec.ts tests/unit/phase2-schedule-write-repository.spec.ts
```

- [ ] Run lint:

```bash
pnpm lint:check
```

## Assumptions

- Plan document lives in `docs/plans/` because this repository already stores plan documents there.
- "Executed history" means a version has solver/result activity, not merely that the monthly schedule container exists.
- "Overwrite" means replacing the chosen version's editable draft/run state so it can be solved again with the new Off inputs; finalized and actively solving versions remain protected.
- User-facing UI copy should be Korean.
