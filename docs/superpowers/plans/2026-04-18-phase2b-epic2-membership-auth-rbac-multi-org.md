# Phase2B Epic 2 Membership Auth RBAC Multi-Org Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the remaining single-organization auth assumptions with membership-based access, explicit active-organization selection, admin-only operations gating, and end-to-end org-scoped API enforcement.

**Architecture:** Treat `organization_memberships` plus `profiles.global_role/account_status` as the only authority for access. Keep legacy auth metadata writes for compatibility during rollout, but stop using `organization_id/current_organization_id` claims as the frontend or edge-function read source. Introduce one explicit active-organization selection flow in the client, propagate it through stores and request headers, and have the edge functions validate that organization against membership or super-user authority before any org-scoped read or mutation.

**Tech Stack:** Vue 3, TypeScript, Pinia, Vue Router, Naive UI, Tailwind CSS, Supabase Auth, Supabase RLS, Supabase Edge Functions, Vitest, Vue Test Utils, Playwright

---

## Scope Lock

- Keep Epic 1 signup and admin approval behavior intact.
- Keep `super` landing on the approval queue.
- Keep schedule-generation and setup operations admin-only for this MVP.
- Do not add onboarding wizard, notifications, dashboard analytics expansion, employee self-service, or admin approval for `user` signups in this plan.
- Do not migrate canonical staffing from `site_requirements` to `site_staffing_requirements`.
- Do not remove legacy auth metadata writes yet; only remove legacy metadata **reads** from the new access path.

## File Map

- Create: `src/utils/rbacAccess.ts`
  - Pure access-resolution helpers, ability derivation, default organization selection, and route-access predicates.
- Create: `src/api/requestScope.ts`
  - Single helper for resolving the required active organization from the RBAC store and producing the `X-Organization-Id` header.
- Create: `src/components/layout/OrganizationSwitcher.vue`
  - Header-level organization selector for `super` and multi-membership users.
- Create: `src/views/UserHome.vue`
  - Restricted authenticated landing page for `user_active` accounts with no admin operations access.
- Create: `src/types/router-meta.d.ts`
  - Route meta augmentation for `requiresOrgContext` and `requiredOrgRole`.
- Create: `supabase/functions/_shared/organization-access.ts`
  - Shared edge auth helper that parses bearer auth, reads `X-Organization-Id`, loads profile/membership state, and returns a normalized org access context.
- Create: `supabase/migrations/20260418120000_phase2b_epic2_membership_auth_rbac_multi_org.sql`
  - Backfill missing approved memberships, add access-supporting indexes, and replace permissive/legacy RLS policies with membership-based ones.
- Create: `tests/unit/rbac-abilities.spec.ts`
  - Locks the ability matrix and active-organization fallback rules.
- Create: `tests/unit/request-scope.spec.ts`
  - Locks `X-Organization-Id` request-header behavior.
- Create: `tests/unit/organization-switcher.spec.ts`
  - Locks switcher rendering, disabled states, and selection behavior.
- Create: `tests/unit/user-home.spec.ts`
  - Locks the restricted user landing contract.
- Create: `tests/e2e/multi-org-rbac.spec.ts`
  - Covers org switching, super landing, and blocked user access.
- Modify: `src/types/rbac.ts`
  - Add selected-organization state, organization options, and abilities typing.
- Modify: `src/stores/rbac.ts`
  - Move pure logic out, hydrate membership-backed org options, persist selection, expose abilities, and centralize `selectOrganization`.
- Modify: `src/stores/auth.ts`
  - Sync auth boot with the new RBAC selection lifecycle and schedule-scope reset.
- Modify: `src/stores/organization.ts`
  - Stop deriving org scope from auth metadata; resolve by explicit org id or RBAC-selected org.
- Modify: `src/stores/schedule.ts`
  - Replace metadata-derived persistence scope with explicit access scope.
- Modify: `src/utils/authScope.ts`
  - Reduce it to user/foundation metadata helpers only; remove org-scope authority from this module.
- Modify: `src/router/index.ts`
  - Add the new restricted user route and explicit route meta requirements.
- Modify: `src/router/guards.ts`
  - Add org-context and org-role access enforcement on top of the existing blocked-state handling.
- Modify: `src/constants/routes.ts`
  - Add the restricted user-home route and role-aware post-auth redirect logic.
- Modify: `src/components/layout/Header.vue`
  - Replace the hard-coded “관리자” label with actual role/organization state and the switcher.
- Modify: `src/components/layout/Sidebar.vue`
  - Render menu entries from abilities instead of a single hard-coded route.
- Modify: `src/views/Dashboard.vue`
  - Treat dashboard operations as admin-only and rely on the selected org context.
