# Step4 프리셉터 짝 Off 요청 동기화 — Design Spec

> **Status:** Approved (구현 전)  
> **Approved:** 2026-06-14  
> **Authoring:** deep-interview + brainstorming review  
> **Source plan:** [요구사항 문서](../../plans/2026-06-14-step4-preceptor-off-request-sync.ko.md)  
> **Related:** [프리셉터 설계 개요](../../plans/2026-06-11-nurse-preceptor-design.ko.md), [Step4 Off Drawer](../../plans/2026-05-07-step4-off-request-grid-shortcut-drawer.ko.md)

---

## 1. Problem

Step3에서 지정한 **프리셉터–프리셉티 1:1 짝**은 같은 날 **같은 시프트**가 필요하다(Step5 `preceptor_pairing`). Mock 솔버도 한쪽만 Off 잠금 시 `pairConflict`를 낸다.

현재 Step4 Off 입력은 짝 연동이 없어, 한쪽만 Off를 넣을 수 있다. 사용자는 Step5 compliance까지 가서야 불일치를 발견한다.

**Goal:** Step4 Off **쓰기** 시점에 짝 Off를 자동 동기화하고, 사용자가 배너·드로어·토스트로 인지하게 한다.

---

## 2. Scope

### In scope

- Step4(`Step4InitialData.vue`) 모든 Off **쓰기** 경로
- 짝 조회, delta 확장, 합집합 보정, 클라이언트 정책 사전 검증
- 배너·드로어·토스트·`n-alert` 안내
- 단위 테스트 + Step4 통합 테스트

### Out of scope

- `OffRequestPolicySetup.vue` (직급별 Off 횟수 정책 CRUD)
- Step3 프리셉터 지정 UX 변경
- Step5 compliance 규칙 추가 (구현 후 회귀 테스트만)
- 그리드 셀 직접 Off 토글 재도입

### Prerequisites (met)

- Step3 `preceptor_id` 저장·로드
- Step4 Off Drawer 파이프라인 (`applyDraftRequest`, `handleDeleteRequest`, Excel upload)
- `mockSolverPairing.ts` pair conflict 개념

---

## 3. Core rules

| Rule            | Decision                                                              |
| --------------- | --------------------------------------------------------------------- |
| Pair definition | Step3 `preceptor_id` 1:1 (preceptee → preceptor)                      |
| Off parity      | Paired employees: same date → both Off or both not Off                |
| Sync direction  | Bidirectional                                                         |
| Delete          | Deleting one side's Off removes peer's Off on same date               |
| Notes           | **Not synced** — only `O` constraint code; peer gets Off without note |
| Confirm dialog  | None — auto-apply + messaging                                         |
| Date range      | Full 36-day grid including previous month's last 5 days               |

---

## 4. Write layers

Step4 Off mutations split into two layers. Pair sync hooks run at **in-memory** stage at minimum; persist path includes pair dates in payload before save.

| Layer          | Triggers                                                                   | Pair sync                                                                     |
| -------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| **In-memory**  | `handleDeleteRequest`, Excel apply, localStorage draft load, `restoreData` | Reconcile/sync then `commitPreferenceMaps`                                    |
| **DB persist** | `applyDraftRequest`, `handleSaveAppliedChanges`                            | Sync in `buildDraftAppliedPreferenceMaps` before `persistStep4PreferenceMaps` |

### Path matrix

| Path                                     | Sync                             |
| ---------------------------------------- | -------------------------------- |
| Drawer → `요청 반영`                     | ✅                               |
| Grid shortcut → drawer → reflect         | ✅                               |
| Request list delete                      | ✅ in-memory + toast             |
| Editing — date add/remove                | ✅ diff-based peer add/remove    |
| Excel upload → apply                     | ✅ union reconcile before commit |
| Off reset all                            | — (no pair logic needed)         |
| Excel download                           | — (export synced state)          |
| localStorage draft load / server restore | ✅ union reconcile after load    |

### Block guards

All Off writes blocked when any guard is active (no exceptions for pair sync):

- `step4MutationBlockedReason` — solving / finalized
- `pageLevelBlockedReason` — unapplied draft
- `offPolicyLoadError` — policy rules fetch failed

---

## 5. Reconciliation (add-only union)

On load paths (Excel, draft, server restore), reconcile mismatched pair Off sets:

| Situation                    | Action                                                                     |
| ---------------------------- | -------------------------------------------------------------------------- |
| A Off only on date D         | Add D to B                                                                 |
| B Off only on date D         | Add D to A                                                                 |
| A={1,2}, B={2,3}             | Union {1,2,3} — add missing dates per side only; **never delete to match** |
| Correction hits policy limit | Skip that date; continue others; report skip count                         |
| Notes on correction          | Do not copy notes to peer                                                  |

