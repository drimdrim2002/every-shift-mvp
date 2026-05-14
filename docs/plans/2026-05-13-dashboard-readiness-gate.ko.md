# Dashboard Readiness Gate 구현 계획

> **Agentic worker용:** REQUIRED SUB-SKILL: 이 계획은 task 단위로 구현할 때 `superpowers:subagent-driven-development`(권장) 또는 `superpowers:executing-plans`를 사용한다. 진행 추적은 checkbox(`- [ ]`) 문법을 사용한다.

**Goal:** 병원 담당자가 로그인 후 처음 보는 `Dashboard.vue` 화면을 필수 운영 정보 준비 상태에 따라 온보딩 전용 화면 또는 준비 완료 대시보드로 분기한다.

**Architecture:** `Dashboard.vue`에서 기존 `getChecklist()` 응답을 readiness gate의 단일 source of truth로 사용한다. 완료 판정은 `organization_profile`, `schedule_foundation`, `employee_roster` 3개 checklist item만 사용한다. `off_request_policy`, `schedule_review`는 readiness 완료 이후 보조 정보로만 표시한다.

**Tech Stack:** Vue 3 `<script setup>`, TypeScript, Vite, Tailwind CSS, Naive UI, Pinia, Vue Test Utils, Vitest, Playwright.

---

## Scope

이번 변경은 로그인 후 첫 `Dashboard.vue` 화면의 정보 구조와 표시 조건만 다룬다.

- 포함: 필수 정보 미완료 시 온보딩 전용 화면 표시
- 포함: 필수 정보 완료 시 3개 섹션 표시
- 포함: 기존 checklist 응답 기반 완료 판정
- 제외: Off 요청 정책을 필수 온보딩 조건에 포함
- 제외: 지난 근무표 리뷰/공정성 확인을 필수 온보딩 조건에 포함
- 제외: 모바일 대응, 분석 대시보드, CRUD 확장, 실제 AI solver 연동
- 제외: backend API, DB schema, route contract 변경

## Readiness Contract

필수 readiness는 아래 3개 checklist item이 모두 `status === 'ready'`일 때만 true이다.

```ts
const REQUIRED_DASHBOARD_READINESS_KEYS = [
  'organization_profile',
  'schedule_foundation',
  'employee_roster',
] as const;
```

- `organization_profile`: 병원 정보
- `schedule_foundation`: 병동/근무 기준
- `employee_roster`: 직원 정보

`checklist.ready`는 참고값으로만 둔다. Dashboard 분기는 필수 3개 항목의 실제 status를 우선한다.

`off_request_policy`, `schedule_review`는 readiness 완료 이후 보조 카드 또는 지난 결과 영역에서만 표시한다. 두 항목이 `blocked`여도 필수 3개 항목이 ready이면 Dashboard는 준비 완료 상태로 본다.

Checklist 로드가 실패하면 생성/목록 action을 노출하지 않는다. 사용자의 readiness 상태를 검증할 수 없으므로, 재시도 가능한 안내 상태를 보여준다.

## File Structure

**Modify: `src/views/Dashboard.vue`**

- readiness 계산 computed state 추가
- template을 loading, no-access, incomplete-readiness, complete-readiness 상태로 분리
- 준비 미완료 화면에서 기존 schedule list와 새 근무표 생성 CTA 숨김
- 준비 완료 화면에서 3개 섹션 표시
- 기존 월 선택 modal, schedule list, Step5 navigation 로직 유지

**Modify: `src/components/ops/PilotChecklistCard.vue`**

- 기존 checklist card를 계속 재사용하는 편이 유용하면, 필수/보조 항목을 분리 표시할 수 있도록 props를 추가한다.
- 재사용이 구현을 더 복잡하게 만들면 이 파일은 수정하지 않고 `Dashboard.vue` 안에 온보딩 전용 markup을 둔다.

**Modify: `tests/unit/dashboard.spec.ts`**

- readiness gate unit test 추가/갱신
- incomplete, complete, optional-blocked, loading-failure 시나리오 검증

**Modify: `tests/e2e/pilot-checklist.spec.ts`**

- 기존 checklist deep-link 테스트를 새 화면 구조에 맞게 갱신
- incomplete-readiness fixture와 complete-readiness fixture를 모두 검증

## Design Review Addendum

### Design Completeness Rating

- Initial plan rating: **6/10**
- Target after this addendum: **9/10**
- 이 계획이 10/10이 되려면 구현 후 최종 시각 screenshot까지 포함해야 하지만, 이 문서는 implementation-stage planning 문서이다.

기존 계획은 routing과 test 측면에서는 구체적이었지만, 담당자가 처음 무엇을 보는지, error/empty state가 어떻게 느껴지는지, split dashboard가 generic card grid가 되지 않도록 어떻게 막을지가 부족했다.

### What Already Exists

새로운 dashboard 언어를 만들지 말고 기존 project decision을 재사용한다.

- `DESIGN.md`가 active design contract이다.
- `DESIGN.md`의 dashboard hierarchy: 첫째 readiness와 next action, 둘째 monthly work area, 셋째 lower-priority metadata.
- App UI 방향: calm operational product, dense but readable, minimal chrome, restrained neutrals, one meaningful accent.
- Typography: UI text는 `Pretendard Variable`, inspectable counts/timestamps/IDs/score-like values에만 `IBM Plex Mono`.
- Color tokens: 기존 semantic CSS variables와 restrained slate/teal language를 우선한다. purple/blue gradients 또는 decorative color system을 추가하지 않는다.
- Existing dashboard patterns: section-local loading, schedule cards as true schedule entities, Naive UI buttons/cards/spinner/modal, existing schedule actions.

### UI Scope

이 계획은 authenticated app surface 하나만 바꾼다: 로그인 후 첫 `Dashboard.vue` 화면.

영향 범위:

- dashboard header CTA visibility
- readiness loading, failure, incomplete, complete states
- onboarding-only required item flow
- complete dashboard sections for basic information, schedule creation, past results
- history section 안의 schedule list placement

새 app shell, sidebar, mobile app layout, analytics surface, CRUD module, new route contract는 도입하지 않는다.

### Screen Classifier

이 화면은 landing page가 아니라 **APP UI**이다.

App UI rules 적용:

- calm surface hierarchy
- dense but readable layout
- utility language
- minimal chrome
- card는 action container 또는 schedule entity일 때만 사용
- decorative hero, gradient background, ornamental icon set, generic dashboard mosaic 금지

### Information Architecture

Dashboard에는 서로 배타적인 top-level state가 정확히 5개 있다.

```text
 Dashboard.vue
 |
 +-- No admin access
 |   +-- permissions guidance only
 |
 +-- Readiness loading
 |   +-- section-local loading state only
 |
 +-- Readiness unavailable
 |   +-- retryable guidance state
 |
 +-- Incomplete readiness
 |   +-- onboarding-only required setup sequence
 |
 +-- Complete readiness
     +-- 기본 정보
     +-- 근무표 생성
     +-- 지난 결과
```

