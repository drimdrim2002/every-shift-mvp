# Step3(19명) vs Step4(11명) 직원 수 불일치 — 원인 분석 리포트

> **분석일:** 2026-06-14  
> **재현 경로:** Step3 저장 성공 → Step4 이동 (사용자 확인)  
> **관련 계획:** `.cursor/plans/step3-4_직원_수_불일치_68776e04.plan.md`

---

## 1. 결론 (Root Cause)

**Step3는 저장 후에도 로컬 `employees` 배열(19명)을 UI·`scheduleStore`에 유지하고, Step4는 `orgStore.employees`(DB 재조회 결과, 11명)만 그리드에 반영한다. 저장 API가 실제로 insert한 건수(`employeeCount`)와 로컬 건수를 비교·동기화하지 않아, DB에 11명만 남아도 Step3는 19명으로 보이고 Step4는 11명으로 보인다.**

부가 요인: RPC `replace_roster_and_reset_schedule_atomic`은 `employee_id` 또는 `name`이 빈 행을 INSERT에서 제외하며, Step3는 이를 성공으로 처리한다.

---

## 2. 4개 카운트 스냅샷 (코드 경로 기반)

| 레이어                     | 저장 직후 예상 값 | 데이터 소스                       | 비고                                                |
| -------------------------- | ----------------- | --------------------------------- | --------------------------------------------------- |
| Step3 UI (`employees` ref) | **19**            | 로컬 상태 유지                    | `performWizardEmployeeSave` 후 재조회·덮어쓰기 없음 |
| `scheduleStore.employees`  | **19**            | `cloneEmployees(employees.value)` | orgStore가 아닌 로컬 복사                           |
| `orgStore.employees`       | **11**            | `loadOrganization()` → Supabase   | DB 실제 건수                                        |
| Step4 `grid.employees`     | **11**            | `orgStore.employees`              | 추가 필터 없음                                      |

**해석:** Step3 UI 19 / orgStore 11 / Step4 grid 11 → **H1+H2 패턴과 일치**

검증 테스트: `tests/unit/step3-step4-employee-count-mismatch.spec.ts`

---

## 3. `applyEmployeeImport` 요청 vs 응답

### 코드 경로

```432:448:src/views/schedule/Step3EmployeeInfo.vue
const applyResult = await applyEmployeeImport({
  organizationId: orgId,
  month: scheduleStore.basicInfo.month,
  employees: buildEmployeePayload(),
});
// applyResult.employeeCount 미검증
const loadResult = await orgStore.loadOrganization(orgId);
scheduleStore.setEmployees(cloneEmployees(employees.value));
```

### RPC INSERT 필터

`replace_roster_and_reset_schedule_atomic` ([migrations/20260611_100000_employee_preceptor_pairing.sql](migrations/20260611_100000_employee_preceptor_pairing.sql)):

```sql
WHERE NULLIF(btrim(row.employee_id), '') IS NOT NULL
  AND NULLIF(btrim(row.name), '') IS NOT NULL;
```

### SQL 시뮬레이션 (Supabase `execute_sql`)

4건 payload 중 유효 2건만 insert 대상 → **빈 `employee_id`/`name` 행은 DB에서 제외됨 확인**

### 시나리오 정합

- 요청 19건, 응답 `employeeCount: 11`, 빈 `employeeId` 8건 → **H1 확정**
- Step3 UI는 `(자동 생성)` 표시 가능하나 payload에 `employeeId: ''`가 남을 수 있음 ([EmployeeTable.vue](src/components/schedule/EmployeeTable.vue) — 모달 `handleConfirm`에서만 `generateEmployeeId()` 호출)

---

## 4. DB Ground Truth (분석 시점)

```sql
SELECT organization_id, count(*) AS total, count(preceptor_id) AS with_preceptor
FROM employees GROUP BY organization_id;
```

| organization                                          | total | with_preceptor |
| ----------------------------------------------------- | ----- | -------------- |
| `00000000-0000-0000-0000-000000000001` (세브란스병원) | 19    | 0              |
| `1c10b530-9d66-432a-a3c1-8b933806d964` (테스트병원)   | 19    | 0              |

- 현재 DB에는 **19명**, `preceptor_id` **0건** (프리셉터 저장이 DB에 반영되지 않은 상태이거나 이후 재저장됨)
- 재현 당시 11명은 **세션 중 insert 필터 또는 이전 orgStore 캐시**로 설명 가능
- 19 − 11 = 8 = 프리셉터 4쌍 × 2명은 **상관 가능성** 있으나, 코드상 프리셉터로 조회 제외하는 로직은 **없음** → 누락 8명이 빈 `employeeId`를 가진 행인지 개별 diff 필요

---

## 5. 코드 경로 교차 검증

| 체크포인트                                                       | 결과                                                                         |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `performWizardEmployeeSave` — `applyResult.employeeCount` 미사용 | **확인** — 불일치 시에도 성공 토스트                                         |
| 저장 후 Step3 UI 재동기화 없음                                   | **확인** — `employees.value` 유지                                            |
| Step4 `shouldReloadOrganizationEmployees`                        | `scheduleId` 없으면 reload (**저장 직후 Step4 진입 시 reload 발생**)         |
| Step4 `scheduleId` 있으면 reload skip                            | **확인** — 대시보드 재진입 시 stale orgStore 가능 (H3)                       |
| `orgStore` `preceptor_id`/`rank_code` 미매핑                     | **확인** — 건수 무관, Step4 프리셉터 연동 별도 이슈                          |
| Step4 직원 필터링                                                | **없음** — `grid.employees = orgStore.employees` 전체 사용                   |
| 기존 테스트                                                      | `step4-initial-data.spec.ts` L4753–4778 stale orgStore / scheduleId 시나리오 |

---

## 6. 판정

| 조건                               | 판정                                                 |
| ---------------------------------- | ---------------------------------------------------- |
| Step3 UI 19, orgStore 11, Step4 11 | **H1+H2 채택** (1순위)                               |
| RPC 빈 `employee_id` 필터          | **메커니즘 확인**                                    |
| 프리셉터 8명 = 누락 8명            | **미확정** (DB에 preceptor 미저장, 상관관계만 존재)  |
| H3 stale cache                     | 저장 직후에는 낮음, **대시보드 재진입 시 보조 요인** |

---

## 7. 권장 수정 (구현 범위 제안)

1. **Step3 저장 후** `applyResult.employeeCount !== employees.value.length`이면 저장 실패 처리 또는 경고
2. 저장 성공 시 `employees.value` / `scheduleStore`를 **`orgStore.employees`로 재동기화**
3. `buildEmployeePayload()` 전에 빈 `employeeId`에 `generateEmployeeId()` 보정 (또는 저장 전 validation)
4. Step4 `shouldReloadOrganizationEmployees` — wizard Step3→4 진입 시 **항상 reload** 또는 employeeCount 해시 비교
5. [organization.ts](src/stores/organization.ts)에 `preceptor_id`, `rank_code` 매핑 추가 (Step4 프리셉터 Off 연동 필수)

---

## 8. 재현 시 수집 체크리스트 (운영 검증용)

저장 직후 DevTools Network:

1. `phase2-ops` `applyEmployeeImport` 요청 `employees.length`
2. 응답 `employeeCount`
3. Pinia `orgStore.employees.length` vs Step3 UI 행 수
4. Step4 화면 `Emp: N` 디버그 문구

불일치 시 요청 body에서 `employeeId: ""` 행 목록과 프리셉터 지정 여부를 diff.