- Modify: `src/api/ops.ts`
  - Send `X-Organization-Id` on all org-scoped edge calls.
- Modify: `src/api/schedule.ts`
  - Send `X-Organization-Id` on all edge calls and stop relying on JWT org claims.
- Modify: `supabase/functions/phase2-ops/auth.ts`
  - Swap metadata-based org resolution for shared membership-aware request-scope auth.
- Modify: `supabase/functions/phase2-schedule/auth.ts`
  - Require explicit org context via request header and validate it against membership/super access.
- Modify: `tests/unit/rbac-store.spec.ts`
  - Replace legacy-fallback expectations with explicit selection and ability behavior.
- Modify: `tests/unit/rbac-access-hydration.spec.ts`
  - Cover option loading, persisted selection, and missing-membership fallback handling.
- Modify: `tests/unit/router-auth-guards.spec.ts`
  - Lock the new redirects for `super_active`, `admin_active`, and `user_active`.
- Modify: `tests/unit/router-index.spec.ts`
  - Assert the new route table.
- Modify: `tests/unit/header.spec.ts`
  - Assert header role text and switcher injection.
- Modify: `tests/unit/dashboard.spec.ts`
  - Assert dashboard behavior under explicit org scope.
- Modify: `tests/unit/organization-store.spec.ts`
  - Assert the store resolves the active org from RBAC, not auth metadata.
- Modify: `tests/unit/phase2-ops-api.spec.ts`
  - Assert `X-Organization-Id` is sent.
- Modify: `tests/unit/phase2-schedule-api.spec.ts`
  - Assert `X-Organization-Id` is sent.
- Modify: `tests/unit/phase2-ops-auth.spec.ts`
  - Assert org header plus membership validation.
- Modify: `tests/unit/phase2-schedule-edge-auth.spec.ts`
  - Assert org header plus membership validation.
- Modify: `tests/unit/phase2-ops-migrations.spec.ts`
  - Assert the migration contains the new backfill/index/policy contract.

## Implementation Contract

- Active organization persistence key:

```ts
const ACTIVE_ORG_STORAGE_KEY_PREFIX = 'everyshift:selected-organization:';
```

- RBAC abilities shape:

```ts
export interface AccessAbilities {
  canViewApprovalQueue: boolean;
  canSwitchOrganization: boolean;
  canViewRestrictedUserHome: boolean;
  canManageOrganizationSetup: boolean;
  canManageEmployees: boolean;
  canManageSchedules: boolean;
}
```

- Route meta contract:

```ts
interface RouteMeta {
  requiresAuth?: boolean;
  requiresOrgContext?: boolean;
  requiredOrgRole?: 'admin';
}
```

- `user_active` redirect target:

```ts
export const USER_HOME_ROUTE_PATH = '/home/user';
```

- Frontend edge request contract:

```ts
headers: {
  apikey: getPhase2OpsAnonKey(),
  Authorization: `Bearer ${accessToken}`,
  'X-Organization-Id': organizationId,
}
```

- Shared edge auth context:

```ts
export interface OrganizationAccessContext {
  userId: string;
  globalRole: 'super' | 'admin' | 'user';
  accountStatus: 'active' | 'pending' | 'rejected' | 'suspended' | 'withdrawn';
  organizationId: string;
  organizationRole: 'admin' | 'user' | null;
  isSuper: boolean;
}
```

- Super-user rule:
  - `super_active` can always see the approval queue.
  - `super_active` can enter org-admin flows only when an active organization is selected.
- Admin-user rule:
  - Only `admin` memberships unlock setup, employee, and schedule flows.
  - `user` memberships never unlock those flows in this MVP.
- Compatibility rule:
  - Continue writing `organization_id/current_organization_id/organization_memberships` metadata in signup/bootstrap paths.
  - New frontend store resolution, route access, and edge auth must not depend on those metadata org claims except the explicit migration fallback test coverage that proves old pilot accounts still backfill correctly.

### Task 1: Extract The Pure Access Model And Lock It In Tests

**Files:**

- Create: `src/utils/rbacAccess.ts`
- Create: `tests/unit/rbac-abilities.spec.ts`
- Modify: `src/types/rbac.ts`
- Modify: `src/stores/rbac.ts`
- Modify: `tests/unit/rbac-store.spec.ts`
- Modify: `tests/unit/rbac-access-hydration.spec.ts`
- Test: `tests/unit/rbac-store.spec.ts`
- Test: `tests/unit/rbac-access-hydration.spec.ts`
- Test: `tests/unit/rbac-abilities.spec.ts`

- [ ] **Step 1: Write the failing ability-matrix tests**

