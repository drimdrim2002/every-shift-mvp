# Step4 Off 요청 저장 403 RLS 오류 수정 계획

> **상태:** 📋 Plan 확정 대기 (구현 전)  
> **작성일:** 2026-06-14  
> **관련 조사:** `.cursor/plans/step4_off_rls_403_4e6833f6.plan.md` (수정 금지)  
> **관련 기능:** [Step4 프리셉터 짝 Off 요청 동기화](./2026-06-14-step4-preceptor-off-request-sync.ko.md)

---

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.  
> **Scope guard:** RLS 정책 변경·DB 마이그레이션·Edge Function API 이전은 **이번 plan 범위 밖**.

---

## 1. 문제 요약

Step4에서 Off `요청 반영` 시 `schedule_preferences` INSERT가 **403 / 42501 (RLS WITH CHECK 실패)** 로 거부된다. 조사 결과, 이는 admin 권한 부족이나 JWT 문제가 아니라 **클라이언트가 존재하지 않는 `employee_id`로 INSERT를 시도**하기 때문이다.

확정 root cause: Step3 `applyEmployeeImport` → `replace_roster_and_reset_schedule_atomic`이 조직의 모든 `employees` 행을 삭제한 뒤 **새 `gen_random_uuid()`로 재삽입**한다. 그러나 Step3 저장 직후 `orgStore.loadOrganization()`을 호출하지 않아 `orgStore.employees`에 **재삽입 전 UUID**가 남고, Step4 `loadStep4InitialData`는 `orgStore.employees.length > 0`이면 reload를 건너뛴다. 결과적으로 Step4 그리드·Off persist 경로가 stale UUID를 사용하고, RLS `WITH CHECK`의 `employees` JOIN이 실패해 403이 반환된다.

| 증거          | 내용                                                                        |
| ------------- | --------------------------------------------------------------------------- |
| Network       | `DELETE schedule_preferences` → **204**, 직후 `POST` → **403**              |
| 동일 사용자   | 로스터 재저장 **전** POST **201**                                           |
| 실패 컨텍스트 | 로스터 재저장 **후** 신규 schedule/version에서 POST **403**                 |
| SQL 검증      | 유효 employee + admin → `insert_would_pass = true`; 삭제된 UUID → join 실패 |

---

## 2. 수정 전략

| 원칙               | 내용                                                                                                           |
| ------------------ | -------------------------------------------------------------------------------------------------------------- |
| **최소 diff**      | 클라이언트 캐시 동기화만 수정. DB·RLS·마이그레이션 변경 없음                                                   |
| **근본 수정 우선** | stale cache가 생기지 않도록 Step3 저장 직후·Step4 진입 시 reload                                               |
| **방어층 보강**    | persist 직전 2차 검증 (P1). 근본 수정만으로도 재현 차단 가능하나, localStorage draft 등 잔여 경로 대비         |
| **API 경로 유지**  | `saveSchedulePreferencesByScope` direct client INSERT 유지. Edge Function 이전은 별도 ADR                      |
| **범위 밖**        | RLS 정책 변경, `replace_roster_and_reset_schedule_atomic` 시그니처/동작 변경, service_role preference API 신설 |

---

## 3. 권장 수정안 (우선순위)

### P0-A — Step3 roster apply 직후 `orgStore.loadOrganization()` 강제

**대상:** `performWizardEmployeeSave` (`applyEmployeeImport` 성공 후)

`applyEmployeeImport`가 `replace_roster_and_reset_schedule_atomic`을 호출해 employee UUID가 전부 바뀐다. 저장 성공 직후 `orgStore.loadOrganization(orgId)`를 호출해 Pinia `employees`를 DB와 일치시킨다.

**부가:** `performSetupEmployeeSave` (`replaceOrganizationRoster`)도 동일하게 `DELETE` → `INSERT` 패턴이므로 동일 reload 적용.

### P0-B — Step4 진입 시 employee 목록 강제 reload 조건

**대상:** `loadStep4InitialData`