Hierarchy는 첫 3초 안에 이해되어야 한다.

1. **Incomplete state:** "근무표 생성을 막는 항목"을 첫째로, "지금 action 가능한 항목"을 둘째로, route CTA를 셋째로 보여준다.
2. **Complete state:** "검토할 수 있는 정보"를 첫째로, "새 근무표 생성"을 둘째로, "지난 결과"를 셋째로 보여준다.
3. **History section:** schedule entity를 먼저 보여주고, 필요 시 supporting `schedule_review` guidance를 둘째로 보여준다.

### Incomplete Screen Layout

기존 full checklist와 schedule list를 함께 보여주지 말고, 단일 onboarding section을 사용한다.

```text
[Page title: 근무표 관리]

[Onboarding-only section]
  Title: 근무표 생성을 시작하기 전에 필수 정보를 먼저 확인해주세요
  Helper: 아래 3가지를 순서대로 완료하면 근무표 생성과 지난 결과 확인을 사용할 수 있습니다.

  [1 병원 정보]       status chip: 완료 / 진행 / 대기
      one-line context
      CTA: 병원 정보 확인하기

  [2 병동/근무 기준] status chip: 완료 / 진행 / 대기
      one-line context
      CTA: 근무 기준 설정하기

  [3 직원 정보]       status chip: 완료 / 진행 / 대기
      one-line context
      CTA: 직원 정보 확인하기
```

현재 action 가능한 item만 primary button treatment를 받는다. 완료된 item은 secondary review button을 사용한다. 대기 item은 disabled 상태로 두고, 이전 단계를 먼저 완료해야 한다는 짧은 이유를 보여준다.

### Complete Screen Layout

준비 완료 dashboard를 같은 무게의 decorative card grid로 만들지 않는다. 서로 다른 일을 하는 3개 work section으로 구성한다.

```text
[Page title: 근무표 관리]                         [새 근무표 생성]

[기본 정보]
  Compact action row/list:
  - 병원 정보
  - 병동/근무 기준
  - 직원 정보

[근무표 생성]
  Primary action surface for the month selection modal.
  If canManageSchedules is false, show readonly guidance instead of a hidden blank section.

[지난 결과]
  Existing schedule loading/list/empty/error behavior lives here.
```

Section jobs:

- `기본 정보`: readiness input을 review/edit
- `근무표 생성`: schedule-generation workflow 시작
- `지난 결과`: 기존 schedule inspect/edit/delete/continue

### Interaction State Coverage

State design은 필수이다. boolean branch만 구현하지 말고 user-visible state를 구현한다.

| Feature                   | Loading                                                      | Empty                                                                              | Error                                                                    | Success                                              | Partial                                                                      |
| ------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------- | ---------------------------------------------------------------------------- |
| Readiness gate            | `dashboard-ops-readiness-loading` 표시, schedule action 숨김 | checklist request가 성공하면 해당 없음                                             | retryable readiness unavailable state 표시, create/list action 숨김      | incomplete 또는 complete state로 분기                | 필수 key가 누락되면 ready가 아니라 unavailable로 처리                        |
| Incomplete onboarding     | readiness loading 완료 전에는 렌더링하지 않음                | 필수 3개 item을 현재 status와 함께 모두 표시                                       | route click 실패 시 dashboard에 머물고 기존 message utility 표시         | reload 후 item이 ready가 되면 completed state로 이동 | 완료된 이전 item은 visible 유지, 다음 incomplete item만 primary              |
| Basic information section | readiness loading 중에는 표시하지 않음                       | ready 이후 해당 없음                                                               | route target unavailable 시 section은 유지하고 disabled action copy 표시 | 기존 setup surface로 route                           | optional checklist item은 required readiness를 바꾸지 않음                   |
| Schedule creation section | readiness loading 중 hidden                                  | `canManageSchedules === false`이면 readonly permission guidance 표시               | 기존 month modal error는 modal context에 유지                            | 기존 `handleCreateNew()`와 month modal behavior      | header create button과 section CTA는 같은 readiness permission 사용          |
| Past results section      | 기존 schedule list loading을 section 안에서 표시             | allowed 상태에서 warm empty state와 primary CTA 표시, emoji-first empty state 금지 | 기존 safe error behavior 유지 또는 retry guidance 추가                   | 기존 card click/edit/delete behavior                 | `schedule_review`는 supporting guidance일 수 있지만 readiness blocker는 아님 |

### Required Copy and Tone

모든 user-facing copy는 한국어이며 operational해야 한다.

Utility language를 사용한다:

- 무엇이 빠졌는지
- 왜 schedule creation을 막는지
- 지금 사용자가 무엇을 할 수 있는지

피한다:

- marketing claims
- "AI" promotional copy
- "Get started" 같은 모호한 label
- emoji-first empty states
- decorative checklist language

### Visual System Alignment

`DESIGN.md`를 visual contract로 사용한다.

- 기존 dashboard/app content width와 app shell spacing 사용
- page title은 `text-2xl`, section title은 `text-xl`
- helper copy와 operational metadata는 `text-sm`
- shadow보다 restrained neutral surfaces와 subtle borders 우선
- accent color는 primary actionable item, primary CTA, important status에만 사용
- status chip은 color alone이 아니라 text와 shape로 의미 전달
- third font, new token family, gradient background, decorative blobs, icon-in-colored-circle feature cards 도입 금지
- card는 3개 onboarding action container와 schedule entity에만 허용한다. card inside card 금지

### Responsive and Accessibility Requirements

이 MVP dashboard는 desktop-first이지만 tablet과 narrow desktop behavior는 의도적으로 처리해야 한다.

- Desktop: complete-state 3개 section은 priority order대로 vertical stack, history는 기존 schedule-card layout 사용 가능
- Tablet: 같은 vertical section order 유지, action row는 wrap 가능하지만 CTA는 item label과 인접해야 함
- Mobile: broad mobile support는 out of scope이지만 narrow viewport에서 text overlap이나 unreachable action이 없어야 함
- Touch targets: 모든 button과 clickable card row는 최소 `44px` 높이
- Keyboard: navigate 가능한 onboarding item card는 focusable/Enter/Space activatable이어야 하며, 더 좋게는 non-clickable container 안에 real button/link 사용
- Focus: header CTA, onboarding CTA, basic info CTA, schedule card, edit/delete button, modal control에 visible focus ring
- Screen readers: 각 status chip은 color 없이도 의미가 통하는 text 필요, disabled waiting item은 무엇을 먼저 해야 하는지 설명
- Color contrast: body text와 essential warning은 WCAG AA 충족, muted text는 secondary에만 사용

