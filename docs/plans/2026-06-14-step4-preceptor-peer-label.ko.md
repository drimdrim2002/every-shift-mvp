# Step4 프리셉터 짝 — 상대 이름(peer) 표시 강화

> **상태:** ✅ 구현 완료  
> **작성일:** 2026-06-14  
> **선행 작업:** [프리셉터 짝 같은 행 표시](./2026-06-14-step4-preceptor-pair-same-row.ko.md) (Phase 1–3 ✅)  
> **관련 화면:** `Step4InitialData.vue`, `ScheduleGrid.vue`

---

## 요약

Step4 Off 요청 캘린더에서 프리셉터–프리셉티 **1:1 짝**이 있을 때, 현재는 역할 배지(`프리셉터` / `프리셉티`)만 보여 **상대가 누구인지** 바로 알기 어렵다.

**사용자 예시 (Step3 기준):**

| 근무자  | 역할     | 상대    |
| ------- | -------- | ------- |
| 정다래Q | 프리셉터 | 이민지  |
| 이민지  | 프리셉티 | 정다래Q |

Step3 `EmployeeTable`은 프리셉티 행에 `정다래Q (42635)` 열로 관계를 보여 준다. Step4 그리드는 인접 배치·좌측 스트라이프·역할 배지까지 있으나 **상대 이름이 없어** 스크린샷처럼 두 줄이 “같은 짝”인지 역할만으로는 부족하다.

본 계획은 **그리드 이름 셀에 역할 + 상대 이름**을 노출해 Step3 수준의 관계 인지를 달성하는 것이 목표다.

---

## 현재 구현 상태 (코드베이스 확인)

| 항목                               | 상태           | 위치                                                      |
| ---------------------------------- | -------------- | --------------------------------------------------------- |
| 짝 인접 행 정렬                    | ✅             | `orderEmployeesForPreceptorPairs`                         |
| `peerName` / `peerEmployeeId` 메타 | ✅ (UI 미사용) | `getPreceptorPairDisplayMeta`                             |
| 역할 배지 + 행 배경                | ✅             | `ScheduleGrid.vue` L116–125, L537–543                     |
| 선택 시 짝 자동 포함               | ✅             | `expandSelectedEmployeeIdsWithPairs`                      |
| 드로어 힌트 (선택 후)              | ✅             | `preceptorPairHints` — `연결된 프리셉터: {이름} ({사번})` |
| 그리드 이름 셀에 상대 표시         | ❌             | `peerName` prop 있으나 렌더 없음                          |

**갭:** 데이터·정렬·선택 UX는 갖춰졌고, **이름 셀 copy만** 보강하면 된다.

---

## deep-interview — 확정된 사항

| 축              | 결정                                                                                        |
| --------------- | ------------------------------------------------------------------------------------------- |
| **목표**        | 그리드만 봐도 “이 사람의 프리셉터/프리셉티가 누구인지” 즉시 인지                            |
| **데이터 소스** | 기존 `pairDisplayMetaByEmployeeId` (`peerName`, `peerEmployeeId`, `role`) — 신규 API 불필요 |
| **범위 (최소)** | `ScheduleGrid.vue` 이름 셀 (Step4 `mode="planning"` + `pairDisplayMeta` 전달 시)            |
| **제외 (기본)** | Step3/Step5 그리드, DB roster 순서, Off 동기화 로직, Excel 순서                             |
| **제약**        | 30×36 그리드 구조 유지, 이름 열 폭은 DESIGN.md 톤 내에서만 확장                             |
| **완료 기준**   | 정다래Q 행에 프리셉티=이민지, 이민지 행에 프리셉터=정다래Q가 그리드에서 읽힘                |

### 코드베이스에서 자동 해소한 모호성

| #   | 모호했던 지점           | 해소                                                              |
| --- | ----------------------- | ----------------------------------------------------------------- |
| 1   | 짝 데이터 어디서?       | `preceptor_id` + `resolvePreceptorPair` — 기존과 동일             |
| 2   | 행 순서 다시 정할까?    | 아니오 — `displayEmployees` 이미 인접 배치                        |
| 3   | 드로어에는 이미 보이나? | 선택 후 `preceptorPairHints`에 상대 표시됨 — **그리드가 핵심 갭** |
| 4   | 메타에 이름 있나?       | `PreceptorPairDisplayMeta.peerName` / `peerEmployeeId` 이미 존재  |

---

## deep-interview — 미확정 (사용자 결정 필요)

### Q1. 그리드 이름 셀 copy 형식 — ✅ **확정: 옵션 A**

**결정:** 역할 배지 유지 + 그 아래 한 줄  
`프리셉티: 이민지 (43178)` / `프리셉터: 정다래Q (42635)`  
(Step3 프리셉터 열 + 드로어 `preceptorPairHints` copy와 일관)

