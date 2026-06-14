# Step4 프리셉터 짝 Off 요청 동기화 — 요구사항

> **상태:** ✅ 스펙 확정 (구현 전)  
> **Formal spec:** [docs/superpowers/specs/2026-06-14-step4-preceptor-off-request-sync-design.md](../superpowers/specs/2026-06-14-step4-preceptor-off-request-sync-design.md)  
> **작성일:** 2026-06-14  
> **보강일:** 2026-06-14  
> **확정일:** 2026-06-14  
> **인터뷰 기반:** deep-interview  
> **관련 문서:** [프리셉터 설계 개요](./2026-06-11-nurse-preceptor-design.ko.md), [프리셉터 UI](./2026-06-11-nurse-preceptor-ui.ko.md), [Step4 Off Drawer](./2026-05-07-step4-off-request-grid-shortcut-drawer.ko.md)

---

## 브레인스토밍 검토 요약

코드베이스(`Step4InitialData.vue`, `offRequestExcel.ts`, `mockSolverPairing.ts`, 서버 `policy_check`)와 대조한 결과, 아래 항목이 원문에서 **모호하거나 누락**되어 있었다. 본 문서에 **결정·보강**으로 반영했다.

| #   | 모호했던 지점                            | 보강 결정                                                                                                                                      |
| --- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 짝 조회 데이터 소스                      | Step4는 `grid.employees[].preceptor_id`(UUID)만 사용. UI 직번(`preceptorEmployeeId`)은 표시용 역매핑                                           |
| 2   | 동기화가 어느 레이어에서 일어나는지      | **인메모리 `constraints`** 와 **DB persist** 두 단계로 구분 (§3.1)                                                                             |
| 3   | 메모(note) 동기화 여부                   | **Off 코드(`O`)만 동기화**. 메모는 요청자 쪽만 유지, 짝 쪽은 메모 없이 Off만 추가                                                              |
| 4   | 다중 근무자 일괄 반영                    | 배치 내 짝이 함께 선택돼도 `employeeId+date` 기준 **중복 제거** 후 1회만 반영                                                                  |
| 5   | 요청 수정(editing) 시 날짜 변경          | 제거된 날짜 → 짝에서도 삭제, 추가된 날짜 → 짝에도 추가 (정책 통과 시)                                                                          |
| 6   | 정책 사전 차단 구현 방식                 | 현재 Step4는 **서버 persist 후** `recheckPhase2ScheduleVersion`으로 정책 판정. 부분 반영 금지를 위해 **클라이언트 사전 검증** 추가 필요 (§5.1) |
| 7   | 불일치 보정 — 양쪽 날짜 집합이 다른 경우 | **합집합(add-only)**: 한쪽에만 있는 날짜를 반대쪽에 추가. 임의 삭제로 맞추지 않음                                                              |
| 8   | 보정 시 정책 한도 초과                   | 해당 날짜 보정 **스킵** + 요약 알림에 스킵 건수 포함. 이미 반영된 쪽 Off는 유지                                                                |
| 9   | Excel / draft 보정 시점                  | 파싱·로드 직후 **인메모리 보정** → 사용자 알림. DB 저장은 기존처럼 별도 `변경사항 저장`                                                        |
| 10  | 배너 위치                                | 접기 영역(`isOffRequestGuideExpanded`) 안 **별도 소절**로 추가 (항상 보이는 1줄 요약은 유지하지 않음)                                          |
| 11  | 토스트 vs 기존 저장 메시지               | 짝 동기화 토스트 **후** 기존 `요청이 저장되었습니다` 유지. 짝 안내는 **추가** 토스트 1건                                                       |
| 12  | 다건 보정 알림                           | **짝별 1건 요약 토스트** (예: `2건 자동 맞춤`). 3쌍 이상이면 `n-alert` 요약 병행                                                               |
| 13  | 비정상 1:1 데이터                        | 역조회 2명 이상 시 동기화 **스킵** + `console.warn` (Step3 검증이 정상 경로)                                                                   |
| 14  | 전월 5일 컬럼                            | 그리드 36일 범위 **전체**에 동기화 적용 (전월 말 5일 포함)                                                                                     |
| 15  | `step4MutationBlockedReason`             | 생성 중·확정 상태에서는 동기화 포함 **모든 Off 쓰기 차단** (기존 가드 재사용)                                                                  |
| 16  | 정책 규칙 fetch 실패                     | Off 쓰기 **전체 차단** + 재시도 UI. 정책 로드 성공 전까지 짝 동기화·보정·삭제·Excel 적용 불가                                                  |