### AI Slop Risk Assessment

이 addendum 이후 risk level: **low**.

구현 중 반드시 피해야 할 hard rejection:

- work layout 대신 stacked decorative cards로 만든 app UI
- 모든 section이 경쟁하는 equal-weight dashboard-card mosaic
- `지난 결과`의 emoji-first empty state
- 3개 readiness item에 colored icon circles 사용
- centered-everything layout
- purple/blue gradients 또는 decorative blobs

### NOT in Scope

- 전체 schedule workflow의 새로운 mobile interaction model: MVP dashboard readiness scope 밖이다.
- Dashboard analytics 또는 KPI widgets: 이 gate는 readiness와 schedule-generation entry에 관한 것이다.
- Organizations, employees, shifts CRUD: MVP는 기존 setup flow와 seed data assumptions를 계속 사용한다.
- Real AI solver integration: dashboard readiness split과 무관하다.
- New visual design system: `DESIGN.md`가 이미 contract를 제공한다.
- Public landing-page treatment: 이 화면은 authenticated app UI이다.

### Unresolved Design Decisions

없음. 구현은 위 complete design contract를 사용한다.

## UI Behavior

### Loading

`opsReadinessLoading === true`이면 현재처럼 모든 schedule action을 숨긴다.

- 숨김: header `새 근무표 생성`
- 숨김: schedule list
- 숨김: 3개 complete-state sections
- 표시: `dashboard-ops-readiness-loading`

문구의 기존 의미를 유지한다.

```text
운영 준비 정보를 확인하는 중입니다
병원 정보, 기준 설정, 체크리스트를 불러오고 있습니다.
```

Loading state는 section-local, calm, non-promotional이어야 한다. Readiness가 검증되기 전에는 schedule action을 사용할 수 없으므로 schedule card skeleton을 보여주지 않는다.

### No Admin Access

`hasAdminDashboardAccess === false`이면 기존 권한 안내 화면을 유지한다.

- `loadOrganization()`, `getChecklist()`, `getScheduleList()` 호출 없음
- schedule 생성/목록 action 표시 없음

### Readiness Load Failure

`getChecklist()`가 실패하거나 필수 readiness key가 누락되면 schedule action 대신 retryable guidance state를 보여준다.

- 숨김: header `새 근무표 생성`
- 숨김: schedule list
- 숨김: complete-state sections
- 표시: readiness를 검증할 수 없다는 section error card
- Primary action: readiness loading 재시도

필수 문구:

```text
운영 준비 상태를 확인하지 못했습니다
필수 정보가 준비되었는지 확인할 수 없어 근무표 생성과 지난 결과를 잠시 숨겼습니다.
다시 확인
```

이 상태가 중요한 이유: readiness를 알 수 없는데 schedule creation을 노출하면 trust contract가 깨진다.

### Incomplete Readiness

필수 3개 항목 중 하나라도 ready가 아니면 onboarding-only screen만 보여준다.

표시 순서는 고정한다.

1. 병원 정보
2. 병동/근무 기준
3. 직원 정보

각 item은 아래 상태 중 하나를 보여준다.

- 완료: `완료`
- 현재 진행 가능: `진행`
- 선행 항목 필요: `대기`

State rules:

- `완료`: completed로 보여주고 secondary review/edit navigation 허용
- `진행`: ready가 아닌 첫 번째 required item이며 primary CTA 하나 표시
- `대기`: 그 뒤의 incomplete item이며 disabled action과 어떤 prior item이 필요한지 설명

CTA route는 아래처럼 고정한다.

```ts
organization_profile -> getOpsOrganizationSetupRoutePath()
schedule_foundation -> { path: getScheduleStepRoutePath(2), query: buildScheduleEntryQuery('setup') }
employee_roster -> { path: getScheduleStepRoutePath(3), query: buildScheduleEntryQuery('setup') }
```

준비 미완료 화면에서는 아래를 표시하지 않는다.

- 기존 schedule list
- Header `새 근무표 생성`
- `월별 근무표 작업`
- 3개 ready-state menus/sections
- Supporting `off_request_policy` 또는 `schedule_review` items

Incomplete screen은 optional/non-required item을 포함하는 기존 `PilotChecklistCard`를 그대로 보여주면 안 된다. 담당자는 schedule creation을 막는 필수 3개 blocker만 봐야 한다.

### Complete Readiness

필수 3개 item이 모두 ready이면 3개 section을 보여준다.

**기본 정보**

- 병원 정보 review/edit
- 병동/근무 기준 review/edit
- 직원 정보 review/edit
- 각 CTA는 onboarding에서 사용한 route와 동일하게 연결

**근무표 생성**

- 새 schedule creation workflow 진입
- 기존 `handleCreateNew()`와 월 선택 modal 계속 사용
- `canManageSchedules === false`이면 create CTA 숨김

**지난 결과**

- 기존 schedule list를 이 section 안에 둔다.
- schedule card click, edit, delete, Step5 canonical route navigation 기존 동작 유지
- schedule이 없으면 기존 empty state를 이 section 안에 표시
- `schedule_review` checklist item은 필수 완료 조건이 아니며, 필요하면 이 section의 supporting guidance로만 사용

`지난 결과` 안의 empty-state copy는 warm and directive해야 하며 emoji-first이면 안 된다. 이 surface를 건드리면 현재 emoji-led empty state를 교체한다.

권장 empty-state copy:

```text
아직 생성된 근무표가 없습니다
필수 정보는 준비되었습니다. 첫 근무표를 생성해 이번 달 배정을 시작하세요.
첫 근무표 생성하기
```

## Implementation Tasks

### Task 1: Add Dashboard Readiness Computed State

**Files:**

- Modify: `src/views/Dashboard.vue`

- [ ] **Step 1: Add required key constants and helper types near the checklist state**

```ts
const REQUIRED_DASHBOARD_READINESS_KEYS = [
  'organization_profile',
  'schedule_foundation',
  'employee_roster',
] as const satisfies readonly ChecklistItem['key'][];

type DashboardReadinessKey = (typeof REQUIRED_DASHBOARD_READINESS_KEYS)[number];
```

- [ ] **Step 2: Add checklist lookup computed values**

```ts
const opsReadinessLoadFailed = ref(false);

const checklistItemByKey = computed(() => {
  return new Map((checklist.value?.items ?? []).map((item) => [item.key, item]));
});

const requiredReadinessItems = computed(() => {
  return REQUIRED_DASHBOARD_READINESS_KEYS.map((key) => checklistItemByKey.value.get(key) ?? null);
});

const hasRequiredReadinessItems = computed(() => {
  return requiredReadinessItems.value.every((item) => item !== null);
});

const isDashboardReady = computed(() => {
  return requiredReadinessItems.value.every((item) => item?.status === 'ready');
});

const incompleteRequiredReadinessItems = computed(() => {
  return requiredReadinessItems.value.filter((item) => item?.status !== 'ready');
});

const isDashboardReadinessUnavailable = computed(() => {
  return (
    !opsReadinessLoading.value && (opsReadinessLoadFailed.value || !hasRequiredReadinessItems.value)
  );
});
```