**Notification:** 1–2 pairs → toast only. **3+ pairs** → `n-alert` summary + one toast.

---

## 6. Policy integration

### Pre-apply validation (required)

Current Step4 validates policy **after** server persist. Partial apply is forbidden for pair sync, so **client-side pre-check** is required before any in-memory or persist write.

| Item                       | Decision                                                                            |
| -------------------------- | ----------------------------------------------------------------------------------- |
| Load rules                 | Once on Step4 mount / `restoreData` via existing Ops API                            |
| Validator                  | `offRequestPolicyCheck.ts` — mirror server `phase2-schedule/repository.ts` counting |
| Counting                   | Date ascending cumulative; monthly + annual limits per `rank_code`                  |
| No rules configured        | Skip validation (same as server)                                                    |
| **Fetch failure**          | **Strict (B):** block **all** Off writes until retry succeeds                       |
| Pre-block UX               | Toast only — do not add to `policyRejectionSummaries`                               |
| Post-persist server reject | Existing `policyRejectionSummaries` UI (regression, not pair-specific)              |

**Fetch failure message:** `Off 정책을 불러오지 못해 요청을 반영할 수 없습니다.` + retry UI (reuse baseline load retry pattern).

### Pair policy block

When adding Off for A on date D with peer B:

- Validate delta `{A+D, B+D}` atomically
- If either would exceed limit → **reject entire operation**, no partial apply
- Toast must name **whose** limit blocked (requester vs peer)

---

## 7. Pair lookup

| Role      | Lookup                                           |
| --------- | ------------------------------------------------ |
| Preceptee | `grid.employees[].preceptor_id` → preceptor UUID |
| Preceptor | Roster scan: `preceptor_id === self.id`          |
| Display   | UUID → `{ name, employeeId }` for drawer copy    |

- **SSOT in Step4:** `preceptor_id` (UUID) from DB-loaded roster
- **No pair:** behave as today (no sync, no drawer copy)
- **Abnormal data** (reverse lookup >1): skip sync, `console.warn`, UI as no-pair

---

## 8. Multi-select & editing

| Case                              | Behavior                                                        |
| --------------------------------- | --------------------------------------------------------------- |
| Multi-employee apply              | Apply per employee + expand each peer; dedupe `employeeId+date` |
| Batch includes both sides of pair | Same date counted once                                          |
| Editing mode                      | Removed dates → delete on peer; new dates → add on peer         |
| Peer had note + sync delete       | Remove peer Off and note on that date                           |

---

## 9. UX specification

### Banner

- Location: inside expanded Off guide (`isOffRequestGuideExpanded`), **third subsection** after rest/priority copy
- Title: `🔗 프리셉터 짝 Off 연동`
- Body: `프리셉터 짝으로 지정된 근무자는 같은 날짜 Off가 함께 반영됩니다.`
- Collapsed one-liner: **no** preceptor mention (avoid clutter)

### Drawer

| Selection            | Copy                                                                                |
| -------------------- | ----------------------------------------------------------------------------------- |
| 1 employee with pair | `연결된 프리셉터: {name} ({id}) — Off는 같은 날짜로 자동 반영` or preceptee variant |
| 2+ employees         | `프리셉터 짝 연동 대상: A ↔ B` (max 2 pairs shown, then `외 N쌍`)                  |

### Toasts (supplement existing save toasts)

| Event            | Example                                                             |
| ---------------- | ------------------------------------------------------------------- |
| Add with peer    | `김신규 Off 반영 — 프리셉터 박선배에도 3/15 Off가 추가되었습니다.`  |
| Delete with peer | `3/15 Off 삭제 — 프리셉터 박선배의 같은 날짜 Off도 삭제되었습니다.` |
| Reconcile        | `프리셉터 짝 Off 2건이 자동 맞춤되었습니다 (박선배 ↔ 김신규).`     |
| Reconcile skip   | `1건은 박선배(프리셉터) Off 한도 초과로 맞추지 못했습니다.`         |
| Pre-block        | `박선배(프리셉터)의 Off 한도 초과로 함께 반영할 수 없습니다.`       |

**Order:** pair toast → existing save success toast. On block, no save toast.

Final copy tuned to `DESIGN.md` at implementation time.

---

## 10. Architecture

