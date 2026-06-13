# 간호사 프리셉터 — UI 설계

> **상태:** 설계 확정 · UI 구현 대기 (API/util 완료)  
> **작성일:** 2026-06-11  
> **갱신:** 2026-06-13 — writing-plans 구현 계획 분리·갭 분석 추가  
> **순서:** 3/3 — [DB](./2026-06-11-nurse-preceptor-db.ko.md) → [API](./2026-06-11-nurse-preceptor-api.ko.md) → UI  
> **상위 문서:** [개요](./2026-06-11-nurse-preceptor-design.ko.md)  
> **선행:** DB migration + API 타입·validation util ✅  
> **구현 계획 (TDD·태스크):** [superpowers/plans/2026-06-11-nurse-preceptor-ui.ko.md](../superpowers/plans/2026-06-11-nurse-preceptor-ui.ko.md)

---

## 1. 범위

본 문서는 **Step3 화면**, **EmployeeTable**, **엑셀 업로드**, **compliance 패널 표시** UX만 다룬다.

| 포함                 | 제외                                                                 |
| -------------------- | -------------------------------------------------------------------- |
| 테이블·모달 와이어   | SQL / RPC → [DB](./2026-06-11-nurse-preceptor-db.ko.md)              |
| 엑셀 템플릿·검증 UX  | TypeScript 타입 정의 → [API](./2026-06-11-nurse-preceptor-api.ko.md) |
| Step3 load/save UX   | 목 솔버 알고리즘 → API 문서                                          |
| Compliance 패널 copy |                                                                      |

**적용 화면:** Step3 **운영 준비(setup)** + **월별 Step3** — 동일 UX.

**컴포넌트:**

- `src/views/schedule/Step3EmployeeInfo.vue`
- `src/components/schedule/EmployeeTable.vue`
- `src/components/schedule/EmployeeExcelUpload.vue`
- Step5 `ScheduleCompliancePanel` (표시만)

**디자인 기준:** `DESIGN.md` — Step3 표, modal, muted text, mono accent(직번).

---

## 2. 요구사항 (UI 관점)

| 항목 | UI 동작                                      |
| ---- | -------------------------------------------- |
| 입력 | 직원당 선택적 프리셉터 1명 (직번 기준)       |
| 후보 | 같은 로스터, 본인 제외, D/E/N 1개 이상 겹침  |
| 1:1  | 이미 다른 사람의 프리셉터인 직원은 후보 제외 |
| 체인 | A→B 관계에서 B→A 또는 B를 타인이 선택 불가   |
| 저장 | 기존 Step3 저장·다음 단계 흐름 유지          |
| 엑셀 | 4번째 컬럼 `프리셉터직번`                    |

---

## 3. EmployeeTable — 테이블

### 3.1 컬럼 구성

```text
┌──────────┬────────┬─────────────────────┬──────────────────┬────────┐
│ 직원 ID  │ 이름   │ 가능 시프트         │ 프리셉터         │ 작업   │
├──────────┼────────┼─────────────────────┼──────────────────┼────────┤
│ 40501    │ 박선배 │ [D] [E] [N]         │ —                │ 수정 삭제 │
│ 40627    │ 김신규 │ [D] [E]             │ 박선배 (40501)   │ 수정 삭제 │
│ EMP003   │ 이신규 │ [N]                 │ (미지정)         │ 수정 삭제 │
└──────────┴────────┴─────────────────────┴──────────────────┴────────┘
```

| 컬럼         | key                   | 표시 규칙          |
| ------------ | --------------------- | ------------------ |
| 직원 ID      | `employeeId`          | 기존과 동일        |
| 이름         | `name`                | 기존과 동일        |
| 가능 시프트  | `availableShifts`     | O 제외 chip (기존) |
| **프리셉터** | `preceptorEmployeeId` | §3.2               |
| 작업         | —                     | 수정 / 삭제 (기존) |