현재 조건 `!orgStore.current \|\| orgStore.employees.length === 0`은 roster 재저장 직후 **stale but non-empty** 캐시를 놓친다.

**권장 reload 조건 (OR):**

```text
forceRefresh === true
  OR !orgStore.current
  OR orgStore.employees.length === 0
  OR !scheduleStore.basicInfo.scheduleId   // Step3 roster reset이 scheduleId를 undefined로 만든 경계
```

`!scheduleStore.basicInfo.scheduleId`는 Step3 `performWizardEmployeeSave`가 `scheduleStore.setBasicInfo({ scheduleId: undefined })`로 설정하는 **roster reset 경계**와 정확히 대응한다. ensure 이후 scheduleId가 생기면 일반 진입과 동일하게 non-empty 캐시를 재사용할 수 있다.

**대안 (더 보수적):** wizard Step4 `onMounted`에서 항상 `loadOrganization` 1회 — 구현 단순, API 1회 추가. 위 조건식이 실패할 엣지가 걱정되면 채택.

### P1 — persist 직전 stale employee UUID 방어층

**대상:** `sanitizeSnapshotToCurrentEmployees`, `persistStep4PreferenceMaps`

현재 `sanitizeSnapshotToCurrentEmployees`는 `grid.employees` 기준으로만 필터한다. grid가 orgStore에서 복사되므로 P0만으로 충분하지만, **localStorage draft**에 이전 UUID가 남아 있을 수 있다.

**보강:**

1. `sanitizeSnapshotToCurrentEmployees`의 기준 집합을 `orgStore.employees` (또는 reload 직후 grid)로 통일하고, grid·orgStore 불일치 시 orgStore 우선.
2. `persistStep4PreferenceMaps` 진입 시 `orgStore.employees`가 비어 있거나 grid와 ID 집합이 다르면 `loadOrganization` 1회 후 재검증.
3. 제거된 stale key가 있으면 기존 `showInfo` 토스트 유지; **INSERT payload에 stale ID가 0건**임을 보장.

### P2 — Edge Function preference replace API 이전 (별도 논의, **이번 scope 밖**)

`ensurePhase2Schedule` / `recheckPhase2ScheduleVersion`은 service_role 경로이나, Off 저장은 여전히 클라이언트 direct INSERT (`src/api/schedule.ts` `saveSchedulePreferencesByScope`). 장기적으로 RLS·권한 일관성을 위해 Edge Function 이전을 검토할 수 있으나, **이번 버그 수정과 무관**하며 별도 ADR로만 언급한다.

---

## 4. 구체 작업 목록

### 4.1 `src/views/schedule/Step3EmployeeInfo.vue`

| 항목      | 내용                                                                                                                 |
| --------- | -------------------------------------------------------------------------------------------------------------------- |
| 함수      | `performWizardEmployeeSave`                                                                                          |
| 변경      | `applyEmployeeImport` 성공 후, `scheduleStore` 갱신 **이전 또는 직후** `await orgStore.loadOrganization(orgId)` 호출 |
| 실패 처리 | `loadOrganization` 실패 시 저장 성공 토스트 대신 에러 표시 + `return false` (stale cache 방지)                       |
| 함수      | `performSetupEmployeeSave`                                                                                           |
| 변경      | `replaceOrganizationRoster` 성공 후 동일 `loadOrganization` 호출                                                     |
| 예상 diff | **+12~18 lines**                                                                                                     |

`orgStore`는 이미 import·인스턴스화되어 있음 (`useOrganizationStore`).

### 4.2 `src/views/schedule/Step4InitialData.vue`

| 항목      | 내용                                                                                        |
| --------- | ------------------------------------------------------------------------------------------- |
| 함수      | `loadStep4InitialData`                                                                      |
| 변경      | §3 P0-B reload 조건 적용. reload 성공 후 `grid.employees.value = orgStore.employees` 유지   |
| 함수      | `sanitizeSnapshotToCurrentEmployees` (P1)                                                   |
| 변경      | `currentEmployeeIds` 소스를 `orgStore.employees` 우선으로 변경 (fallback: `grid.employees`) |
| 함수      | `persistStep4PreferenceMaps` (P1)                                                           |
| 변경      | persist 직전 orgStore·grid employee ID 집합 불일치 시 `loadOrganization` + grid 재할당      |
| 예상 diff | **+20~35 lines**                                                                            |

