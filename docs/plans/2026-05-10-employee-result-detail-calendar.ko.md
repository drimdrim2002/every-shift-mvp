# 직원별 결과 캘린더 UI 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `EmployeeResultDetail.vue`의 직원별 일정 표를 읽기 전용 월간 캘린더로 바꿔, 근무 배정과 Off 요청을 날짜 맥락 안에서 확인할 수 있게 한다.

**Architecture:** 기존 Step5 데이터 흐름을 유지한다. `Step5Result.vue`에서 이미 `ScheduleGrid`에 전달하는 `shiftColors`를 `EmployeeResultDetail.vue`에도 전달하고, 직원 상세 컴포넌트 내부에서 `scheduleRows`를 7열 캘린더 행렬로 변환해 렌더링한다.

**Tech Stack:** Vue 3 `<script setup>`, TypeScript, Tailwind CSS, Naive UI, Vitest, Vue Test Utils.

---

## 요약

- 대상 변경은 Step5 근무자 보기의 왼쪽 일정 표시 영역이다.
- 기존 오른쪽 `가이드라인 위반 상세`, `Off 요청 반영` 목록, Off 요청 상세 모달은 유지한다.
- 캘린더는 `일~토` 7열 구조를 항상 유지하고, 좁은 화면에서는 캘린더 영역만 가로 스크롤한다.
- 이전 달 참고 날짜는 포함하되 흐리게 표시한다.
- 근무 배지는 Step1/Step2에서 설정된 shift별 색상을 Step5 사이트 결과 그리드와 동일하게 사용한다.

## 구현 변경 사항

### Task 1: shift 색상 전달 경로 추가

**Files:**

- Modify: `src/views/schedule/Step5Result.vue`
- Modify: `src/components/schedule/review/EmployeeResultDetail.vue`

- [ ] `EmployeeResultDetail.vue` props에 `shiftColors?: Record<string, string>`를 추가한다.
- [ ] `withDefaults`가 필요하면 기본값을 `{}`로 둔다.
- [ ] `Step5Result.vue`의 `<EmployeeResultDetail>` 호출부에 `:shift-colors="shiftColors"`를 추가한다.
- [ ] 이 변경은 새 API 호출, store 변경, 저장 로직 변경 없이 prop 전달만 수행한다.

### Task 2: 일정 표를 월간 캘린더로 교체

**Files:**

- Modify: `src/components/schedule/review/EmployeeResultDetail.vue`

- [ ] 기존 `[data-test="employee-result-schedule"]` 영역의 `<table>` 렌더링을 캘린더 레이아웃으로 교체한다.
- [ ] 요일 헤더는 `일`, `월`, `화`, `수`, `목`, `금`, `토` 순서로 표시한다.
- [ ] `scheduleRows`를 날짜순으로 정렬한 뒤 첫 표시 날짜의 `dayOfWeek`만큼 앞쪽 `null` 셀을 추가한다.
- [ ] 마지막 행이 7칸이 될 때까지 뒤쪽 `null` 셀을 추가한다.
- [ ] 빈 칸은 날짜 없는 흐린 배경으로 렌더링하고 `aria-hidden="true"`를 둔다.
- [ ] 현재 월 제목은 첫 번째 `!isLastMonth` row의 `date`에서 `YYYY년 M월` 형식으로 계산한다.
- [ ] 선택된 직원이 없거나 `scheduleRows`가 비어 있으면 기존 empty state 문구 `선택된 직원이 없습니다.`를 유지한다.

### Task 3: 날짜 칸 표시 규칙 구현

**Files:**

- Modify: `src/components/schedule/review/EmployeeResultDetail.vue`

- [ ] 현재 월 날짜는 `1`, `2`처럼 일자만 표시한다.
- [ ] 이전 달 날짜는 `11/30`처럼 월/일로 표시한다.
- [ ] 이전 달 날짜 칸은 낮은 대비 배경과 텍스트로 흐리게 표시한다.
- [ ] 각 날짜 칸에는 `일자 + 근무 배지`를 기본 표시한다.
- [ ] 빈 assignment는 `미배정`으로 표시한다.
- [ ] assignment가 `O` 또는 `Off`이면 회색 계열 배지로 표시한다.
- [ ] 그 외 shift 코드는 `shiftColors[shiftCode]`가 유효한 hex 색상일 때 그 색상을 배경/테두리로 사용한다.
- [ ] hex 색상의 텍스트 색상은 `ShiftSelector.vue`의 `getReadableTextColor`와 같은 luminance 기준으로 계산한다.
- [ ] 유효한 shift 색상이 없으면 기존 단순 색상 fallback을 사용하되, `미배정/Off`는 회색으로 유지한다.

