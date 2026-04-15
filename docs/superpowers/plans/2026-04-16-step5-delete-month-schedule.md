# Step5 Delete Month Schedule Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Step5 button that deletes the current organization/month schedule container and all non-finalized schedule work for that month.

**Architecture:** Keep destructive deletion behind the existing `phase2-schedule` Edge Function trust boundary. The frontend calls one small API helper, and the backend calls one atomic SQL RPC that blocks finalized or actively solving months before deleting the `schedules` row and letting existing cascades remove child rows.

**Tech Stack:** Vue 3, TypeScript, Naive UI, Pinia, Supabase Edge Functions, PostgreSQL RPC, Vitest, ESLint.

---

## File Structure

- Create `migrations/20260416_090000_step5_delete_month_schedule.sql`
  - Adds one service-role-only RPC: `delete_schedule_month_atomic`.
- Modify `supabase/functions/phase2-schedule/contracts.ts`
  - Adds route, request parser, and response type for `POST /schedules/delete-month`.
- Modify `supabase/functions/phase2-schedule/repository.ts`
  - Adds `deleteScheduleMonth()` repository function.
- Modify `supabase/functions/phase2-schedule/index.ts`
  - Wires the new route to the repository function.
- Modify `src/types/schedule.ts`
  - Adds frontend request/response types.
- Modify `src/api/schedule.ts`
  - Adds `deletePhase2ScheduleMonth()`.
- Modify `src/views/schedule/Step5Result.vue`
  - Adds the destructive button, confirmation dialog, loading guard, and local state cleanup.
- Modify tests only where the existing patterns already cover this behavior:
  - `tests/unit/phase2-schedule-contracts.spec.ts`
  - `tests/unit/phase2-schedule-write-repository.spec.ts`
  - `tests/unit/phase2-schedule-api.spec.ts`
  - `tests/unit/step5-result.spec.ts`

## Task 1: Backend Delete Boundary

**Files:**

- Create: `migrations/20260416_090000_step5_delete_month_schedule.sql`
- Modify: `supabase/functions/phase2-schedule/contracts.ts`
- Modify: `supabase/functions/phase2-schedule/repository.ts`
- Modify: `supabase/functions/phase2-schedule/index.ts`
- Test: `tests/unit/phase2-schedule-contracts.spec.ts`
- Test: `tests/unit/phase2-schedule-write-repository.spec.ts`

- [ ] **Step 1: Add failing contract tests**

In `tests/unit/phase2-schedule-contracts.spec.ts`, extend the existing route/method test:

```ts
expect(
  matchRoute(normalizePathSegments('/functions/v1/phase2-schedule/schedules/delete-month'))
).toEqual({
  route: 'deleteMonth',
  params: {},
});

expect(allowedMethods('deleteMonth')).toEqual(['POST']);
```

Add parser tests near the existing reset roster parser tests:

```ts
expect(
  parseDeleteMonthRequest({
    organizationId: '11111111-1111-4111-8111-111111111111',
    month: '2026-04',
  })
).toEqual({
  organizationId: '11111111-1111-4111-8111-111111111111',
  month: '2026-04',
});

expect(() => parseDeleteMonthRequest({ organizationId: 'bad', month: '2026-04' })).toThrow();
expect(() =>
  parseDeleteMonthRequest({
    organizationId: '11111111-1111-4111-8111-111111111111',
    month: '2026-13',
  })
).toThrow();
```

Import `parseDeleteMonthRequest` from `contracts.ts`.

- [ ] **Step 2: Run contract test and verify it fails**

Run:

```bash
pnpm test:unit -- tests/unit/phase2-schedule-contracts.spec.ts
```

Expected: FAIL because `deleteMonth` route and parser do not exist.

- [ ] **Step 3: Implement contracts**

In `supabase/functions/phase2-schedule/contracts.ts`:

```ts
export type RouteName =
  | 'ensure'
  | 'compare'
  | 'createVersion'
  | 'resetRoster'
  | 'resetActiveFlow'
  | 'deleteMonth';
// keep existing entries
```

Add interfaces near reset response types:

```ts
export interface DeleteMonthRequest {
  organizationId: string;
  month: string;
}

export interface DeleteMonthResponse {
  deletedScheduleId: string | null;
}
```

Add route definition:

```ts
{
  name: 'deleteMonth',
  methods: ['POST'],
  segments: ['schedules', 'delete-month'],
},
```

Add parser:

```ts
export function parseDeleteMonthRequest(payload: unknown): DeleteMonthRequest {
  if (typeof payload !== 'object' || payload === null) {
    throw new ContractError('bad_request', 'Request body must be an object', 400);
  }

  const record = payload as Record<string, unknown>;
  const organizationId = record.organizationId;
  const month = record.month;

  if (typeof organizationId !== 'string' || !isValidUuid(organizationId)) {
    throw new ContractError('bad_request', 'organizationId must be a valid UUID', 400);
  }

  if (typeof month !== 'string' || !isValidMonth(month)) {
    throw new ContractError('bad_request', 'month must be YYYY-MM', 400);
  }

  return { organizationId, month };
}
```

- [ ] **Step 4: Add failing repository tests**

In `tests/unit/phase2-schedule-write-repository.spec.ts`, import `deleteScheduleMonth`.

Add success test near `resetScheduleRoster` and `resetActiveFlow` tests:

```ts
it('deletes a non-finalized month schedule through the atomic trust boundary rpc', async () => {
  const { client, rpcSpies } = createClient(
    {},
    {
      delete_schedule_month_atomic: [
        {
          data: {
            deleted_schedule_id: 'schedule-2',
          },
          error: null,
        },
      ],
    }
  );

  const result = await deleteScheduleMonth(client, AUTH_CONTEXT, {
    organizationId: AUTH_CONTEXT.organizationId,
    month: '2026-04',
  });

  expect(result).toEqual({ deletedScheduleId: 'schedule-2' });
  expect(rpcSpies.delete_schedule_month_atomic).toHaveBeenCalledWith({
    p_organization_id: AUTH_CONTEXT.organizationId,
    p_month: '2026-04',
    p_deleted_by: AUTH_CONTEXT.userId,
  });
});
```

Add access and conflict tests:

```ts
await expect(
  deleteScheduleMonth(client, AUTH_CONTEXT, {
    organizationId: '99999999-9999-4999-8999-999999999999',
    month: '2026-04',
  })
).rejects.toMatchObject({
  code: 'organization_access_denied',
  status: 403,
});
```

Use RPC error fixtures with `message: 'already_finalized'` and `message: 'version_locked_for_solving'`, both expecting `status: 409`.

- [ ] **Step 5: Run repository test and verify it fails**

Run:

```bash
pnpm test:unit -- tests/unit/phase2-schedule-write-repository.spec.ts
```

Expected: FAIL because `deleteScheduleMonth` and the RPC wiring do not exist.

- [ ] **Step 6: Add the SQL RPC**

Create `migrations/20260416_090000_step5_delete_month_schedule.sql`:

```sql
CREATE OR REPLACE FUNCTION public.delete_schedule_month_atomic(
  p_organization_id uuid,
  p_month text,
  p_deleted_by uuid DEFAULT NULL
)
RETURNS TABLE (
  deleted_schedule_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SELECT s.id
  INTO deleted_schedule_id
  FROM schedules s
  WHERE s.organization_id = p_organization_id
    AND s.month = p_month
  FOR UPDATE;

  IF NOT FOUND THEN
    deleted_schedule_id := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  PERFORM 1
  FROM schedules s
  WHERE s.id = deleted_schedule_id
    AND s.finalized_version_id IS NOT NULL;

  IF FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'already_finalized';
  END IF;

  PERFORM 1
  FROM schedule_versions sv
  WHERE sv.schedule_id = deleted_schedule_id
    AND sv.archived_at IS NULL
    AND (sv.status = 'solving' OR sv.active_solver_execution_id IS NOT NULL);

  IF FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'version_locked_for_solving';
  END IF;

  DELETE FROM schedules
  WHERE id = deleted_schedule_id;

  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_schedule_month_atomic(uuid, text, uuid)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.delete_schedule_month_atomic(uuid, text, uuid)
TO service_role;
```

Do not add audit tables, soft delete, or extra logging. This keeps the feature small and consistent with the existing roster reset delete path.

- [ ] **Step 7: Implement repository and index route**

In `supabase/functions/phase2-schedule/repository.ts`, add row type:

```ts
interface DeleteScheduleMonthAtomicRow {
  deleted_schedule_id: string | null;
}
```

Add a dedicated conflict mapper near the existing reset mappers:

```ts
function remapDeleteMonthRpcConflict(error: unknown): never {
  if (error instanceof DatabaseError) {
    const { message } = error.dbError;

    if (message === 'already_finalized') {
      throw new ContractError('already_finalized', 'Schedule is already finalized', 409);
    }

    if (message === 'version_locked_for_solving') {
      throw new ContractError(
        'version_locked_for_solving',
        'Version is locked while solving is active',
        409
      );
    }
  }

  throw error;
}
```

Add function near reset functions:

```ts
export async function deleteScheduleMonth(
  client: Phase2ScheduleRepositoryClient,
  auth: Phase2ScheduleAuthContext,
  request: DeleteMonthRequest
): Promise<DeleteMonthResponse> {
  if (request.organizationId !== auth.organizationId) {
    throw new ContractError(
      'organization_access_denied',
      'Authenticated user cannot delete another organization schedule month',
      403
    );
  }

  try {
    const row = await rpcSingle<DeleteScheduleMonthAtomicRow>(
      client,
      'delete_schedule_month_atomic',
      {
        p_organization_id: request.organizationId,
        p_month: request.month,
        p_deleted_by: auth.userId,
      }
    );

    return { deletedScheduleId: row.deleted_schedule_id };
  } catch (error: unknown) {
    remapDeleteMonthRpcConflict(error);
  }
}
```

Import `DeleteMonthRequest` and `DeleteMonthResponse` from `contracts.ts`.

In `supabase/functions/phase2-schedule/index.ts`:

```ts
import {
  parseDeleteMonthRequest,
  // existing imports
} from './contracts.ts';
import {
  deleteScheduleMonth,
  // existing imports
} from './repository.ts';
```

Add `DeleteMonthResponse` to response union types, then add handler before version routes:

```ts
if (route.route === 'deleteMonth') {
  const payload = await parseJsonBody(request);
  const deleteMonthInput = parseDeleteMonthRequest(payload);
  const result: DeleteMonthResponse = await deleteScheduleMonth(
    repositoryClient,
    auth,
    deleteMonthInput
  );
  return createResponse(request, result, 200);
}
```

- [ ] **Step 8: Run backend tests and commit**

Run:

```bash
pnpm test:unit -- tests/unit/phase2-schedule-contracts.spec.ts tests/unit/phase2-schedule-write-repository.spec.ts
```

Expected: PASS.

Commit:

```bash
git add migrations/20260416_090000_step5_delete_month_schedule.sql supabase/functions/phase2-schedule/contracts.ts supabase/functions/phase2-schedule/repository.ts supabase/functions/phase2-schedule/index.ts tests/unit/phase2-schedule-contracts.spec.ts tests/unit/phase2-schedule-write-repository.spec.ts
git commit -m "feat: add month schedule delete boundary"
```

## Task 2: Frontend API Helper

**Files:**

- Modify: `src/types/schedule.ts`
- Modify: `src/api/schedule.ts`
- Test: `tests/unit/phase2-schedule-api.spec.ts`

- [ ] **Step 1: Add failing API helper test**

In `tests/unit/phase2-schedule-api.spec.ts`, add near reset-active-flow test:

```ts
it('calls the delete-month mutation route through phase2-schedule edge function', async () => {
  getSessionMock.mockResolvedValue({
    data: {
      session: {
        access_token: 'token-delete-month',
      },
    },
    error: null,
  });
  fetchMock.mockResolvedValue(
    new Response(
      JSON.stringify({
        deletedScheduleId: 'schedule-33',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  );

  const { deletePhase2ScheduleMonth } = await import('@/api/schedule');

  await deletePhase2ScheduleMonth({
    organizationId: '33333333-3333-4333-8333-333333333333',
    month: '2026-04',
  });

  expect(fetchMock).toHaveBeenCalledWith(
    'https://example.supabase.co/functions/v1/phase2-schedule/schedules/delete-month',
    expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({
        organizationId: '33333333-3333-4333-8333-333333333333',
        month: '2026-04',
      }),
    })
  );
});
```

- [ ] **Step 2: Run API test and verify it fails**

Run:

```bash
pnpm test:unit -- tests/unit/phase2-schedule-api.spec.ts
```

Expected: FAIL because `deletePhase2ScheduleMonth` does not exist.

- [ ] **Step 3: Add frontend types and helper**

In `src/types/schedule.ts`, add near reset schedule types:

```ts
export interface DeleteScheduleMonthRequest {
  organizationId: string;
  month: string;
}

export interface DeleteScheduleMonthResponse {
  deletedScheduleId: string | null;
}
```