---

## 요약

Step3에서 지정된 **프리셉터–프리셉티 1:1 짝**은 **같은 날 Off 요청이 일치**해야 한다. Step4(`Step4InitialData.vue`) 사전 Off 요청 입력 시, 한쪽에 Off를 추가·삭제하면 **짝에게도 같은 날짜가 자동 반영**되며, 사용자가 그 사실을 **배너·드로어·토스트**로 인지할 수 있어야 한다.

**범위:** Step4 Off 입력 전 경로. **제외:** `OffRequestPolicySetup.vue`(직급별 Off 횟수 정책만 관리).

---

## 배경

| 영역             | 현재 상태                                                        |
| ---------------- | ---------------------------------------------------------------- |
| Step3            | `preceptorEmployeeId`로 1:1 짝 지정 (구현됨)                     |
| Step4 Off UI     | 프리셉터 규칙 안내·연동 없음                                     |
| Mock 솔버        | 한쪽만 Off 잠금 시 `pairConflict` (`mockSolverPairing.ts`)       |
| Step5 compliance | `preceptor_pairing` — 같은 날 **시프트** 불일치 검사 (mandatory) |

Off **입력 단계**에서 짝 불일치를 막지 않으면, 사용자는 Step5까지 가서야 문제를 발견한다. 본 요구사항은 **입력 시점에 짝 Off를 강제·동기화**한다.

---

## 확정 요구사항

### 1. 핵심 규칙

| 항목            | 결정                                                                        |
| --------------- | --------------------------------------------------------------------------- |
| 짝 정의         | Step3 `preceptor_id` / `preceptorEmployeeId` 기준 1:1 (프리셉티 → 프리셉터) |
| Off 일치        | 짝이 지정된 경우, **같은 날짜에 양쪽 모두 Off이거나 모두 Off가 아님**       |
| 동기화 방향     | **양방향** — 프리셉티·프리셉터 어느 쪽을 편집해도 짝에 동일 날짜 반영       |
| 삭제            | 한쪽 Off 삭제 시 **짝의 같은 날짜 Off도 함께 삭제**                         |
| 확인 다이얼로그 | **없음** — 자동 반영 + 메시지로 인지                                        |

### 2. 사용자 안내 (메시지)

| 시점                       | 채널                                                   | 내용 (예시)                                                                                                         |
| -------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| 항상 (접기 영역)           | Step4 Off 안내 배너 — `자세히 보기` 펼침 시 3번째 소절 | `🔗 프리셉터 짝 Off 연동` — `프리셉터 짝으로 지정된 근무자는 같은 날짜 Off가 함께 반영됩니다.`                      |
| 근무자 1명 선택 시         | 요청 입력 드로어 상단                                  | `연결된 프리셉터: 박선배 (40501) — Off는 같은 날짜로 자동 반영` 또는 프리셉터 선택 시 `연결된 프리셉티: 김신규 (…)` |
| 근무자 2명 이상 선택 시    | 요청 입력 드로어 상단                                  | 짝이 있는 선택 근무자만 나열: `프리셉터 짝 연동 대상: 김신규 ↔ 박선배` (최대 2쌍, 초과 시 `외 N쌍`)                |
| Off 추가 반영              | 토스트 (`showSuccess`) — **추가** 1건                  | `김신규 Off 반영 — 프리셉터 박선배에도 3/15 Off가 추가되었습니다.`                                                  |
| Off 삭제 반영              | 토스트 — **추가** 1건                                  | `3/15 Off 삭제 — 프리셉터 박선배의 같은 날짜 Off도 삭제되었습니다.`                                                 |
| 불일치 자동 보정           | 토스트 (1쌍) / `n-alert` (3쌍 이상)                    | `프리셉터 짝 Off 2건이 자동 맞춤되었습니다 (박선배 ↔ 김신규).`                                                     |
| 보정 중 정책 한도로 스킵   | 토스트 또는 alert 보조 문구                            | `1건은 박선배(프리셉터) Off 한도 초과로 맞추지 못했습니다.`                                                         |
| 정책 한도 초과 (사전 차단) | 토스트 (`showError`)                                   | `박선배(프리셉터)의 Off 한도 초과로 함께 반영할 수 없습니다.`                                                       |