```ts
expect(
  buildAccessAbilities({
    accessState: 'super_active',
    selectedOrganizationId: null,
    effectiveMembership: null,
  })
).toMatchObject({
  canViewApprovalQueue: true,
  canSwitchOrganization: true,
  canManageOrganizationSetup: false,
  canManageSchedules: false,
});

expect(
  buildAccessAbilities({
    accessState: 'admin_active',
    selectedOrganizationId: 'org-1',
    effectiveMembership: {
      organizationId: 'org-1',
      role: 'admin',
      status: 'approved',
      selectionSource: 'current_organization',
    },
  })
).toMatchObject({
  canManageOrganizationSetup: true,
  canManageEmployees: true,
  canManageSchedules: true,
});

expect(
  buildAccessAbilities({
    accessState: 'user_active',
    selectedOrganizationId: 'org-1',
    effectiveMembership: {
      organizationId: 'org-1',
      role: 'user',
      status: 'approved',
      selectionSource: 'current_organization',
    },
  })
).toMatchObject({
  canViewRestrictedUserHome: true,
  canManageSchedules: false,
});
```

- [ ] **Step 2: Write the failing selection-priority tests in the RBAC store suite**

```ts
expect(
  pickDefaultOrganizationId({
    accessState: 'admin_active',
    memberships: [
      {
        organizationId: 'org-b',
        role: 'admin',
        status: 'approved',
        approvedAt: '2026-04-18T02:00:00.000Z',
      },
      {
        organizationId: 'org-a',
        role: 'admin',
        status: 'approved',
        approvedAt: '2026-04-18T01:00:00.000Z',
      },
    ],
    persistedOrganizationId: null,
  })
).toBe('org-a');
```

- [ ] **Step 3: Add the failing hydration test for persisted org selection**

```ts
window.localStorage.setItem('everyshift:selected-organization:user-1', 'org-2');

await store.ensureAccessContextLoaded();

expect(store.selectedOrganizationId).toBe('org-2');
expect(store.organizationOptions).toEqual([
  expect.objectContaining({ id: 'org-1' }),
  expect.objectContaining({ id: 'org-2' }),
]);
```

- [ ] **Step 4: Implement the new pure helpers and types**

```ts
export interface OrganizationOption {
  id: string;
  name: string;
  membershipRole: 'admin' | 'user' | null;
}

export function buildAccessAbilities(input: BuildAccessAbilitiesInput): AccessAbilities {
  if (input.accessState === 'super_active') {
    return {
      canViewApprovalQueue: true,
      canSwitchOrganization: true,
      canViewRestrictedUserHome: false,
      canManageOrganizationSetup: Boolean(input.selectedOrganizationId),
      canManageEmployees: Boolean(input.selectedOrganizationId),
      canManageSchedules: Boolean(input.selectedOrganizationId),
    };
  }

  if (
    input.effectiveMembership?.role === 'admin' &&
    input.effectiveMembership.status === 'approved'
  ) {
    return {
      canViewApprovalQueue: false,
      canSwitchOrganization: true,
      canViewRestrictedUserHome: false,
      canManageOrganizationSetup: true,
      canManageEmployees: true,
      canManageSchedules: true,
    };
  }

  return {
    canViewApprovalQueue: false,
    canSwitchOrganization: input.accessState === 'user_active',
    canViewRestrictedUserHome: input.accessState === 'user_active',
    canManageOrganizationSetup: false,
    canManageEmployees: false,
    canManageSchedules: false,
  };
}
```

- [ ] **Step 5: Refactor `src/stores/rbac.ts` to use the helper module instead of inline access logic**

```ts
const selectedOrganizationId = ref<string | null>(null);
const organizationOptions = ref<OrganizationOption[]>([]);
const abilities = computed(() =>
  buildAccessAbilities({
    accessState: accessState.value,
    selectedOrganizationId: selectedOrganizationId.value,
    effectiveMembership: effectiveMembership.value,
  })
);
```

- [ ] **Step 6: Run the focused RBAC tests**

Run:

```bash
pnpm vitest run tests/unit/rbac-store.spec.ts tests/unit/rbac-access-hydration.spec.ts tests/unit/rbac-abilities.spec.ts
```

Expected: PASS, with the new ability and organization-selection assertions covering `super_active`, `admin_active`, and `user_active`.

- [ ] **Step 7: Commit**

```bash
git add src/types/rbac.ts src/utils/rbacAccess.ts src/stores/rbac.ts tests/unit/rbac-store.spec.ts tests/unit/rbac-access-hydration.spec.ts tests/unit/rbac-abilities.spec.ts
git commit -m "feat: add membership-based RBAC ability model"
```