기존 `loadStep4InitialData(true)` 호출부(예: refresh 핸들러)는 `forceRefresh`로 이미 reload하므로 회귀 없음.

### 4.3 `src/api/schedule.ts`

| 항목 | 내용                                               |
| ---- | -------------------------------------------------- |
| 함수 | `saveSchedulePreferencesByScope`                   |
| 변경 | **이번 plan에서 변경 없음** (P2 옵션으로만 문서화) |

### 4.4 `migrations/20260611_100000_employee_preceptor_pairing.sql`

| 항목 | 내용                                                               |
| ---- | ------------------------------------------------------------------ |
| 함수 | `replace_roster_and_reset_schedule_atomic`                         |
| 변경 | **이번 plan에서 변경 없음**. UUID 재발급 동작은 의도된 설계로 유지 |

### 4.5 테스트 파일

| 파일                                     | 작업                                                                                                    | 예상 diff    |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------ |
| `tests/unit/step3-employee-info.spec.ts` | `performWizardEmployeeSave` / `performSetupEmployeeSave` 성공 시 `loadOrganization` 호출 assertion 추가 | +25~40 lines |
| `tests/unit/step4-initial-data.spec.ts`  | stale orgStore cache 시나리오, `scheduleId: undefined` 시 reload 강제 시나리오                          | +40~70 lines |

**총 예상 diff:** 약 **100~160 lines** (프로덕션 + 테스트)

---

## 5. 테스트 계획

### 5.1 Unit — `tests/unit/step3-employee-info.spec.ts`

- [ ] `applyEmployeeImport` 성공 후 `orgStore.loadOrganization(orgId)` **1회** 호출
- [ ] `loadOrganization` 실패 시 `showSuccess` 미호출, `showError` 호출, `return false`
- [ ] `replaceOrganizationRoster` 경로(`performSetupEmployeeSave`)도 동일 reload 검증
- [ ] `loadOrganization` 실패가 scheduleStore 롤백을 유발하지 않는지 확인 (저장은 이미 완료된 상태 — UX 메시지만 검증)

### 5.2 Unit — `tests/unit/step4-initial-data.spec.ts`

**시나리오: stale orgStore cache after roster reset**

```text
Given:
  organizationStoreMock.employees = [{ id: 'old-uuid-1', ... }]  // stale
  scheduleStoreMock.basicInfo.scheduleId = undefined              // roster reset boundary
When:
  Step4InitialData mounts → loadStep4InitialData runs
Then:
  loadOrganization called
  After mock returns fresh employees [{ id: 'new-uuid-1', ... }]:
    grid.employees reflects new UUIDs
```

- [ ] `scheduleId: undefined` + non-empty stale employees → `loadOrganization` 호출
- [ ] `scheduleId` 존재 + non-empty employees + `forceRefresh: false` → **기존 동작** 유지 (불필요 reload 없음)
- [ ] `forceRefresh: true` → 항상 reload (기존 회귀 없음)
- [ ] (P1) localStorage draft에 `old-uuid-1` Off 포함, fresh employees만 `new-uuid-1` → persist 시 stale key 제거, `saveScheduleVersionPreferences` payload에 `old-uuid-1` 없음

### 5.3 수동 QA

| #   | 단계                                                            | 기대 결과                                                                                |
| --- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 1   | Step3에서 직원 정보 수정 후 저장 (`applyEmployeeImport` 경로)   | 저장 성공 토스트                                                                         |
| 2   | Step4 진입 → Off 1건 `요청 반영`                                | Network: `POST schedule_preferences` **201**                                             |
| 3   | DevTools → `orgStore.employees[].id`가 DB `employees.id`와 일치 | UUID 일치                                                                                |
| 4   | (회귀) Step3 저장 없이 Step4 재진입                             | 불필요한 reload 없이 정상 동작                                                           |
| 5   | (회귀) 프리셉터 짝 Off 동기화 — 한쪽 Off 추가 시 짝 반영        | [preceptor sync plan](./2026-06-14-step4-preceptor-off-request-sync.ko.md) 시나리오 통과 |