**배너 배치:** 기존 「휴식 보장」「수락 우선순위」 소절 **아래** 접기 영역에 `🔗 프리셉터 짝 Off 연동` 소절을 추가한다. 접힌 상태의 1줄 요약에는 프리셉터 문구를 넣지 않는다 (정보 과밀 방지).

**토스트 우선순위:** 짝 관련 토스트 → 기존 저장 성공 토스트 순. 차단 시에는 저장 토스트를 띄우지 않는다.

배너·드로어 문구는 구현 시 `DESIGN.md` 톤·길이에 맞춰 확정한다.

### 3. 적용 범위 (Step4)

#### 3.1 쓰기 레이어 (중요)

Step4 Off 변경은 **두 레이어**로 나뉜다. 동기화 훅은 아래 **인메모리 단계**에 반드시 걸린다.

| 레이어         | 트리거                                                                                      | 현재 동작                                       | 짝 동기화                                  |
| -------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------ |
| **인메모리**   | `handleDeleteRequest`, Excel `적용`, localStorage draft `불러오기`, `restoreData` 자동 복원 | `commitPreferenceMaps`만 — DB 미저장            | ✅ 보정·동기화 후 `constraints` 갱신       |
| **DB persist** | 드로어 `요청 반영` (`applyDraftRequest`), `변경사항 저장` (`handleSaveAppliedChanges`)      | `persistStep4PreferenceMaps` → 서버 정책 재검사 | ✅ persist **직전** payload에 짝 날짜 포함 |

- `요청 반영`은 즉시 DB 저장이므로, `buildDraftAppliedPreferenceMaps()` **내부**에서 짝 동기화를 수행한다.
- `handleDeleteRequest`는 인메모리만 변경하므로, 삭제 시 짝 동기화 후 사용자가 `변경사항 저장`으로 persist한다.
- Excel 적용은 인메모리 전체 교체이므로, `handleApplyOffRequestExcelUpload`에서 `commitPreferenceMaps` **전** 보정을 실행한다.

#### 3.2 경로별 적용

| 경로                                | 동기화 | 비고                                                                    |
| ----------------------------------- | ------ | ----------------------------------------------------------------------- |
| 요청 입력 드로어 → `요청 반영`      | ✅     | `buildDraftAppliedPreferenceMaps` 진입점                                |
| 그리드 셀 shortcut → 드로어 → 반영  | ✅     | 동일 파이프라인                                                         |
| 요청 목록 `삭제`                    | ✅     | 인메모리 즉시 — 짝 날짜·메모(해당 날짜) 함께 제거                       |
| 요청 수정(editing) — 날짜 추가·제거 | ✅     | diff 기준: 제거일 → 짝 삭제, 추가일 → 짝 추가                           |
| Excel 업로드 → `적용`               | ✅     | `commitPreferenceMaps` 전 합집합 보정 + 알림                            |
| 모든 Off 요청 초기화                | —      | 전원 초기화이므로 짝 단위 로직 불필요                                   |
| Excel 다운로드                      | —      | 이미 동기화된 `constraints` 그대로 출력                                 |
| LocalStorage draft 불러오기         | ✅     | `handleLoadPendingLocalDraft` / `restoreData` 자동 복원 시 보정         |
| `restoreData` 서버 preferences 로드 | ✅     | `replacePreferenceMapsFromSnapshot` 직후 보정 (서버 데이터 불일치 대비) |

**제외:** `OffRequestPolicySetup.vue` — 직급별 Off **횟수** 설정만. 프리셉터 짝 규칙과 무관.

**차단:** `step4MutationBlockedReason`(생성 중·확정), `pageLevelBlockedReason`(미반영 draft), `offPolicyLoadError`(정책 fetch 실패) 활성 시 기존과 동일하게 쓰기 차단. 짝 동기화 예외 없음.

### 4. 불일치 데이터 처리

**정책: 합집합 자동 보정(add-only) + 알림**

| 상황                                             | 동작                                                                                            |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| A만 Off, B는 없음                                | B에 같은 날짜 Off 추가                                                                          |
| B만 Off, A는 없음                                | A에 같은 날짜 Off 추가                                                                          |
| 양쪽 Off 날짜 집합이 다름 (예: A={1,2}, B={2,3}) | **합집합** {1,2,3} — 각 쪽에 빠진 날짜만 추가. **삭제로 맞추지 않음**                           |
| Excel·draft·서버 로드 후 불일치                  | 적용/불러오기 직후 인메모리 보정 실행                                                           |
| 보정 발생                                        | 요약 알림 (건수 + 짝 이름)                                                                      |
| 보정 중 짝 한도 초과                             | 해당 날짜만 **스킵**, 나머지 보정은 진행. 스킵 건수를 알림에 포함                               |
| 보정 후                                          | `constraints`만 갱신. 자동으로 localStorage에 다시 쓰지 않음 (기존 debounce autosave 흐름 따름) |