- [ ] **Step 3: Mark checklist request failures explicitly and load schedules only after readiness is verified**

Dashboard reload가 시작되면 `opsReadinessLoadFailed`를 `false`로 reset하고 stale `schedules`를 비운 뒤 organization/foundation data를 먼저 load한다. 그 다음 `getChecklist()`를 호출하고, `getScheduleList()`는 그 이후에만 호출한다.

`getChecklist()`가 reject되거나 response에서 required key가 하나라도 누락되면 `opsReadinessLoadFailed`를 `true`로 설정하고, `checklist.value = null`, `schedules.value = []`를 유지하며 `loadSchedules()`를 skip한다.

Checklist가 load되었지만 required readiness가 incomplete이면 onboarding display를 위해 checklist response는 유지하고, `schedules.value = []`를 유지하며 `loadSchedules()`를 skip한다.

필수 3개 readiness item이 모두 present and ready인 경우에만 `loadSchedules()`를 호출한다. 이렇게 해야 data loading, UI exposure, permission behavior가 일치한다.

`reloadDashboardData()`가 later template branch에 의존하지 않고 schedule-loading decision을 내릴 수 있도록 `loadChecklist()`를 loaded `ChecklistResponse | null`을 return하게 변경한다.

- [ ] **Step 3a: Add schedule-list failure state for the ready dashboard**

별도 `scheduleListLoadFailed` ref를 추가한다. `loadSchedules()` 전에 reset한다. Readiness 완료 후 `getScheduleList()`가 실패하면 complete dashboard는 유지하되 empty schedule state 대신 retryable history error를 보여준다.

권장 data-test attributes:

- `dashboard-history-error`
- `dashboard-history-retry`

필수 문구:

```text
지난 결과를 불러오지 못했습니다
근무표 생성은 계속 사용할 수 있지만, 기존 결과를 확인하려면 목록을 다시 불러와야 합니다.
다시 불러오기
```

- [ ] **Step 4: Add helper for readiness route targets**

```ts
function getReadinessRoute(key: DashboardReadinessKey) {
  if (key === 'organization_profile') {
    return getOpsOrganizationSetupRoutePath();
  }

  if (key === 'schedule_foundation') {
    return {
      path: getScheduleStepRoutePath(2),
      query: buildScheduleEntryQuery('setup'),
    };
  }

  return {
    path: getScheduleStepRoutePath(3),
    query: buildScheduleEntryQuery('setup'),
  };
}
```

- [ ] **Step 5: Add navigation handler for readiness cards**

```ts
async function handleOpenReadinessItem(key: DashboardReadinessKey) {
  if (!hasAdminDashboardAccess.value) {
    return;
  }

  try {
    await router.push(getReadinessRoute(key));
  } catch (error) {
    console.warn('Readiness navigation failed:', error);
    showError('화면을 열지 못했습니다. 잠시 후 다시 시도해주세요.');
  }
}
```

### Task 2: Split Dashboard Template by Readiness

**Files:**

- Modify: `src/views/Dashboard.vue`

- [ ] **Step 1: Gate the header create button**

Header create button 조건을 아래로 변경한다.

```vue
v-if="canManageSchedules && isDashboardReady && !opsReadinessLoading"
```

- [ ] **Step 2: Keep loading as the only readiness-loading surface**

`opsReadinessLoading`이 true인 동안 setup/checklist/schedule section을 렌더링하지 않는다.

- [ ] **Step 3: Add readiness unavailable section**

`!opsReadinessLoading && isDashboardReadinessUnavailable`일 때만 표시한다.

권장 data-test attributes:

- `dashboard-readiness-unavailable`
- `dashboard-readiness-retry`

Expected behavior:

- `dashboard-onboarding-only`를 렌더링하지 않음
- complete-state sections를 렌더링하지 않음
- schedule card 또는 create CTA를 렌더링하지 않음
- Retry action은 `getChecklist()`를 호출하는 readiness load path를 다시 실행

- [ ] **Step 4: Add incomplete onboarding-only section**

`!opsReadinessLoading && !isDashboardReadinessUnavailable && !isDashboardReady`일 때만 표시한다.

필수 화면 문구:

```text
근무표 생성을 시작하기 전에 필수 정보를 먼저 확인해주세요
아래 3가지를 순서대로 완료하면 근무표 생성과 지난 결과 확인을 사용할 수 있습니다.
```

권장 data-test attributes:

- `dashboard-onboarding-only`
- `dashboard-onboarding-item-organization_profile`
- `dashboard-onboarding-item-schedule_foundation`
- `dashboard-onboarding-item-employee_roster`

- [ ] **Step 5: Add onboarding item state and accessibility details**

각 required item에 대해:

- design addendum의 Korean label과 status text 사용
- completed/current item은 real button 또는 link로 navigate 가능하게 구현
- waiting item은 disabled로 유지하고 visible reason 포함
- `완료`, `진행`, `대기`는 color alone에 의존하지 않음

- [ ] **Step 6: Hide schedule surfaces while incomplete**

`월별 근무표 작업`, schedule cards, empty schedule state, create CTAs는 `isDashboardReady`가 true일 때만 렌더링한다.

- [ ] **Step 7: Add complete state sections**

`!opsReadinessLoading && isDashboardReady`일 때 아래 3개 section을 렌더링한다.

권장 data-test attributes:

- `dashboard-basic-info-section`
- `dashboard-create-section`
- `dashboard-history-section`

Section titles:

```text
기본 정보
근무표 생성
지난 결과
```

- [ ] **Step 8: Apply visual-system constraints**

Template을 수정할 때 design addendum을 따른다.

- decorative card mosaic 금지
- nested cards 금지
- emoji-first empty state 금지
- new color token family 금지
- clear section order와 utility copy 유지

### Task 3: Preserve Existing Schedule Actions Inside History Section

**Files:**

- Modify: `src/views/Dashboard.vue`

- [ ] **Step 1: Move the existing schedule loading/list/empty state under `dashboard-history-section`**

기존 `scheduleLoading`, `schedules.length === 0`, `schedule-card` branch를 유지한다.

Required readiness가 complete되기 전에는 schedule list를 fetch하거나 render하지 않는다. History section은 complete-ready branch 안에만 존재한다.

`scheduleListLoadFailed === true`이면 empty state branch보다 먼저 `dashboard-history-error`를 렌더링해서 failed request가 "no schedules"로 잘못 표현되지 않게 한다.

- [ ] **Step 2: Keep existing schedule card actions**

