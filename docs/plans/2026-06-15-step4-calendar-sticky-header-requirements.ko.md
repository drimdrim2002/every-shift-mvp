# Step4 사전 Off 요청 캘린더 — 날짜 헤더 고정 요구사항 정리

> **상태:** ⏸️ 보류 — `docs/plans/2026-06-15-step4-calendar-pagination.ko.md`로 대체
> **작성일:** 2026-06-15  
> **관련 화면:** `Step4InitialData.vue`, `ScheduleGrid.vue` (`mode="planning"`)  
> **요청 유형:** Deep Interview + 구현 전 계획 문서 (코드 수정 없음)

---

## 1. 사용자 요청 요약

Step4 **사전 Off 요청 캘린더**에서 세로 스크롤 시:

| 현재 (문제)                                                               | 기대 (목표)                                                                          |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 카드 상단 `"사전 Off 요청 캘린더"` 헤더(제목·근무자 수·Excel 버튼)만 고정 | 카드 헤더 **+** 그리드 날짜 헤더(`근무자`, `N일 (요일)`, `Total`)가 함께 상단에 고정 |
| 스크롤하면 날짜 열 라벨이 화면 밖으로 사라짐                              | 근무자 목록만 스크롤되고, 날짜 열 맥락은 항상 보임                                   |

첨부 스크린샷 기준:

- **이미지 1:** 스크롤 후 — 날짜 헤더 없이 근무자 행만 보임
- **이미지 2:** 기대 상태 — 카드 헤더 아래에 `근무자` / `1일 (금)` … / `Total` 행이 유지됨

---

## 2. 코드베이스 현황 (코드에서 확인한 사실)

### 2.1 레이아웃 구조

```text
Step4InitialData.vue
└── 캘린더 카드 (overflow-hidden)
    ├── [고정] 카드 헤더 — "사전 Off 요청 캘린더" + Excel 버튼 (shrink-0)
    ├── [조건부] draft 경고 n-alert (스크롤 영역 밖)
    ├── [스크롤] data-test="step4-calendar-scroll-region" (overflow-y-auto)
    │   └── n-spin → ScheduleGrid (mode="planning")
    └── [고정] 스크롤 안내 문구 (shrink-0, border-t)
```

핵심 파일:

- `src/views/schedule/Step4InitialData.vue` — 스크롤 컨테이너 소유, `:deep` 오버라이드 존재
- `src/components/schedule/ScheduleGrid.vue` — 3단 헤더 + `thead { position: sticky; top: 0 }` CSS

### 2.2 Step4 전용 스크롤 오버라이드

`Step4InitialData.vue` scoped style:

```css
:deep(.step4-calendar-grid .schedule-grid-container) {
  flex: none;
  overflow-y: visible;
}
```

의도: 그리드 내부 스크롤 대신 **카드 내부 `step4-calendar-scroll-region`** 이 세로 스크롤을 담당.

`ScheduleGrid` 기본값은 `.schedule-grid-container { overflow-y: auto }` 이지만 Step4에서 비활성화됨.

### 2.3 그리드 헤더 구조 (planning 모드, `show-last-month=false`)

| 레벨 | 내용      | 예시                       |
| ---- | --------- | -------------------------- |
| L1   | 당월 그룹 | `당월` (전체 날짜 colspan) |
| L2   | 월 이름   | `05월`                     |
| L3   | 일 + 요일 | `1일 (금)` …               |
| 좌측 | rowspan=3 | `근무자`                   |
| 우측 | rowspan=3 | `Total`                    |

### 2.4 기존 설계 의도

`docs/plans/2026-05-02-step4-request-entry-ux-plan.ko.md` §6.9:

- 직원 row → sticky left
- **날짜 header → sticky top**
- 선택 하이라이트·셀 클릭 동작 유지

즉, 기능 요구는 **이미 PRD/플랜에 명시**되어 있으나 Step4 스크롤 구조 변경 이후 **실제 동작이 깨진 회귀**로 보는 것이 타당함.

### 2.5 하단 Total 행 (planning)

`ScheduleGrid` planning 모드는 `tbody` 맨 아래에 열별 Total 집계 행이 있으며, CSS로 `position: sticky; bottom: 0` 적용됨.  
사용자 스크린샷·요청에는 **하단 행 언급 없음** → 별도 확인 필요 (§4.2).

---

## 3. 문제 원인 가설 (구현 시 검증 대상)

스크롤 컨테이너를 Step4 카드로 옮긴 뒤 `thead sticky`가 기대대로 동작하지 않을 수 있는 요인:

| #   | 가설                                                    | 근거                                                                   |
| --- | ------------------------------------------------------- | ---------------------------------------------------------------------- |
| H1  | 스크롤 조상과 sticky `top` 기준 불일치                  | Step4가 `.schedule-grid-container`의 `overflow-y`를 `visible`로 덮어씀 |
| H2  | 중간 래퍼가 sticky 깨뜨림                               | `n-spin` 내부 wrapper, `transform`/`overflow: hidden` 조상             |
| H3  | 3단 `thead` + `border-collapse: separate` 조합 이슈     | 브라우저별 sticky 렌더링 차이                                          |
| H4  | `z-index`/배경 미지정으로 sticky는 되나 시각적으로 비침 | 기존 CSS는 존재하나 Step4 컨텍스트에서 미적용 가능                     |

구현 전 **브라우저에서 `step4-calendar-scroll-region` 스크롤 시 `thead` computed `position` 확인**이 1순위 디버깅 단계.

---

## 4. Deep Interview — 불확실성 정리

### 4.1 코드로 확정 가능 (사용자 확인 불필요)

| 항목        | 결론                                                                                       |
| ----------- | ------------------------------------------------------------------------------------------ |
| 대상 화면   | Step4 `사전 Off 요청 캘린더` (첨부 스크린샷과 일치)                                        |
| 스크롤 방향 | **세로** — 근무자 19명 목록 스크롤 시 날짜 맥락 유지                                       |
| 카드 헤더   | 이미 고정 — 변경 불필요 (유지)                                                             |
| 가로 스크롤 | 날짜가 많을 때 헤더는 날짜 열과 **함께** 가로 이동하는 것이 일반적 (별도 freeze pane 없음) |
| MVP 범위    | 모바일 대응·i18n·AI 솔버 등은 제외                                                         |

### 4.2 사용자 확인이 필요한 항목

#### A. 고정할 헤더 행 범위 — ✅ 확정: **A1**

`thead` 전체 3행(L1 당월 / L2 월 / L3 일·요일) + `근무자`·`Total` 코너 셀 모두 상단 고정.

#### B. 하단 열별 Total 집계 행 — ✅ 확정: **B1**

스크롤 중 열별 Total 집계 행도 화면 하단에 고정. 중간 근무자 행만 세로 스크롤.

#### C. 적용 범위 — ✅ 확정: **C1** (권장 유지)

Step4 planning만 수정. `:deep` 오버라이드·스크롤 컨테이너 구조가 원인일 가능성이 높아 국소 수정 우선.

#### F. 향후 페이징 — ⏭️ 이번 세션 제외

근무자 목록을 스크롤 대신 **페이징**으로 전환할 계획이 있으나, **이번 작업 범위에 포함하지 않음**.  
현재 세션 목표는 기존 스크롤 UX 안에서 상·하단 고정만 복구/구현.

#### D. 요청 입력 드로어 열림 상태 (우선순위: 낮음)

드로어가 열리면 그리드 폭이 줄어듦. sticky 헤더는 **동일 규칙** 적용이 자연스러움 — 별도 예외 없으면 C1과 동일 처리.

#### E. 카드 내부 경고 배너 (우선순위: 낮음)

`hasHiddenUnappliedDraft` 등 `n-alert`는 현재 스크롤 영역 **위**에 있음.  
스크롤 시 함께 고정할 필요 없음 — 현 구조 유지 권장.

---

## 5. 완료 기준 (Acceptance Criteria)

구현 후 아래를 모두 만족하면 완료:

1. **세로 스크롤:** `step4-calendar-scroll-region` 스크롤 시 카드 헤더(`사전 Off 요청 캘린더`)는 계속 보임 (현행 유지).
2. **날짜 헤더 고정:** 동일 스크롤에서 §4.2-A에서 확정한 헤더 행이 카드 헤더 바로 아래에 고정됨.
3. **열 정렬:** 고정된 헤더의 날짜 열과 본문 셀이 가로 스크롤·세로 스크롤 모두에서 어긋나지 않음.
4. **좌측 근무자 열:** `sticky-column` — 근무자명 열이 가로 스크롤 시 좌측 고정 (기존 동작 유지 또는 회귀 없음).
5. **우측 Total 열:** 행별 Total 숫자 열이 가로 스크롤 시 우측 고정 (기존 동작 유지).
6. **시각적 계층:** 고정 헤더 아래 본문이 비치지 않도록 배경·border·shadow가 `DESIGN.md` 톤(slate/white, 얇은 border)과 일치.
7. **기능 회귀 없음:** 셀 선택, 헤더 클릭(`@header-click`), Excel 업/다운로드, 프리셉터 짝 표시가 동일하게 동작.
8. **테스트:** `step4-initial-data.spec.ts`에 sticky 관련 회귀 테스트 추가 (DOM 구조 또는 scroll container + thead 위치 assertion).
9. **검증:** `pnpm lint:check`, `pnpm run build` 통과.

### 수동 QA 체크리스트

