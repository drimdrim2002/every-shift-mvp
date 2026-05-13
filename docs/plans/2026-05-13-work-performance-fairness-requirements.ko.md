# 근무 실적 공정성 분석 요구사항

**작성일:** 2026-05-13
**최근 수정일:** 2026-05-14
**대상 화면:** `근무표 조회 > 근무 실적`
**대상 경로:** `/app/work-performance`
**대상 구현 파일:** `src/views/schedule/WorkPerformance.vue`
**문서 성격:** 요구사항 + 엔지니어링 구현 계획
**구현 상태:** 요구사항 확정 중. 현재 `src/views/schedule/WorkPerformance.vue`는 placeholder지만, 이 문서의 결과물은 해당 파일에 실제 근무 실적 공정성 분석 화면으로 적용되어야 함.

---

## 디자인 검토 보강 결과

**검토 관점:** `design-consultation` + `plan-design-review`
**초기 디자인 완성도:** 6/10
**보강 후 목표 디자인 완성도:** 9/10

이 계획은 공정성 계산 기준과 MVP 범위는 충분히 구체적이지만, 원문만으로는 구현자가 화면 위계, 상태별 UI, 좁은 화면 처리, 키보드 접근성, 공정성 강조 표현을 임의로 결정해야 했다. 아래 보강은 `DESIGN.md`의 "calm operational product", restrained slate/teal palette, compact-to-comfortable density, app workspace-first layout을 기준으로 추가한다.

10/10은 구현 후 실제 `/app/work-performance` 화면을 캡처 기반 `/design-review`로 검증해야 달성한다. 특히 표 overflow, 확장 행 높이, 강조 색상 대비, keyboard focus 이동, screen reader 읽기 순서는 실제 DOM과 스타일이 나온 뒤 확인해야 한다.

### 이 화면의 디자인 원칙

- 이 화면은 마케팅 화면이나 dashboard mosaic이 아니라 **읽기 전용 운영 분석 workspace**다.
- 첫 번째 시각 anchor는 요약 카드가 아니라 **근무자별 비교 테이블**이다. 요약 카드는 전체 분포를 빠르게 파악하게 돕는 보조 정보다.
- 색상은 판정 문구를 대신하지 않는다. 강조 셀은 색상, 굵기, 텍스트/ARIA 설명을 함께 사용한다.
- 카드형 UI는 요약 지표와 상태 안내처럼 의미가 분리된 정보에만 사용한다. 테이블 위아래에 장식용 카드 grid를 만들지 않는다.
- 사용자-facing UI 문구는 한국어로 작성하고, "공정성 점수 좋음" 같은 판정형 문구보다 "평균 대비 +3일"처럼 검증 가능한 수치를 우선한다.

### 기존 디자인 자산 재사용

- `DESIGN.md`: Pretendard Variable, IBM Plex Mono, slate/teal token, compact-to-comfortable spacing, desktop-first operational surface 원칙을 따른다.
- `src/views/schedule/ScheduleResults.vue`: `근무표 조회` overline, `text-2xl` page title, compact year selector, loading/empty/error state 구조를 재사용한다.
- `src/views/Dashboard.vue`: loading/error/empty section copy처럼 "무엇이 막혔고 무엇을 할 수 있는지"를 먼저 말하는 운영형 문장 패턴을 재사용한다.
- Naive UI: `NButton`, `NSelect`, `NInputNumber`, `NDataTable` 또는 현재 코드베이스에서 이미 사용하는 table 패턴을 우선한다. 새 컴포넌트 library를 추가하지 않는다.

### 디자인 범위에서 제외

- 모바일 전용 재설계: MVP에서는 desktop-first로 두고, 좁은 화면은 깨지지 않게 보호하는 수준으로 제한한다.
- 추세 chart, radar chart, score visualization: 이번 화면의 신뢰 기준은 수치와 근거 날짜 목록이다.
- 직원 상세 profile drawer: 행 확장 날짜 목록만 제공한다.
- 공정성 상태 라벨 자동 판정: `양호`, `주의`, `확인 필요` 같은 판정 라벨은 넣지 않는다.
- 디자인 시스템 변경: 이 화면을 위해 `DESIGN.md`의 색상, 폰트, radius 체계를 바꾸지 않는다.

---

## 목적

`근무 실적` 화면은 선택한 기간 동안 근무자별 근무 실적을 비교해 근무 공정성이 유지되고 있는지 확인하는 화면이다.

관리자는 이 화면에서 특정 근무자에게 야간 근무나 주말/휴일 근무 부담이 계속 몰리고 있는지, 또는 Off 요청 수락이 상대적으로 적은 근무자가 있는지 빠르게 확인할 수 있어야 한다.

이 화면은 동시에 최종 확정된 근무표 기준으로 스케줄 생성 엔진이 특정 근무자에게 부담을 과도하게 누적시키지 않았다는 점을 수치로 보여주는 역할을 한다.

---

## 메뉴 위치

이 화면은 신규 상단 메뉴 구조에서 `근무표 조회` 하위의 `근무 실적` 메뉴에 둔다.

```text
근무표 조회
├── 생성된 근무표
└── 근무 실적
```

`근무 실적`은 기존 근무표 생성/검토 workflow 안의 Step 4 또는 Step 5 화면이 아니다. 특정 월 근무표 편집이 아니라, 확정된 여러 기간의 운영 결과를 조회하는 분석 화면이다.

---

## 구현 적용 대상

이번 요구사항의 구현 대상은 `src/views/schedule/WorkPerformance.vue`다.

현재 이 파일은 아래 요소만 렌더링하는 준비 중 placeholder다.

- 화면 제목 `근무 실적`
- `근무 실적 화면은 준비 중입니다` 빈 상태
- `생성된 근무표 보기` 보조 이동 버튼

이 placeholder는 top navigation route를 먼저 열기 위한 임시 상태다. 최종 구현에서는 같은 파일 안에서 기간 선택, 공정성 요약 카드, 강조 기준 설정, 근무자별 비교 테이블, 행 상세 날짜 목록을 제공해야 한다.

기존 top navigation 계획 문서의 “placeholder만 만든다”는 내용은 route 도입 당시의 범위로만 본다. 이 요구사항 문서가 `근무 실적` 실제 기능 구현의 기준 문서다.

구현 시 기존 route와 navigation 구조는 유지한다.

- route path: `/app/work-performance`
- route component: `src/views/schedule/WorkPerformance.vue`
- 상단 메뉴 위치: `근무표 조회 > 근무 실적`

`src/views/schedule/ScheduleResults.vue`는 생성된 근무표 조회 화면이므로, 이 공정성 분석 기능을 그 파일로 옮기지 않는다.

---

## 기준 데이터

공정성 지표는 **최종 확정된 근무표**를 기준으로 계산한다.

생성 엔진이 만든 초안이나 관리자가 편집 중인 임시 근무표는 이 화면의 기본 계산 대상이 아니다. 실제 근무자에게 배정된 최종 결과를 기준으로 공정성을 판단해야 하기 때문이다.

### 최종 확정 근무표 판별 기준

현재 코드 기준으로 최종 확정 근무표의 기준값은 `schedules.finalized_version_id`다.

`schedules`는 월 단위 container이고, 실제 후보 근무표는 `schedule_versions`에 version으로 저장된다. 확정 처리 RPC는 선택된 version이 `review_ready`이고 최신 평가가 `passed`이며 `finalization_gate.allowed = true`일 때만 확정을 허용한다. 확정이 완료되면 `schedule_versions.status = 'finalized'`로 바꾸고, `schedules.finalized_version_id`, `schedules.finalized_at`, `schedules.finalized_by`를 함께 기록한다.