**메모:** 보정으로 추가되는 Off에는 **메모를 복사하지 않는다**. 원본 쪽 메모만 유지.

### 5. Off 횟수 정책과의 관계

**정책: 동기화 전체 차단 + 이유 안내 (부분 반영 금지)**

- 한쪽 Off 반영 시 **짝까지 포함한 변경**을 직급별 Off 정책 검증에 넣는다.
- 짝이 한도 초과면 **요청자·짝 모두 반영하지 않는다** (인메모리·DB 모두).
- 메시지에 **누구의 한도**(요청자 vs 짝) 때문에 막혔는지 명시한다.
- 기존 `policyRejectionSummaries` / `정책상 거부된 요청` UI와 충돌하지 않게, **persist 전 사전 차단**을 우선한다. 사전 차단 건은 `policyRejectionSummaries`에 넣지 않고 **토스트만** 사용한다.

#### 5.1 사전 검증 구현 (선행 결정)

현재 Step4는 정책 판정을 **서버 persist 이후** `recheckPhase2ScheduleVersion`으로 수행한다. 부분 반영 금지를 지키려면 아래가 필요하다.

| 항목                 | 결정                                                                                                                                                                    |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 정책 규칙 로드       | Step4 `onMounted` / `restoreData` 시 조직 Off 정책 규칙 1회 fetch (기존 Ops API 재사용)                                                                                 |
| 검증 위치            | `preceptorOffSync.ts` — `validatePairedOffChanges(constraints, delta, policyRules, employees)`                                                                          |
| 카운팅 기준          | 서버 `phase2-schedule/repository.ts`와 동일: 날짜 오름차순 누적, 월별·연별 한도, `rank_code`별 규칙                                                                     |
| 검증 시점            | 인메모리 적용 **직전** (드로어 반영, 삭제, Excel, 보정 각각)                                                                                                            |
| 정책 미설정          | 규칙 없으면 검증 스킵 (기존 서버 동작과 동일)                                                                                                                           |
| 정책 규칙 fetch 실패 | Off 쓰기 **전체 차단** (동기화·보정·삭제·Excel 포함). 에러 토스트 + 재시도 UI. 정책 로드 성공 전까지 `step4MutationBlockedReason`과 별도 `offPolicyLoadError` 가드 사용 |
| 서버 불일치          | 사전 통과 후 서버 reject는 기존 `policyRejectionSummaries`로 표시 — 짝 동기화와 무관한 regression으로 취급                                                              |

### 6. 짝 조회

| 역할           | 조회 방법                                    | 반환                     |
| -------------- | -------------------------------------------- | ------------------------ |
| 프리셉티       | `grid.employees`에서 `employee.preceptor_id` | 프리셉터 UUID (0 또는 1) |
| 프리셉터       | roster에서 `preceptor_id === self.id`인 직원 | 프리셉티 UUID (0 또는 1) |
| 표시 이름·직번 | UUID → `grid.employees` 역매핑               | `{ name, employeeId }`   |

- **단일 진실 원천:** Step4에서는 DB에서 로드된 `preceptor_id`(UUID)만 사용한다. `preceptorEmployeeId`(직번)는 드로어 표시용.
- **짝 없음** (`preceptor_id` null, 역조회 없음): 기존 Off UX와 동일. 동기화·드로어 짝 문구 없음.
- **비정상 데이터** (역조회 2명 이상): 동기화 스킵 + 개발 환경 `console.warn`. UI는 짝 없음과 동일.

### 7. 메모·다중 선택·편집 규칙

| 항목                                     | 결정                                                                                  |
| ---------------------------------------- | ------------------------------------------------------------------------------------- |
| 메모 동기화                              | **하지 않음** — `O` 코드만 짝에 반영                                                  |
| 다중 근무자 `요청 반영`                  | 선택된 각 근무자에 Off 적용 + 각자 짝 동기화. `employeeId+date` 중복 제거             |
| 배치에 짝 양쪽 포함                      | 동일 날짜는 1회만 카운트·검증                                                         |
| editing 모드                             | 기존 `editingRow.dates` 제거분 → 짝에서도 삭제; 새 `draftSelectedDates` → 짝에도 추가 |
| 짝 쪽 기존 Off에 메모 있음 + 동기화 삭제 | 짝의 해당 날짜 Off·메모 모두 제거                                                     |