### 3.2 프리셉터 컬럼 표시

| 상태   | 표시                | 스타일                |
| ------ | ------------------- | --------------------- |
| 미지정 | `—` 또는 `(미지정)` | `text-gray-500` muted |
| 지정됨 | `{이름} ({직번})`   | 직번만 mono accent    |

- 페이지네이션·sticky: 기존 `EmployeeTable` 유지 (`pageSize: 10`).

---

## 4. 편집 모달

### 4.1 와이어

```text
┌─────────────────────────────────────────────┐
│  직원 수정                              [×] │
├─────────────────────────────────────────────┤
│  직원 ID    [ 40627                    ]    │
│  이름       [ 김신규                   ]    │
│  가능 시프트  ☑ D  ☑ E  ☐ N               │
│  프리셉터   [ 박선배 (40501)      ▼ ]       │
│             · (없음)                        │
│             · 박선배 (40501)                │
│             · 최경력 (40400)                │
│             ─ 비활성 ─                      │
│             · 본인                          │
│             · 정야간 (40700) — 시프트 불일치  │
│             · 한선배 (40502) — 이미 지정됨   │
├─────────────────────────────────────────────┤
│                        [ 취소 ]  [ 수정 ]   │
└─────────────────────────────────────────────┘
```

### 4.2 컨트롤

| 속성        | 값                     |
| ----------- | ---------------------- |
| 컴ponent    | Naive UI `NSelect`     |
| `clearable` | `true`                 |
| placeholder | `프리셉터 선택 (선택)` |
| label       | `프리셉터`             |
| form path   | `preceptorEmployeeId`  |

### 4.3 드롭다운 후보 필터

편집 중인 직원 = `self`. `buildPreceptorCandidateOptions()` ([API](./2026-06-11-nurse-preceptor-api.ko.md) §4.4).

| 필터        | 규칙                                                | UI                         |
| ----------- | --------------------------------------------------- | -------------------------- |
| 본인 제외   | `candidate.employeeId !== self.employeeId`          | disabled + tooltip         |
| 시프트 겹침 | D/E/N 1개 이상 교집합                               | disabled — `시프트 불일치` |
| 1:1         | 다른 preceptee가 이미 candidate 지정                | disabled — `이미 지정됨`   |
| 체인        | `candidate.preceptorEmployeeId === self.employeeId` | disabled — `체인 불가`     |
| 체인 (역)   | self가 candidate의 preceptor                        | disabled                   |

- 활성 옵션 상단, `(없음)` 첫 항목 (`value: null`).
- 비활성 옵션: separator 아래, `disabled: true`.

### 4.4 모달 확인

1. `validatePreceptorAssignment()` — 실패 시 `showError(message)`.
2. `EmployeeInput.preceptorEmployeeId` 갱신.
3. `emit('edit', index, employee)` 또는 add flow.

---

## 5. 엑셀

### 5.1 템플릿 컬럼 (4열)

| 컬럼 헤더        | 필수 | 예시     | 설명                |
| ---------------- | ---- | -------- | ------------------- |
| 직원ID           | 선택 | `40627`  | 미입력 시 자동 생성 |
| 이름             | 필수 | `김신규` |                     |
| 가능시프트       | 필수 | `D,E,N`  | 콤마 구분           |
| **프리셉터직번** | 선택 | `40501`  | 같은 로스터 직번    |

### 5.2 형식 안내 (`EmployeeExcelUpload` collapse)

기존 3열 표를 4열로 확장:

```text
| 직원ID | 이름   | 가능시프트 | 프리셉터직번 |
| 40501  | 박선배 | D,E,N      |              |
| 40627  | 김신규 | D,E        | 40501        |
```

### 5.3 파싱

- 헤더 alias: `프리셉터직번`, `프리셉터`, `preceptor`, `preceptorEmployeeId` (대소문자 무시).
- 빈 셀 → `preceptorEmployeeId: null`.

### 5.4 검증 순서