### Q2. 적용 범위 — ✅ **확정: R1**

**결정:** **그리드 이름 셀만** 변경. 드로어 근무자 검색·캘린더 상단은 기존 유지.

### Q3. 사번 표시 — ✅ **확정: S1** (Q1 옵션 A에 포함)

**결정:** `프리셉터: 정다래Q (42635)` 형식 — 이름 + 사번 모두 표시.

### Q4. 이름 열 폭 — 🟡 구현 시 확정

긴 이름·사번으로 줄바꿈 시 `employee-cell` min-width 조정 여부. DESIGN.md `dense operational` 톤 유지.

---

## 권장 설계 (Q1=A, Q2=R1, Q3=S1 가정)

### 1. ScheduleGrid 이름 셀

`getPairDisplayMeta(employee.id)`가 있을 때:

```vue
<!-- 역할 배지 (기존 유지) -->
<span class="...">프리셉터 | 프리셉티</span>
<!-- 신규: 상대 한 줄 -->
<div class="mt-0.5 text-[11px] text-slate-500" :data-test="`preceptor-pair-peer-${meta.role}`">
  {{ meta.role === 'preceptor' ? '프리셉티' : '프리셉터' }}:
  {{ meta.peerName }} ({{ meta.peerEmployeeId }})
</div>
```

- 프리셉터 행 → `프리셉티: 이민지 (43178)`
- 프리셉티 행 → `프리셉터: 정다래Q (42635)`

**Step4만:** `pairDisplayMetaByEmployeeId`가 비어 있지 않을 때만 렌더 (Step3/5 회귀 없음).

### 2. 변경 파일

| 파일                                                                  | 변경                            |
| --------------------------------------------------------------------- | ------------------------------- |
| `src/components/schedule/ScheduleGrid.vue`                            | 이름 셀 peer 라인 추가          |
| `tests/unit/step4-initial-data.spec.ts` 또는 ScheduleGrid 단위 테스트 | peer copy `data-test` assertion |

**변경 없음:** `preceptorPairDisplayOrder.ts`, `Step4InitialData.vue` (이미 meta 전달 중), `preceptorOffSync.ts`.

### 3. 테스트

- [ ] 프리셉터 행 — `preceptor-pair-peer-preceptor`에 프리셉티 이름·사번
- [ ] 프리셉티 행 — `preceptor-pair-peer-preceptee`에 프리셉터 이름·사번
- [ ] 짝 없는 행 — peer 라인 없음
- [ ] 기존 `preceptor-pair-display-order`·off sync 테스트 회귀 없음

### 4. 검증

```bash
pnpm exec vitest run tests/unit/preceptor-pair-display-order.spec.ts tests/unit/step4-initial-data.spec.ts
pnpm lint:check
pnpm run build
```

---

## 아키텍처 (변경 후)

```text
Step4InitialData.vue
  ├── displayEmployees (기존)
  ├── pairDisplayMetaByEmployeeId (기존)
  └── ScheduleGrid
        └── 이름 셀: 배지 + peer 라인 (신규 렌더)

src/utils/preceptorPairDisplayOrder.ts  ← 변경 없음
```

---

## 완료 기준

1. 그리드에서 정다래Q / 이민지 행 각각 **상대 역할 + 이름 + 사번**이 보인다.
2. 짝 없는 근무자 행은 기존과 동일 (이름·사번·배지 없음).
3. Step3·Step5 그리드 UI 회귀 없음.
4. lint·build·관련 unit test 통과.

---

## 열린 질문

| #   | 항목                      | 상태                                               |
| --- | ------------------------- | -------------------------------------------------- |
| 1   | 이름 셀 copy (Q1 A/B/C/D) | ✅ **A** — 배지 + `프리셉터/프리셉티: 이름 (사번)` |
| 2   | 적용 범위 (Q2 R1/R2/R3)   | ✅ **R1** — 그리드만                               |
| 3   | 사번 포함 (Q3 S1/S2)      | ✅ **S1** — Q1과 동일                              |
| 4   | 이름 열 min-width         | 🟡 구현 시                                         |

---

## 변경 이력

| 날짜       | 내용                                                                             |
| ---------- | -------------------------------------------------------------------------------- |
| 2026-06-14 | deep-interview 기반 — peer 라벨 강화 계획 초안 (선행 same-row 계획 이후 갭 정리) |
| 2026-06-14 | Q1 확정 — 옵션 A (배지 + 상대 역할·이름·사번 한 줄)                              |
| 2026-06-14 | Q2 확정 — R1 (그리드만), Q3 — S1 (Q1에 포함)                                     |
| 2026-06-14 | Phase 1 구현 — ScheduleGrid peer 라벨 + unit test                                |
