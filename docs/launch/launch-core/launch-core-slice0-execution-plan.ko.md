# Launch Core Slice 0 실행 계획

> 원문 기준 문서: [launch-core-slice0-execution-plan.md](./launch-core-slice0-execution-plan.md)
> 관련 슬라이스 문서: [launch-core-implementation-slices.ko.md](./launch-core-implementation-slices.ko.md#slice-0-라우트-의미-고정)

## 이 문서의 결과물

`/app` 라우트 트리나 공개 랜딩 작업을 시작하기 전에, 라우트 의미를 먼저 고정하는 것이 목표입니다.

Slice 0 이 끝나면:

- `/` 는 공개 루트만 의미합니다.
- `/app` 은 로그인 후 작업 공간 루트만 의미합니다.
- 라우트 상수 이름만 봐도 두 의미가 분리되어 있습니다.
- Launch Core 관련 코드에서 새로운 하드코딩 경로가 계속 생기지 않습니다.
- 남은 마이그레이션 범위는 체크리스트로 관리됩니다.

## 검토 요약

현재 슬라이스 방향은 맞지만, 실제 저장소 상태를 보면 시작 전에 두 가지를 바로잡아야 합니다.

1. `src/constants/routes.ts` 가 아직 `/` 를 로그인 후 홈처럼 사용하고 있습니다.
2. raw path 사용 범위가 문서에 적힌 것보다 더 넓습니다. 특히 `src/views/ops/OffRequestPolicySetup.vue`, unit/E2E helper 쪽이 그렇습니다.

따라서 Slice 0 에서는 먼저 의미를 고정하고 builder 를 중앙화해야 합니다. 다만 이 단계에서 보이는 라우트 트리 자체를 바꾸면 안 됩니다.

## 현재 코드 상태에서 확인된 문제

### 이미 존재하는 의미 충돌

- `HOME_ROUTE_PATH = '/'` 가 로그인 후 홈 의미로 쓰이고 있음
- `resolvePostAuthRedirectPath()` 가 admin 을 `/`, user 를 `/home/user` 로 보냄
- 인증된 작업 레이아웃이 아직 `/` 에 마운트되어 있음
- auth guard 가 아직 `/` 를 인증 사용자 랜딩으로 특별 취급함

### 문서에 충분히 적혀 있지 않았던 raw path 소유 파일

- `src/views/ops/OffRequestPolicySetup.vue`
- `tests/e2e/multi-org-rbac.spec.ts`
- `tests/e2e/pilot-checklist.spec.ts`
- `tests/unit/login-view.spec.ts`
- `tests/unit/step1-basic-info.spec.ts`
- `tests/unit/step2-site-info.spec.ts`
- `tests/unit/step3-employee-info.spec.ts`
- `tests/unit/step4-initial-data.spec.ts`
- `tests/unit/phase2-ops-contracts.spec.ts`
- `tests/unit/phase2-ops-checklist.spec.ts`

### raw path 조사 명령

슬라이스 전후로 아래를 사용합니다.

```bash
rg -n "'/((admin|home|ops|schedule)|app)" src tests
```

영향 파일 목록만 보고 싶다면:

```bash
rg -l "'/((admin|home|ops|schedule)|app)" src tests
```

## Slice 0 범위

### 포함

- 상수와 helper 에서 라우트 의미 정의
- public root, app root, approval queue, user home, ops, schedule step, Step5 용 canonical builder 도입
- 명시적인 legacy redirect map 데이터 정의
- 계약 소유 파일에 있는 고위험 raw path 교체
- 남은 raw path 를 후속 체크리스트로 전환
- 의미 분리를 잠그는 unit test 확장

### 제외

- `DefaultLayout` 을 `/app` 아래로 옮기는 작업
- router 에 레거시 redirect route 추가
- 랜딩 페이지 UI 배포
- 테스트와 계약 정리 범위를 넘는 사용자 체감 라우트 변경

## Slice 0 에서 다뤄야 할 파일

### 핵심 계약 파일

- `src/constants/routes.ts`
- `src/router/guards.ts`
- `src/router/index.ts`

### 1차 호출부 수정 대상

- `src/views/Dashboard.vue`
- `src/components/layout/Sidebar.vue`
- `src/views/schedule/Step1BasicInfo.vue`
- `src/views/schedule/Step2SiteInfo.vue`
- `src/views/schedule/Step3EmployeeInfo.vue`
- `src/views/schedule/Step4InitialData.vue`
- `src/views/schedule/Step5Result.vue`
- `src/views/ops/OffRequestPolicySetup.vue`
- `tests/e2e/helpers.ts`

### 지금 바로 수정할 테스트

- `tests/unit/router-index.spec.ts`
- `tests/unit/router-guards.spec.ts`
- `tests/unit/router-auth-guards.spec.ts`
- `tests/unit/dashboard.spec.ts`
- `tests/unit/sidebar.spec.ts`
- `tests/unit/schedule-version-resolver.spec.ts`
- `tests/unit/step5-result.spec.ts`
- `tests/unit/login-view.spec.ts`

### 조사만 하고, Slice 0 에서 모두 옮기지는 않아도 되는 테스트

- `tests/e2e/multi-org-rbac.spec.ts`
- `tests/e2e/pilot-checklist.spec.ts`
- `tests/unit/step1-basic-info.spec.ts`
- `tests/unit/step2-site-info.spec.ts`
- `tests/unit/step3-employee-info.spec.ts`
- `tests/unit/step4-initial-data.spec.ts`
- `tests/unit/phase2-ops-contracts.spec.ts`
- `tests/unit/phase2-ops-checklist.spec.ts`

## 이 슬라이스에서 고정해야 하는 계약

`src/constants/routes.ts` 에 아래 개념이 명확히 드러나야 합니다.

```ts
export const PUBLIC_ROOT_ROUTE_PATH = '/';
export const APP_HOME_ROUTE_PATH = '/app';

export const LEGACY_APPROVAL_QUEUE_ROUTE_PATH = '/admin/approval-queue';
export const LEGACY_USER_HOME_ROUTE_PATH = '/home/user';
export const LEGACY_OPS_ORGANIZATION_SETUP_ROUTE_PATH = '/ops/organization-setup';
export const LEGACY_OPS_OFF_REQUEST_POLICY_SETUP_ROUTE_PATH = '/ops/off-request-policy-setup';
export const LEGACY_SCHEDULE_STEP1_ROUTE_PATH = '/schedule/step1';
export const LEGACY_SCHEDULE_STEP2_ROUTE_PATH = '/schedule/step2';
export const LEGACY_SCHEDULE_STEP3_ROUTE_PATH = '/schedule/step3';
export const LEGACY_SCHEDULE_STEP4_ROUTE_PATH = '/schedule/step4';
```

추가로 필요한 canonical builder:

- `getAppHomeRoutePath()`
- `getApprovalQueueRoutePath()`
- `getUserHomeRoutePath()`
- `getOpsOrganizationSetupRoutePath()`
- `getOpsOffRequestPolicySetupRoutePath()`
- `getScheduleStepRoutePath(step: 1 | 2 | 3 | 4)`
- `getScheduleStep5RoutePath(scheduleKey: string)`

추가로 필요한 route classifier:

- `isPublicRootRoutePath(path: string)`
- `isAppRoutePath(path: string)`
- `isLegacyAppRoutePath(path: string)`
- `getLegacyRedirectTarget(path: string)`

### 네이밍에서 중요한 규칙

- `HOME_ROUTE_PATH` 같은 과적된 이름은 유지하지 않습니다.
- public root, app root, canonical app destination, legacy destination 을 이름으로 분리합니다.

## 구체적인 실행 순서

1. 현재 동작을 기준선으로 저장합니다.
   `/`, `/login`, `/signup`, `/access/*`, `/admin/*`, `/home/*`, `/ops/*`, `/schedule/*` 의 현재 redirect 매트릭스를 남깁니다.

2. `src/constants/routes.ts` 를 의미 계약 파일로 정리합니다.
   public root, app root, canonical builder, Step5 builder, typed legacy redirect map 을 추가합니다.

3. guard 로직이 raw path 대신 의미를 보도록 바꿉니다.
   `resolveAuthNavigationTarget()`, `resolveRouteAccessTarget()`, `stepProgressGuard()` 의 `/` 기준 비교를 helper 기준으로 바꿉니다.

4. 라우트 트리는 아직 바꾸지 않고 router 참조만 준비합니다.
   `src/router/index.ts` 에 새 helper 를 연결하되, 실제 마운트 구조 변경은 Slice 2 까지 미룹니다.

5. 고위험 호출부 raw path 를 교체합니다.
   `Dashboard.vue`, `Sidebar.vue`, `Step1BasicInfo.vue` ~ `Step5Result.vue`, `OffRequestPolicySetup.vue`, `tests/e2e/helpers.ts` 부터 시작합니다.

6. unit test 로 계약을 잠급니다.
   public root 와 app root 가 다르다는 점, redirect helper 가 canonical `/app` 으로 해석된다는 점, Step5 helper 가 `/` 로 떨어지지 않는다는 점을 검증합니다.

7. 슬라이스 후 raw path 를 다시 조사합니다.
   남은 항목은 즉흥 수정으로 계속 건드리지 말고 Slice 1 또는 Slice 4 작업 항목으로 넘깁니다.

## 영역별 구현 메모

### `src/constants/routes.ts`

- auth route 와 access-state route 는 고정 상수로 유지
- post-auth 결과는 canonical `/app` 목적지로 반환
- legacy 목적지는 compatibility 상수로만 노출
- 호출부 문자열 연결 대신 builder 사용

### `src/router/guards.ts`

- `resolveAuthNavigationTarget()` 은 `/` 를 공개 루트로 해석해야 함
- 인증 사용자가 `/` 에 접근했을 때 helper 수준에서 canonical `/app` 으로 해석되어야 함
- 단계 guard 비교는 step builder 기반으로 정리
- Step5 잘못된 접근이 `/` 를 대시보드처럼 가정하지 않도록 수정

### `src/router/index.ts`

- 의미 분리를 위한 import 와 테스트는 준비
- 하지만 Slice 0 에서 layout 소유 구조를 완전히 옮기지는 않음
- 반쯤 옮겨진 route 등록 상태를 만들지 않도록 주의

### `Dashboard.vue` 와 `Sidebar.vue`

- schedule, ops, Step5 관련 문자열 비교를 helper 로 교체
- 선택 상태와 활성 상태가 앞으로의 canonical 계약과 맞도록 정리
- 피할 수 없는 레거시 가정만 주석 또는 TODO 로 명시

### 스케줄 단계 뷰

- 이전/다음 이동 경로의 하드코딩 문자열을 step builder 로 교체
- `/app` route 가 생기기 전이라도 Step5 의 “step4 로 돌아가기”, “step1 부터 다시 시작” 이 helper 기반이어야 함

### `tests/e2e/helpers.ts`

- 인증 후 도착 경로를 `/`, `/admin/approval-queue`, `/home/user` 로만 가정하지 않도록 수정
- 공존 기간에는 canonical `/app` 과 legacy 경로를 둘 다 허용하는 helper predicate 준비

## 테스트 계획

### 수정 전 기준선

```bash
pnpm lint:check
pnpm test:unit -- tests/unit/router-index.spec.ts tests/unit/router-guards.spec.ts tests/unit/router-auth-guards.spec.ts tests/unit/login-view.spec.ts tests/unit/dashboard.spec.ts tests/unit/sidebar.spec.ts tests/unit/schedule-version-resolver.spec.ts tests/unit/step5-result.spec.ts
```

### Slice 0 게이트

```bash
pnpm lint:check
pnpm test:unit -- tests/unit/router-index.spec.ts tests/unit/router-guards.spec.ts tests/unit/router-auth-guards.spec.ts tests/unit/login-view.spec.ts tests/unit/dashboard.spec.ts tests/unit/sidebar.spec.ts tests/unit/schedule-version-resolver.spec.ts tests/unit/step5-result.spec.ts
```

### 강화해야 할 검증 포인트

- route constant 에 public root 와 app root 가 분리되어 있다
- post-auth redirect 가 `/app`, `/app/home/user`, `/app/admin/approval-queue` 로 해석된다
- auth page 접근 시 로그인 사용자가 canonical `/app` 목적지로 이동한다
- sidebar, dashboard 이동이 하드코딩 경로 대신 helper 를 사용한다
- Step5 path builder 가 `scheduleKey` 를 유지한다

## 완료 정의

아래 조건을 모두 만족해야 Slice 0 완료로 봅니다.

- `src/constants/routes.ts` 만 읽어도 공개 루트와 로그인 후 홈을 혼동하지 않는다
- 새 route helper 가 approval queue, user home, ops setup, schedule steps, Step5 를 모두 커버한다
- legacy route 지원이 흩어진 문자열이 아니라 명시적인 맵으로 표현된다
- Launch Core 의 고위험 소유 파일에서 raw route string 추가가 멈춘다
- 남은 raw path 가 후속 작업 항목과 파일 소유자까지 포함해 기록된다
- `pnpm lint:check` 가 green 이다
- Slice 0 unit gate 가 green 이다

## 권장 커밋 경계

이 슬라이스는 한 커밋으로 정리하는 것을 권장합니다.

```text
chore: freeze launch route semantics
```

## Slice 1 로 넘길 후속 체크리스트

- 슬라이스 후 조사에서 남은 raw route string 교체
- 임시 compatibility helper 를 최종 Launch Core route contract 로 정리
- `src/router/index.ts`, guard, layout navigation, test 가 동일한 builder 세트를 사용하게 통일