---

## UX 흐름 (요청 반영)

```text
사용자: 근무자 A + 날짜 D Off 요청 반영
  → step4MutationBlockedReason / pageLevelBlockedReason?
      Yes → 차단 (기존 메시지)
  → A에 짝 B 존재?
      No  → 기존 Off 반영 (정책 검증 → persist)
      Yes → delta = { A+D, B+D } (메모는 A만)
            → validatePairedOffChanges(delta)
              실패 → 전체 차단 + 토스트(한도 사유, 누구 한도인지 명시)
              통과 → buildDraftAppliedPreferenceMaps에 반영
                    → persistStep4PreferenceMaps
                    → 토스트(짝 반영 안내) + 토스트(저장 성공)
```

**삭제 흐름:**

```text
사용자: A의 날짜 D Off 삭제
  → A에 짝 B?
      No  → A+D만 인메모리 삭제
      Yes → A+D, B+D 인메모리 삭제 (각 쪽 메모도 제거)
            → 토스트(짝 삭제 안내)
  → (DB 저장은 사용자가 변경사항 저장 시)
```

**Excel / draft 보정 흐름:**

```text
데이터 로드 (Excel 적용 / draft 불러오기 / 서버 restore)
  → 모든 프리셉터 짝에 대해 합집합 보정 계산
  → 날짜별 정책 검증 (스킵 가능 날짜 분리)
  → 인메모리 commitPreferenceMaps
  → 알림 (맞춤 N건, 스킵 M건)
```

---

## 구현 가이드 (참고, 본 문서 범위 외 상세)

### 권장 위치

| 레이어                | 제안                                                                                               |
| --------------------- | -------------------------------------------------------------------------------------------------- |
| 유틸 (신규)           | `src/utils/preceptorOffSync.ts` — 짝 조회, delta 계산, 합집합 보정, 정책 사전 검사, 알림 payload   |
| 정책 (신규 또는 공유) | `src/utils/offRequestPolicyCheck.ts` — 서버 카운팅 로직과 정합되는 클라이언트 검증 (테스트 필수)   |
| Step4                 | `Step4InitialData.vue` — 배너 copy, apply/delete/excel/draft/restore hook                          |
| 드로어                | `Step4RequestComposer.vue` — 짝 연결 표시 (1명·다중 선택 분기)                                     |
| Excel                 | `handleApplyOffRequestExcelUpload` — `commitPreferenceMaps` 전 `reconcilePreceptorOffPairs()` 호출 |

### 핵심 함수 (계약 초안)

```typescript
// Pair lookup
resolvePreceptorPair(employees, employeeId): { peerId: string; role: 'preceptee' | 'preceptor' } | null

// Apply path: expand single-sided edits to paired delta
expandOffDeltaWithPair(constraints, edits: OffEdit[]): OffEdit[]  // dedupe by employeeId+date

// Reconcile path: add-only union for load/excel
reconcilePreceptorOffPairs(constraints, employees, policyRules): {
  nextConstraints: ConstraintMap;
  corrections: PairCorrectionSummary[];
  skipped: PairSkipSummary[];
}

// Policy gate
validatePairedOffChanges(input): { ok: true } | { ok: false; blockedEmployeeName: string; reason: string }
```

### 기존 계약 유지

- Step4 orchestration owner는 계속 `Step4InitialData.vue`.
- 그리드 직접 토글 Off는 재도입하지 않음 ([Drawer 계획](./2026-05-07-step4-off-request-grid-shortcut-drawer.ko.md)).
- `constraints` 구조(`ConstraintMap`) 변경 없이, **쓰기 시점에 짝 날짜를 함께 갱신**.
- `ConstraintCode`는 `'O'`만 짝 동기화 대상 (다른 constraint 타입 없음).

### 테스트 (완료 판단에 포함)