---

## 6. 검증 체크리스트

구현 완료 후 아래를 순서대로 실행하고 결과를 기록한다.

```bash
pnpm exec vitest run tests/unit/step3-employee-info.spec.ts
pnpm exec vitest run tests/unit/step4-initial-data.spec.ts
pnpm lint:check
pnpm run build
```

- [ ] step3 unit tests pass
- [ ] step4 unit tests pass (신규 stale-cache 시나리오 포함)
- [ ] `pnpm lint:check` pass
- [ ] `pnpm run build` pass
- [ ] 수동 QA §5.3 #1–#2 통과 (`POST schedule_preferences` 201)

---

## 7. 리스크·회귀 포인트

| 영역                                    | 리스크                                                                                                                                        | 완화                                                                       |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| **프리셉터 Off sync**                   | `preceptor_id`가 reload 후 fresh employee에 매핑됨. Step3에서 `resolve_roster_preceptor_ids`가 DB에 이미 반영되므로 reload만으로 짝 관계 유지 | preceptor sync unit test 회귀 실행                                         |
| **localStorage draft**                  | draft에 stale UUID Off가 있으면 sanitize 시 제거 → 사용자 Off 일부 소실 가능                                                                  | P1 토스트로 안내; reload 후 restoreData 경로에서 sanitize 재실행           |
| **edit-off version flow**               | `scheduleId`가 있는 편집 진입 시 불필요 reload 방지 조건 유지                                                                                 | `scheduleId` 존재 + non-force 시 skip reload 테스트                        |
| **Step3 저장 후 loadOrganization 실패** | DB 저장은 됐으나 캐시 stale → Step4 진입 시 P0-B가 2차 방어                                                                                   | Step4 조건식 + P1 persist guard                                            |
| **API 부하**                            | Step4 `scheduleId: undefined` 진입마다 reload 1회                                                                                             | 월 1회 wizard 흐름에서 허용 가능. 과도하면 Step3 P0만으로도 핵심 경로 차단 |
| **performSetupEmployeeSave**            | setup 모드 roster replace도 UUID 재발급                                                                                                       | P0-A에 포함                                                                |

---

## 8. 완료 기준

1. Step3 roster apply(`applyEmployeeImport` 또는 `replaceOrganizationRoster`) 성공 직후 `orgStore.employees`가 DB 최신 UUID를 반영한다.
2. 로스터 재저장 후 Step4 진입 시 `grid.employees`가 stale UUID를 사용하지 않는다.
3. Step4 Off `요청 반영` 시 `POST /schedule_preferences`가 **201**을 반환한다 (재현 시나리오: 로스터 재저장 → 신규 schedule ensure → Off 1건 반영).
4. §6 검증 체크리스트 전항목 통과.
5. RLS·마이그레이션 변경 없이 배포 가능.

---

## 부록: 제외된 원인 (조사 확정, 구현 불필요)

| 후보           | 결론                                                   |
| -------------- | ------------------------------------------------------ |
| A (admin RLS)  | 동일 사용자 로스터 재저장 전 POST 201 — 권한 문제 아님 |
| B (RBAC drift) | `organization_memberships` admin/approved 확인         |
| D (멀티 조직)  | seed org 일관                                          |
| E (JWT)        | ensure/DELETE 성공                                     |

## 부록: 장기 개선 (ADR 후보, 이번 scope 밖)

- `schedule_preferences` 쓰기를 Edge Function(service_role)으로 이전해 클라이언트 RLS 의존 제거
- `replace_roster_and_reset_schedule_atomic`이 employee UUID를 안정적으로 유지하는 방안 (업무키 `employee_id` 기반 upsert) — 스키마·FK 전파 범위가 커서 별도 설계 필요