### Task 4: Off 요청 표시와 클릭 동작

**Files:**

- Modify: `src/components/schedule/review/EmployeeResultDetail.vue`

- [ ] `row.hasOffRequest`가 true인 날짜 칸에 `Off 요청` 배지를 표시한다.
- [ ] `row.offRequestNote`가 있으면 한 줄 말줄임으로 표시한다.
- [ ] Off 요청이 있는 날짜 칸은 `button`으로 렌더링하고 클릭 시 기존 `openOffRequestDetail(row.date)`를 호출한다.
- [ ] Off 요청이 없는 날짜 칸은 클릭 불가 표시 요소로 렌더링한다.
- [ ] Off 요청 날짜 버튼에는 `aria-label="{날짜} Off 요청 상세"` 형태의 접근성 레이블을 둔다.
- [ ] 기존 오른쪽 Off 요청 목록의 `상세` 버튼과 모달 동작은 변경하지 않는다.

### Task 5: 테스트 보강

**Files:**

- Modify: `tests/unit/employee-result-detail-component.spec.ts`
- Modify: `tests/unit/step5-result.spec.ts`

- [ ] 기존 표 렌더링 기대값을 캘린더 렌더링 기준으로 갱신한다.
- [ ] `일~토` 요일 헤더가 렌더링되는지 검증한다.
- [ ] 앞쪽/뒤쪽 빈 칸이 포함되는지 검증할 수 있도록 테스트 fixture 날짜를 필요한 범위로 확장한다.
- [ ] 이전 달 날짜가 `월/일` 형식으로 표시되고 흐림 처리 클래스가 적용되는지 검증한다.
- [ ] 현재 월 날짜가 일자만 표시되는지 검증한다.
- [ ] `shiftColors` prop을 전달했을 때 근무 배지의 inline style에 같은 색상이 적용되는지 검증한다.
- [ ] Off 요청 날짜 칸 클릭 시 기존 상세 모달이 열리는지 검증한다.
- [ ] Off 요청이 없는 날짜 칸은 상세 모달을 열지 않는지 검증한다.
- [ ] `Step5Result.vue` 테스트에서 `EmployeeResultDetail`에 `shiftColors`가 전달되는지 필요한 범위만 보강한다.

## 완료 기준

- 직원 선택 시 해당 직원의 배정 결과가 `일~토` 7열 월간 캘린더로 표시된다.
- 이전 달 참고 날짜가 캘린더에 포함되고 현재 월과 시각적으로 구분된다.
- 현재 월 날짜는 일자만, 이전 달 날짜는 월/일로 표시된다.
- 근무 배지는 Step5 사이트 결과 그리드와 같은 shift 색상을 사용한다.
- `미배정`, `O`, `Off`는 회색 계열로 표시된다.
- Off 요청이 있는 날짜는 캘린더에서 사유를 한 줄로 보여주고 클릭 시 기존 상세 모달을 연다.
- 오른쪽 `가이드라인 위반 상세`, `Off 요청 반영` 목록, 기존 Off 요청 상세 모달은 유지된다.
- 읽기 전용 상세 화면에서 배정 수정 관련 이벤트가 새로 발생하지 않는다.

## 검증 명령

```bash
pnpm test:unit -- tests/unit/employee-result-detail-component.spec.ts tests/unit/step5-result.spec.ts
pnpm lint:check
pnpm run build
```

## 가정

- 이번 작업 범위는 Step5 근무자 상세의 왼쪽 일정 표시 영역에 한정한다.
- `dates` 배열에는 생성 대상 월과 이전 달 참고 날짜가 이미 포함되어 있다.
- 새 날짜 생성 로직, 새 API 호출, 새 store 상태는 추가하지 않는다.
- 오른쪽 검토 패널과 기존 모달의 문구/구조는 변경하지 않는다.
- 캘린더는 편집 기능을 제공하지 않는 읽기 전용 상세 화면이다.