- [ ] 프리셉티 Off 추가 → 프리셉터 동일 날짜 추가 + 토스트 (메모는 프리셉티만)
- [ ] 프리셉터 Off 삭제 → 프리셉티 동일 날짜 삭제 + 토스트
- [ ] editing 모드 — 날짜 1일 제거·1일 추가 → 짝에도 동일 diff
- [ ] 다중 근무자 반영 — 짝 양쪽이 배치에 포함돼도 중복 없이 1회 반영
- [ ] Excel 한쪽만 Off → 합집합 보정 + 알림
- [ ] 양쪽 날짜 집합 불일치 (A={1,2}, B={2,3}) → {1,3}만 추가
- [ ] draft 불일치 불러오기 → 보정 + 알림
- [ ] 보정 중 짝 한도 초과 → 해당 날짜 스킵 + 스킵 건수 알림
- [ ] 짝 한도 초과 (사전 차단) → 전체 차단, 양쪽 constraints 미변경
- [ ] 짝 없는 직원 → 기존 동작 회귀 없음
- [ ] 드로어에 짝 이름 표시 (1명·다중 선택)
- [ ] 역조회 2명 이상 비정상 데이터 → 동기화 스킵, 크래시 없음
- [ ] `offRequestPolicyCheck` — 서버 fixture와 동일 입력 시 동일 reject
- [ ] 정책 fetch 실패 → Off 쓰기·동기화·보정·Excel 적용 전부 차단 + 재시도 전까지 가드 유지

---

## 완료 기준

1. Step4 모든 Off **쓰기** 경로(§3.2)에서 프리셉터 짝 Off가 인메모리·persist 양쪽에서 동기화된다.
2. 동기화·보정·차단 시 사용자가 **배너·드로어·토스트**(다건 시 `n-alert`)로 인지할 수 있다.
3. 불일치 데이터는 **합집합(add-only) 자동 보정**되며 보정·스킵 내역이 알림된다.
4. 짝의 Off 정책 한도 초과 시 **부분 반영 없이** 차단된다 (§5.1 사전 검증 포함).
5. 메모는 짝에게 복사되지 않으며, Off 코드만 동기화된다.
6. `OffRequestPolicySetup` 및 Step3 프리셉터 지정 UX는 변경하지 않는다 (본 스코프 외).

---

## 열린 질문

| #   | 항목                        | 상태            | 결정 / 비고                                                                                                                                                                                                                                                    |
| --- | --------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 토스트 문구 최종 copy       | 🟡 구현 시      | `DESIGN.md` 톤·길이에 맞춰 확정. 위 표 예시를 baseline으로 사용                                                                                                                                                                                                |
| 2   | 자동 보정 알림 채널         | ✅ 결정         | 1–2쌍: 토스트만. **3쌍 이상**: `n-alert` 요약 + 토스트 1건                                                                                                                                                                                                     |
| 3   | 다건 보정 토스트            | ✅ 결정         | 짝별 1건 요약 (날짜 건수 합산). 동일 짝은 1토스트                                                                                                                                                                                                              |
| 4   | Step5 Off diff / compliance | 🟡 구현 후 확인 | Step4에서 짝 Off를 맞추므로 별도 규칙 불필요할 가능성 높음. Step5 회귀 테스트만 추가                                                                                                                                                                           |
| 5   | 클라이언트 정책 검증 정합성 | 🟡 구현 시      | 서버 `repository.ts` fixture 기반 단위 테스트로 보장 (§5.1)                                                                                                                                                                                                    |
| 6   | 정책 규칙 fetch 실패        | ✅ 결정         | **B — 엄격:** fetch 실패 시 Off **쓰기 전체 차단** + `showError('Off 정책을 불러오지 못해 요청을 반영할 수 없습니다.')`. 짝 동기화·보정·삭제·Excel 적용 모두 동일 가드 적용. Step4 진입 시 1회 fetch, 실패 시 재시도 버튼(기존 baseline 로드 패턴 재사용) 제공 |

---

## 변경 이력

| 날짜       | 내용                                                                                                   |
| ---------- | ------------------------------------------------------------------------------------------------------ |
| 2026-06-14 | deep-interview 기반 초안 작성                                                                          |
| 2026-06-14 | 브레인스토밍 검토 — 쓰기 레이어, 메모·정책·보정·다중선택·editing 모호성 보강                           |
| 2026-06-14 | 열린 질문 #6 결정 — 정책 fetch 실패 시 Off 쓰기 전체 차단 (B)                                          |
| 2026-06-14 | 스펙 확정 — formal spec `docs/superpowers/specs/2026-06-14-step4-preceptor-off-request-sync-design.md` |