아래 기존 handler의 signature와 behavior를 바꾸지 않는다.

```ts
handleViewSchedule(schedule);
handleEdit(schedule);
handleDelete(schedule);
handleCreateNew();
handleMonthConfirm();
```

- [ ] **Step 3: Keep Step5 navigation helpers unchanged**

Readiness 작업 범위에서 아래 helper를 수정하지 않는다.

```ts
seedChecklistScheduleContext(item);
navigateToCanonicalStep5(scheduleKey);
handleChecklistNavigate(item);
```

- [ ] **Step 4: Remove duplicated foundation-card state**

새 onboarding/basic-information section이 해당 CTA를 소유하므로 `foundationChecklistItems`, `showFoundationCard`, `foundationCardTarget`, `FoundationCardTarget`, `handleOpenFoundationEntry`를 제거한다. 기존 foundation card를 새 readiness gate 옆에 남기지 않는다.

### Task 4: Update Unit Tests

**Files:**

- Modify: `tests/unit/dashboard.spec.ts`

- [ ] **Step 1: Add a checklist fixture helper**

```ts
function buildChecklistFixture(
  overrides?: Partial<Record<ChecklistItem['key'], Partial<ChecklistItem>>>
) {
  const items: ChecklistItem[] = [
    {
      key: 'organization_profile',
      title: '병원 정보 확인',
      status: 'ready',
      route: '/ops/organization-setup',
      blockedReason: null,
      isOptional: false,
    },
    {
      key: 'schedule_foundation',
      title: '기준 장소와 근무 기준 설정',
      status: 'ready',
      route: '/schedule/step2',
      blockedReason: null,
      isOptional: false,
    },
    {
      key: 'employee_roster',
      title: '직원 로스터 준비',
      status: 'ready',
      route: '/schedule/step3',
      blockedReason: null,
      isOptional: false,
    },
    {
      key: 'off_request_policy',
      title: 'Off 사용 기준 설정',
      status: 'blocked',
      route: '/ops/off-request-policy-setup',
      blockedReason: '필요하면 나중에 설정할 수 있습니다.',
      isOptional: true,
    },
    {
      key: 'schedule_review',
      title: '최종 검토 진입',
      status: 'blocked',
      route: null,
      blockedReason: '검토할 근무표가 아직 없습니다.',
      isOptional: false,
    },
  ].map((item) => ({
    ...item,
    ...(overrides?.[item.key] ?? {}),
  }));

  return {
    organizationId: 'org-1',
    checklistCursor: 'employee_roster',
    ready: items.slice(0, 3).every((item) => item.status === 'ready'),
    items,
    fairnessSummary: [],
  };
}
```

- [ ] **Step 2: Add incomplete onboarding-only test**

Expected assertions:

```ts
expect(wrapper.find('[data-test="dashboard-onboarding-only"]').exists()).toBe(true);
expect(wrapper.find('[data-test="dashboard-create-schedule"]').exists()).toBe(false);
expect(wrapper.find('[data-test="schedule-card"]').exists()).toBe(false);
expect(wrapper.find('[data-test="dashboard-basic-info-section"]').exists()).toBe(false);
expect(wrapper.find('[data-test="dashboard-create-section"]').exists()).toBe(false);
expect(wrapper.find('[data-test="dashboard-history-section"]').exists()).toBe(false);
```

- [ ] **Step 3: Add readiness load failure test**

`getChecklist()`가 reject되거나 required key 하나가 누락된 payload를 return하게 만든다.

Expected assertions:

```ts
expect(wrapper.find('[data-test="dashboard-readiness-unavailable"]').exists()).toBe(true);
expect(wrapper.find('[data-test="dashboard-create-schedule"]').exists()).toBe(false);
expect(wrapper.find('[data-test="schedule-card"]').exists()).toBe(false);
expect(wrapper.find('[data-test="dashboard-onboarding-only"]').exists()).toBe(false);
expect(wrapper.find('[data-test="dashboard-basic-info-section"]').exists()).toBe(false);
```

Schedule list가 fetch되지 않았는지도 assert한다.

```ts
expect(getScheduleListMock).not.toHaveBeenCalled();
```

- [ ] **Step 3a: Add incomplete-readiness schedule fetch guard test**

Required key 하나를 blocked로 만들고 onboarding-only screen이 schedule loading 없이 나타나는지 assert한다.

Expected assertions:

```ts
expect(wrapper.find('[data-test="dashboard-onboarding-only"]').exists()).toBe(true);
expect(getScheduleListMock).not.toHaveBeenCalled();
expect(wrapper.find('[data-test="schedule-card"]').exists()).toBe(false);
```

- [ ] **Step 4: Add optional item blocked test**

`off_request_policy.status = 'blocked'`로 두고 required 3개 item은 ready로 유지한다.

Expected assertions:

```ts
expect(wrapper.find('[data-test="dashboard-onboarding-only"]').exists()).toBe(false);
expect(wrapper.find('[data-test="dashboard-basic-info-section"]').exists()).toBe(true);
expect(wrapper.find('[data-test="dashboard-create-section"]').exists()).toBe(true);
expect(wrapper.find('[data-test="dashboard-history-section"]').exists()).toBe(true);
```

- [ ] **Step 5: Add schedule review blocked test**

`schedule_review.status = 'blocked'`로 두고 required 3개 item은 ready로 유지한다.

Expected assertion:

```ts
expect(wrapper.find('[data-test="dashboard-history-section"]').exists()).toBe(true);
```

- [ ] **Step 6: Add schedule list failure test**

Required readiness 3개 item은 ready로 두고 `getScheduleList()`가 reject되게 만든 뒤, ready dashboard가 empty state가 아니라 retryable history error를 보여주는지 assert한다.

Expected assertions:

```ts
expect(wrapper.find('[data-test="dashboard-history-section"]').exists()).toBe(true);
expect(wrapper.find('[data-test="dashboard-history-error"]').exists()).toBe(true);
expect(wrapper.text()).toContain('지난 결과를 불러오지 못했습니다');
expect(wrapper.text()).not.toContain('아직 생성된 근무표가 없습니다');
```

- [ ] **Step 7: Add onboarding route tests**

Expected route assertions:

```ts
expect(pushMock).toHaveBeenCalledWith('/app/ops/organization-setup');
expect(pushMock).toHaveBeenCalledWith({
  path: '/app/schedule/step2',
  query: { context: 'setup' },
});
expect(pushMock).toHaveBeenCalledWith({
  path: '/app/schedule/step3',
  query: { context: 'setup' },
});
```

- [ ] **Step 8: Add onboarding route failure test**

Actionable onboarding item에서 `router.push`가 reject되게 만든다.

Expected assertions:

```ts
expect(showErrorMock).toHaveBeenCalledWith('화면을 열지 못했습니다. 잠시 후 다시 시도해주세요.');
expect(wrapper.find('[data-test="dashboard-onboarding-only"]').exists()).toBe(true);
```

- [ ] **Step 9: Add permission-gated create section test**

Required readiness는 ready로 두고 `canManageSchedules === false`로 설정한다.

Expected assertions:

```ts
expect(wrapper.find('[data-test="dashboard-create-section"]').exists()).toBe(true);
expect(wrapper.find('[data-test="dashboard-create-schedule"]').exists()).toBe(false);
expect(wrapper.text()).toContain('근무표 생성 권한');
```

- [ ] **Step 10: Update existing checklist tests**

기존 `surfaces the pilot checklist entry with deep links from the dashboard shell` 테스트는 새 complete-state section 안에서 checklist 또는 basic information card를 찾도록 갱신한다.

### Task 5: Update E2E Coverage

**Files:**

- Modify: `tests/e2e/pilot-checklist.spec.ts`

- [ ] **Step 1: Rename the describe block to match Dashboard readiness**

```ts
test.describe('dashboard readiness gate', () => {
```

- [ ] **Step 2: Add incomplete checklist route mock**

Required fixture state:

```json
{
  "organization_profile": "ready",
  "schedule_foundation": "blocked",
  "employee_roster": "blocked",
  "off_request_policy": "blocked",
  "schedule_review": "blocked"
}
```

Expected browser assertions:

```ts
await expect(page.getByTestId('dashboard-onboarding-only')).toBeVisible();
await expect(
  page.getByText('근무표 생성을 시작하기 전에 필수 정보를 먼저 확인해주세요')
).toBeVisible();
await expect(page.getByText('월별 근무표 작업')).toHaveCount(0);
await expect(page.getByTestId('dashboard-create-schedule')).toHaveCount(0);
```

- [ ] **Step 3: Add readiness failure browser assertion**

Checklist endpoint를 failed response로 mock한다.

Expected browser assertions:

```ts
await expect(page.getByTestId('dashboard-readiness-unavailable')).toBeVisible();
await expect(page.getByText('운영 준비 상태를 확인하지 못했습니다')).toBeVisible();
await expect(page.getByTestId('dashboard-create-schedule')).toHaveCount(0);
await expect(page.getByText('월별 근무표 작업')).toHaveCount(0);
```

- [ ] **Step 4: Keep ready checklist deep-link test**

Ready fixture state:

```json
{
  "organization_profile": "ready",
  "schedule_foundation": "ready",
  "employee_roster": "ready",
  "off_request_policy": "blocked",
  "schedule_review": "blocked"
}
```

Expected browser assertions:

```ts
await expect(page.getByTestId('dashboard-basic-info-section')).toBeVisible();
await expect(page.getByTestId('dashboard-create-section')).toBeVisible();
await expect(page.getByTestId('dashboard-history-section')).toBeVisible();
```

- [ ] **Step 5: Update dashboard-start E2E fixtures**

Dashboard에서 시작하고 schedule creation 또는 schedule-card access를 기대하는 모든 E2E test는 schedule state를 기다리기 전에 complete-ready checklist fixture를 제공해야 한다.

Affected helper flows:

- `startNewScheduleFromDashboard(page)`
- `openExistingScheduleFromDashboard(page, options)`

Test가 의도적으로 incomplete readiness를 다루는 경우에는 schedule history가 의도적으로 hidden이므로 `waitForDashboardScheduleState(page)`를 호출하지 않는다.

## Verification

구현 후 실행한다.

```bash
pnpm test:unit -- tests/unit/dashboard.spec.ts
pnpm lint:check
pnpm run build
```

E2E fixture를 변경했다면 실행한다.

```bash
pnpm test:e2e -- tests/e2e/pilot-checklist.spec.ts tests/e2e/schedule-workflow.spec.ts
```

Expected result:

- Dashboard unit tests pass
- Lint passes
- Build passes
- E2E readiness gate test passes when run

## Assumptions

- User-facing UI text는 한국어로 유지한다.
- `getChecklist()` response shape는 변경하지 않는다.
- Backend `ready`는 Dashboard readiness gate보다 넓은 의미로 남아도 된다. Dashboard는 필수 3개 item status를 사용한다.
- 기존 schedule creation modal과 Step5 navigation behavior는 유지한다.
- Organizations, employees, shifts에 대한 새 CRUD surface를 추가하지 않는다.
- 이 계획은 의도적으로 MVP schedule-generation flow 안에 머문다.

## Engineering Review Addendum

### Step 0: Scope Challenge

**Existing code already solving sub-problems**

- `src/views/Dashboard.vue`는 이미 admin access check, organization loading, checklist loading, schedule list loading, month modal behavior, Step5 navigation을 소유한다. 재사용하고 dashboard service 또는 새 route를 만들지 않는다.
- `getChecklist()`는 이 gate에 필요한 readiness input을 이미 반환한다. item status를 재사용하고 backend, DB, API contract 작업을 추가하지 않는다.
- `getOpsOrganizationSetupRoutePath()`, `getScheduleStepRoutePath()`, `buildScheduleEntryQuery('setup')`는 route contract를 이미 encode한다. Template에 route string을 hard-code하지 말고 재사용한다.
- `tests/unit/dashboard.spec.ts`는 dashboard data boundary를 이미 mock한다. 새 test harness를 만들지 말고 기존 mock을 확장한다.
- `tests/e2e/pilot-checklist.spec.ts`는 dashboard checklist deep link를 이미 검증한다. 이를 readiness gate E2E suite로 전환한다.

**Minimum viable change**

가장 작은 complete implementation도 one-view refactor이다. 모든 branching은 `Dashboard.vue`에 유지하고, local computed readiness state를 추가하며, 필수 3개 readiness key가 검증된 뒤에만 schedule을 load하고, 기존 dashboard unit/E2E test를 갱신한다. `PilotChecklistCard.vue`는 duplication을 줄일 때만 수정하고, 그렇지 않으면 건드리지 않는다.

**Complexity check**

Planned touch set은 3-4 files이다.

```text
src/views/Dashboard.vue
tests/unit/dashboard.spec.ts
tests/e2e/pilot-checklist.spec.ts
src/components/ops/PilotChecklistCard.vue   (optional only)
```

이는 8-file / 2-new-service smell threshold보다 낮다. 새 class, store, composable, API endpoint, migration은 정당화되지 않는다.

**Search check**

새 infrastructure 또는 unfamiliar concurrency pattern을 도입하지 않는다. 이 계획은 Vue 3 computed state, 기존 route helper, 기존 Vitest/Playwright test를 사용한다: **[Layer 1] boring, in-distribution technology**.

**TODOS cross-reference**