따라서 `근무 실적` 화면의 계산 대상은 아래 조건으로 판별한다.

```text
schedules.finalized_version_id IS NOT NULL
```

배정 데이터는 `schedule_assignments.schedule_version_id = schedules.finalized_version_id`로 조회한다.

`schedules.status = 'complete'` 또는 `schedule_versions.status = 'finalized'`만 단독 기준으로 쓰지 않는다. `complete` 상태는 legacy 흐름에서도 설정될 수 있고, version 상태만으로는 어떤 월 container의 최종 확정본인지 판별하기 어렵기 때문이다.

선택 기간 안에 확정되지 않은 월이 있으면 해당 기간의 공정성 계산을 표시하지 않는다. 부분 기간만 계산하면 선택 기간 전체의 부담 분포가 왜곡될 수 있기 때문이다.

---

## 기간 선택

사용자는 `연도`, `시작 월`, `종료 월`을 선택한다.

예:

```text
2026년 1월 ~ 2026년 3월
2026년 4월 ~ 2026년 6월
```

기간은 같은 연도 안에서만 선택할 수 있다.

허용하지 않는 예:

```text
2025년 12월 ~ 2026년 1월
```

연도 넘김 기간은 이번 MVP 범위에서 제외한다.

---

## 비교 대상

MVP 비교 대상은 전체 근무자다.

부서/팀, 역할 또는 직급, 근무 형태 필터는 이번 요구사항에서 제외한다.

선택 기간 전체를 근무하지 않은 직원은 기본 공정성 비교 대상에서 제외한다. 중도 입사, 퇴사, 휴직자는 단순 일수 비교 시 왜곡이 생길 수 있기 때문이다.

---

## 공정성 지표

이 화면에서 비교할 공정성 지표는 세 가지다.

1. 야간 근무 일수
2. 주말 및 휴일 근무 일수
3. Off 요청 수락 일수

### 야간 근무 일수

선택 기간 안에서 최종 확정 근무표에 야간 근무로 배정된 일수다.

야간 근무는 평균보다 많이 높을수록 부담이 큰 것으로 본다.

### 주말 및 휴일 근무 일수

선택 기간 안에서 토요일, 일요일, 한국 법정공휴일에 근무한 일수다.

한국 법정공휴일 데이터는 이미 생성된 `public.public_holidays` 테이블을 기준 데이터로 본다. 공휴일 날짜는 `public_holidays.holiday_date` 컬럼에 `YYYY-MM-DD` 형식으로 저장되어 있으며, 예시는 `2026-01-01`이다.

구현 시 선택 기간의 각 날짜를 아래 기준으로 판별한다.

```text
date is Saturday
OR date is Sunday
OR date IN public.public_holidays.holiday_date
```

`holiday_date`는 date-only 값으로 비교한다. 시간대 변환으로 하루가 밀리지 않도록 JavaScript `Date` 객체의 local timezone 변환에 의존하지 말고, `YYYY-MM-DD` 문자열 또는 date-only helper로 비교한다.

선택 기간에 해당하는 `holiday_date` row가 없더라도 그것만으로 오류로 보지 않는다. 해당 기간에 법정공휴일이 없을 수 있기 때문이다. 단, 선택한 연도에 `public.public_holidays` row가 하나도 없으면 공휴일 기준 데이터가 준비되지 않은 것으로 보고 `공휴일 데이터 없음` 상태로 차단한다.

병원 자체 지정 휴일은 이번 요구사항의 기본 범위에서 제외한다.

주말 및 휴일 근무는 평균보다 많이 높을수록 부담이 큰 것으로 본다.

### Off 요청 수락 일수

직원이 Off를 요청한 날짜 중, 최종 확정 근무표에서도 Off로 배정된 일수다.

요청하지 않았지만 최종 근무표에서 Off가 된 일반 휴무는 포함하지 않는다.

Off 요청 수락 일수는 평균보다 낮을수록 상대적으로 배려를 덜 받은 것으로 본다.

---

## 화면 구성

화면은 크게 네 영역으로 구성한다.

1. 기간 선택 영역
2. 공정성 요약 카드
3. 강조 기준 설정
4. 근무자별 비교 테이블

### 정보 위계

사용자가 화면에 들어온 뒤 보아야 하는 순서는 아래와 같다.

1. 현재 어떤 기간을 보고 있는지
2. 선택 기간이 공정성 계산 가능한 확정 상태인지
3. 전체적으로 편차가 큰 지표가 무엇인지
4. 어떤 근무자가 평균 대비 불리한 방향으로 많이 벗어났는지
5. 그 수치의 근거 날짜가 무엇인지

구현 시 화면 구조는 아래 순서를 따른다.

```text
WorkPerformance.vue
└── Page shell: max-w-6xl, px-4, space-y-6
    ├── Header
    │   ├── overline: 근무표 조회
    │   ├── title: 근무 실적
    │   └── helper: 확정된 근무표 기준으로 야간, 주말·휴일, Off 요청 수락 편차를 확인합니다.
    ├── Period controls
    │   ├── 연도 select
    │   ├── 시작 월 select
    │   ├── 종료 월 select
    │   └── 조회 button
    ├── Period state banner
    │   └── 조회 가능 / 확정 누락 / 데이터 없음 / 오류 상태를 section-local로 표시
    ├── Summary metrics
    │   └── 3 compact metric panels: 야간 근무, 주말·휴일 근무, Off 요청 수락
    ├── Threshold controls
    │   └── 강조 기준 input/stepper + 짧은 설명
    └── Employee comparison table
        ├── sortable columns
        ├── highlighted metric cells
        └── expandable evidence rows
```

기간 선택은 자동 조회가 아니라 `조회` 버튼으로 적용한다. 연도, 시작 월, 종료 월을 바꾸는 동안 화면이 반쯤 바뀌는 느낌을 피하고, 관리자가 "이 기간으로 다시 계산했다"는 확신을 갖게 하기 위해서다.

### 화면별 시각 우선순위

| 영역                | 사용자가 먼저 알아야 하는 것                           | 시각 처리                                                      |
| ------------------- | ------------------------------------------------------ | -------------------------------------------------------------- |
| Header              | 이 화면은 과거 운영 결과 분석이지 생성 workflow가 아님 | `ScheduleResults.vue`와 같은 overline/title 구조               |
| Period controls     | 현재 계산 범위                                         | 한 줄 control group, 좁은 화면에서는 2줄 wrap 허용             |
| Period state banner | 계산 가능 여부                                         | 확정 누락/오류만 semantic tint 사용, 정상 상태는 조용하게 표시 |
| Summary metrics     | 지표별 평균/최소/최대/최대 편차                        | compact panel 3개, 숫자는 mono accent 허용                     |
| Threshold controls  | 어떤 차이를 강조할지                                   | table 바로 위에 배치해 강조 결과와 연결                        |
| Employee table      | 누가 먼저 확인 대상인지                                | 가장 큰 work surface. table density와 sticky header 우선       |
| Expanded row        | 수치의 근거 날짜                                       | 행 안에서만 열리고, 별도 modal/drawer로 띄우지 않음            |

### AI slop 방지 기준

