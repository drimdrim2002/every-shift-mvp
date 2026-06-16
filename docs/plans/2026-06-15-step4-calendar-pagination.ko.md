# Step4·Step5 ScheduleGrid UX — SSOT (Single Source of Truth)

> **상태:** ✅ 구현 완료 (2026-06-17)  
> **브랜치:** `feat/step4-calendar-pagination`  
> **관련 화면:** `Step4InitialData.vue`, `Step5Result.vue`, `ScheduleGrid.vue`

---

## 요약

Step4(사전 Off 요청)와 Step5(결과 검토)의 **사이트 그리드 UX를 동일한 패턴**으로 맞춘다.

- **날짜:** 당월(±전월) **전체 열** + **가로 스크롤**. ~~7일 주간 페이징~~ ❌ (롤백됨)
- **근무자:** **10명 페이지네이션**만 (Step4·Step5 동일)
- **ScheduleGrid 공통:** 날짜 헤더 1줄 (`N일 (요일)`), compact 열 너비, 근무자 열 140px
- **프리셉터 짝:** 이름 셀 2줄 + 역할 배지 + 상대 라벨

---

## 핵심 결정 (SSOT)

| 축                  | 결정                                                                                    |
| ------------------- | --------------------------------------------------------------------------------------- |
| **날짜 뷰**         | 당월 전체 일자 열 렌더. `overflow-auto` 가로·세로 스크롤                                |
| **7일 주간 페이징** | **사용 안 함** (2026-06-17 롤백)                                                        |
| **근무자 페이징**   | `employeeCalendarPagination.ts` — 10명/페이지, 프리셉터 짝은 페이지 경계에서 분리 안 함 |
| **compact 열**      | `schedule-grid--compact` — `--day-col-width: 72px` (planning·result 공통)               |
| **날짜 헤더**       | `text-[11px] leading-tight`, `N일 (요일)` 한 줄                                         |
| **근무자 열**       | 140px, 데이터 셀 좌측 정렬, 헤더 `근무자`는 가운데                                      |
| **프리셉터 짝**     | `pairDisplayMetaByEmployeeId` — 2줄 이름 + 역할 배지 + peer 라벨                        |
| **열 통계**         | `statisticsEmployees` = 전체 roster, `employees` = 현재 페이지                          |

---

## Step4 vs Step5 차이

| 항목              | Step4                          | Step5                          |
| ----------------- | ------------------------------ | ------------------------------ |
| **mode**          | `planning`                     | `result`                       |
| **셀 에디터**     | `ConstraintSelector`           | `ShiftSelector` (single-box)   |
| **전월 열**       | 없음 (`show-last-month=false`) | 있음 (`show-last-month=true`)  |
| **우측 요약**     | Total 1열                      | D / E / N / Total 4열          |
| **하단 통계 행**  | Total 1행                      | Total + D + E + N 4행          |
| **Off 요청 표시** | constraints                    | offRequests + offRequestNotes  |
| **스크롤 영역**   | `step4-calendar-scroll-region` | `step5-calendar-scroll-region` |
| **그리드 클래스** | `step4-calendar-grid`          | `step5-calendar-grid`          |

공통: 근무자 10명 pagination, compact layout, pair display meta, sticky thead/stat rows.

---

## 파일 구조

| File                                                    | Responsibility                                         |
| ------------------------------------------------------- | ------------------------------------------------------ |
| `src/components/schedule/ScheduleGrid.vue`              | compact layout, date header, pair display, sticky grid |
| `src/views/schedule/Step4InitialData.vue`               | 당월 전체 날짜 + 근무자 pagination + scroll region     |
| `src/views/schedule/Step5Result.vue`                    | site view — Step4와 동일 grid UX                       |
| `src/utils/employeeCalendarPagination.ts`               | 근무자 페이지 분할 (짝 유지)                           |
| `src/utils/preceptorPairDisplayOrder.ts`                | 짝 정렬 + display meta                                 |
| `tests/unit/schedule-grid-compact-layout.spec.ts`       | compact 열·헤더 라벨 계약                              |
| `tests/unit/schedule-grid-preceptor-peer-label.spec.ts` | 프리셉터 짝 라벨                                       |
| `tests/unit/step4-initial-data.spec.ts`                 | Step4 pagination·scroll 계약                           |
| `tests/unit/step5-result.spec.ts`                       | Step5 site pagination·pair meta 계약                   |

---

## ScheduleGrid compact 토큰

```css
.schedule-grid--compact {
  --day-col-width: 72px;
}
```

- **적용 조건:** `mode === 'planning'` 또는 `mode === 'result'`
- **목적:** `31일 (수)` 등 최장 날짜 헤더가 72px 열에서 잘리지 않도록 함
- **이전:** `schedule-grid--planning-compact` 64px — 헤더 클리핑 발생

---

## Step4 바인딩 (참고)

```vue
<ScheduleGrid
  mode="planning"
  :employees="paginatedDisplayEmployees"
  :statistics-employees="displayEmployees"
  :dates="currentMonthStatisticsDates"
  :pair-display-meta-by-employee-id="pairDisplayMetaByEmployeeId"
  ...
/>
```

스크롤: `step4-calendar-scroll-region` (`overflow-auto`).  
그리드 내부: `:deep(.step4-calendar-grid .schedule-grid-container) { overflow: visible }`.

---

## Step5 바인딩 (참고)

```vue
<ScheduleGrid
  mode="result"
  :employees="paginatedDisplayEmployees"
  :statistics-employees="displayEmployees"
  :dates="grid.dates.value"
  :pair-display-meta-by-employee-id="pairDisplayMetaByEmployeeId"
  ...
/>
```

스크롤: `step5-calendar-scroll-region` (`overflow-auto`).  
그리드 내부: `:deep(.step5-calendar-grid .schedule-grid-container) { overflow: visible }`.

---

## 완료 체크리스트

- [x] 당월 전체 일자 + 가로 스크롤 (7일 주간 페이징 제거)
- [x] 근무자 10명 pagination (Step4·Step5)
- [x] compact 72px 열 + 날짜 헤더 1줄 (`31일 (수)` 클리핑 해결)
- [x] 프리셉터 짝 2줄 + 배지 (Step4·Step5)
- [x] `statisticsEmployees`로 열 통계 전체 roster 유지
- [x] unit tests + lint + build

---

## 변경 이력

| 날짜       | 내용                                                          |
| ---------- | ------------------------------------------------------------- |
| 2026-06-16 | 초안: 7일 주간 페이징 설계 (이 문서의 이전 버전)              |
| 2026-06-17 | **롤백:** 주간 페이징 제거, 당월 전체 + 가로 스크롤로 확정    |
| 2026-06-17 | Step5 grid UX Step4 패리티 적용, compact 72px, 문서 SSOT 개정 |

---

## 참고 (outdated 제거됨)

- ~~`calendarWeekPage` / `displayDateCells` / `visibleWeekCells`~~ — 제거·미사용
- ~~`formatCalendarWeekLabel` / `findWeekPageIndexForDate`~~ — 주간 페이징 롤백으로 불필요
- sticky header follow-up: [2026-06-15-step4-calendar-sticky-header-requirements.ko.md](./2026-06-15-step4-calendar-sticky-header-requirements.ko.md)