Review 시점에 이 repo에는 `TODOS.md`가 없다. 이 계획을 막는 deferred item은 없다. 새 follow-up으로 추적할 만한 것은 구현 후 visual QA뿐이며, design review summary가 화면 구현 후 `/design-review`로 이미 포착한다.

**Completeness check**

기존 design plan은 가까웠지만 engineering plan에는 시간을 조금 아끼려다 production ambiguity를 만들 수 있는 shortcut 2개가 있었다.

1. Readiness 검증 전에 schedule data가 fetch될 수 있었다.
2. Schedule-list request 실패가 empty history state로 render될 수 있었다.

둘 다 작은 local change로 trust impact가 크므로 이제 scope에 포함한다.

**Distribution check**

새 artifact type은 도입하지 않는다. Package, binary, container, publish pipeline은 필요 없다.

**Retrospective learning**

최근 commit은 주로 Step5 result review와 finalization behavior를 다룬다. Dashboard는 최근 변경된 flow의 entry point이므로, 이 계획은 Step5 route helper를 보존하고 `navigateToCanonicalStep5()`/schedule-card behavior 주변 regression test를 추가해야 한다.

### Architecture Review

**Decision:** readiness gate는 `Dashboard.vue` local에 유지한다.

Why: backend는 이미 checklist contract를 노출하고, 이 변경은 엄격히 first-screen information architecture이다. Readiness logic을 store나 새 service로 옮기면 blast radius를 줄이지 못하고 accidental complexity만 추가한다.

```text
Dashboard mount / selected org changes
        |
        v
hasAdminDashboardAccess?
   | no
   +--> reset local dashboard data
   |     show no-access guidance
   |
   | yes
   v
loadOrganization()
        |
        v
loadFoundationData()
        |
        v
getChecklist()
   |
   +-- rejects OR missing required keys
   |       -> readiness unavailable
   |       -> schedules = []
   |       -> do not call getScheduleList()
   |
   +-- required key blocked
   |       -> onboarding-only screen
   |       -> schedules = []
   |       -> do not call getScheduleList()
   |
   +-- required keys ready
           -> getScheduleList()
           -> complete dashboard sections
```

**Issue 1: schedule loading must be readiness-first.**

Recommendation: checklist를 schedule보다 먼저 load하고, readiness가 complete일 때만 schedule fetching을 수행한다. 준비되지 않은 담당자는 history를 보지 않아야 하고, history latency cost도 지불하지 않아야 한다.

**Issue 2: history errors need their own state.**

Recommendation: `scheduleListLoadFailed`를 추가하고 `dashboard-history-error`를 render한다. Failed list request는 empty schedule history와 다르다.

**Issue 3: duplicate setup surfaces should be removed.**

Recommendation: onboarding/basic-information sections를 추가할 때 기존 foundation-card computed state를 제거한다. 둘 다 유지하면 경쟁하는 readiness explanation이 생긴다.

### Code Quality Review

- Clever generic mapper보다 explicit local constants를 선호한다. `REQUIRED_DASHBOARD_READINESS_KEYS`와 typed metadata map이면 충분하다.
- Item labels, descriptions, disabled reasons, route targets를 하나의 local typed record에 둬서 onboarding row와 basic-information row가 drift하지 않게 한다.
- Branching에 `checklist.ready`를 사용하지 않는다. Backend meaning이 dashboard gate보다 의도적으로 넓으므로 diagnostic only이다.
- `loadChecklist()`가 response를 return하게 바꿔 reload order를 읽기 쉽고 testable하게 만든다.
- `Dashboard.vue`에서 근처 코드를 수정할 때 touched `window.$message?.error/info` path는 `src/utils/message.ts`의 `showError()` 또는 `showWarning()`으로 교체한다.
- 구현 후 `Dashboard.vue`가 실질적으로 읽기 어려워지지 않는 한 composable을 새로 만들지 않는다. One-screen readiness gate만으로는 새 abstraction을 만들 이유가 부족하다.

### Test Framework Detection

- Unit framework: Vitest with Vue Test Utils (`pnpm test:unit`)
- E2E framework: Playwright (`pnpm test:e2e`)
- Code change 후 required workflow checks: `pnpm lint:check`, `pnpm run build`

### Test Coverage Diagram

```text
CODE PATH COVERAGE
==================
[+] src/views/Dashboard.vue
    |
    +-- reloadDashboardData()
    |   +-- [EXISTING] no admin access -> reset local state
    |   +-- [EXISTING] organization load failure -> show error, no actions
    |   +-- [GAP -> REQUIRED] checklist rejects -> unavailable, no schedule fetch
    |   +-- [GAP -> REQUIRED] checklist missing required key -> unavailable, no schedule fetch
    |   +-- [GAP -> REQUIRED] required key blocked -> onboarding-only, no schedule fetch
    |   +-- [GAP -> REQUIRED] three required keys ready, optional blocked -> load schedules
    |   +-- [GAP -> REQUIRED] schedule list rejects after ready -> history error, not empty state
    |
    +-- readiness computed state
    |   +-- [GAP -> REQUIRED] uses only organization_profile/schedule_foundation/employee_roster
    |   +-- [GAP -> REQUIRED] ignores off_request_policy blocked
    |   +-- [GAP -> REQUIRED] ignores schedule_review blocked
    |   +-- [GAP -> REQUIRED] does not trust checklist.ready for dashboard branching
    |
    +-- handleOpenReadinessItem()
    |   +-- [GAP -> REQUIRED] organization_profile -> org setup route
    |   +-- [GAP -> REQUIRED] schedule_foundation -> Step2 setup query
    |   +-- [GAP -> REQUIRED] employee_roster -> Step3 setup query
    |   +-- [GAP -> REQUIRED] router.push rejection -> Korean error, stays on dashboard
    |
    +-- existing schedule actions
        +-- [EXISTING] handleCreateNew() month modal
        +-- [EXISTING] handleMonthConfirm() duplicate month guard
        +-- [EXISTING] handleViewSchedule() canonical Step5 navigation
        +-- [EXISTING] handleDelete() backend delete boundary

USER FLOW COVERAGE
==================
[+] First dashboard after login
    |
    +-- [GAP -> E2E REQUIRED] incomplete readiness hides create/list/history
    +-- [GAP -> E2E REQUIRED] readiness unavailable hides create/list/history and offers retry
    +-- [GAP -> E2E REQUIRED] complete readiness shows basic info/create/history
    +-- [GAP -> E2E REQUIRED] complete readiness with optional blocked still shows ready dashboard
    |
[+] Onboarding-only flow
    |
    +-- [GAP -> REQUIRED] only first incomplete item is primary/actionable
    +-- [GAP -> REQUIRED] later incomplete items are disabled with visible reason
    +-- [GAP -> REQUIRED] completed prior items remain reviewable
    |
[+] Ready dashboard flow
    |
    +-- [EXISTING + REGRESSION REQUIRED] create schedule from dashboard still opens month modal
    +-- [EXISTING + REGRESSION REQUIRED] existing schedule card still opens canonical Step5
    +-- [GAP -> REQUIRED] schedule-list failure shows retryable history error

SUMMARY:
Existing coverage before implementation: 7/25 relevant paths.
Required additions in this plan: 18 paths, including 4 E2E-worthy user flows.
Critical regressions to guard: create schedule entry, Step5 existing schedule entry, delete/edit actions inside moved history section.
```