In `src/api/schedule.ts`, import those types and add near reset helpers:

```ts
export async function deletePhase2ScheduleMonth(
  request: DeleteScheduleMonthRequest
): Promise<DeleteScheduleMonthResponse> {
  return callPhase2Schedule<DeleteScheduleMonthResponse>('/schedules/delete-month', {
    method: 'POST',
    body: request,
  });
}
```

- [ ] **Step 4: Run API test and commit**

Run:

```bash
pnpm test:unit -- tests/unit/phase2-schedule-api.spec.ts
```

Expected: PASS.

Commit:

```bash
git add src/types/schedule.ts src/api/schedule.ts tests/unit/phase2-schedule-api.spec.ts
git commit -m "feat: add schedule month delete api"
```

## Task 3: Step5 Button and State Cleanup

**Files:**

- Modify: `src/views/schedule/Step5Result.vue`
- Test: `tests/unit/step5-result.spec.ts`

- [ ] **Step 1: Add failing Step5 tests**

In `tests/unit/step5-result.spec.ts`, add a mock for `deletePhase2ScheduleMonth` in the existing `@/api/schedule` mock:

```ts
const deletePhase2ScheduleMonthMock = vi.fn();
```

Export it from the mock object:

```ts
deletePhase2ScheduleMonth: deletePhase2ScheduleMonthMock,
```

Reset it in `beforeEach`:

```ts
deletePhase2ScheduleMonthMock.mockResolvedValue({
  deletedScheduleId: 'schedule-1',
});
```

Add tests:

```ts
it('deletes the current month schedule after confirmation and returns to dashboard', async () => {
  const wrapper = createWrapper();
  await flushPromises();

  const button = wrapper.find('[data-test="delete-month-schedule-button"]');
  expect(button.exists()).toBe(true);
  await button.trigger('click');

  const dialog = (window as unknown as { $dialog: { warning: ReturnType<typeof vi.fn> } }).$dialog
    .warning;
  expect(dialog).toHaveBeenCalledWith(
    expect.objectContaining({
      title: '이번 달 근무표 삭제',
      positiveText: '삭제',
      negativeText: '취소',
    })
  );

  const options = dialog.mock.calls.at(-1)?.[0] as { onPositiveClick: () => Promise<void> };
  await options.onPositiveClick();

  expect(deletePhase2ScheduleMonthMock).toHaveBeenCalledWith({
    organizationId: 'org-1',
    month: '2025-12',
  });
  expect(solverMock.stopPolling).toHaveBeenCalled();
  expect(scheduleStoreMock.setSelectedVersionId).toHaveBeenCalledWith(null);
  expect(scheduleStoreMock.setPreviewVersionId).toHaveBeenCalledWith(null);
  expect(scheduleStoreMock.setCompareMatrix).toHaveBeenCalledWith(null);
  expect(replaceMock).toHaveBeenCalledWith('/');
});
```

Add a finalized guard test:

```ts
it('disables month schedule deletion when the month is finalized', async () => {
  getPhase2ScheduleCompareMock.mockResolvedValueOnce({
    scheduleId: 'schedule-1',
    selectedVersionId: 'version-2',
    finalizedVersionId: 'version-2',
    activeSolvingVersionId: null,
    versions: [
      createVersionSummary({
        id: 'version-2',
        versionNo: 2,
        isSelected: true,
        isFinalized: true,
        status: 'finalized',
      }),
    ],
  });

  const wrapper = createWrapper();
  await flushPromises();

  expect(
    wrapper.find('[data-test="delete-month-schedule-button"]').attributes('disabled')
  ).toBeDefined();
});
```

- [ ] **Step 2: Run Step5 test and verify it fails**

Run:

```bash
pnpm test:unit -- tests/unit/step5-result.spec.ts
```

Expected: FAIL because the button and handler do not exist.

- [ ] **Step 3: Implement Step5 UI and handler**

In `src/views/schedule/Step5Result.vue`, import helper:

```ts
deletePhase2ScheduleMonth,
```

Add state:

```ts
const isDeletingMonthSchedule = ref(false);
const isDeleteMonthScheduleDisabled = computed(() => {
  return (
    isDeletingMonthSchedule.value ||
    Boolean(lockedVersionId.value) ||
    isRunning.value ||
    previewVersionStatus.value === 'solving' ||
    !scheduleStore.basicInfo?.organizationId ||
    !scheduleStore.basicInfo?.month
  );
});
```