### Task 2: Persist The Active Organization And Propagate It Into Stores

**Files:**

- Modify: `src/stores/rbac.ts`
- Modify: `src/stores/auth.ts`
- Modify: `src/stores/organization.ts`
- Modify: `src/stores/schedule.ts`
- Modify: `src/utils/authScope.ts`
- Modify: `tests/unit/organization-store.spec.ts`
- Modify: `tests/unit/schedule-store.spec.ts`
- Modify: `tests/unit/auth-store.spec.ts`
- Test: `tests/unit/organization-store.spec.ts`
- Test: `tests/unit/schedule-store.spec.ts`
- Test: `tests/unit/auth-store.spec.ts`

- [ ] **Step 1: Write the failing organization-store test that proves metadata is no longer the org authority**

```ts
rbacStore.selectedOrganizationId = 'org-2';
mockSessionUser.app_metadata = { organization_id: 'org-legacy' };

await store.loadOrganization();

expect(fetchOrganizationByIdMock).toHaveBeenCalledWith('org-2');
expect(store.current?.id).toBe('org-2');
```

- [ ] **Step 2: Write the failing schedule-store test for explicit access-scope sync**

```ts
store.syncWithAccessScope({
  userId: 'user-1',
  organizationId: 'org-2',
});

expect(readPersistedWizardContextMock).toHaveBeenCalledWith({
  userId: 'user-1',
  organizationId: 'org-2',
});
```

- [ ] **Step 3: Write the failing auth-store test for org-switch side effects**

```ts
await rbacStore.selectOrganization('org-2');

expect(scheduleStoreSyncMock).toHaveBeenCalledWith({
  userId: 'user-1',
  organizationId: 'org-2',
});
expect(organizationStoreResetMock).toHaveBeenCalled();
```

- [ ] **Step 4: Implement persisted org selection and scoped reset behavior in `src/stores/rbac.ts`**

```ts
async function selectOrganization(organizationId: string | null) {
  selectedOrganizationId.value = organizationId;
  persistSelectedOrganizationId(sessionUser.value?.id ?? null, organizationId);

  useOrganizationStore().resetContext();
  useScheduleStore().syncWithAccessScope(
    sessionUser.value?.id ? { userId: sessionUser.value.id, organizationId } : null
  );
}
```

- [ ] **Step 5: Replace metadata-derived org resolution in `useOrganizationStore` and `useScheduleStore`**

```ts
function resolveSelectedOrganizationId(explicitOrgId?: string): string {
  const trimmedExplicit = explicitOrgId?.trim();
  if (trimmedExplicit) return trimmedExplicit;

  const rbacStore = useRbacStore();
  const selected =
    rbacStore.selectedOrganizationId ?? rbacStore.effectiveMembership?.organizationId ?? null;
  if (!selected) {
    throw new Error('접근 가능한 조직 정보가 없습니다.');
  }

  return selected;
}
```

- [ ] **Step 6: Reduce `src/utils/authScope.ts` to user/foundation helpers only**

```ts
export interface AuthScope {
  userId: string;
  foundation: AuthFoundationMetadata | null;
}
```

- [ ] **Step 7: Run the store synchronization tests**

Run:

```bash
pnpm vitest run tests/unit/organization-store.spec.ts tests/unit/schedule-store.spec.ts tests/unit/auth-store.spec.ts tests/unit/rbac-access-hydration.spec.ts
```

Expected: PASS, with no test still expecting org authority from auth metadata.

- [ ] **Step 8: Commit**

```bash
git add src/stores/rbac.ts src/stores/auth.ts src/stores/organization.ts src/stores/schedule.ts src/utils/authScope.ts tests/unit/organization-store.spec.ts tests/unit/schedule-store.spec.ts tests/unit/auth-store.spec.ts tests/unit/rbac-access-hydration.spec.ts
git commit -m "feat: persist active organization selection across stores"
```

### Task 3: Add Role-Aware Shell UI And Router Enforcement

**Files:**

- Create: `src/components/layout/OrganizationSwitcher.vue`
- Create: `src/views/UserHome.vue`
- Create: `src/types/router-meta.d.ts`
- Modify: `src/components/layout/Header.vue`
- Modify: `src/components/layout/Sidebar.vue`
- Modify: `src/router/index.ts`
- Modify: `src/router/guards.ts`
- Modify: `src/constants/routes.ts`
- Modify: `src/views/Dashboard.vue`
- Modify: `tests/unit/header.spec.ts`
- Create: `tests/unit/organization-switcher.spec.ts`
- Create: `tests/unit/user-home.spec.ts`
- Modify: `tests/unit/router-auth-guards.spec.ts`
- Modify: `tests/unit/router-index.spec.ts`
- Modify: `tests/unit/dashboard.spec.ts`
- Test: `tests/unit/header.spec.ts`
- Test: `tests/unit/organization-switcher.spec.ts`
- Test: `tests/unit/user-home.spec.ts`
- Test: `tests/unit/router-auth-guards.spec.ts`
- Test: `tests/unit/router-index.spec.ts`
- Test: `tests/unit/dashboard.spec.ts`