### Failure Modes

| Codepath                  | Production failure                                    | Test required            | Error handling required                         | User-visible result                            |
| ------------------------- | ----------------------------------------------------- | ------------------------ | ----------------------------------------------- | ---------------------------------------------- |
| `getChecklist()`          | Edge function timeout 또는 500                        | Unit + E2E               | `opsReadinessLoadFailed = true`; skip schedules | Retryable readiness-unavailable state          |
| Required key lookup       | Backend가 필수 key 중 하나를 누락                     | Unit                     | incomplete/ready가 아니라 unavailable로 처리    | Retryable readiness-unavailable state          |
| Incomplete readiness      | Employee roster blocked지만 schedules는 이미 존재     | Unit + E2E               | `getScheduleList()` skip, stale schedules clear | Onboarding-only screen                         |
| Optional readiness        | required keys ready 이후 `off_request_policy` blocked | Unit + E2E               | dashboard-ready branch에서 ignore               | Complete dashboard with optional guidance only |
| Schedule list load        | Ready 이후 Supabase/network failure                   | Unit                     | `scheduleListLoadFailed = true`                 | History error, false empty state 아님          |
| Readiness navigation      | `router.push()` reject                                | Unit                     | `try/catch` with `showError()`                  | 담당자는 dashboard에 남고 clear error 표시     |
| Step5 schedule-card entry | Compare request 실패                                  | Existing unit regression | 기존 `showError()` path 유지                    | Step5로 broken navigation 없음                 |

추가된 schedule-list error state와 route failure handling이 구현되면 silent critical gap은 남지 않는다.

### Performance Review

- 긍정적 변화: readiness가 complete될 때까지 `getScheduleList()`를 skip하므로 incomplete/unavailable dashboard state에서 불필요한 network request 하나가 제거된다.
- N+1 pattern은 도입하지 않는다. Dashboard는 여전히 checklist request 1개와, ready일 때만 schedule-list request 1개를 사용한다.
- Caching layer는 필요 없다. Stale setup readiness가 잘못된 first action을 노출할 수 있으므로 readiness state는 mount와 selected-organization change마다 refresh되어야 한다.
- Memory impact는 negligible하다. 가장 큰 retained local collection은 기존 schedule list 그대로이다.

### Engineering NOT in Scope

- Backend checklist reducer changes: existing contract로 충분하다.
- Dashboard readiness용 새 Pinia store/composable: 여러 화면이 같은 gate를 소비하기 전까지 필요 없다.
- Broad dashboard analytics/KPI work: MVP readiness scope 밖이다.
- Full mobile workflow redesign: narrow viewport가 깨지지 않아야 하지만 mobile optimization은 out of scope이다.
- Separate TODO entry: `TODOS.md`가 없고 알려진 implementation work는 이 계획 안에 모두 captured되어 있다.

### Engineering Plan Review Completion Summary

```text
+====================================================================+
|      ENGINEERING PLAN REVIEW - COMPLETION SUMMARY                  |
+====================================================================+
| Step 0: Scope Challenge    | scope accepted; no new infra/service   |
| Architecture Review        | 3 issues found; all folded into plan   |
| Code Quality Review        | 6 guidance items added                 |
| Test Review                | diagram produced, 18 gaps identified   |
| Performance Review         | 1 positive optimization, 0 blockers    |
| NOT in scope               | written                                |
| What already exists        | written                                |
| TODOS.md updates           | 0 items proposed; no TODOS.md present  |
| Failure modes              | 0 critical silent gaps after updates   |
| Outside voice              | skipped                                |
| Lake Score                 | 3/3 recommendations chose complete fix |
+====================================================================+
```

Engineering plan review status: **DONE**. Readiness-first data flow, schedule history error state, route failure handling, coverage requirements가 추가되었으므로 이 계획은 implementation-ready이다.

## Design Plan Review Completion Summary

```text
+====================================================================+
|         DESIGN PLAN REVIEW - COMPLETION SUMMARY                    |
+====================================================================+
| System Audit         | DESIGN.md exists; UI scope is Dashboard.vue |
| Step 0               | 6/10 initial; gaps were states, IA, a11y    |
| Pass 1  (Info Arch)  | 6/10 -> 9/10 after hierarchy/diagrams      |
| Pass 2  (States)     | 5/10 -> 9/10 after state matrix/failure    |
| Pass 3  (Journey)    | 6/10 -> 9/10 after operator flow clarified |
| Pass 4  (AI Slop)    | 6/10 -> 9/10 after app-UI constraints     |
| Pass 5  (Design Sys) | 7/10 -> 9/10 after DESIGN.md alignment    |
| Pass 6  (Responsive) | 4/10 -> 8/10 after viewport/a11y rules    |
| Pass 7  (Decisions)  | 0 unresolved, 8 added to plan             |
+--------------------------------------------------------------------+
| NOT in scope         | written (6 items)                          |
| What already exists  | written                                    |
| TODOS.md updates     | 0 items proposed; all design debt captured |
| Decisions made       | 8 added to plan                            |
| Decisions deferred   | 0                                          |
| Overall design score | 6/10 -> 9/10                               |
+====================================================================+
```

Design plan review status: **DONE**. 구현하기에 충분히 design-complete하다. 구현 후 live screen 기준 visual QA를 위해 `/design-review`를 실행한다.

## GSTACK REVIEW REPORT

| Review        | Trigger               | Why                             | Runs | Status | Findings                                                             |
| ------------- | --------------------- | ------------------------------- | ---- | ------ | -------------------------------------------------------------------- |
| CEO Review    | `/plan-ceo-review`    | Scope & strategy                | 0    | -      | -                                                                    |
| Codex Review  | `/codex review`       | Independent 2nd opinion         | 0    | -      | -                                                                    |
| Eng Review    | `/plan-eng-review`    | Architecture & tests (required) | 1    | clean  | 3 architecture issues, 18 test gaps captured, 0 critical silent gaps |
| Design Review | `/plan-design-review` | UI/UX gaps                      | 1    | clean  | score: 6/10 -> 9/10, 8 decisions                                     |

**UNRESOLVED:** 0 decisions.
**VERDICT:** DESIGN + ENG CLEARED for implementation. 구현 후 visual QA를 위해 `/design-review`를 실행하고, shipping 전 required lint/build checks를 실행한다.