```text
행 파싱 → 직번 중복 → 시프트 코드 → 프리셉터 규칙 (전체 로스터) → 미리보기
```

### 5.5 오류 메시지 (한국어)

| 코드                         | 메시지                                                            |
| ---------------------------- | ----------------------------------------------------------------- |
| `PRECEPTOR_SELF`             | `{행}행: 본인을 프리셉터로 지정할 수 없습니다.`                   |
| `PRECEPTOR_NOT_FOUND`        | `{행}행: 프리셉터 직번 '{id}'를 찾을 수 없습니다.`                |
| `PRECEPTOR_SHIFT_OVERLAP`    | `{행}행: 프리셉터와 가능 시프트가 겹치지 않습니다.`               |
| `PRECEPTOR_ALREADY_ASSIGNED` | `{행}행: 프리셉터 '{id}'는 이미 다른 직원에게 지정되어 있습니다.` |
| `PRECEPTOR_CHAIN`            | `{행}행: 프리셉터 관계는 연속(체인)으로 지정할 수 없습니다.`      |

`validationPreview` alert에 프리셉터 오류 목록 추가 (기존 중복·시프트 패턴과 동일).

### 5.6 템플릿 다운로드

`downloadTemplate()` — 4번째 컬럼 헤더 `프리셉터직번` 포함.

---

## 6. Step3EmployeeInfo — load / save

### 6.1 Load

```typescript
// select('*') 후
const idToEmployeeIdMap = new Map(data.map((emp) => [emp.id, emp.employee_id]));

employees.value = data.map((emp) => ({
  employeeId: emp.employee_id,
  name: emp.name,
  availableShifts: emp.available_shifts,
  rankCode: emp.rank_code ?? null,
  preceptorEmployeeId: emp.preceptor_id ? (idToEmployeeIdMap.get(emp.preceptor_id) ?? null) : null,
}));
```

- FK 대상 preceptor 행이 로스터에 없으면 `null` + console warn (데이터 무결성 이슈).

### 6.2 Save / dirty check

`cloneEmployees` / `serializeEmployees`에 `preceptorEmployeeId` 포함:

```typescript
{
  employeeId, name, availableShifts, rankCode,
  preceptorEmployeeId: employee.preceptorEmployeeId ?? null,
}
```

저장 경로: 기존 roster replace — payload에 `preceptorEmployeeId` ([API](./2026-06-11-nurse-preceptor-api.ko.md) §5.1).

### 6.3 setup vs 월별

| 모드                   | 저장 API                                   | UI 차이         |
| ---------------------- | ------------------------------------------ | --------------- |
| setup (`isSetupEntry`) | `replace_organization_roster_atomic`       | 경고 alert 유지 |
| 월별 Step3             | `replace_roster_and_reset_schedule_atomic` | Step indicator  |

프리셉터 UX는 **동일**.

---

## 7. Compliance 패널 (Step4/5)

Evaluator는 [API 문서](./2026-06-11-nurse-preceptor-api.ko.md) §8. UI copy만 본 문서에서 고정.

### 7.1 Summary (`ScheduleCompliancePanel`)

| 상태 | copy                              |
| ---- | --------------------------------- |
| 통과 | `프리셉터 동일 시프트 — 충족`     |
| 위반 | `프리셉터 동일 시프트 — 위반 N건` |

- Mandatory 섹션 — NOD 다음 순서 (`RULE_ORDER`).
- 확정 차단 reason 예: `법적 기준 위반: 프리셉터 동일 시프트 2건`

### 7.2 Violation row

```text
2026-06-05: 김신규(D) ↔ 박선배(E) 시프트 불일치
```

- `employee-guideline-status`, comparison modal compliance props — 기존 Step5 패턴 재사용.

---

## 8. 구현 슬라이스 (UI만)

> **상세 TDD 태스크·코드·명령어:** [구현 계획](../superpowers/plans/2026-06-11-nurse-preceptor-ui.ko.md)