- [ ] **Step 1: Write the failing switcher and header tests**

```ts
expect(wrapper.get('[data-test="organization-switcher"]').exists()).toBe(true);
expect(wrapper.text()).toContain('선택한 조직');

await wrapper.get('[data-test="organization-switcher"]').setValue('org-2');
expect(selectOrganizationMock).toHaveBeenCalledWith('org-2');
```

- [ ] **Step 2: Write the failing route-guard tests for the new landing rules**

```ts
expect(
  resolveAuthNavigationTarget({
    toPath: LOGIN_ROUTE_PATH,
    isAuthenticated: true,
    accessState: 'user_active',
  })
).toBe(USER_HOME_ROUTE_PATH);

expect(
  resolveRouteAccessTarget({
    toPath: '/',
    accessState: 'super_active',
    abilities: {
      canViewApprovalQueue: true,
      canSwitchOrganization: true,
      canViewRestrictedUserHome: false,
      canManageOrganizationSetup: false,
      canManageEmployees: false,
      canManageSchedules: false,
    },
  })
).toBe(APPROVAL_QUEUE_ROUTE_PATH);
```

- [ ] **Step 3: Write the failing dashboard and user-home tests**

```ts
expect(wrapper.text()).toContain('현재 계정은 운영 기능 권한이 없습니다.');
expect(wrapper.find('[data-test="dashboard-create-schedule"]').exists()).toBe(false);
```

- [ ] **Step 4: Implement the switcher, restricted user route, and typed route meta**

```vue
<n-select
  data-test="organization-switcher"
  :value="selectedOrganizationId"
  :options="options"
  :disabled="options.length <= 1"
  @update:value="handleSelect"
/>
```

```ts
{
  path: USER_HOME_ROUTE_PATH,
  name: 'UserHome',
  component: () => import('@/views/UserHome.vue'),
  meta: { requiresAuth: true, title: '내 홈' },
}
```

- [ ] **Step 5: Add route-level org/admin gating**

```ts
{
  path: 'ops/organization-setup',
  name: 'OrganizationProfileSetup',
  component: () => import('@/views/ops/OrganizationProfileSetup.vue'),
  meta: {
    requiresAuth: true,
    title: '조직/사이트 기본 설정',
    requiresOrgContext: true,
    requiredOrgRole: 'admin',
  },
}
```

- [ ] **Step 6: Render sidebar items from abilities instead of a hard-coded menu**

```ts
const menuOptions = computed(() => {
  const items = [];

  if (rbacStore.abilities.canManageSchedules) {
    items.push({ label: '근무표 생성', key: '/schedule/step1' });
  }

  if (rbacStore.abilities.canManageOrganizationSetup) {
    items.push({ label: '조직 기본 설정', key: '/ops/organization-setup' });
  }

  if (rbacStore.abilities.canViewApprovalQueue) {
    items.push({ label: '가입 승인', key: APPROVAL_QUEUE_ROUTE_PATH });
  }

  return items;
});
```

- [ ] **Step 7: Run the UI and router tests**

Run:

```bash
pnpm vitest run tests/unit/header.spec.ts tests/unit/organization-switcher.spec.ts tests/unit/user-home.spec.ts tests/unit/router-auth-guards.spec.ts tests/unit/router-index.spec.ts tests/unit/dashboard.spec.ts
```

Expected: PASS, with `user_active` landing on `/home/user`, `super_active` staying approval-first without an active org, and admin routes blocked without org-admin authority.

- [ ] **Step 8: Commit**

```bash
git add src/components/layout/OrganizationSwitcher.vue src/views/UserHome.vue src/types/router-meta.d.ts src/components/layout/Header.vue src/components/layout/Sidebar.vue src/router/index.ts src/router/guards.ts src/constants/routes.ts src/views/Dashboard.vue tests/unit/header.spec.ts tests/unit/organization-switcher.spec.ts tests/unit/user-home.spec.ts tests/unit/router-auth-guards.spec.ts tests/unit/router-index.spec.ts tests/unit/dashboard.spec.ts
git commit -m "feat: add role-aware shell and router access gating"
```

### Task 4: Scope Frontend Edge Requests By The Selected Organization

**Files:**