- [ ] 근무자 15명 이상 월에서 세로 스크롤 → 날짜 헤더 유지
- [ ] 31일 전후 가로 스크롤 → 헤더·본문 열 정렬 유지
- [ ] 요청 입력 드로어 열림/닫힘 각각에서 동일
- [ ] Chrome / Safari (macOS) 각 1회

---

## 6. 구현 진행 계획 (코드 착수 시)

> 이 섹션은 **실행 순서**만 정리. 본 문서 작성 시점에는 코드 변경 없음.

### Phase 0 — 요구사항 확정 ✅

- [x] §4.2 A·B·C 사용자 답변 반영 (A1 + B1 + C1)
- [x] 페이징 전환은 향후 작업으로 명시적 제외
- [x] 본 문서 상태를 `✅ 요구사항 확정`으로 갱신

### Phase 1 — 원인 확인 (0.5일)

1. 로컬에서 Step4 진입, DevTools로 스크롤 조상 체인 추적
2. `thead th` computed style (`position`, `top`, `z-index`) 기록
3. H1~H4 가설 중 실제 원인 1개로 좁힘

### Phase 2 — 수정 설계 (0.5일)

예상 접근 (원인에 따라 택1 또는 조합):

| 접근     | 내용                                                                                          | 장단점                                                     |
| -------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| **P2-a** | `step4-calendar-scroll-region` 기준 `thead sticky top: 0` 복구 — 중간 래퍼/`n-spin` 구조 조정 | 최소 diff, 기존 CSS 재활용                                 |
| **P2-b** | 헤더를 스크롤 영역 밖으로 분리해 2-table 또는 grid-template 동기화                            | sticky 이슈 회피, 구현 복잡                                |
| **P2-c** | Step4 `:deep` 오버라이드 제거 후 스크롤을 `.schedule-grid-container`로 복귀                   | `ScheduleGrid` 기본 설계와 일치, 카드 레이아웃 재조정 필요 |

**권장 초기 가설:** P2-a — Step4 스크롤 리팩터 이후 sticky 깨짐이므로, 스크롤 조상·래퍼 정리가 1차 시도.

### Phase 3 — 구현 (0.5~1일)

예상 수정 파일:

| 파일                                       | 변경 내용                                               |
| ------------------------------------------ | ------------------------------------------------------- |
| `src/views/schedule/Step4InitialData.vue`  | 스크롤 영역 구조, `:deep` 스타일, 필요 시 `n-spin` 배치 |
| `src/components/schedule/ScheduleGrid.vue` | planning 모드 sticky/z-index 미세 조정 (공통 수정 시)   |
| `tests/unit/step4-initial-data.spec.ts`    | sticky 회귀 테스트                                      |

### Phase 4 — 검증 (0.5일)

1. `pnpm lint:check` / `pnpm run build`
2. §5 수동 QA
3. (선택) E2E — Step4 캘린더 스크롤 스모크

---

## 7. 제외 범위 (명시적)

- **근무자 목록 페이징** — 향후 별도 작업 (이번 세션 미포함)
- Step3 초기 데이터 그리드 (`show-last-month=true`) — 별도 요청 시
- Step5 결과 그리드 — 별도 요청 시
- 헤더 행 UI 단순화(3행→1행)
- 모바일 반응형
- 가상 스크롤 / 30명 초과 직원 대응

---

## 8. 열린 질문

없음 (2026-06-15 확정).

---

## 9. 관련 문서·코드

| 리소스                | 경로                                                      |
| --------------------- | --------------------------------------------------------- |
| Step4 뷰              | `src/views/schedule/Step4InitialData.vue`                 |
| 그리드 컴포넌트       | `src/components/schedule/ScheduleGrid.vue`                |
| UX 플랜 (sticky 의도) | `docs/plans/2026-05-02-step4-request-entry-ux-plan.ko.md` |
| 디자인 계약           | `DESIGN.md`                                               |
| 단위 테스트           | `tests/unit/step4-initial-data.spec.ts`                   |

---

## 10. Deep Interview 로그

### Round 1 (2026-06-15)

**질문:** 세로 스크롤 시 상단 날짜 헤더만 고정 vs 하단 Total 집계 행도 고정?

**답변:** 추천대로 **상·하단 모두 고정** (A1 + B1). 페이징 전환은 예정이나 **이번 세션 제외**.

### 확정 결정 요약

| 항목           | 결정                                         |
| -------------- | -------------------------------------------- |
| 상단 고정      | `thead` 3행 전체 + `근무자`·`Total` 코너     |
| 하단 고정      | 열별 Total 집계 행 (`stat-row-total-only`)   |
| 수정 범위      | Step4 planning (`Step4InitialData.vue` 중심) |
| 이번 세션 제외 | 근무자 페이징                                |

---

_다음 단계: Phase 1(원인 확인) → Phase 3(구현) 착수 가능._