### 8.1 갭 분석 (2026-06-13)

| Step | 작업                             | 파일                               | 상태                            |
| ---- | -------------------------------- | ---------------------------------- | ------------------------------- |
| U1   | validation util (API와 공유)     | `src/utils/preceptorValidation.ts` | ✅ 완료                         |
| U2   | EmployeeTable 컬럼 + 모달 select | `EmployeeTable.vue`                | ❌ 컬럼·`NSelect` 없음          |
| U3   | Step3 load/save/dirty            | `Step3EmployeeInfo.vue`            | ❌ `preceptorEmployeeId` 미포함 |
| U4   | Excel template/parse/validate    | `EmployeeExcelUpload.vue`          | ❌ 3열만 지원                   |
| U5   | Compliance panel copy            | evaluator + spec                   | ✅ `preceptor_pairing` 연결됨   |

**추가 작업 (구현 계획 Task 1):** 엑셀 행 단위 오류 코드용 `validatePreceptorExcelRows()` — 설계 §5.5 메시지와 매핑.

### 8.2 완료 기준

- [ ] setup·월별 Step3에서 프리셉터 지정·저장·reload 일치
- [ ] 엑셀 4열 업로드·오류 메시지 (`PRECEPTOR_*` 코드)
- [ ] Step5 compliance에 「프리셉터 동일 시프트」 표시 (회귀 테스트)

### 8.3 구현 순서 (권장)

```text
U1 확인 → 엑셀 배치 검증 util → EmployeeTable 컬럼 → EmployeeTable 모달
       → Step3 load/save → Excel 4열 → compliance 회귀 → lint/build
```

---

## 9. 테스트 계획

| 파일                                              | 케이스                              | 상태         |
| ------------------------------------------------- | ----------------------------------- | ------------ |
| `tests/unit/preceptor-validation.spec.ts`         | 후보 필터, 규칙 1–6                 | ✅           |
| `tests/unit/preceptor-validation.spec.ts`         | `validatePreceptorExcelRows`        | ❌ 추가 예정 |
| `tests/unit/step3-employee-info.spec.ts`          | load UUID→직번, save payload, dirty | ❌           |
| `tests/unit/employee-table.spec.ts` (신규)        | 컬럼 render, 모달 검증              | ❌           |
| `tests/unit/employee-excel-upload.spec.ts` (신규) | 4열 parse, 오류 코드                | ❌           |
| `tests/unit/schedule-compliance-panel.spec.ts`    | summary copy `프리셉터 동일 시프트` | ✅           |

**검증 명령 (구현 완료 후):**

```bash
pnpm exec vitest run tests/unit/preceptor-validation.spec.ts \
  tests/unit/employee-table.spec.ts \
  tests/unit/employee-excel-upload.spec.ts \
  tests/unit/step3-employee-info.spec.ts \
  tests/unit/schedule-compliance-panel.spec.ts -v
pnpm lint:check && pnpm run build
```

**E2E (선택):**

1. Step3 setup: 프리셉터 지정 → 저장 → reload → 값 유지
2. Excel upload → 오류 → 수정 → apply
3. Step5 generate → compliance panel 프리셉터 항목

---

## 10. MVP Scope (UI)

**포함:** Step3 테이블·모달·엑셀, compliance 표시 copy.

**제외:**

- 프리셉터 자동 추천 UI
- 기간별 pairing 변경 UI
- 모바일 레이아웃
- 프리셉터 전용 대시보드

---

## 11. 참고 파일

| 경로                                                         |
| ------------------------------------------------------------ |
| `src/views/schedule/Step3EmployeeInfo.vue`                   |
| `src/components/schedule/EmployeeTable.vue`                  |
| `src/components/schedule/EmployeeExcelUpload.vue`            |
| `src/components/schedule/review/ScheduleCompliancePanel.vue` |
| `DESIGN.md`                                                  |