- Create: `src/api/requestScope.ts`
- Modify: `src/api/ops.ts`
- Modify: `src/api/schedule.ts`
- Create: `tests/unit/request-scope.spec.ts`
- Modify: `tests/unit/phase2-ops-api.spec.ts`
- Modify: `tests/unit/phase2-schedule-api.spec.ts`
- Test: `tests/unit/request-scope.spec.ts`
- Test: `tests/unit/phase2-ops-api.spec.ts`
- Test: `tests/unit/phase2-schedule-api.spec.ts`

- [ ] **Step 1: Write the failing request-scope helper test**

```ts
mockRbacStore.selectedOrganizationId = 'org-2';

expect(getRequiredOrganizationId()).toBe('org-2');
expect(buildOrganizationScopeHeaders('org-2')).toEqual({
  'X-Organization-Id': 'org-2',
});
```

- [ ] **Step 2: Write the failing API boundary tests for the org header**

```ts
expect(fetchMock).toHaveBeenCalledWith(
  'https://example.supabase.co/functions/v1/phase2-ops/organization-profile?organizationId=org-2',
  expect.objectContaining({
    headers: expect.objectContaining({
      'X-Organization-Id': 'org-2',
    }),
  })
);
```

- [ ] **Step 3: Implement the request-scope helper**

```ts
export function getRequiredOrganizationId(): string {
  const rbacStore = useRbacStore();
  const organizationId =
    rbacStore.selectedOrganizationId ?? rbacStore.effectiveMembership?.organizationId ?? null;

  if (!organizationId) {
    throw new Error('활성 조직을 먼저 선택하세요.');
  }

  return organizationId;
}
```

- [ ] **Step 4: Inject `X-Organization-Id` into all org-scoped edge calls**

```ts
const organizationId = getRequiredOrganizationId();
const headers: Record<string, string> = {
  apikey: getPhase2ScheduleAnonKey(),
  Authorization: `Bearer ${accessToken}`,
  ...buildOrganizationScopeHeaders(organizationId),
};
```

- [ ] **Step 5: Keep the public request body/query `organizationId` fields, but enforce header/body consistency**

```ts
if (request.organizationId !== organizationId) {
  throw new Error('요청 조직과 활성 조직이 일치하지 않습니다.');
}
```

- [ ] **Step 6: Run the API tests**

Run:

```bash
pnpm vitest run tests/unit/request-scope.spec.ts tests/unit/phase2-ops-api.spec.ts tests/unit/phase2-schedule-api.spec.ts
```

Expected: PASS, with all org-scoped edge requests carrying `X-Organization-Id`.

- [ ] **Step 7: Commit**

```bash
git add src/api/requestScope.ts src/api/ops.ts src/api/schedule.ts tests/unit/request-scope.spec.ts tests/unit/phase2-ops-api.spec.ts tests/unit/phase2-schedule-api.spec.ts
git commit -m "feat: scope edge requests by selected organization"
```

### Task 5: Replace Edge Auth Metadata Reads With Membership-Aware Access Validation

**Files:**

- Create: `supabase/functions/_shared/organization-access.ts`
- Modify: `supabase/functions/phase2-ops/auth.ts`
- Modify: `supabase/functions/phase2-schedule/auth.ts`
- Modify: `supabase/functions/phase2-ops/repository.ts`
- Modify: `supabase/functions/phase2-schedule/repository.ts`
- Modify: `tests/unit/phase2-ops-auth.spec.ts`
- Modify: `tests/unit/phase2-schedule-edge-auth.spec.ts`
- Modify: `tests/unit/phase2-ops-repository.spec.ts`
- Modify: `tests/unit/phase2-schedule-repository.spec.ts`
- Test: `tests/unit/phase2-ops-auth.spec.ts`
- Test: `tests/unit/phase2-schedule-edge-auth.spec.ts`
- Test: `tests/unit/phase2-ops-repository.spec.ts`
- Test: `tests/unit/phase2-schedule-repository.spec.ts`

- [ ] **Step 1: Write the failing edge-auth tests for org header plus membership validation**

```ts
await expect(
  resolveAuthContext(
    authClient,
    repositoryClient,
    new Request('https://example.com/functions/v1/phase2-schedule/schedules/ensure', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer token',
        'X-Organization-Id': 'org-2',
      },
    })
  )
).resolves.toEqual({
  userId: 'user-1',
  organizationId: 'org-2',
});
```

```ts
await expect(resolveAuthContext(...missingHeaderRequest)).rejects.toMatchObject({
  code: 'organization_context_missing',
  status: 403,
});
```

- [ ] **Step 2: Write the failing repository mismatch tests**