Add button beside the existing destructive buttons:

```vue
<n-button
  size="medium"
  type="error"
  ghost
  data-test="delete-month-schedule-button"
  :loading="isDeletingMonthSchedule"
  :disabled="isDeleteMonthScheduleDisabled"
  @click="handleDeleteMonthSchedule"
>
  이번 달 근무표 삭제
</n-button>
```

Add handler near `handleResetActiveMonthFlow()`:

```ts
async function handleDeleteMonthSchedule() {
  const basicInfo = scheduleStore.basicInfo;

  if (!basicInfo?.organizationId || !basicInfo.month) {
    showError('조직 또는 월 정보를 찾을 수 없습니다.');
    return;
  }

  if (isDeleteMonthScheduleDisabled.value) {
    showInfo('확정본이 있거나 생성 중인 월은 삭제할 수 없습니다.');
    return;
  }

  window.$dialog?.warning({
    title: '이번 달 근무표 삭제',
    content: `${basicInfo.month} 근무표의 비교안, 입력 요청, 생성 결과를 모두 삭제합니다.\n\n확정본이 있는 월은 삭제할 수 없습니다. 이 작업은 되돌릴 수 없습니다.`,
    positiveText: '삭제',
    negativeText: '취소',
    onPositiveClick: async () => {
      isDeletingMonthSchedule.value = true;
      try {
        await deletePhase2ScheduleMonth({
          organizationId: basicInfo.organizationId,
          month: basicInfo.month,
        });

        solver.stopPolling();
        stopAssignmentsRefresh();
        resetRealtimeState();

        currentScheduleAssignments.value = {};
        originalCurrentAssignments.value = {};
        changedCells.value.clear();
        rebuildDisplayAssignments({});
        clearTempPreferenceStorage();

        scheduleStore.setBasicInfo({
          ...basicInfo,
          scheduleId: undefined,
        });
        scheduleStore.resetReviewState();
        scheduleStore.setAssignments({});
        scheduleStore.setComments({});

        showSuccess('이번 달 근무표를 삭제했습니다.');
        router.replace('/');
      } catch (error) {
        console.warn('Delete month schedule error:', error);
        showError(
          error instanceof Error ? error.message : '이번 달 근무표 삭제 중 오류가 발생했습니다.'
        );
      } finally {
        isDeletingMonthSchedule.value = false;
      }
    },
  });
}
```

Do not route to Step4 after deletion. Step4 can immediately recreate a new schedule container, which makes deletion feel like reset rather than deletion.

- [ ] **Step 4: Run Step5 test and commit**

Run:

```bash
pnpm test:unit -- tests/unit/step5-result.spec.ts
```

Expected: PASS.

Commit:

```bash
git add src/views/schedule/Step5Result.vue tests/unit/step5-result.spec.ts
git commit -m "feat: add step5 month delete button"
```

## Task 4: Final Verification

**Files:**

- Verify only; no planned source edits.

- [ ] **Step 1: Run focused unit tests**

Run:

```bash
pnpm test:unit -- tests/unit/phase2-schedule-contracts.spec.ts tests/unit/phase2-schedule-api.spec.ts tests/unit/phase2-schedule-write-repository.spec.ts tests/unit/step5-result.spec.ts
```

Expected: PASS.

- [ ] **Step 2: Run lint**

Run:

```bash
pnpm lint:check
```

Expected: PASS. If ESLint fails, fix only the reported issues in touched files, then rerun `pnpm lint:check`.

- [ ] **Step 3: Optional smoke check**

Run the app and manually verify:

```bash
pnpm dev
```

Expected:

- Step5 shows `이번 달 근무표 삭제` only as a destructive secondary action.
- Clicking it opens the confirmation dialog.
- Confirming a non-finalized idle month deletes it and returns to dashboard.
- Finalized or actively solving months cannot be deleted.

- [ ] **Step 4: Final commit if lint/test fixes were needed**

```bash
git add <changed-files>
git commit -m "test: cover step5 month delete flow"
```

## Notes and Defaults

- Finalized months are protected by both UI disablement and the backend RPC.
- The backend remains the source of truth. UI guards are convenience only.
- `deleted_by` is accepted by the RPC for future observability but not stored. Do not add an audit table in this change.
- Dashboard’s older direct-delete path is out of scope for this plan.
- Do not add broad CRUD, mobile redesign, analytics, or solver changes.