- 첫 화면을 "요약 카드 3개 + 큰 빈 영역"으로 만들지 않는다. 표가 보이기 전까지 scroll이 길어지면 실패다.
- 각 요약 panel은 같은 크기의 decorative card가 아니라 실제 요약 숫자를 담는 compact metric panel이다.
- icon-in-circle, gradient background, decorative blob, emoji, hero copy를 사용하지 않는다.
- 강조 색상은 amber/error 계열 semantic token을 제한적으로 사용하고, primary teal을 위험/불균형 색으로 쓰지 않는다.
- "공정성을 한눈에!" 같은 홍보형 문구를 쓰지 않는다. 운영자는 설명보다 근거 수치를 원한다.

### 기간 선택 영역

사용자는 같은 연도 안에서 조회 기간을 선택한다.

필수 입력:

- 연도
- 시작 월
- 종료 월

상호작용 기준:

- 기본값은 현재 연도와 현재 월로 둔다. 단, 현재 월의 확정 근무표가 없으면 가장 최근 확정 월을 기본값으로 선택할 수 있다.
- 시작 월이 종료 월보다 뒤가 되면 `조회` 버튼을 disabled 처리하고, controls 아래에 `시작 월은 종료 월보다 늦을 수 없습니다`를 표시한다.
- 조회 중에는 `조회` 버튼 안에 loading 상태를 표시하고, 기존 결과가 있다면 기존 표를 지우지 않는다. 새 결과가 도착하기 전까지 "이전 조회 결과"임을 작은 보조 문구로 표시한다.
- 연도 넘김 기간은 select 구조상 만들 수 없게 한다. 별도 error page로 보내지 않는다.

### 공정성 요약 카드

상단 요약 카드에는 지표별 전체 분포를 수치로 보여준다.

각 지표별로 아래 값을 표시한다.

- 평균
- 최소
- 최대
- 최대 편차

예:

```text
야간 근무
평균 4.2일 · 최소 3일 · 최대 6일 · 최대 편차 2일

주말·휴일 근무
평균 3.1일 · 최소 2일 · 최대 5일 · 최대 편차 2일

Off 요청 수락
평균 2.8일 · 최소 1일 · 최대 4일 · 최대 편차 2일
```

요약 카드에는 `양호`, `주의`, `확인 필요` 같은 상태 라벨을 넣지 않는다. 사용자는 수치로 전체 편차를 판단한다.

시각 기준:

- 각 요약 panel은 `border-subtle`, `surface-primary`, `radius-md`를 사용한다.
- 지표명은 `text-sm font-semibold`, 평균/최소/최대/편차 값은 `text-sm` 또는 `text-base`로 둔다. 한 panel 안에서 hero-size 숫자를 사용하지 않는다.
- 숫자와 signed delta는 `IBM Plex Mono` 계열 mono accent를 사용할 수 있다.
- 최대 편차는 "불리한 방향 기준"과 "전체 절대 편차"가 혼동되지 않도록 label을 정확히 쓴다. MVP에서는 카드 label을 `최대 편차`로 두되, helper text에서 "평균과 가장 멀리 떨어진 값"이라고 설명한다.

### 강조 기준 설정

평균 대비 차이가 큰 값은 색상으로 강조한다.

기본 강조 기준은 `3일`이다. 사용자는 화면에서 이 기준 일수를 조절할 수 있어야 한다.

강조 방향:

- 야간 근무: 평균 대비 `+기준일` 이상이면 강조
- 주말 및 휴일 근무: 평균 대비 `+기준일` 이상이면 강조
- Off 요청 수락: 평균 대비 `-기준일` 이하이면 강조

예:

```text
강조 기준: 3일

야간 근무 평균 4일, 직원 A 7일 -> +3일이므로 강조
Off 요청 수락 평균 4일, 직원 B 1일 -> -3일이므로 강조
```

강조 표현 기준:

- 강조 threshold input은 table 바로 위에 둔다.
- 기본 control은 1일 단위 `NInputNumber` 또는 stepper로 구현한다.
- 허용 범위는 1일 이상 10일 이하로 둔다. 0일은 모든 편차를 강조해 화면 noise가 커지므로 허용하지 않는다.
- 강조 셀은 색상만 바꾸지 않는다. `강조` 또는 `평균보다 3일 많음/적음`을 screen reader가 읽을 수 있도록 숨김 텍스트 또는 `aria-label`을 제공한다.
- 야간/주말·휴일의 불리한 편차는 amber tint를 기본으로 사용한다. Off 요청 수락 부족은 같은 amber 계열을 사용하되, 텍스트에서 방향을 명확히 한다.

### 근무자별 비교 테이블

테이블은 근무자별로 세 가지 공정성 지표를 비교한다.

각 지표는 실제 일수와 평균 대비 차이를 함께 보여준다.

예:

```text
근무자      야간 근무        주말·휴일 근무     Off 요청 수락
김민지      7일 (+3일)       4일 (+1일)        2일 (-1일)
박서연      3일 (-1일)       6일 (+3일)        5일 (+2일)
```

기본 정렬은 공정성 편차가 큰 순이다.

기본 정렬 점수는 세 지표를 별도의 동일 가중치로 본다. 각 지표는 평균 대비 불리한 방향의 편차만 점수에 반영한다.

```text
정렬 점수 =
  max(0, 야간 근무 일수 - 야간 근무 평균)
+ max(0, 주말·휴일 근무 일수 - 주말·휴일 근무 평균)
+ max(0, Off 요청 수락 평균 - Off 요청 수락 일수)
```

동률이면 아래 순서로 다시 정렬한다.

- 야간 근무가 평균보다 많이 높은 근무자
- 주말 및 휴일 근무가 평균보다 많이 높은 근무자
- Off 요청 수락 일수가 평균보다 많이 낮은 근무자

즉, 부담이 많이 쌓였거나 배려를 덜 받은 근무자가 먼저 보이도록 정렬한다.

사용자는 테이블에서 지표별 정렬을 바꿀 수 있어야 한다.

테이블 표시 기준:

- 첫 번째 column은 근무자명이며 sticky left를 고려한다. 이름이 길면 한 줄 ellipsis를 적용하되, `title` 또는 accessible name으로 전체 이름을 확인할 수 있어야 한다.
- 각 지표 cell은 `실제 일수`와 `평균 대비 차이`를 같은 cell 안에서 보여준다.
- 평균 대비 차이는 signed format을 사용한다. 예: `+3일`, `-1일`, `0일`.
- 평균이 소수점이면 평균 대비 차이도 소수점 1자리까지 표시할 수 있다. 실제 일수는 항상 정수 일수로 표시한다.
- 기본 정렬 column은 별도 hidden column인 `공정성 편차 점수`로 보아도 된다. UI에는 `확인 우선순위` tooltip 또는 helper copy로 설명한다.
- 사용자가 column 정렬을 바꾸면 해당 column header에 `aria-sort`를 반영한다.
- table caption 또는 screen-reader-only 설명에 "평균보다 불리한 방향으로 많이 벗어난 근무자가 먼저 표시됩니다"를 포함한다.

---

## 상세 확인

근무자 행을 펼치면 각 지표의 근거가 되는 날짜 목록을 확인할 수 있어야 한다.

예:

```text
김민지

야간 근무
- 1/3
- 1/8
- 1/14

주말·휴일 근무
- 1/5
- 1/12

Off 요청 수락
- 1/20
- 1/21
```

상세 날짜 목록은 사용자가 수치의 근거를 확인하기 위한 보조 정보다. 기본 화면에서는 근무자별 비교 테이블의 가독성을 우선한다.