```ts
await expect(
  ensureSchedule(
    repositoryClient,
    { userId: 'user-1', organizationId: 'org-2' },
    { organizationId: 'org-3', month: '2026-05' }
  )
).rejects.toMatchObject({
  code: 'organization_access_denied',
});
```

- [ ] **Step 3: Implement the shared org access helper**

```ts
export async function resolveOrganizationAccessContext(
  authClient: SharedAuthClient,
  repositoryClient: SharedAccessRepositoryClient,
  request: Request
): Promise<OrganizationAccessContext> {
  const token = readBearerToken(request);
  const organizationId = readOrganizationHeader(request);
  const user = await requireAuthenticatedUser(authClient, token);
  const profile = await loadProfile(repositoryClient, user.id);

  if (profile.globalRole === 'super' && profile.accountStatus === 'active') {
    return {
      userId: user.id,
      globalRole: 'super',
      accountStatus: 'active',
      organizationId,
      organizationRole: null,
      isSuper: true,
    };
  }

  const membership = await loadApprovedMembership(repositoryClient, user.id, organizationId);
  if (!membership) {
    throw new ContractError(
      'organization_access_denied',
      'Authenticated user cannot access this organization',
      403
    );
  }

  return {
    userId: user.id,
    globalRole: normalizeGlobalRole(profile.globalRole),
    accountStatus: normalizeAccountStatus(profile.accountStatus),
    organizationId,
    organizationRole: membership.role,
    isSuper: false,
  };
}
```

- [ ] **Step 4: Refactor `phase2-ops` and `phase2-schedule` auth modules to use the shared helper**

```ts
const access = await resolveOrganizationAccessContext(authClient, repositoryClient, request);
return {
  userId: access.userId,
  organizationId: access.organizationId,
};
```

- [ ] **Step 5: Tighten repository entrypoints so request bodies cannot drift from the active org**

```ts
if (request.organizationId !== auth.organizationId) {
  throw new ContractError(
    'organization_access_denied',
    'Authenticated user cannot act on another organization',
    403
  );
}
```

- [ ] **Step 6: Run the auth and repository tests**

Run:

```bash
pnpm vitest run tests/unit/phase2-ops-auth.spec.ts tests/unit/phase2-schedule-edge-auth.spec.ts tests/unit/phase2-ops-repository.spec.ts tests/unit/phase2-schedule-repository.spec.ts
```

Expected: PASS, with no test still accepting auth metadata-only org claims.

- [ ] **Step 7: Commit**

```bash
git add supabase/functions/_shared/organization-access.ts supabase/functions/phase2-ops/auth.ts supabase/functions/phase2-schedule/auth.ts supabase/functions/phase2-ops/repository.ts supabase/functions/phase2-schedule/repository.ts tests/unit/phase2-ops-auth.spec.ts tests/unit/phase2-schedule-edge-auth.spec.ts tests/unit/phase2-ops-repository.spec.ts tests/unit/phase2-schedule-repository.spec.ts
git commit -m "feat: validate edge access with memberships and org headers"
```

### Task 6: Backfill Membership Rows And Tighten RLS Policies

**Files:**

- Create: `supabase/migrations/20260418120000_phase2b_epic2_membership_auth_rbac_multi_org.sql`
- Modify: `tests/unit/phase2-ops-migrations.spec.ts`
- Test: `tests/unit/phase2-ops-migrations.spec.ts`

- [ ] **Step 1: Write the failing migration spec for the backfill and policy contract**

```ts
expect(sql).toContain('insert into public.organization_memberships');
expect(sql).toContain('create index if not exists idx_organization_memberships_user_status_org');
expect(sql).toContain('drop policy if exists "Admin can do everything" on public.profiles');
expect(sql).toContain('create policy profiles_self_select on public.profiles');
expect(sql).toContain("has_org_access(organization_id, 'admin')");
```

- [ ] **Step 2: Write the idempotent membership backfill SQL**

```sql
insert into public.organization_memberships (
  organization_id,
  user_id,
  role,
  status,
  approved_at,
  created_at,
  updated_at
)
select
  p.organization_id,
  p.id,
  case
    when p.role = 'admin' then 'admin'
    else 'user'
  end,
  'approved',
  coalesce(p.updated_at, now()),
  coalesce(p.created_at, now()),
  now()
from public.profiles p
left join public.organization_memberships m
  on m.organization_id = p.organization_id
 and m.user_id = p.id
where p.organization_id is not null
  and p.account_status = 'active'
  and coalesce(p.status, 'active') = 'active'
  and m.id is null;
```

- [ ] **Step 3: Add the access-supporting index**

```sql
create index if not exists idx_organization_memberships_user_status_org
  on public.organization_memberships (user_id, status, organization_id);
```