```
Step4InitialData.vue (orchestrator)
  ├── loadOffRequestPolicyRules() → offPolicyLoadError guard
  ├── applyDraftRequest / handleDeleteRequest / excel / draft hooks
  └── UI: banner, Step4RequestComposer pair hint, toasts/alerts

src/utils/preceptorOffSync.ts
  ├── resolvePreceptorPair()
  ├── expandOffDeltaWithPair()
  ├── reconcilePreceptorOffPairs()
  └── validatePairedOffChanges() → delegates to offRequestPolicyCheck

src/utils/offRequestPolicyCheck.ts
  └── client policy counting aligned with server repository.ts
```

### Function contracts

```typescript
resolvePreceptorPair(
  employees: GridEmployee[],
  employeeId: string
): { peerId: string; role: 'preceptee' | 'preceptor' } | null

expandOffDeltaWithPair(
  constraints: ConstraintMap,
  edits: OffEdit[]
): OffEdit[]

reconcilePreceptorOffPairs(
  constraints: ConstraintMap,
  employees: GridEmployee[],
  policyRules: OffRequestPolicyRule[]
): {
  nextConstraints: ConstraintMap
  corrections: PairCorrectionSummary[]
  skipped: PairSkipSummary[]
}

validatePairedOffChanges(input: ValidatePairedOffInput):
  | { ok: true }
  | { ok: false; blockedEmployeeName: string; reason: string }
```

### Invariants

- `ConstraintMap` schema unchanged — sync at write time only
- Only `'O'` codes participate in pair sync
- `Step4InitialData.vue` remains orchestration owner
- No direct grid Off toggle

---

## 11. Flow diagrams

### Apply (drawer)

```text
User: employee A + date D → 요청 반영
  → offPolicyLoadError / step4MutationBlockedReason / pageLevelBlockedReason?
      Yes → block
  → pair B for A?
      No  → existing apply + policy check + persist
      Yes → delta = {A+D, B+D} (note on A only)
            → validatePairedOffChanges
              fail → block + error toast (name whose limit)
              pass → buildDraftAppliedPreferenceMaps → persist
                    → pair toast + save toast
```

### Delete

```text
User: delete A on D
  → pair B?
      No  → delete A+D in memory
      Yes → delete A+D and B+D (+ notes) in memory + pair toast
  → persist on user "변경사항 저장"
```

### Load reconcile

```text
Excel / draft / server restore
  → reconcile all pairs (union, per-date policy skip)
  → commitPreferenceMaps
  → notify (corrected N, skipped M)
```

---

## 12. Acceptance criteria

1. All Off write paths (§4) sync pair Off in-memory and/or persist payload.
2. User informed via banner, drawer, toast, and `n-alert` (3+ pair corrections).
3. Mismatched data corrected by add-only union; skip counts reported.
4. Policy limit on pair → full block, no partial apply; client pre-validation in place.
5. Notes not copied to peer; only `O` synced.
6. Policy fetch failure blocks all Off writes until retry succeeds.
7. No changes to `OffRequestPolicySetup` or Step3 preceptor UX.

---

## 13. Test checklist

- [ ] Preceptee add → preceptor same date + toast (note preceptee-only)
- [ ] Preceptor delete → preceptee same date removed + toast
- [ ] Editing date diff propagates to peer
- [ ] Multi-employee batch dedupes pair dates
- [ ] Excel one-sided Off → union reconcile + alert
- [ ] A={1,2} B={2,3} → adds {1} to B, {3} to A only
- [ ] Draft load mismatch → reconcile + alert
- [ ] Reconcile skip on peer limit → skip count in message
- [ ] Pre-block on pair limit → neither side mutated
- [ ] No pair → no regression
- [ ] Drawer pair label (single + multi select)
- [ ] Reverse lookup >1 → skip sync, no crash
- [ ] `offRequestPolicyCheck` matches server fixture
- [ ] Policy fetch failure → all Off writes blocked until retry

---

## 14. Deferred (implementation-time)

| Item                        | Notes                                         |
| --------------------------- | --------------------------------------------- |
| Toast final copy            | Use §9 examples; align with `DESIGN.md`       |
| Step5 regression            | Verify no new pair-Off compliance rule needed |
| Client/server policy parity | Fixture tests against `repository.ts`         |

---

## 15. Decision log

| Date       | Decision                                                                              |
| ---------- | ------------------------------------------------------------------------------------- |
| 2026-06-14 | Initial requirements (deep-interview)                                                 |
| 2026-06-14 | Brainstorming: write layers, add-only reconcile, note non-sync, client pre-validation |
| 2026-06-14 | Policy fetch failure → strict block all Off writes (B)                                |
| 2026-06-14 | **Spec approved**                                                                     |