확장 행 UI 기준:

- 행 전체 click이 아니라 명시적인 `상세 보기` button으로 펼친다.
- 펼쳐진 영역은 같은 table row 아래에 inline으로 표시한다. modal은 사용하지 않는다.
- 세 지표를 3개 column으로 나누되, 좁은 폭에서는 세로로 쌓는다.
- 날짜는 `1/3 토`, `1/8 목`처럼 월/일과 요일을 함께 표시한다. 공휴일이면 `공휴일` 보조 label을 붙인다.
- 날짜가 없으면 빈 list 대신 `해당 날짜 없음`을 표시한다.
- 확장/접힘 상태는 `aria-expanded`로 표시하고, focus가 갑자기 page 상단으로 이동하지 않아야 한다.

---

## 상태별 화면 기준

이 화면은 확정 근무표와 여러 기간 데이터를 읽는 분석 화면이므로, 상태가 비어 있거나 일부만 준비된 경우의 UI가 중요하다. 구현자는 아래 상태를 모두 분리해서 처리한다.

| 상태                | 사용자가 보는 것                                                                                                       | 기본 action                                |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| 최초 진입           | header, 기간 선택, 최근 확정 월 기준 안내 또는 조회 전 안내                                                            | 기간 선택 후 `조회`                        |
| 조회 중             | 기존 결과가 없으면 section-local loading, 기존 결과가 있으면 table 유지 + 조회 button loading                          | 없음                                       |
| 조회 가능           | summary metrics, threshold controls, employee table                                                                    | 정렬/행 확장                               |
| 확정 누락 월 있음   | 계산 대신 누락 월 목록과 "선택 기간 전체 확정 후 조회 가능" 안내                                                       | `생성된 근무표 보기` 보조 이동             |
| 확정 근무표 없음    | "아직 확정된 근무표가 없습니다"와 생성/조회 흐름 안내                                                                  | `생성된 근무표 보기` 또는 `새 근무표 생성` |
| 비교 대상 직원 없음 | "선택 기간 전체를 근무한 직원이 없습니다"와 제외 기준 설명                                                             | 기간 변경                                  |
| 공휴일 데이터 없음  | 선택 연도에 `public.public_holidays.holiday_date` row가 없어 법정공휴일 판별 기준이 준비되지 않았음을 차단 상태로 표시 | 공휴일 데이터 확인 안내                    |
| 요청 데이터 없음    | Off 요청 수락 지표는 0 기준으로 표시하되 "선택 기간에 Off 요청이 없습니다" 설명                                        | 없음                                       |
| 조회 실패           | 어떤 정보를 불러오지 못했는지와 재시도 안내                                                                            | `다시 시도`                                |

확정 누락 월이 있으면 부분 계산을 하지 않는다. 이때 단순히 빈 표를 보여주면 사용자는 "공정성 문제가 없다"고 오해할 수 있으므로, blocker state로 분리한다.

공휴일 데이터 없음 상태는 선택 기간 row 유무가 아니라 선택 연도 coverage로 판단한다. 예를 들어 2026년 3월 조회 기간에 공휴일 row가 없더라도 2026년 전체에 `holiday_date` row가 있으면 정상 계산한다. 반대로 2026년 전체에 row가 하나도 없으면 sync 누락 가능성이 높으므로 계산을 차단한다.

### 상태 copy 기준

- Loading: `근무 실적을 계산하는 중입니다`
- 확정 누락: `선택한 기간에 아직 확정되지 않은 월이 있습니다`
- 전체 empty: `아직 확정된 근무표가 없습니다`
- 비교 대상 empty: `이 기간 전체를 근무한 직원이 없습니다`
- Error: `근무 실적을 불러오지 못했습니다`

각 상태는 한 줄 원인과 하나의 다음 action만 둔다. 여러 action을 같은 weight로 나열하지 않는다.

---

## 사용자 여정과 감정 기준

| 단계 | 사용자가 하는 일                     | 사용자가 느껴야 하는 것                             | UI가 지원해야 하는 것                          |
| ---- | ------------------------------------ | --------------------------------------------------- | ---------------------------------------------- |
| 1    | `근무표 조회 > 근무 실적`에 진입한다 | "여기는 생성 화면이 아니라 운영 결과 확인 화면이다" | overline, title, 짧은 helper copy              |
| 2    | 기간을 선택하고 조회한다             | "내가 본 기간이 명확하다"                           | applied period summary, disabled invalid range |
| 3    | 요약 분포를 훑는다                   | "전체 편차 규모를 먼저 알 수 있다"                  | compact metric panels                          |
| 4    | table 상단 근무자를 확인한다         | "확인해야 할 사람이 먼저 나온다"                    | default fairness deviation sort                |
| 5    | 행을 펼쳐 날짜 근거를 본다           | "왜 이 숫자인지 검증할 수 있다"                     | inline evidence row                            |
| 6    | 기간이나 threshold를 조정한다        | "내 기준에 맞춰 다시 볼 수 있다"                    | stable controls, no layout jump                |

5초 안에는 현재 기간과 table 목적이 이해되어야 한다. 5분 안에는 관리자가 "이 직원은 왜 강조됐는지"를 날짜 근거로 설명할 수 있어야 한다. 장기적으로는 이 화면이 생성 엔진을 믿게 만드는 proof surface가 되어야 한다.

---

## 반응형 및 접근성 기준

MVP에서 모바일 최적화는 제외하지만, 화면이 좁아졌을 때 주요 정보가 깨지면 안 된다.

### Desktop

- primary target이다.
- summary metrics는 3개 panel을 한 줄로 배치할 수 있다.
- table은 sticky header를 우선 고려한다.
- table body는 horizontal overflow를 허용하되, page 전체가 불필요하게 흔들리지 않게 table container 안에서 처리한다.

### Tablet / narrow desktop

- 기간 controls는 2줄 wrap을 허용한다.
- summary metrics는 2열 또는 1열로 내려갈 수 있다.
- table은 최소 폭을 유지하고 horizontal scroll을 제공한다.
- threshold controls는 table 위에 계속 남아 있어야 한다.

### Mobile

- full mobile optimization은 MVP 범위 밖이다.
- 접근 자체를 막지는 않는다.
- controls와 상태 안내는 읽을 수 있어야 한다.
- table은 horizontal scroll로 보호하고, "넓은 화면에서 더 보기 쉽습니다" 정도의 보조 문구를 허용한다.

### Accessibility

- 모든 form control은 visible label을 가진다.
- `조회`, `다시 시도`, `상세 보기`는 keyboard로 접근 가능해야 한다.
- row expansion button은 `aria-expanded`를 가진다.
- sortable header는 `aria-sort`를 반영한다.
- 강조 cell은 color-only 상태가 아니어야 한다.
- table에는 caption 또는 screen-reader-only 설명을 둔다.
- touch target은 최소 44px를 지킨다.
- error/empty/loading 상태는 heading hierarchy를 유지하고, focus를 잃지 않아야 한다.

---

## 제외 범위

이번 요구사항에서 아래 항목은 제외한다.

- 실제 AI solver 연동
- 생성 초안과 최종 확정표의 공정성 비교
- 병원 자체 지정 휴일 관리
- 부서/팀, 역할 또는 직급, 근무 형태 필터
- 중도 입사, 퇴사, 휴직자의 별도 보정 계산
- 직원 CRUD 또는 조직 CRUD
- 모바일 최적화
- 광범위한 analytics dashboard
- 상태 라벨 기반 판정 문구
- 연도를 넘는 기간 조회