- [ ] **Step 4: Replace permissive or legacy-org-claim policies with membership-based policies**

```sql
drop policy if exists "Admin can do everything" on public.profiles;
drop policy if exists "Users can view own organization schedules" on public.schedules;
drop policy if exists "Users can insert own organization schedules" on public.schedules;
drop policy if exists "Users can update own organization schedules" on public.schedules;
drop policy if exists "Users can delete own organization schedules" on public.schedules;

create policy schedules_select_authenticated on public.schedules
for select to authenticated
using (has_org_access(organization_id, 'user'));

create policy schedules_admin_all on public.schedules
for all to authenticated
using (has_org_access(organization_id, 'admin'))
with check (has_org_access(organization_id, 'admin'));
```

- [ ] **Step 5: Run the migration spec**

Run:

```bash
pnpm vitest run tests/unit/phase2-ops-migrations.spec.ts
```

Expected: PASS, with explicit coverage for the new SQL contract.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260418120000_phase2b_epic2_membership_auth_rbac_multi_org.sql tests/unit/phase2-ops-migrations.spec.ts
git commit -m "feat: backfill memberships and tighten org RLS policies"
```

### Task 7: Add Multi-Org Regression Coverage And Final Verification

**Files:**

- Create: `tests/e2e/multi-org-rbac.spec.ts`
- Modify: `tests/e2e/helpers.ts`
- Modify: `tests/unit/router-auth-guards.spec.ts`
- Modify: `tests/unit/phase2-ops-api.spec.ts`
- Modify: `tests/unit/phase2-schedule-api.spec.ts`
- Test: `tests/e2e/multi-org-rbac.spec.ts`
- Test: `tests/unit/router-auth-guards.spec.ts`
- Test: `tests/unit/phase2-ops-api.spec.ts`
- Test: `tests/unit/phase2-schedule-api.spec.ts`

- [ ] **Step 1: Write the failing Playwright spec for super org selection**

```ts
test('super selects an organization before entering admin workflows', async ({ page }) => {
  await page.goto('/login');
  await loginAsSuper(page);

  await expect(page).toHaveURL(/\/admin\/approval-queue/);
  await page.getByTestId('organization-switcher').selectOption('org-2');
  await page.goto('/');

  await expect(page.getByTestId('dashboard-create-schedule')).toBeVisible();
});
```

- [ ] **Step 2: Write the failing Playwright spec for blocked `user_active` operations**

```ts
test('user role cannot open schedule generation routes', async ({ page }) => {
  await loginAsUser(page);
  await page.goto('/schedule/step1');

  await expect(page).toHaveURL(/\/home\/user/);
  await expect(page.getByText('현재 계정은 운영 기능 권한이 없습니다.')).toBeVisible();
});
```

- [ ] **Step 3: Add the e2e helpers and network stubs needed for org-switching**

```ts
export async function seedAuthState(
  page: Page,
  payload: {
    accessState: 'super_active' | 'admin_active' | 'user_active';
    selectedOrganizationId?: string | null;
  }
) {
  await page.addInitScript((value) => {
    window.localStorage.setItem(
      'everyshift:selected-organization:user-1',
      value.selectedOrganizationId ?? ''
    );
  }, payload);
}
```

- [ ] **Step 4: Run the regression suite**

Run:

```bash
pnpm vitest run tests/unit/router-auth-guards.spec.ts tests/unit/phase2-ops-api.spec.ts tests/unit/phase2-schedule-api.spec.ts
pnpm test:e2e --grep "multi-org-rbac"
pnpm lint:check
```

Expected:

- Unit suites PASS
- The new Playwright multi-org suite PASS
- `pnpm lint:check` exits successfully with no ESLint errors

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/multi-org-rbac.spec.ts tests/e2e/helpers.ts tests/unit/router-auth-guards.spec.ts tests/unit/phase2-ops-api.spec.ts tests/unit/phase2-schedule-api.spec.ts
git commit -m "test: cover multi-org switching and restricted user access"
```

## Final Verification Checklist

- [ ] `user_active` always lands on `/home/user`
- [ ] `admin_active` can access `/`, `/ops/*`, and `/schedule/*` only for the selected approved organization
- [ ] `super_active` always lands on `/admin/approval-queue` and needs an active org selection before using admin workflows
- [ ] No frontend store still derives org authority from auth metadata
- [ ] All `phase2-ops` and `phase2-schedule` requests send `X-Organization-Id`
- [ ] Edge auth rejects missing org header and cross-org access
- [ ] RLS policies no longer rely on legacy org-claim comparisons or permissive `true` policies for org-scoped tables
- [ ] `pnpm lint:check` passes