---

## MVP 완료 기준

아래 조건을 만족하면 `근무 실적` 공정성 분석 화면의 MVP 요구사항을 충족한 것으로 본다.

- `src/views/schedule/WorkPerformance.vue`가 placeholder가 아니라 실제 공정성 분석 화면을 렌더링한다.
- `/app/work-performance` route는 기존처럼 `WorkPerformance.vue`를 사용한다.
- 연도, 시작 월, 종료 월을 선택할 수 있다.
- 연도 넘김 기간은 선택할 수 없다.
- 선택 기간 안의 모든 월에 `schedules.finalized_version_id`가 있을 때만 지표가 계산된다.
- 최종 확정된 version의 `schedule_assignments.schedule_version_id` 기준으로 지표가 계산된다.
- 전체 근무자 기준으로 세 가지 공정성 지표가 계산된다.
- 부서/팀, 역할, 근무 형태 필터는 제공하지 않는다.
- 선택 기간 전체를 근무하지 않은 직원은 비교에서 제외된다.
- 한국 법정공휴일은 `public.public_holidays.holiday_date`의 `YYYY-MM-DD` date-only 값 기준으로 판별한다.
- 선택 기간 전체 근무 여부는 현재 schema 한계상 final assignment coverage로 판단한다.
- `src/api/workPerformance.ts`는 필요한 column만 명시적으로 조회하고, assignment/preference 조회는 1000 row 이상도 읽도록 pagination을 적용한다.
- `src/utils/workPerformanceFairness.ts`의 순수 계산 함수가 평균, 편차, 강조, 정렬, 근거 날짜를 계산한다.
- 공휴일 데이터 없음 상태는 선택 기간 range 조회와 별도로 선택 연도 coverage check를 통과해야 한다.
- 상단 요약 카드에서 평균, 최소, 최대, 최대 편차를 볼 수 있다.
- 근무자별 테이블에서 실제 일수와 평균 대비 차이를 볼 수 있다.
- 기본 강조 기준은 3일이다.
- 사용자가 강조 기준 일수를 조절할 수 있다.
- 행을 펼치면 해당 수치의 근거 날짜 목록을 볼 수 있다.
- 기본 정렬은 세 지표의 동일 가중치 편차 점수가 큰 순이다.
- 조회 중, 확정 누락, 전체 empty, 비교 대상 empty, 공휴일 데이터 누락, 조회 실패 상태를 서로 다른 UI로 표시한다.
- 근무자별 비교 테이블은 화면의 primary visual anchor로 구현한다.
- 강조 셀은 색상만으로 상태를 전달하지 않는다.
- 행 확장, column 정렬, 조회/재시도 action은 keyboard와 screen reader 기준을 충족한다.
- 좁은 화면에서는 controls와 상태 안내가 읽히고, table은 horizontal scroll로 보호된다.
- `DESIGN.md`의 typography, color token, spacing, radius, app workspace 원칙을 따른다.
- 기존 placeholder 전용 테스트는 실제 화면 요구사항에 맞게 갱신한다.
- 공정성 계산 unit test, Supabase query contract unit test, 화면 상태 unit test, 주요 조회 E2E test가 모두 추가된다.

---

## 모호함 해소 결과

아래 항목은 이번 문서 업데이트에서 결정된 내용이다.

- 구현 적용 파일은 `src/views/schedule/WorkPerformance.vue`다.
- 현재 placeholder는 임시 route scaffold로만 본다. 실제 구현 결과물은 이 파일에 적용한다.
- 한국 법정공휴일 데이터는 별도 계획인 `docs/plans/2026-05-13-public-holidays-solver-integration-plan.md` 방향을 따른다.
- 선택 기간 전체를 근무하지 않은 직원은 MVP 비교 대상에서 제외한다.
- 부서/팀, 역할 또는 직급, 근무 형태 필터는 MVP에서 제외한다.
- 최종 확정 근무표는 `schedules.finalized_version_id`로 판별하고, 배정은 해당 version의 `schedule_assignments.schedule_version_id`로 조회한다.
- 공정성 편차 정렬은 야간 근무, 주말·휴일 근무, Off 요청 수락을 별도의 동일 가중치 지표로 본다.
- 기간 변경은 자동 조회가 아니라 `조회` 버튼으로 적용한다.
- 첫 번째 시각 anchor는 요약 카드가 아니라 근무자별 비교 테이블로 둔다.
- 요약 카드는 compact metric panel로만 사용하고, dashboard-card mosaic으로 확장하지 않는다.
- 강조 기준 입력은 1일 이상 10일 이하로 제한한다.
- 상세 날짜 확인은 modal/drawer가 아니라 table inline 확장 행으로 제공한다.
- 모바일 전용 최적화는 제외하지만, 좁은 화면에서 controls와 상태 안내가 깨지지 않도록 한다.
- 공휴일 데이터 없음 상태는 선택 기간에 공휴일 row가 없는 경우가 아니라, 선택 연도에 `public.public_holidays.holiday_date` row가 하나도 없는 경우로 판단한다.

남은 열린 질문은 없다.

---

## 엔지니어링 검토 보강 결과

**검토 관점:** `plan-eng-review`
**검토일:** 2026-05-14
**검토 대상:** `src/views/schedule/WorkPerformance.vue` 실제 구현 계획
**결론:** 구현 가능. 단, 모든 계산을 Vue 파일 안에 넣으면 테스트와 장애 대응이 약해지므로, 데이터 조회와 순수 계산을 분리하는 최소 구조로 구현한다.

### Step 0 Scope Challenge

이번 구현의 핵심은 "새로운 분석 플랫폼"이 아니라, 이미 확정된 근무표 데이터를 읽어 공정성 지표를 계산하고 보여주는 것이다.

- **[Layer 1] 기존 route와 placeholder를 재사용한다.** `/app/work-performance`와 `src/views/schedule/WorkPerformance.vue`는 이미 존재하므로 route 추가나 navigation 재작업은 하지 않는다.
- **[Layer 1] 기존 Supabase direct-read 패턴을 유지한다.** Phase 2 문서는 organization/employees/shifts/read-only lookup은 기존 Supabase direct read를 유지할 수 있다고 정리한다. 이 화면도 read-only 분석이므로 새 Edge Function을 만들지 않는다.
- **[Layer 1] 기존 공휴일 API helper를 재사용하되 coverage check만 보강한다.** `listPublicHolidayDatesInRange()`는 이미 date-only range read를 제공한다. 이 화면에는 선택 연도 coverage 확인이 필요하므로 같은 API boundary에 `hasPublicHolidayCoverageForYear(year)` 성격의 helper를 추가한다.
- **[Layer 3] "선택 기간 전체 근무자"는 현재 DB에 입퇴사일 컬럼이 없으므로 assignment coverage로 정의한다.** `employees`에는 hire/leave/status 기간 컬럼이 없다. MVP에서는 선택 기간의 모든 날짜에 최종 version assignment row가 있는 직원만 비교 대상에 포함한다.
- **범위 축소:** chart, score label, 별도 상세 drawer, 부서/직급 필터, hospital-specific holiday는 이번 PR에서 제외한다.
- **복잡도 기준:** 권장 write scope는 7개 파일이다. 8개 파일 threshold를 넘지 않고, 새 service/class는 만들지 않는다.

권장 구현 범위:

```text
src/views/schedule/WorkPerformance.vue          # 화면 상태, controls, table 렌더링
src/api/workPerformance.ts                      # read-only Supabase 조회 경계
src/types/workPerformance.ts                    # 화면/계산 전용 타입
src/utils/workPerformanceFairness.ts            # 순수 계산, date-only helper
tests/unit/work-performance.spec.ts             # 화면 상태/interaction
tests/unit/work-performance-fairness.spec.ts    # 계산/정렬/edge cases
tests/unit/work-performance-api.spec.ts         # Supabase query contract
tests/e2e/work-performance.spec.ts              # 주요 사용자 흐름
```

`src/composables/useWorkPerformance.ts`는 이번 MVP에서 만들지 않는다. API boundary와 순수 계산 함수만 분리해도 Vue 파일의 복잡도가 충분히 낮아지고, 추가 composable은 상태 소유권만 늘릴 가능성이 크다.

### What Already Exists

| 기존 자산                                           | 현재 역할                                       | 이번 계획에서의 사용                                 |
| --------------------------------------------------- | ----------------------------------------------- | ---------------------------------------------------- |
| `src/views/schedule/WorkPerformance.vue`            | placeholder 화면                                | 실제 화면으로 교체                                   |
| `src/router/index.ts`                               | `/app/work-performance` route와 admin org guard | 그대로 재사용                                        |
| `src/views/schedule/ScheduleResults.vue`            | page title, loading/error/empty 패턴            | 화면 위계와 상태 copy 패턴 재사용                    |
| `src/api/publicHolidays.ts`                         | `public_holidays` date-only range read          | range read 재사용, year coverage helper 추가         |
| `src/api/schedule.ts`의 pagination 패턴             | `schedule_assignments` 1000 row limit 대응      | assignment/preference 조회에도 같은 pagination 적용  |
| `migrations/007_phase2a_trust_layer_foundation.sql` | `schedule_version_id` source-of-truth 명시      | final version 기준 조회의 근거                       |
| `tests/unit/work-performance.spec.ts`               | placeholder test                                | 실제 화면 test로 갱신                                |
| `tests/e2e/schedule-workflow.spec.ts`               | route smoke coverage                            | 별도 work-performance E2E 추가 또는 route smoke 유지 |

### NOT in Scope

- Edge Function 신설: read-only 분석이고 기존 Supabase direct-read 패턴으로 충분하다.
- DB schema 변경: 입퇴사일/휴직일 컬럼이 없으므로 assignment coverage 기준으로 MVP를 닫는다.
- fairness ledger 재사용: `fairness_ledger_monthly`는 확정 월 단위 ledger이고, 이 화면은 선택 기간 aggregation과 근거 날짜 목록이 필요하다.
- chart 또는 점수화 visualization: 이번 화면의 신뢰 근거는 수치, 평균 대비 delta, 날짜 목록이다.
- 부서/직급/근무형태 필터: 비교 대상 확장 없이 전체 근무자 기준으로 먼저 구현한다.
- 모바일 전용 table 재설계: horizontal scroll 보호만 한다.
- 병원 자체 휴일: 법정공휴일만 사용한다.

### Architecture Review

#### 1. 데이터 조회 경계

`WorkPerformance.vue`에서 여러 Supabase table을 직접 이어 붙이지 않는다. 화면 파일은 조회 상태와 render만 갖고, table별 query는 `src/api/workPerformance.ts`에 둔다.

```text
WorkPerformance.vue
   │
   ├─ loadWorkPerformancePeriod({ organizationId, year, startMonth, endMonth })
   │
   └─ computeWorkPerformanceFairness(input)
         │
         ├─ schedules.finalized_version_id
         ├─ schedule_assignments by finalized version ids
         ├─ schedule_preferences request_code = 'O'
         ├─ employees id/name
         ├─ shifts id/code/name
         └─ public_holidays date-only strings
```

이 구조가 중요한 이유는 공정성 계산이 UI와 섞이면 평균, delta, 제외 대상, 정렬 규칙을 unit test로 막기 어렵기 때문이다.

#### 2. 조회 순서와 차단 상태

구현은 아래 순서를 따른다. 확정 누락, 공휴일 coverage 누락, 비교 대상 없음은 서로 다른 blocker state다.

```text
조회 클릭
  │
  ├─ validate same-year range
  │    └─ invalid -> 조회 button disabled
  │
  ├─ load schedules for selected months
  │    ├─ no finalized schedules at all -> 전체 empty
  │    ├─ any selected month missing finalized_version_id -> 확정 누락
  │    └─ all months finalized -> continue
  │
  ├─ check public holiday coverage for selected year
  │    ├─ 0 rows in selected year -> 공휴일 데이터 없음
  │    └─ at least 1 row in selected year -> continue
  │
  ├─ load assignments/preferences/employees/shifts/holiday range
  │
  ├─ compute rows
  │    ├─ no employee with full assignment coverage -> 비교 대상 없음
  │    └─ rows exist -> 조회 가능
  │
  └─ render summary + threshold + table
```

#### 3. Assignment Coverage 정의

현재 schema에는 직원의 입사일, 퇴사일, 휴직 기간이 없다. 따라서 "선택 기간 전체를 근무하지 않은 직원 제외"는 아래처럼 구현한다.

```text
requiredDates = selected months의 모든 YYYY-MM-DD
employeeCoverage = employee가 finalized assignments에 가진 unique date 수

비교 대상 포함 조건:
employeeCoverage === requiredDates.length
```

주의할 점:

- Off도 확정 근무표의 하루 상태이므로 assignment row가 있으면 coverage에 포함한다.
- assignment row가 빠진 직원은 중도 입사/퇴사/휴직일 수도 있고 데이터 누락일 수도 있다. MVP에서는 모두 비교 대상에서 제외하고, state helper에 제외 인원 수를 표시한다.
- 이 기준은 DB schema 변경 없이 구현 가능한 MVP 정의다. 나중에 입퇴사/휴직 기간이 생기면 이 정의를 교체한다.

#### 4. Date-Only 규칙

공정성 계산에는 JavaScript local timezone `Date` 변환을 사용하지 않는다.

`src/utils/workPerformanceFairness.ts`에 아래 helper를 둔다.

```text
isIsoDate(value)
compareIsoDate(left, right)
listMonthDates(year, month)
listPeriodDates(year, startMonth, endMonth)
getIsoDayOfWeek(date)      # UTC 기준 0-6 또는 순수 알고리즘
formatKoreanMonthDay(date) # "1/3 토"
```

이 helper들은 모두 unit test 대상이다. 특히 `2026-01-01`, `2026-03-01`, `2026-10-09`, 월말, 윤년 `2028-02-29`를 포함한다.

#### 5. Data Access Contract

`src/api/workPerformance.ts`는 `select('*')`를 쓰지 않는다. 필요한 column만 명시한다.

```text
schedules:
  id, month, finalized_version_id
  where organization_id = active org
  where month between selected start/end

schedule_assignments:
  schedule_version_id, employee_id, date, shift_id, shifts(code, name)
  where schedule_version_id in finalizedVersionIds
  where date between selected start/end
  paginated range(0, 999), range(1000, 1999), ...

schedule_preferences:
  schedule_version_id, employee_id, date, request_code
  where schedule_version_id in finalizedVersionIds
  where request_code = 'O'
  where date between selected start/end
  paginated

employees:
  id, name
  where organization_id = active org
  order name

public_holidays:
  holiday_date
  where country_code = 'KR'
  where is_holiday = true
  where date range matches selected period or selected year coverage check
```

보안 경계: route meta는 이미 auth, organization context, admin role을 요구한다. 그래도 API helper는 organization-owned table을 active organization으로 필터링하거나, organization-scoped `schedules`에서 얻은 finalized version id로만 조회해야 한다.

### Code Quality Review

#### Required module boundaries

- `WorkPerformance.vue` owns UI state only: draft period controls, applied period, loading/error/blocker states, threshold, sort, expanded rows.
- `src/api/workPerformance.ts` owns all Supabase query chains and converts raw rows into typed raw input.
- `src/utils/workPerformanceFairness.ts` owns deterministic calculations and has no Vue, router, store, Supabase, or Naive UI import.
- `src/types/workPerformance.ts` owns shared input/output types used by API, utility, and view tests.

#### DRY rules

- Do not duplicate date range generation in the view and tests. Tests should import the same helper only when they assert helper behavior directly; integration tests should assert user-visible output.
- Do not create separate calculation functions for each metric if one metric descriptor can express direction and evidence extraction clearly.
- Do not create a generic analytics framework. This screen has exactly three metrics in MVP.

권장 metric descriptor:

```text
MetricDefinition
  key: 'night' | 'weekendHoliday' | 'offRequestAccepted'
  label: Korean label
  unfavorableDirection: 'aboveAverage' | 'belowAverage'
  collectEvidence(row): YYYY-MM-DD[]
```

이 방식은 세 지표를 명시적으로 유지하면서 평균/최소/최대/delta 계산 로직을 세 번 반복하지 않게 한다.

#### Error handling rules

- Invalid month range is a validation state, not a thrown error.
- Missing finalized month is a blocker state, not an empty table.
- Missing public holiday year coverage is a blocker state, not a warning.
- A Supabase error becomes `조회 실패` with retry.
- Unexpected malformed rows are ignored only if they are non-critical display metadata. Missing `employee_id`, `date`, or `schedule_version_id` in assignments is a load failure because the calculation would be untrustworthy.

### Test Review

감지된 test framework는 `package.json` 기준으로 unit test는 Vitest, E2E는 Playwright다.

#### Code Path Coverage Diagram

```text
CODE PATH COVERAGE
==================
[+] src/api/workPerformance.ts
    │
    ├── loadWorkPerformancePeriod()
    │   ├── [GAP] finalized months query filters by organization/month
    │   ├── [GAP] missing finalized month returns blocker payload
    │   ├── [GAP] assignment pagination continues past 1000 rows
    │   ├── [GAP] preference pagination continues past 1000 rows
    │   ├── [GAP] public holiday year coverage distinguishes "no holidays in range" from "no year data"
    │   └── [GAP] Supabase error maps to Korean load error
    │
    └── normalizeWorkPerformanceRows()
        ├── [GAP] nested shifts object and array shape both normalize
        └── [GAP] malformed required row fails loudly

[+] src/utils/workPerformanceFairness.ts
    │
    ├── listPeriodDates()
    │   ├── [GAP] same-year Jan-Mar range
    │   ├── [GAP] invalid inverted range
    │   └── [GAP] leap day
    │
    ├── computeWorkPerformanceFairness()
    │   ├── [GAP] night count uses shift code N only
    │   ├── [GAP] weekend/holiday count dedupes weekend holiday overlap
    │   ├── [GAP] off request accepted counts requested Off that remained Off
    │   ├── [GAP] requested Off assigned to work is not accepted
    │   ├── [GAP] ordinary Off without request is not counted
    │   ├── [GAP] partial-coverage employee is excluded
    │   ├── [GAP] averages/min/max/max deviation use included employees only
    │   └── [GAP] default fairness sort uses unfavorable deltas only

[+] src/views/schedule/WorkPerformance.vue
    │
    ├── period controls
    │   ├── [GAP] default period prefers latest finalized month
    │   ├── [GAP] invalid start/end disables 조회
    │   └── [GAP] changing controls does not mutate applied result until 조회
    │
    ├── state rendering
    │   ├── [GAP] initial
    │   ├── [GAP] loading with no previous result
    │   ├── [GAP] loading with previous result keeps table
    │   ├── [GAP] finalized missing
    │   ├── [GAP] no finalized schedule
    │   ├── [GAP] no comparison employees
    │   ├── [GAP] public holiday data missing
    │   └── [GAP] load failure + retry
    │
    └── table interactions
        ├── [GAP] threshold 1-10 controls highlight
        ├── [GAP] color is not the only highlighted signal
        ├── [GAP] sortable headers expose aria-sort
        ├── [GAP] detail button toggles aria-expanded
        └── [GAP] expanded evidence dates render empty labels when absent
```

#### User Flow Coverage Diagram

```text
USER FLOW COVERAGE
==================
[+] 관리자 조회 flow
    │
    ├── [GAP] [->E2E] `/app/work-performance` 진입 후 기간 조회 성공
    ├── [GAP] [->E2E] 확정 누락 월이 있으면 table 대신 blocker 표시
    ├── [GAP] [->E2E] threshold 변경 후 강조 셀이 즉시 바뀜
    └── [GAP] [->E2E] 상세 보기 버튼으로 근거 날짜 확인

[+] 접근성 flow
    │
    ├── [GAP] keyboard로 조회, 정렬, 상세 보기 가능
    ├── [GAP] aria-sort가 현재 정렬 방향과 일치
    └── [GAP] aria-expanded가 확장 행 상태와 일치

[+] 장애/복구 flow
    │
    ├── [GAP] 조회 실패 후 다시 시도 성공
    ├── [GAP] 공휴일 연도 coverage 없음은 차단 상태
    └── [GAP] 새 조회 중 이전 결과가 유지되고 "이전 조회 결과" 보조 문구 표시
```

#### Required Tests

Unit test 요구사항:

- `tests/unit/work-performance-fairness.spec.ts`
  - period date list: normal range, inverted range, leap day.
  - weekend/holiday classification: Saturday, Sunday, public holiday, weekend holiday overlap dedupe.
  - metric counting: night, weekend/holiday, Off request accepted, ordinary Off exclusion.
  - partial employee exclusion via assignment coverage.
  - summary stats: average, min, max, max deviation.
  - fairness sort tie-breakers: night, weekend/holiday, Off request shortage.
  - threshold highlight direction: above-average for burden metrics, below-average for Off acceptance.

- `tests/unit/work-performance-api.spec.ts`
  - schedules query filters by `organization_id` and month range.
  - assignments query filters by `schedule_version_id in (...)` and date range.
  - preferences query filters `request_code = 'O'`.
  - assignment/preference pagination reads beyond 1000 rows.
  - holiday coverage query checks selected year separately from selected period.
  - Supabase errors throw one Korean load error consumed by the view.

- `tests/unit/work-performance.spec.ts`
  - replaces placeholder assertions with real screen assertions.
  - initial state, invalid range, loading, success, missing finalized month, no finalized schedule, no comparison employees, public holiday missing, load failure.
  - query button applies draft controls.
  - threshold input clamps 1-10.
  - highlighted cells include visible delta and accessible description.
  - expand/collapse preserves focus and updates `aria-expanded`.

E2E test 요구사항:

- `tests/e2e/work-performance.spec.ts`
  - route is accessible from top navigation.
  - successful mock data renders summary metrics and table as primary surface.
  - missing finalized month blocks calculation.
  - threshold change updates highlighted cells.
  - detail expansion shows evidence dates.

Regression test:

- 기존 placeholder test의 "준비 중입니다" assertion은 제거하거나 실제 화면 assertion으로 다시 작성한다. 그대로 두면 새 구현이 잘못된 이유로 실패한다.
- Route smoke tests in `tests/e2e/app-shell-top-navigation.spec.ts` should continue to assert navigation to `/app/work-performance`, but should not assert placeholder content.

### Performance Review

MVP 예상 규모는 크지 않지만, 구현은 Supabase 기본 1000 row limit에 의존하면 안 된다.

```text
30 employees x 31 days x 3 months = 2,790 assignment rows
30 employees x 36 days x 3 months = 3,240 rows if prior-month generation context leaks in
```

규칙:

- All assignment and preference reads must use pagination or explicit `.range()` loops.
- Query only selected months and finalized version ids. Do not load all historical assignments for the organization.
- Build maps once:
  - `shiftCodeById`
  - `employeeById`
  - `assignmentsByEmployeeDate`
  - `offRequestDatesByEmployee`
  - `holidayDateSet`
- Summary metrics must be computed in one pass over included employees.
- Expanded evidence rows can be precomputed with the row. Lazy recomputation on every expansion is unnecessary for MVP.
- No client-side caching is required. The user manually clicks `조회`, and selected-period data is modest.

### Failure Modes

| Codepath                  | Production failure                                   | Test coverage required | Error handling            | User-visible result                                 |
| ------------------------- | ---------------------------------------------------- | ---------------------- | ------------------------- | --------------------------------------------------- |
| finalized schedule lookup | one selected month has no `finalized_version_id`     | yes                    | blocker state             | `선택한 기간에 아직 확정되지 않은 월이 있습니다`    |
| assignment read           | more than 1000 rows but only first page loaded       | yes                    | pagination                | no silent truncation                                |
| assignment normalization  | required `date` or `employee_id` missing             | yes                    | fail load                 | `근무 실적을 불러오지 못했습니다`                   |
| public holiday range      | selected month has no holiday rows but year has rows | yes                    | allow calculation         | normal result                                       |
| public holiday coverage   | selected year has zero rows                          | yes                    | blocker state             | `공휴일 데이터 없음`                                |
| date calculation          | timezone shifts date by one day                      | yes                    | date-only helper          | no Date local conversion                            |
| employee inclusion        | employee missing assignment rows for some dates      | yes                    | exclude from comparison   | comparison empty or helper copy with excluded count |
| Off request accepted      | ordinary Off counted as accepted request             | yes                    | request set intersection  | correct Off request metric                          |
| load retry                | first query fails, retry succeeds                    | yes                    | retry button resets error | result appears without stale error                  |
| threshold control         | 0 threshold highlights every cell                    | yes                    | clamp/validation 1-10     | no noisy all-highlight state                        |

이 문서 업데이트 이후 남은 critical silent gap은 없다. 위험 경로는 모두 명시적 test 요구사항으로 전환했다.

### Implementation Order

1. Add `src/types/workPerformance.ts` with raw rows, calculation input, metric summary, employee result row, and UI state types.
2. Add `src/utils/workPerformanceFairness.ts` with date-only helpers and pure calculation.
3. Add `tests/unit/work-performance-fairness.spec.ts` first and make the calculation pass.
4. Add `src/api/workPerformance.ts` with explicit Supabase selects and pagination.
5. Add `tests/unit/work-performance-api.spec.ts` with query-chain mocks.
6. Replace `WorkPerformance.vue` placeholder with the actual screen.
7. Rewrite `tests/unit/work-performance.spec.ts`.
8. Add `tests/e2e/work-performance.spec.ts` for the primary admin flow.

이 순서는 구조 변경과 동작 변경을 review 가능한 단위로 분리한다. 또한 계산 contract가 test로 잠기기 전에 UI부터 만드는 일을 막는다.

### Implementation Completion Checklist

- `pnpm test:unit -- tests/unit/work-performance-fairness.spec.ts tests/unit/work-performance-api.spec.ts tests/unit/work-performance.spec.ts`
- `pnpm lint:check`
- `pnpm run build`
- `pnpm test:e2e -- tests/e2e/work-performance.spec.ts`
- After implementation, run screenshot-based `/design-review` on `/app/work-performance`.

### plan-eng-review Completion Summary

```text
+====================================================================+
|          ENGINEERING PLAN REVIEW — COMPLETION SUMMARY              |
+====================================================================+
| Step 0: Scope Challenge      | scope accepted with module boundary  |
| Architecture Review          | 5 issues found, all resolved in plan |
| Code Quality Review          | 3 issues found, all resolved in plan |
| Test Review                  | coverage diagram produced, 33 gaps   |
| Performance Review           | 1 issue found, pagination required   |
| NOT in scope                 | written                              |
| What already exists          | written                              |
| TODOS.md updates             | 0 items proposed; plan captures work |
| Failure modes                | 0 critical silent gaps after update  |
| Outside voice                | skipped for document-only pass       |
| Lake Score                   | 9/9 recommendations chose complete   |
+====================================================================+
```

위 test를 기능 구현과 함께 작성하면 이 계획은 engineering-ready 상태다.

---

## plan-design-review Completion Summary

```text
+====================================================================+
|         DESIGN PLAN REVIEW — COMPLETION SUMMARY                    |
+====================================================================+
| System Audit         | DESIGN.md exists; UI scope is APP UI         |
| Step 0               | initial rating 6/10; focus on UI specifics   |
| Pass 1  (Info Arch)  | 5/10 -> 9/10 after hierarchy + diagram       |
| Pass 2  (States)     | 4/10 -> 9/10 after state matrix              |
| Pass 3  (Journey)    | 5/10 -> 9/10 after journey storyboard        |
| Pass 4  (AI Slop)    | 7/10 -> 9/10 after anti-slop constraints     |
| Pass 5  (Design Sys) | 6/10 -> 9/10 after DESIGN.md alignment       |
| Pass 6  (Resp/A11y)  | 4/10 -> 8.5/10 after responsive/a11y rules   |
| Pass 7  (Decisions)  | 6 resolved, 0 deferred                       |
+--------------------------------------------------------------------+
| NOT in scope         | written (5 design items)                     |
| What already exists  | written                                     |
| TODOS.md updates     | 0 items proposed; no TODOS.md exists         |
| Decisions made       | 6 added to plan                              |
| Decisions deferred   | 0                                            |
| Overall design score | 6/10 -> 9/10                                 |
+====================================================================+
```

Plan is design-complete for implementation planning. Run `/design-review` after implementation for visual QA.

## GSTACK REVIEW REPORT

| Review        | Trigger               | Why                             | Runs | Status | Findings                                                          |
| ------------- | --------------------- | ------------------------------- | ---- | ------ | ----------------------------------------------------------------- |
| CEO Review    | `/plan-ceo-review`    | Scope & strategy                | 0    | —      | —                                                                 |
| Codex Review  | `/codex review`       | Independent 2nd opinion         | 0    | —      | —                                                                 |
| Eng Review    | `/plan-eng-review`    | Architecture & tests (required) | 3    | clean  | latest: document strengthened, 9 issues resolved, 0 critical gaps |
| Design Review | `/plan-design-review` | UI/UX gaps                      | 3    | clean  | latest score: 6/10 -> 9/10, 6 decisions                           |

- **UNRESOLVED:** 0 unresolved decisions after this document update.
- **VERDICT:** DESIGN + ENG PLAN CLEARED — ready to implement with the required test coverage above.
