# Landing Product Preview Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 공개 랜딩의 제품 프리뷰를 실제 EveryShift 간호사 근무표 생성/검토 흐름을 보여주는 안정적인 랜딩용 축약 UI로 재설계한다.

**Architecture:** 정적 랜딩 copy와 정적 mock product preview를 유지하고, 공개 랜딩 view에서 섹션 레이아웃과 progressive-enhancement reveal 상태만 관리한다. 실제 solver, Supabase, Step5/WorkPerformance production data에는 연결하지 않는다.

**Tech Stack:** Vue 3 `<script setup>`, TypeScript, Vite, Tailwind CSS, Vue Test Utils/Vitest, Playwright.

---

# Landing Product Preview 개선 계획

> **상태:** 계획 문서  
> **대상:** 공개 랜딩 페이지의 제품 프리뷰 영역  
> **코드 수정:** 이 문서는 구현 계획만 정의하며 코드 변경을 포함하지 않는다.
> **디자인 검토:** `/design-consultation` 관점 보강 완료

## 1. 목표

`src/components/public/LandingProductPreview.vue`와 공개 랜딩 섹션을 실제 EveryShift 제품 흐름에 맞는 “랜딩용 단순화 프리뷰”로 개선한다. 프리뷰는 장식용 이미지가 아니라 “이 제품이 실제로 어떤 업무를 해결하는지 보여주는 증거” 역할을 해야 한다.

현재 프리뷰는 제품 화면과 다른 요소가 섞여 있고, 랜딩 섹션은 데스크톱에서 왼쪽 텍스트/오른쪽 이미지 구조로 되어 있어 모바일에서 화면이 깨지기 쉽다. 개선 후에는 Toss 메인 페이지처럼 스크롤 흐름에 따라 짧은 메시지와 대응 프리뷰가 순서대로 읽히되, 첫 구현은 안정적인 섹션별 fade-up 방식으로 제한한다.

## 2. 디자인 검토 결론

현재 계획의 방향은 맞다. 좌우 분할을 없애고 `위 텍스트 / 아래 프리뷰` 구조로 바꾸는 것은 모바일 안정성과 메시지 집중도에 모두 유리하다.

다만 계획만으로는 구현자가 “예쁜 mock 카드”를 만들 위험이 있다. EveryShift 랜딩은 일반 SaaS 소개 페이지가 아니라 병원 근무표 운영 도구의 첫 신뢰 화면이다. 따라서 아래 기준을 명확히 추가한다.

- 프리뷰는 실제 제품의 업무 순서를 압축해야 한다.
- 화면은 `DESIGN.md`의 “calm operational product with a restrained brand layer” 방향을 따른다.
- 색은 slate/teal 기반의 절제된 운영 UI를 기본으로 하고, D/E/N/O 색상은 shift 의미에만 사용한다.
- 첫 viewport는 “간호사 근무표 생성 제품”이라는 신호가 즉시 보여야 한다.
- 공정성은 단일 월 최적화가 아니라 확정 이력 기반의 누적/rolling 관리로 보여야 한다.
- 고급 scrollytelling은 이번 범위에서 제외하되, 섹션별 reveal 상태와 reduced motion 대응은 구현 범위에 포함한다.

## 3. 기준 문서와 용어 정리

### 3.1 기준 문서

- `DESIGN.md`: 시각 방향, 색, 타이포그래피, spacing, motion 기준
- `docs/prd/PHASE2_PRD_KR.md`: 결과 신뢰성, 공정성, Step5 review/finalization 방향
- `README.md`: 공개 설명과 Phase1 MVP 범위
- 현재 구현 파일:
  - `src/views/PublicLandingView.vue`
  - `src/components/public/LandingProductPreview.vue`
  - `src/data/publicLandingContent.ts`
  - `src/views/schedule/Step5Result.vue`
  - `src/views/schedule/WorkPerformance.vue`

### 3.2 Step 명칭

문서와 코드의 명칭이 섞여 있다.

- Phase1/README 기준: 결과 확인과 수정은 Step 4
- 현재 라우트/코드 기준: 결과 리뷰 화면은 `Step5Result.vue`

이 계획에서는 구현 파일을 말할 때는 `Step5Result.vue`, 사용자에게 보이는 제품 흐름을 말할 때는 “결과 확인/수정” 또는 “결과 리뷰”라고 쓴다. 랜딩 카피에는 `Step5` 같은 내부 명칭을 노출하지 않는다.

## 4. 결정 사항

- 프리뷰 방식은 “실제 앱 화면 기반 + 랜딩용 단순화”로 한다.
- 기존 5개 가치 섹션은 유지한다.
- 히어로의 `overview` 프리뷰도 함께 개선한다.
- 랜딩 섹션 구조는 `위 텍스트 / 아래 프리뷰`로 변경한다.
- 모바일에서는 좌우 분할 레이아웃을 제거하고 세로 흐름으로 표시한다.
- 스크롤 인터랙션은 섹션 진입 시 텍스트가 먼저, 프리뷰가 이어서 나타나는 fade-up 방식으로 한다.
- sticky 기반의 Toss 유사 고급 scrollytelling은 이번 범위에서 제외한다.
- 정적 이미지 파일을 새로 추가하지 않고 Vue/Tailwind 기반 mock UI 프리뷰로 구현한다.
- user-facing UI 문구는 Korean을 유지한다.
- 프리뷰는 새 기능을 암시하지 않는다. 현재 제품 또는 Phase2 PRD에 정의된 흐름만 압축해서 보여준다.
- `LandingPreviewVariant` union 값은 유지한다. variant 이름이 `compare`여도 화면 내용은 “유연한 운영” 메시지에 맞춰 수동 수정, 재검증, 저장, Excel 내보내기를 중심으로 구성한다.

## 5. 디자인 방향

### 5.1 Aesthetic

- 방향: 차분한 병원 운영 도구
- 장식 수준: intentional, not expressive
- 레이아웃: 제품 화면을 넓게 보여주는 disciplined grid
- 색: slate/teal 중심, semantic status 색만 보조적으로 사용
- 타이포그래피: 기존 `DESIGN.md`의 Pretendard 계열 전제 유지
- motion: minimal-functional

### 5.2 Safe Choices

사용자가 병원 운영 도구에서 기대하는 기준이다.

- 표, 상태 배지, 요약 수치, 검증 결과처럼 업무 판단에 익숙한 UI 형태를 유지한다.
- CTA와 섹션 메시지는 과장된 마케팅 문구보다 “무엇을 할 수 있는지”를 먼저 말한다.
- 프리뷰는 실제 앱처럼 보이되, 랜딩에서는 30명 x 36일 전체 그리드를 보여주지 않고 핵심 패턴만 압축한다.

### 5.3 Risks

이 제품이 흔한 SaaS 랜딩처럼 보이지 않기 위해 감수할 디자인 리스크다.

- **제품 화면을 크게 노출한다.** 일반 랜딩보다 장식성이 줄어들 수 있지만, EveryShift가 실제 업무 도구라는 신뢰를 더 빨리 만든다.
- **문구를 짧고 운영적으로 유지한다.** 감성적인 브랜드 카피는 약해질 수 있지만, 수간호사/운영자가 이해해야 할 핵심이 선명해진다.
- **히어로 프리뷰를 단순한 hero image가 아니라 업무 요약판으로 만든다.** 구현 난이도는 조금 올라가지만, 첫 화면에서 제품의 정체가 즉시 드러난다.

## 6. 프리뷰 매핑

| Variant      | 랜딩 섹션       | 대표할 실제 제품 화면                     | 프리뷰 방향                                                         | 반드시 보여줄 신뢰 신호                                       |
| ------------ | --------------- | ----------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------- |
| `overview`   | 히어로          | 결과 확인/수정 흐름 (`Step5Result.vue`)   | Off 요청, AI 생성, 가이드라인 점검, Excel 내보내기를 한 장으로 압축 | “근무표 생성 도구”라는 정체성, 생성 완료 상태, 검토 필요 상태 |
| `ai`         | 자동 완성       | 생성 결과 확인                            | 생성 상태, 진행률, 결과 그리드 중심                                 | 30명/36일 범위, 전월 5일 참고, 요일별 필요 인력               |
| `conditions` | 조건 반영       | Off 요청 반영 결과/미반영 사유            | Off 요청 목록, 반영/미반영 상태, 미반영 사유, Excel 입력/출력 문맥  | 요청이 무시되지 않고 이유가 남는다는 점                       |
| `guide`      | 가이드라인 점검 | 검증/위반 요약                            | 연속 야간, 야간 후 휴식, NOD, 필요 인력 충족 상태                   | 위반이 있으면 확정 전에 드러난다는 점                         |
| `compare`    | 유연한 운영     | 결과 수동 수정/저장/재검증/Excel 다운로드 | 후보안 비교보다 수정 후 검증 상태와 내보내기 중심                   | 수정 후 `재검증 필요` 상태가 보인다는 점                      |
| `fairness`   | 공정성 관리     | `WorkPerformance.vue`                     | 기간별 rolling 공정성, 평균/최소/최대, 확인 필요 직원 요약          | 확정 이력 기반 누적 비교라는 점                               |

## 7. 구현 계획

### 7.1 `src/views/PublicLandingView.vue`

- `publicLandingSections` 반복 섹션의 현재 `lg:grid-cols-[0.9fr_1.1fr]` 좌우 구조를 제거한다.
- 각 섹션 내부를 텍스트 블록과 프리뷰 블록이 세로로 쌓이는 구조로 바꾼다.
- 데스크톱에서는 텍스트를 제한 폭으로 두고, 프리뷰는 아래에 넓게 배치한다.
- 텍스트는 기본적으로 좌측 정렬한다. 중앙 정렬은 히어로에만 제한적으로 사용한다.
- 모바일에서는 모든 콘텐츠가 viewport 폭 안에 들어오도록 `w-full`, `max-w-*`, `overflow-hidden` 중심으로 정리한다.
- 히어로 `overview` 프리뷰는 `max-height`로 핵심 정보를 잘라내지 않는다. 필요하면 `aspect-ratio`와 내부 축약 레이아웃으로 높이를 제어한다.
- `IntersectionObserver`를 사용해 섹션 진입 상태를 관리한다.
- reveal 순서는 텍스트 먼저, 프리뷰는 약간 늦게 표시되도록 한다.
- `prefers-reduced-motion`에서는 transform 기반 animation 없이 즉시 표시한다.
- reveal 전에도 DOM에는 콘텐츠가 존재해야 한다. animation 실패가 blank section으로 이어지면 안 된다.
- CTA와 header 동작은 기존 공개 랜딩 라우팅을 유지한다.

### 7.2 `src/components/public/LandingProductPreview.vue`

- 외부 인터페이스는 유지한다.
  - `variant` prop 유지
  - `LandingPreviewVariant` 값 유지
- 내부 mock UI를 실제 제품 화면 흐름에 맞춰 재작성한다.
- 프리뷰 내부의 큰 `min-width` 값이 모바일에서 부모를 밀지 않도록 조정한다.
- 모든 프리뷰는 실제 앱 용어를 유지하되, 랜딩에서 한눈에 읽히는 예시 데이터로 단순화한다.
- `compare` variant는 이름은 유지하지만, 시각 내용은 “유연한 운영”에 맞게 수동 수정과 Excel 다운로드 중심으로 변경한다.
- `fairness` variant는 `src/views/schedule/WorkPerformance.vue`의 실제 화면 구조를 참고해 기간 선택, 요약 카드, 직원별 비교, 확인 필요 요약을 압축한다.
- 모든 row key는 사용자에게 보이는 이름/날짜 조합이 아니라 안정적인 id를 사용한다.
- 표 셀과 badge는 글자가 잘리지 않도록 `min-w-0`, `truncate` 사용 여부를 variant별로 확인한다.
- 카드 안의 카드를 과하게 중첩하지 않는다. 같은 프리뷰 안에서는 “상단 상태 바 + 주요 업무 패널 + 보조 요약” 정도로 계층을 제한한다.
- D/E/N/O shift 색은 `DESIGN.md`의 shift token 의미를 유지한다. 야간(N)을 일반 장식용 violet으로 쓰지 않는다.
- 상태 색은 semantic 의미에만 사용한다.
  - 성공/완료: teal/green 계열
  - 검토 필요: amber
  - 차단/미반영: red/rose
  - 정보: blue
- 프리뷰는 실제 데이터를 읽지 않는다. 정적 mock 데이터로 유지한다.

### 7.3 `src/data/publicLandingContent.ts`

- 5개 섹션은 유지한다.
- hero 문구는 제품 정체가 바로 드러나도록 보강한다.
  - 현재처럼 추상적인 브랜드 문구만 두면 제품 카테고리가 늦게 이해된다.
  - 예: “간호사 근무표 생성부터 검토까지”처럼 실제 업무를 먼저 말한다.
- `fairness-management` 문구는 “특정 월만 맞추는 것이 아니라 기간별/누적 기준으로 균형을 확인한다”는 방향으로 보강한다.
- `flexible-operations` 문구는 실제 제공 범위에 맞게 수동 수정, 저장, Excel 내보내기 중심으로 정리한다.
- `ai-schedule` 문구는 실제 solver가 mock/단계적 연동이라는 구현 현실을 넘어서지 않도록 “자동 완성 흐름”과 “검토 가능한 결과”에 초점을 둔다.
- `guide-check` 문구는 “보건복지부 가이드라인을 완전히 보장”처럼 법적 보증으로 읽히는 표현을 피하고, “위반 여부를 확인하고 확정 전에 막는다”는 제품 기능으로 표현한다.
- 과장되거나 현재 MVP 범위를 넘어서는 표현은 피한다.

### 7.4 테스트 파일

- `tests/unit/public-landing.spec.ts`
  - hero copy 변경 반영
  - 5개 섹션 anchor와 CTA 유지 확인
  - `flexible-operations`, `fairness-management`의 메시지 방향 확인
  - `landing-product-preview`가 6개 variant를 모두 렌더링하는지 확인
- `tests/e2e/public-launch.spec.ts`
  - 공개 랜딩 라우팅 유지
  - 모바일 viewport 가로 스크롤 방지
  - CTA 링크 유지

## 8. Variant별 상세 기준

### 8.1 `overview`

- 히어로 첫 화면에서 제품 화면 역할을 한다.
- 한 화면에 너무 많은 카드를 넣지 말고 아래 4가지만 압축한다.
  - 생성된 근무표 일부
  - Off 요청 반영 현황
  - 가이드라인 점검 상태
  - Excel 다운로드 또는 확정 전 검토 상태
- “AI 생성 근무표” 같은 내부 결과 제목은 유지하되, `검토 필요`, `확정 가능`, `Excel 준비`처럼 업무 상태가 같이 보여야 한다.

### 8.2 `ai`

- 생성 진행률을 단순 progress bar로만 보여주지 않는다.
- 병동 기준, 전월 5일, 30명/36일 범위가 생성 근거로 보이게 한다.
- 결과 그리드는 실제 전체가 아니라 3-4명 x 5-7일 정도로 축약한다.

### 8.3 `conditions`

- Off 요청이 반영된 항목과 미반영 항목을 같이 보여준다.
- 미반영 사유가 있어야 한다.
- “요청 반영률”만 크게 보여주면 요청이 기계적으로 처리된 것처럼 보일 수 있으므로, 사유와 검토 상태를 같이 둔다.

### 8.4 `guide`

- 검증 항목은 실제 사용자가 이해할 수 있는 이름을 쓴다.
  - 연속 야간
  - 야간 후 휴식
  - NOD
  - 필요 인력
- 위반 항목은 색만으로 구분하지 않고 텍스트 label도 둔다.
- 확정 gate와 연결되는 느낌을 준다.

### 8.5 `compare`

- 현재 variant 이름은 유지하지만, 시각 메시지는 후보안 비교보다 “수정 가능한 결과 운영”에 둔다.
- 최소 상태 흐름:
  - 결과 직접 수정
  - 저장됨
  - 재검증 필요 또는 재검증 완료
  - Excel 내보내기
- 여러 버전 비교는 과장하지 않는다. 비교 기능을 보여줄 경우 `근무표안 비교` modal의 보조 기능처럼만 표현한다.

### 8.6 `fairness`

- `WorkPerformance.vue`의 실제 개념을 축약한다.
  - 기간 선택
  - 전체 평균
  - 최소/최대
  - 평균과의 차이
  - 확인 필요 직원
  - 야간, 주말·휴일, Off 요청 수락
- “이번 달 공정성 점수”처럼 단일 점수화하지 않는다.
- 확정된 근무표 기준의 누적 비교라는 문맥을 보여준다.

## 9. 세부 UX 기준

- 제품 프리뷰는 카드 안의 카드가 과하게 중첩되지 않도록 한다.
- 텍스트가 버튼, 배지, 표 셀 안에서 잘리지 않도록 한다.
- 프리뷰는 모바일에서 가로 스크롤을 만들지 않아야 한다.
- 표 형태가 필요한 경우 실제 30명 x 36일 전체를 보여주지 않고 핵심 행/열만 압축해서 보여준다.
- 결과 확인/수정 화면의 실제 용어를 사용한다.
  - 예: `Off 요청`, `근무표 생성(AI)`, `가이드라인 점검`, `Excel 다운로드`, `확정`, `검토 필요`
- 공정성 관리는 특정 월 결과 최적화처럼 보이지 않게 한다.
  - 기간별 조회
  - rolling 누적
  - 전체 평균과의 차이
  - 확인 필요 직원
  - 야간, 주말·휴일, Off 요청 수락 지표
- 제품 프리뷰의 표/패널은 “실제 앱의 축소판”처럼 보여야 한다. 랜딩 전용 장식 도형이나 의미 없는 그래프는 추가하지 않는다.
- Public landing에서는 `DESIGN.md`의 public surface 규칙을 따른다.
  - 긴 중앙 정렬 문단 지양
  - 3-column icon grid 지양
  - gradient-heavy hero 지양
  - tonal panel, subtle gridline, restrained background block 우선

## 10. Responsive 기준

| Viewport        | 기대 동작                                                                                                |
| --------------- | -------------------------------------------------------------------------------------------------------- |
| 390px mobile    | 모든 섹션이 한 열로 표시되고, body/document에 가로 스크롤이 생기지 않는다. CTA는 접히거나 잘리지 않는다. |
| 768px tablet    | 텍스트와 프리뷰가 세로 흐름을 유지하되, 프리뷰 내부는 2-column 보조 패널을 사용할 수 있다.               |
| 1280px+ desktop | 각 섹션은 `위 텍스트 / 아래 프리뷰` 구조를 유지하고, 프리뷰가 충분히 넓게 보여 제품 화면처럼 읽힌다.     |

모바일에서 full Step3/Step5 화면을 축소해 억지로 보여주지 않는다. 랜딩 프리뷰는 별도 축약 레이아웃이다.

## 11. Motion 기준

- IntersectionObserver는 섹션별 reveal 상태만 관리한다.
- 텍스트 reveal: opacity 0 -> 1, translateY 12-16px 정도
- 프리뷰 reveal: 텍스트보다 80-140ms 늦게 시작
- duration: `DESIGN.md`의 short/medium 범위인 160-320ms 안에서 제한
- easing: enter는 `ease-out`
- `prefers-reduced-motion: reduce`에서는 opacity/transform transition 없이 즉시 표시
- 스크롤 위치에 따라 프리뷰가 frame-by-frame으로 변하는 sticky scrollytelling은 제외한다.

## 12. Accessibility 기준

- reveal animation은 콘텐츠 접근성을 막지 않아야 한다.
- 필수 정보는 색만으로 전달하지 않는다.
- preview 내부가 실제 버튼처럼 보이는 요소를 포함하더라도 랜딩용 mock이면 interactive affordance를 과하게 주지 않는다.
- 실제 CTA는 keyboard focus가 보여야 한다.
- 모바일에서 preview가 잘리더라도 CTA와 본문 이해에는 영향이 없어야 한다.

## 13. 테스트 및 검증 계획

코드 구현 후 아래를 실행한다.

```bash
pnpm lint:check
pnpm run build
pnpm test:unit -- tests/unit/public-landing.spec.ts
pnpm test:e2e -- --no-deps tests/e2e/public-launch.spec.ts
```

브라우저 QA에서 확인할 항목:

- 390px 모바일 viewport에서 가로 스크롤이 생기지 않는다.
- 390px 모바일 viewport에서 hero preview가 CTA나 본문을 밀어내지 않는다.
- 태블릿과 데스크톱에서 모든 섹션이 `위 텍스트 / 아래 프리뷰` 구조로 보인다.
- 각 섹션 진입 시 텍스트가 먼저, 프리뷰가 이어서 자연스럽게 나타난다.
- reduced motion 환경에서도 콘텐츠가 숨겨지지 않는다.
- 히어로 `overview` 프리뷰가 EveryShift의 근무표 생성 도구 성격을 즉시 전달한다.
- 각 variant preview가 실제 제품 흐름과 맞지 않는 기능을 암시하지 않는다.
- 공정성 프리뷰가 “기간별 rolling 관리”로 이해된다.
- D/E/N/O shift 색상이 일반 장식 색으로 오해되지 않는다.
- CTA와 공개 랜딩 라우팅은 기존처럼 동작한다.

## 14. 제외 범위

- 실제 solver 연동 변경
- Supabase schema/API 변경
- 결과 확인/수정 실제 업무 화면 기능 변경
- 신규 이미지 asset 추가
- sticky scrollytelling 구현
- 모바일 전용 별도 페이지 구현
- 조직/직원/시프트 CRUD 추가
- `DESIGN.md` 전역 토큰 마이그레이션
- Naive UI theme 전역 재정렬

## 15. 구현 시 주의 사항

- `LandingPreviewVariant` 타입 변경은 피한다.
- `data-test="public-landing"`, `data-test="public-value-section"`, `data-test="landing-product-preview"`는 유지한다.
- Naive UI 메시지 API나 전역 message 사용 변경은 필요 없다.
- 랜딩 프리뷰는 실제 데이터를 읽지 않는 정적 mock UI로 유지한다.
- 구현 후 lint/build 실패가 있으면 완료로 보지 않는다.
- touched component에서 새 raw gray/slate 조합을 무분별하게 늘리지 않는다.
- 이번 PR에서 전역 token 작업을 하지 않더라도, 프리뷰 내부 색상은 `DESIGN.md` 방향과 어긋나지 않게 제한한다.
- 새로운 animation class가 test 환경에서 콘텐츠를 숨긴 상태로 남지 않도록 초기 상태와 mounted 상태를 분리한다.

## 16. 완료 기준

- 공개 랜딩 첫 화면에서 제품 카테고리와 핵심 업무가 3초 안에 이해된다.
- 모든 value section이 같은 구조로 읽히며, 모바일에서도 깨지지 않는다.
- 6개 preview variant가 실제 제품 흐름의 축약판으로 보인다.
- 공정성 preview가 누적/rolling 관리로 읽힌다.
- copy가 현재 MVP/Phase2 범위를 넘어서지 않는다.
- lint, build, public landing unit test, public launch e2e가 통과한다.

## 17. Plan Design Review 보강

### 17.1 Review Summary

`/plan-design-review` 관점의 초기 평가는 **7/10**이다.

좋은 점:

- 제품 프리뷰를 실제 업무 흐름에 맞추려는 방향이 명확하다.
- `DESIGN.md`의 차분한 운영 도구 방향을 이미 반영했다.
- 모바일 가로 스크롤, reduced motion, MVP 범위 초과 표현을 경계하고 있다.

10/10이 되려면 아래가 추가로 명시되어야 한다.

- 사용자가 첫 화면에서 무엇을 1st/2nd/3rd로 보는지
- 각 섹션이 어떤 한 가지 일을 하는지
- loading/empty/error/success/partial 상태에서 실제로 무엇이 보이는지
- 프리뷰가 카드 모음처럼 보이지 않게 하는 구체적인 레이아웃 규칙
- 모바일/태블릿/데스크톱별 의도적 구조
- keyboard, screen reader, contrast, touch target 기준

아래 보강을 반영한 후 목표 디자인 완성도는 **9/10**이다. 남은 1점은 구현 후 실제 화면 캡처를 보고 spacing, crop, hierarchy를 조정해야만 확정할 수 있다.

### 17.2 What Already Exists

구현자는 새 시각 체계를 만들지 말고 아래 기존 자산을 재사용한다.

| Existing asset                                    | Reuse decision                                                |
| ------------------------------------------------- | ------------------------------------------------------------- |
| `DESIGN.md`                                       | 모든 색, 타이포그래피, spacing, motion 판단의 기준            |
| `src/views/PublicLandingView.vue`                 | 공개 랜딩의 라우팅, CTA, header/inquiry 구조 유지             |
| `src/components/public/LandingProductPreview.vue` | variant prop API와 `data-test="landing-product-preview"` 유지 |
| `src/data/publicLandingContent.ts`                | 5개 value section과 anchor id 유지                            |
| `src/views/schedule/Step5Result.vue`              | 결과 확인/수정/재검증/Excel 문맥의 실제 제품 기준             |
| `src/views/schedule/WorkPerformance.vue`          | 누적 공정성, 기간 조회, 평균/최소/최대, 확인 필요 직원 기준   |
| `tests/unit/public-landing.spec.ts`               | 랜딩 copy, CTA, preview language regression 기준              |
| `tests/e2e/public-launch.spec.ts`                 | 공개 랜딩 route/CTA smoke 기준                                |

### 17.3 Information Architecture

랜딩은 hybrid surface다. Hero와 value copy는 landing page처럼 작동하지만, 프리뷰 내부는 app UI처럼 읽혀야 한다.

Hierarchy:

1. **Hero:** EveryShift가 무엇인지, 누구의 어떤 일을 줄이는지
2. **Hero preview:** 실제 근무표 생성/검토 도구라는 증거
3. **Value sections:** 자동 완성 -> 조건 반영 -> 가이드라인 점검 -> 유연한 운영 -> 공정성 관리
4. **Inquiry CTA:** 관심 사용자가 다음 행동을 할 수 있는 단일 출구

First viewport structure:

```text
PublicHeader
└─ Hero section
   ├─ Product category cue: 간호사 근무표 생성/검토
   ├─ Headline: one clear promise, two lines maximum
   ├─ Supporting line: outcome + trust cue, one sentence
   ├─ CTA group: 회원 가입 / 도입 문의
   └─ Overview preview
      ├─ generated schedule slice
      ├─ off request status
      ├─ guideline status
      └─ export/final review status
```

Value section structure:

```text
Value section
├─ Short section label
├─ One headline
├─ One supporting paragraph
├─ 2-3 proof bullets, no generic feature list
└─ Wide product preview
   ├─ primary state or work surface
   └─ one supporting proof panel
```

Constraint rule:

- Hero preview may show only 4 proof elements.
- Value preview may show only 1 primary work surface and 1 secondary context area.
- If a preview needs more than 2 nested visual levels, cut content before adding another card.

### 17.4 Interaction State Coverage

Even though the preview is static mock UI, implementation still needs visible states. These states prevent reveal animation, viewport cropping, or config errors from becoming blank sections.

| Feature               | Loading                                                              | Empty                                                                          | Error                                                                         | Success                                              | Partial / Transitional                                                     |
| --------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------- |
| Public landing shell  | Header, hero copy, and CTA render immediately; no full-page skeleton | Not applicable                                                                 | Preserve hero and CTA; failing preview area shows a quiet fallback panel      | CTA remains visible and clickable                    | If preview render is delayed, reserve stable height to prevent layout jump |
| Intersection reveal   | Content exists in DOM before animation starts                        | Not applicable                                                                 | If observer is unavailable, all sections render visible                       | Text appears first, preview follows                  | `prefers-reduced-motion` skips transform/opacity transition                |
| Hero overview preview | Use static mock rows; no async dependency                            | If mock rows are unavailable, show one compact schedule row and status summary | Show tonal fallback: `제품 프리뷰를 표시하지 못했습니다` without blocking CTA | Shows generated schedule + review/export state       | Keep height stable while viewport changes                                  |
| Value section preview | Static variant renders with section content                          | If a variant has no rows, show a product-specific empty proof, not blank space | Fallback panel names the missing variant and keeps section copy visible       | Variant reinforces the section headline              | Long labels truncate only secondary metadata, never status meaning         |
| CTA group             | Buttons render with normal focus state                               | Not applicable                                                                 | Inquiry URL config failure should not hide signup CTA                         | Signup and inquiry destinations remain unchanged     | Buttons wrap to two rows on mobile without overlap                         |
| Fairness preview      | Static rolling sample renders                                        | If no confirmed history exists in mock, show “확정 이력 기준으로 표시됩니다”   | Fallback preserves explanation of cumulative fairness                         | Shows period, average, min/max, and check-needed row | Do not imply live calculation or real data                                 |

### 17.5 User Journey Storyboard

| Step | User does              | User feels                                             | Plan must support it                                                                   |
| ---- | ---------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| 1    | Lands on `/`           | “이게 우리 병동 근무표 문제를 다루는 제품인가?”        | Hero headline and overview preview must say nurse scheduling, not generic productivity |
| 2    | Scans first preview    | “실제 화면이 있네. 장난감 랜딩은 아니네.”              | Preview shows schedule grid, Off request status, guideline check, export/review status |
| 3    | Scrolls value sections | “어떤 순서로 업무가 처리되는지 알겠다.”                | Sections follow workflow order: 생성 -> 조건 -> 점검 -> 수정/운영 -> 누적 공정성       |
| 4    | Checks details         | “요청이 안 들어가도 이유가 남는구나.”                  | Conditions preview includes reflected/unreflected states and reason text               |
| 5    | Checks risk/fairness   | “확정 전에 위험을 보고, 다음 달에도 참고할 수 있구나.” | Guide and fairness previews show blocking/check-needed states                          |
| 6    | Decides next step      | “내가 더 알아보거나 가입해도 되겠다.”                  | CTA remains visible, stable, and not buried under decorative content                   |

Time-horizon:

- 5 seconds: product category, hospital scheduling, CTA, and real product preview are visible.
- 5 minutes: section order explains the operational workflow without needing a demo call.
- 5 years: the design feels trustworthy enough for repeated hospital operations, not like a launch template.

### 17.6 AI Slop Risk Assessment

Classifier: **HYBRID**.

- Landing rules apply to hero, copy hierarchy, CTA, and scroll composition.
- App UI rules apply to the product preview internals.

Hard rejection checks:

| Risk                                           | Status                                           | Plan requirement                                         |
| ---------------------------------------------- | ------------------------------------------------ | -------------------------------------------------------- |
| Generic SaaS card grid as first impression     | Avoided if overview preview is the visual anchor | Hero must not become a 3-feature card grid               |
| Beautiful image with weak brand                | Not applicable                                   | No decorative stock image or generic hero art            |
| Strong headline with no clear action           | Must verify                                      | CTA group remains directly under hero body               |
| Busy imagery behind text                       | Avoided                                          | No text over busy preview/image                          |
| Sections repeating same mood statement         | Must verify                                      | Each value section gets one workflow job                 |
| Carousel with no narrative purpose             | Avoided                                          | No carousel                                              |
| App UI made of stacked cards instead of layout | Main risk                                        | Preview uses workspace layout, not dashboard-card mosaic |

Litmus scorecard:

| Check                                           | Current plan               | Required final state                                 |
| ----------------------------------------------- | -------------------------- | ---------------------------------------------------- |
| Brand/product unmistakable in first screen?     | Partial                    | Hero copy must name nurse schedule generation/review |
| One strong visual anchor?                       | Yes                        | `overview` preview is the anchor                     |
| Page understandable by scanning headlines only? | Partial                    | Headlines must map to workflow order                 |
| Each section has one job?                       | Yes, with this plan        | Do not merge compare/fairness messages               |
| Are cards actually necessary?                   | Partial                    | Cards only for real status groups or rows            |
| Does motion improve hierarchy?                  | Yes                        | Text first, preview second, no motion gimmick        |
| Premium without decorative shadows?             | Yes if tokens are followed | Use border/tonal hierarchy first, minimal shadow     |

Specific anti-slop rules:

- Do not add icon-in-circle feature cards.
- Do not add gradient CTA buttons.
- Do not use decorative blobs, glow, bokeh, or wavy dividers.
- Do not center every section.
- Do not make every preview block the same rounded card.
- Do not use violet/indigo for brand emphasis; night shift color is only shift semantics.
- Do not add “AI-powered”, “smart”, “all-in-one”, or “seamless” unless the sentence explains a concrete workflow.

### 17.7 Design System Alignment Rules

Use `DESIGN.md` decisions directly.

| Design area  | Required implementation direction                                                                            |
| ------------ | ------------------------------------------------------------------------------------------------------------ |
| Font         | Pretendard stack; mono only for counts, status IDs, period labels, or compact metrics                        |
| Background   | `--color-bg-canvas`, `--color-bg-app`, `--color-surface-primary`, `--color-surface-secondary` direction      |
| Text         | `--color-text-strong`, `--color-text-default`, `--color-text-muted`; muted text cannot carry essential state |
| Accent       | `--color-accent-primary` / teal for primary emphasis and CTA alignment                                       |
| Shift colors | D/E/N/O colors only for actual shift chips/cells/legend                                                      |
| Radius       | compact chips/buttons `sm-md`; panels `md-lg`; avoid same radius everywhere                                  |
| Shadow       | border and tonal separation first; `shadow-soft` only when elevation is meaningful                           |
| Motion       | 160-320ms, ease-out, no looping or parallax                                                                  |

Raw Tailwind guidance:

- Prefer slate-like neutral direction for new classes.
- Do not increase mixed `gray-*` and `slate-*` drift beyond existing component constraints.
- If adding component-scoped CSS variables is cheaper than many repeated raw classes, use variables.

### 17.8 Responsive And Accessibility Specification

Responsive behavior:

| Viewport       | Hero                                                               | Value sections                                              | Preview internals                                                       | CTA                                    |
| -------------- | ------------------------------------------------------------------ | ----------------------------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------- |
| 390px mobile   | Brand/category, headline, body, CTA, then compact overview preview | Single column with left-aligned copy                        | No internal min-width that creates document scroll; use compressed rows | Buttons may wrap but remain 44px+ tall |
| 768px tablet   | Hero remains one composition; preview can be taller                | Copy then preview; preview may use 2-column internal layout | Keep primary work surface first                                         | CTA group remains near hero copy       |
| 1280px desktop | Hero copy and overview preview read as one composed first viewport | Text width constrained, preview wide below                  | Preview can use app-like workspace density                              | CTA does not move below preview        |

Accessibility requirements:

- Every real link/button keeps visible `focus-visible` state.
- Touch targets for CTA and header actions are at least 44px high.
- Mock preview controls that are not interactive should not be rendered as real buttons.
- If mock controls use button styling, add `aria-hidden="true"` to the preview wrapper or use non-interactive elements.
- Essential states must include text labels, not color alone.
- Contrast must meet WCAG AA for body text and essential status labels.
- Truncation is allowed for employee names and secondary metadata only; status labels like `미반영`, `검토 필요`, `재검증 필요` must remain readable.
- Reduced motion must not hide content before JavaScript runs.

### 17.9 Unresolved Design Decisions

No user-blocking design decision remains for this plan. The following defaults are now part of the plan:

| Decision        | Default                                                                       |
| --------------- | ----------------------------------------------------------------------------- |
| Hero structure  | Keep CTA above overview preview; overview is evidence, not the primary action |
| Section rhythm  | Five value sections keep workflow order and one job each                      |
| Motion          | Section-level fade-up only; no sticky scrollytelling                          |
| Preview data    | Static mock data only; no real solver or Supabase dependency                  |
| Mobile strategy | Separate compressed landing preview, not a shrunken Step3/Step5 workspace     |

### 17.10 NOT in Scope

These design decisions were considered and intentionally deferred.

| Deferred decision                    | Rationale                                                                           |
| ------------------------------------ | ----------------------------------------------------------------------------------- |
| Full sticky scrollytelling           | High polish cost and higher implementation risk; section reveal covers current need |
| New illustration or image system     | Product preview should carry trust better than decorative assets                    |
| Full design token migration          | Existing `DESIGN.md` migration sequence is broader than this landing preview task   |
| Dark mode                            | MVP design system explicitly does not require dark mode                             |
| Mobile-native Step3/Step5 redesign   | This plan needs landing preview compression, not operational workspace redesign     |
| Real interactive demo inside landing | Risk of implying live solver behavior; static mock keeps scope honest               |

### 17.11 TODO Recommendation

Do not add a new TODO file item for this review. The plan now includes the deferred design decisions that matter for implementation. The broader design debts already live in `DESIGN.md` and existing `docs/todo/*` notes:

- first impression/dashboard setup: `docs/todo/05-first-impression.md`
- result review and validation: `docs/todo/01-result-review.md`
- rolling fairness process: `docs/todo/03-rolling-process.md`

### 17.12 Completion Summary

```text
+====================================================================+
|         DESIGN PLAN REVIEW — COMPLETION SUMMARY                    |
+====================================================================+
| System Audit         | DESIGN.md exists; UI scope is public landing |
| Step 0               | initial rating 7/10; gaps were states, IA,   |
|                      | journey, AI-slop litmus, and a11y specifics  |
| Pass 1  (Info Arch)  | 7/10 -> 9/10 after hierarchy + diagrams      |
| Pass 2  (States)     | 5/10 -> 9/10 after state matrix              |
| Pass 3  (Journey)    | 6/10 -> 9/10 after storyboard                |
| Pass 4  (AI Slop)    | 7/10 -> 9/10 after hard checks + blacklist   |
| Pass 5  (Design Sys) | 8/10 -> 9/10 after token alignment table     |
| Pass 6  (Resp/A11y)  | 7/10 -> 9/10 after viewport + a11y specs     |
| Pass 7  (Decisions)  | 5 resolved, 0 user-blocking deferred         |
+--------------------------------------------------------------------+
| NOT in scope         | written (6 items)                            |
| What already exists  | written                                      |
| TODOS.md updates     | 0 items proposed                             |
| Decisions made       | 5 added to plan                              |
| Decisions deferred   | 6 non-blocking scope exclusions listed       |
| Overall design score | 7/10 -> 9/10                                 |
+====================================================================+
```

Plan is design-complete enough to implement. Run `/design-review` after implementation for visual QA against real screenshots.

## 18. Plan Eng Review 보강

### 18.1 Review Summary

`/plan-eng-review` 관점의 결론은 **구현 가능, 단 테스트/상태/키 안정성 보강 후 착수**다.

이번 계획은 새 서비스, 새 API, 새 schema를 만들지 않는다. 구현 범위는 공개 랜딩 표면의 `3개 소스 파일 + 2개 테스트 파일` 중심이므로 복잡도는 적정하다. 다만 랜딩은 공개 첫 화면이므로, 작은 UI 회귀도 신뢰 손상으로 이어진다. 따라서 구현 전에 아래 엔지니어링 계약을 계획에 고정한다.

- reveal animation은 progressive enhancement로 구현한다. JavaScript, `IntersectionObserver`, test DOM 환경 중 하나가 실패해도 콘텐츠는 보인다.
- preview mock data의 모든 반복 row는 안정적인 `id`를 가진다. 이름, 날짜, label, index를 key로 쓰지 않는다.
- copy test는 data mirror가 아니라 제품 약속을 검증한다. `publicLandingHero` 값을 그대로 expect하지 않고, “간호사 근무표 생성/검토” 같은 핵심 문구를 literal로 확인한다.
- e2e는 공개 랜딩의 모바일 가로 overflow를 실제 viewport에서 확인한다.
- performance는 단일 observer, 정적 mock data, CSS 중심 animation으로 제한한다.

### 18.2 Step 0 - Scope Challenge

#### What Already Exists

| Existing code / flow                                 | Solves                                                  | Reuse decision                                                                                 |
| ---------------------------------------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `src/views/PublicLandingView.vue`                    | 공개 랜딩 route, hero, CTA, 5개 value section           | 유지한다. layout/reveal 상태만 보강하고 routing/CTA contract는 바꾸지 않는다.                  |
| `src/components/public/LandingProductPreview.vue`    | 6개 `LandingPreviewVariant` 렌더링                      | prop API는 유지한다. 내부 mock UI와 반복 key/data shape만 재작성한다.                          |
| `src/data/publicLandingContent.ts`                   | hero/value section copy와 anchor id                     | 5개 section id와 preview mapping은 유지하고 copy만 제품 범위에 맞게 조정한다.                  |
| `tests/unit/public-landing.spec.ts`                  | header/CTA/section/copy smoke                           | 확장한다. data mirror assertion을 줄이고 사용자에게 보여야 하는 약속을 literal로 검증한다.     |
| `tests/e2e/public-launch.spec.ts`                    | public root/auth redirect route contract                | 확장한다. logged-out mobile viewport overflow와 CTA reachability를 추가한다.                   |
| `tailwind.config.js`의 `shift.day/evening/night/off` | D/E/N/O 의미 색상                                       | `LandingProductPreview.vue`의 `shiftClassMap`에서 직접 사용한다. N을 violet로 표현하지 않는다. |
| `DESIGN.md` public surface/state matrix              | public landing hierarchy, responsive, a11y, motion 기준 | 새 design system을 만들지 않고 그대로 따른다.                                                  |

#### Minimum Change Set

```text
src/data/publicLandingContent.ts
  └─ public copy를 MVP/Phase2 범위에 맞게 조정

src/components/public/LandingProductPreview.vue
  ├─ 6개 variant mock UI 재작성
  ├─ 모든 repeat item에 stable id 추가
  ├─ shift token class 정리
  └─ 모바일 overflow를 내부 축약 layout으로 해결

src/views/PublicLandingView.vue
  ├─ value section 좌우 split 제거
  ├─ reveal state progressive enhancement 추가
  └─ CTA/header/route contract 유지

tests/unit/public-landing.spec.ts
  └─ copy, variants, observer fallback, reduced-motion contract 검증

tests/e2e/public-launch.spec.ts
  └─ logged-out mobile overflow + CTA reachability 검증
```

Complexity check: 5 touched files, 0 new services/classes. 8-file smell과 2-service smell 모두 트리거되지 않는다.

Search check:

- **[Layer 1]** `IntersectionObserver`는 브라우저 내장 API이며, MDN 기준 2019년 3월 이후 널리 지원된다. 섹션 진입 감지에는 custom scroll handler보다 적합하다.
- **[Layer 1]** `prefers-reduced-motion`는 OS/browser 접근성 설정을 반영하는 CSS media feature다. animation 제거는 CSS 계약으로 둔다.
- **[Layer 3]** 이 랜딩은 프레임별 scrollytelling이 아니라 “제품 증거를 순서대로 보여주는 공개 문서”다. 정확한 scroll progress보다 blank 없는 안정성이 더 중요하므로 one-shot section reveal이 맞다.

TODOS cross-reference: repo root에 `TODOS.md`는 없다. 이 계획에서 새 TODO로 분리할 만한 항목은 없고, deferred scope는 `14. 제외 범위`, `17.10 NOT in Scope`, `18.9 NOT in Scope`에 문서화한다.

Distribution check: 새 artifact, package, CLI, container, schema, API를 만들지 않는다. 배포 파이프라인 변경은 범위 밖이다.

### 18.3 Architecture Review

핵심 architecture는 “정적 content + 정적 product preview + section reveal state”다. 서버/API나 인증 상태에 의존하지 않아야 한다.

```text
publicLandingContent.ts
  ├─ hero copy
  └─ 5 value sections
       │
       ▼
PublicLandingView.vue
  ├─ PublicHeader
  ├─ Hero + LandingProductPreview(overview)
  ├─ Value sections loop
  │    ├─ text block
  │    └─ LandingProductPreview(section.preview)
  └─ Inquiry CTA
       │
       ▼
LandingProductPreview.vue
  ├─ variant switch
  ├─ static mock records with stable ids
  └─ compressed visual proof, no real data fetch
```

Reveal state는 아래 state machine으로 구현한다.

```text
Initial render
  │
  ├─ no window / no IntersectionObserver / reduced motion
  │     └─ all sections visible
  │
  └─ observer available
        ├─ register one observer after mount
        ├─ observe each section by stable section id
        ├─ on intersecting -> mark visible and unobserve that section
        └─ onBeforeUnmount -> disconnect observer
```

Architecture issues resolved in this plan:

1. **Reveal fallback must be visible by default.**  
   Recommendation: default visible, then opt into transition only after observer setup. This follows “systems over heroes”: a missing browser API or happy-dom limitation should not require a future engineer to debug a blank landing.

2. **Preview should stay static.**  
   Recommendation: do not read Step5, WorkPerformance, Supabase, or solver data. Landing proof can look product-real without creating data coupling.

3. **Public header redesign is not required.**  
   Recommendation: keep `PublicHeader.vue` out of the planned edit set unless the mobile e2e proves it creates horizontal overflow. If a fix is needed, apply the smallest spacing/wrap fix rather than adding a new mobile menu.

### 18.4 Code Quality Review

Required code-shape changes:

- Add explicit ids to all repeat data, including `offRequests`, `guideChecks`, `guideCells`, `candidatePlans`, `candidatePlan.metrics`, `fairnessRows.metrics`, and `rollingHistory`.
- Avoid `:key="item.label"`, `:key="plan.name"`, `:key="metric.label"`, and employee/date composite keys in touched preview code.
- Keep `LandingPreviewVariant` unchanged. If a variant needs fallback UI, use an exhaustive `variant` branch with a final `assertNever`-style helper only if TypeScript needs it; do not widen the union.
- Prefer local constants over computed factories because preview data is static and deterministic.
- Do not create a new composable for reveal unless `PublicLandingView.vue` becomes hard to read. A small local `sectionRefs + visibleSectionIds` implementation is sufficient.
- Replace N shift styling with `bg-shift-night` or a token-aligned class. Do not use violet/indigo for night shift semantics.
- Mock preview controls must be `div`/`span` unless they actually navigate or submit. If a whole preview is decorative, hide the preview wrapper from assistive tech only if the same information is available in adjacent real text.

Recommended local data shape:

```ts
interface PreviewMetric {
  id: string;
  label: string;
  value: string;
}

interface OffRequestPreview {
  id: string;
  employee: string;
  date: string;
  approved: boolean;
  reason: string;
}
```

### 18.5 Test Review

Detected test stack:

- Unit: Vitest + Vue Test Utils (`pnpm test:unit`)
- E2E: Playwright (`pnpm test:e2e`)
- Required repo checks for implementation touching `.vue`/`.ts`: `pnpm lint:check`, `pnpm run build`

#### Code Path Coverage Diagram

```text
CODE PATH COVERAGE
==================
[~] src/data/publicLandingContent.ts
    │
    ├── [★★  TESTED] Hero renders from data — tests/unit/public-landing.spec.ts
    ├── [GAP]         Hero/category copy says nurse schedule generation/review literally
    ├── [★★  TESTED] 5 value sections render with fixed anchors
    ├── [GAP]         Guide copy avoids legal/absolute guarantee language
    └── [GAP]         Flexible/fairness copy does not overpromise compare or live solver behavior

[~] src/views/PublicLandingView.vue
    │
    ├── [★★  TESTED] Logged-out root renders public landing — tests/e2e/public-launch.spec.ts
    ├── [★★  TESTED] Header/CTA destinations remain stable — tests/unit/public-landing.spec.ts
    ├── [GAP]         Value sections use vertical text -> preview layout on desktop/tablet/mobile
    ├── [GAP]         IntersectionObserver unavailable -> all sections visible
    ├── [GAP]         Observer cleanup on unmount
    ├── [GAP]         reduced motion -> no transform/opacity hiding
    └── [GAP] [→E2E] 390px viewport has no document horizontal overflow

[~] src/components/public/LandingProductPreview.vue
    │
    ├── [★★  TESTED] Preview text appears through landing render
    ├── [GAP]         All 6 variants render by explicit variant contract
    ├── [GAP]         Stable ids used for every v-for key
    ├── [GAP]         Overview does not rely on min-width overflow on mobile
    ├── [GAP]         Compare variant shows manual edit/recheck/export, not candidate comparison as the primary claim
    ├── [GAP]         Fairness variant shows finalized rolling context, not a single monthly score
    └── [GAP]         Shift colors use D/E/N/O semantics, especially N != violet decoration
```

#### User Flow Coverage Diagram

```text
USER FLOW COVERAGE
==================
[~] Logged-out visitor opens /
    │
    ├── [★★  TESTED] Sees public landing instead of app chrome
    ├── [GAP]         Understands product category in first viewport within hero copy
    ├── [GAP] [→E2E] Mobile visitor can scroll without horizontal overflow
    └── [GAP] [→E2E] CTA remains visible and reachable after layout change

[~] Visitor scans value sections
    │
    ├── [GAP]         Sections read in workflow order: 생성 -> 조건 -> 점검 -> 수정/운영 -> 누적 공정성
    ├── [GAP]         Reveal order is text first, preview second
    ├── [GAP]         No section is blank before observer callback
    └── [GAP]         Variant preview reinforces one section job only

[~] Accessibility and resilience
    │
    ├── [GAP]         reduced motion users see content immediately
    ├── [GAP]         essential states use visible text, not color alone
    ├── [GAP]         mock controls are not keyboard traps
    └── [GAP]         fallback panel appears if an unknown/missing preview branch is introduced later

────────────────────────────────────────
COVERAGE NOW: 5/29 paths tested or partially tested
  Code paths: 5/19
  User flows: 0/10 new-flow gaps covered
QUALITY NOW: ★★★ 0  ★★ 5  ★ 0
PLAN REQUIREMENT: add 24 targeted assertions/checks before implementation is complete
────────────────────────────────────────
```

#### Required Test Additions

`tests/unit/public-landing.spec.ts`:

- Assert hero copy literally includes `간호사`, `근무표`, and one of `생성`/`검토`.
- Assert guide section does not include absolute guarantee wording such as `준수합니다`, `보장합니다`, or legal-safe overclaims unless the sentence is framed as “확인/점검”.
- Assert `flexible-operations` emphasizes `수정`, `재검증`, `저장`, `Excel` and does not make multiple candidate comparison the primary promise.
- Assert `fairness-management` includes `확정 이력`, `누적`, and `기간` or `rolling`.
- Mount `LandingProductPreview` directly for all 6 variants and assert each variant renders its required trust signal.
- Stub missing `window.IntersectionObserver` and assert every value section is visible/not hidden.
- Stub `matchMedia('(prefers-reduced-motion: reduce)')` and assert reveal-hidden classes are not applied.
- Unmount the landing view with a mocked observer and assert `disconnect` is called.

`tests/e2e/public-launch.spec.ts`:

- Add logged-out `390x844` viewport check:

```ts
const hasHorizontalOverflow = await page.evaluate(
  () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
);
expect(hasHorizontalOverflow).toBe(false);
```

- In the same test, assert hero signup/inquiry CTA are visible, and at least one `landing-product-preview` is visible without pushing the document wider than the viewport.
- Add reduced-motion browser context or injected media override if Playwright setup supports it; otherwise keep reduced-motion coverage at unit level.

### 18.6 Performance Review

Performance risk is low because there are no data fetches and no large runtime computation. The plan should still enforce these constraints:

- Use one `IntersectionObserver` for all value sections, not one observer per section.
- Unobserve a section after first reveal to avoid repeated callback churn.
- Keep observer callback O(number of entries) and only mutate a `Set`/plain record of visible section ids.
- Do not attach `scroll` listeners or call `getBoundingClientRect()` on every scroll frame.
- Avoid `trackVisibility: true`; it is more expensive and unnecessary for simple reveal.
- Avoid large `min-w-[460px]` style preview internals on mobile. If a table-like preview needs more columns, reduce columns for the preview instead of creating body-level horizontal scroll.
- Static mock arrays should stay module constants. Do not build them from functions during render.
- CSS transitions should be transform/opacity only; no layout-affecting animation.

### 18.7 Failure Modes

| Codepath / user flow   | Realistic production failure                   | Test coverage required                 | Error handling / fallback required                           | User-visible result                  | Critical gap? |
| ---------------------- | ---------------------------------------------- | -------------------------------------- | ------------------------------------------------------------ | ------------------------------------ | ------------- |
| Section reveal setup   | `IntersectionObserver` unavailable             | Unit fallback test                     | All sections visible by default                              | Content still readable               | No, if added  |
| Section reveal cleanup | User navigates away during observer lifecycle  | Unit unmount test                      | `observer.disconnect()` in unmount                           | No leak or console noise             | No            |
| Reduced motion         | OS setting disables animation                  | Unit reduced-motion test               | No transform/opacity hidden state                            | Content appears immediately          | No            |
| Mobile layout          | Preview internal min-width creates body scroll | Playwright 390px overflow test         | Compressed preview rows, `min-w-0`, parent `overflow-hidden` | No sideways scroll                   | No, if added  |
| Hero preview height    | `max-height` crops core proof/CTA              | E2E visibility check                   | Use aspect/internal compression, not blind crop              | Product proof remains visible        | No            |
| Variant branch         | Unknown/missing variant after future edit      | Unit all-variant render test           | Exhaustive branch/fallback panel                             | Section copy still visible           | No            |
| Stable keys            | Duplicate employee/date/label causes DOM reuse | Unit/component render plus lint review | Stable ids in mock records                                   | No stale row or wrong badge reuse    | No            |
| Copy overclaim         | Legal guarantee wording appears                | Unit literal negative assertion        | Copy framed as “확인/점검/차단”                              | No misleading compliance promise     | No            |
| CTA routing            | Signup/inquiry path regresses                  | Existing unit/e2e route assertions     | Keep existing route constants and inquiry config             | Visitor can still act                | No            |
| Mock preview semantics | Static preview looks interactive               | Unit/a11y review checklist             | Non-interactive elements for mock controls                   | No keyboard trap or false affordance | No            |

No failure mode is currently accepted as silent + untested + unhandled. The implementation is not complete until the tests above exist.

### 18.8 권장 구현 순서

1. Update tests first for copy contract, all 6 variants, observer fallback, reduced motion, observer cleanup, and mobile overflow.
2. Update `publicLandingContent.ts` copy so tests define the product promise before UI work begins.
3. Rewrite `LandingProductPreview.vue` mock data and variant internals with stable ids and shift token colors.
4. Refactor `PublicLandingView.vue` layout and reveal state using the progressive enhancement state machine above.
5. Run `pnpm lint:check`, `pnpm run build`, targeted unit test, and targeted e2e test.
6. Run `/design-review` after implementation because spacing, crop, and hierarchy need screenshot-based QA.

### 18.9 NOT in Scope

| Out of scope                                       | Rationale                                                                 |
| -------------------------------------------------- | ------------------------------------------------------------------------- |
| Real solver integration or live preview data       | Landing proof must not become coupled to auth, Supabase, or solver state. |
| Step5/WorkPerformance production feature changes   | Those screens are references only; this PR changes the public preview.    |
| Full public header mobile menu redesign            | Only fix header if e2e proves overflow; otherwise keep diff small.        |
| Sticky scrollytelling or scroll-progress animation | One-shot reveal gives the value without scroll timing fragility.          |
| New image/illustration asset pipeline              | Product-like Vue/Tailwind preview is the chosen evidence surface.         |
| Global design token migration                      | Use existing `DESIGN.md` direction and local classes for this PR.         |
| New TODO backlog item                              | Deferred work is documented here; no separate root `TODOS.md` exists.     |

### 18.10 TODO Recommendation

No `TODOS.md` item should be added from this eng review. The deferred items are scoped decisions, not forgotten work. If implementation discovers a real blocker, add a concrete TODO then with owner/context; do not create speculative backlog now.

### 18.11 Completion Summary

```text
+====================================================================+
|              ENG PLAN REVIEW — COMPLETION SUMMARY                  |
+====================================================================+
| Step 0: Scope Challenge      | scope accepted as-is; 5-file minimal diff |
| Architecture Review          | 3 issues found; all resolved in plan      |
| Code Quality Review          | 7 requirements added                      |
| Test Review                  | diagram produced, 24 gaps identified      |
| Performance Review           | 7 constraints added                       |
| NOT in scope                 | written                                   |
| What already exists          | written                                   |
| TODOS.md updates             | 0 items proposed                          |
| Failure modes                | 0 critical gaps if required tests land    |
| Outside voice                | skipped for direct doc-edit task          |
| Lake Score                   | 5/5 recommendations chose complete option |
+====================================================================+
```

## 19. Writing-Plans Review 보강

### 19.1 Review Summary

`$superpowers:writing-plans` 관점의 결론은 **구현 가능하지만, 기존 문서는 실행용 plan보다 strategy/spec에 가까웠다**는 것이다. 이 보강으로 구현자가 코드베이스 맥락이 거의 없어도 테스트를 먼저 추가하고, 작은 단위로 구현하고, 각 단계마다 검증/커밋할 수 있게 만든다.

보강 전 gap:

- 문서 첫머리에 required implementation handoff header가 없었다.
- 파일별 책임은 있었지만 task가 2-5분 단위 checkbox step으로 쪼개져 있지 않았다.
- 테스트 추가 항목은 있었지만 “먼저 실패해야 하는 test”, “예상 실패”, “통과 확인”이 명확하지 않았다.
- 커밋 단위가 정의되어 있지 않았다.

보강 후 기준:

- 이 문서의 top header가 implementation handoff 역할을 한다.
- 아래 Task 1-6을 순서대로 수행한다.
- 각 task는 failing test 또는 manual proof를 먼저 만들고, 최소 구현 후 targeted command를 실행한다.
- 구현 중 unrelated local change는 포함하지 않는다.

### 19.2 File Structure Lock

이번 구현의 write set은 아래 파일로 제한한다. 새 파일을 만들지 않는다.

| File                                              | Responsibility                                                                                         |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `tests/unit/public-landing.spec.ts`               | hero/section copy contract, preview variant rendering, reveal fallback/reduced-motion/cleanup contract |
| `tests/e2e/public-launch.spec.ts`                 | logged-out public landing route, 390px mobile overflow, CTA/preview visibility                         |
| `src/data/publicLandingContent.ts`                | Korean public copy and section promise; no routing or behavior                                         |
| `src/components/public/LandingProductPreview.vue` | six static preview variants, stable ids, compressed app-like mock UI, shift semantic colors            |
| `src/views/PublicLandingView.vue`                 | public landing section layout, hero preview sizing, section reveal progressive enhancement             |

Read-only references:

- `DESIGN.md`
- `src/views/schedule/Step5Result.vue`
- `src/views/schedule/WorkPerformance.vue`
- `tailwind.config.js`
- `package.json`

### 19.3 Implementation Task Board

#### Task 1: Lock the Public Landing Test Contract

**Files:**

- Modify: `tests/unit/public-landing.spec.ts`
- Modify: `tests/e2e/public-launch.spec.ts`
- Reference: `package.json`

- [ ] **Step 1: Add direct component coverage for all preview variants**

Add `LandingProductPreview` import and a unit test that mounts all six variants:

```ts
import LandingProductPreview from '@/components/public/LandingProductPreview.vue';
import type { LandingPreviewVariant } from '@/data/publicLandingContent';

const previewTrustSignals: Record<LandingPreviewVariant, readonly string[]> = {
  overview: ['AI 생성 근무표', 'Off 요청', '가이드라인 점검', 'Excel'],
  ai: ['30명', '36일', '전월 5일'],
  conditions: ['반영', '미반영', '사유'],
  guide: ['연속 야간', '야간 후 휴식', 'NOD', '필요 인력'],
  compare: ['수정', '저장', '재검증', 'Excel'],
  fairness: ['확정 이력', '누적', '평균', '확인 필요'],
};

it('renders every landing product preview variant with its trust signals', () => {
  (Object.keys(previewTrustSignals) as LandingPreviewVariant[]).forEach((variant) => {
    const wrapper = mount(LandingProductPreview, { props: { variant } });

    previewTrustSignals[variant].forEach((text) => {
      expect(wrapper.text()).toContain(text);
    });
  });
});
```

- [ ] **Step 2: Add copy contract tests that do not mirror data constants**

Extend the existing public landing tests so they assert literal product promises:

```ts
expect(hero.text()).toContain('간호사');
expect(hero.text()).toContain('근무표');
expect(hero.text()).toMatch(/생성|검토/);

const guideText = sections[2].text();
expect(guideText).not.toMatch(/보장합니다|완전히 보장|법적 보증/);
expect(guideText).toMatch(/확인|점검|검토/);

const flexibleText = sections[3].text();
expect(flexibleText).toContain('수정');
expect(flexibleText).toContain('재검증');
expect(flexibleText).toContain('저장');
expect(flexibleText).toContain('Excel');
expect(flexibleText).not.toMatch(/여러 버전.*주요|후보안.*추천/);

const fairnessText = sections[4].text();
expect(fairnessText).toContain('확정 이력');
expect(fairnessText).toContain('누적');
expect(fairnessText).toMatch(/기간|rolling/);
```

- [ ] **Step 3: Add reveal fallback and cleanup unit tests**

Before mounting `PublicLandingView`, stub the browser APIs:

```ts
it('shows value sections when IntersectionObserver is unavailable', () => {
  vi.stubGlobal('IntersectionObserver', undefined);

  const wrapper = mountLanding();

  wrapper.findAll('[data-test="public-value-section"]').forEach((section) => {
    expect(section.attributes('class')).not.toContain('opacity-0');
  });
});

it('disconnects the landing section observer on unmount', () => {
  const disconnect = vi.fn();
  vi.stubGlobal(
    'IntersectionObserver',
    vi.fn(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect,
    }))
  );

  const wrapper = mountLanding();
  wrapper.unmount();

  expect(disconnect).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 4: Add reduced-motion unit coverage**

Add a helper to stub `matchMedia`:

```ts
function stubReducedMotion(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: query.includes('prefers-reduced-motion') ? matches : false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  );
}
```

Then assert reduced motion does not leave hidden content:

```ts
it('does not hide sections for reduced-motion users', () => {
  stubReducedMotion(true);

  const wrapper = mountLanding();

  wrapper.findAll('[data-test="public-value-section"]').forEach((section) => {
    expect(section.attributes('class')).not.toContain('translate-y');
    expect(section.attributes('class')).not.toContain('opacity-0');
  });
});
```

- [ ] **Step 5: Add mobile overflow e2e coverage**

In `tests/e2e/public-launch.spec.ts`, add a logged-out mobile test:

```ts
test('logged-out public landing fits a 390px mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.context().clearCookies();
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  await page.goto('/');

  await expect(page.getByTestId('public-landing')).toBeVisible();
  await expect(page.getByTestId('public-hero-signup')).toBeVisible();
  await expect(page.getByTestId('public-hero-inquiry')).toBeVisible();
  await expect(page.getByTestId('landing-product-preview').first()).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
  );
  expect(hasHorizontalOverflow).toBe(false);
});
```

- [ ] **Step 6: Run tests and confirm they fail for the right reasons**

Run:

```bash
pnpm test:unit -- tests/unit/public-landing.spec.ts
pnpm test:e2e -- --no-deps tests/e2e/public-launch.spec.ts
```

Expected before implementation:

- Unit test fails because current hero copy does not include `간호사`.
- Unit test fails because current `compare` preview still emphasizes `버전 A/B` instead of the required edit/recheck/export state.
- Unit test fails because several preview rows still key by label/name/date and do not include all required trust signals.
- E2E may fail because current preview internals use mobile-hostile min width and current value sections still use split layout.

- [ ] **Step 7: Commit test contract**

```bash
git add tests/unit/public-landing.spec.ts tests/e2e/public-launch.spec.ts
git commit -m "test: lock public landing preview redesign contract"
```

#### Task 2: Update Public Landing Copy

**Files:**

- Modify: `src/data/publicLandingContent.ts`
- Test: `tests/unit/public-landing.spec.ts`

- [ ] **Step 1: Update hero copy to name the product category**

Use Korean user-facing copy. Required content:

```ts
export const publicLandingHero: PublicLandingHeroContent = {
  kicker: '간호사 근무표 생성/검토',
  sloganLines: ['근무표 생성부터', '검토와 내보내기까지'],
  body: 'EveryShift는 병동 조건, Off 요청, 가이드라인 점검을 함께 보며 간호사 근무표를 만들고 확정 전 검토할 수 있게 돕습니다.',
};
```

- [ ] **Step 2: Update section copy without overpromising**

Required direction:

- `ai-schedule`: “실제 solver 완전 자동화”보다 “자동 완성 흐름 + 검토 가능한 결과”
- `guide-check`: `준수합니다` headline을 피하고 `확정 전 점검합니다`로 변경
- `flexible-operations`: 후보안 비교보다 `수정`, `저장`, `재검증`, `Excel`
- `fairness-management`: `확정 이력`, `기간별`, `누적/rolling`

- [ ] **Step 3: Run targeted unit test**

Run:

```bash
pnpm test:unit -- tests/unit/public-landing.spec.ts
```

Expected:

- Copy-related assertions pass.
- Preview/layout/reveal assertions may still fail until Tasks 3-4.

- [ ] **Step 4: Commit copy change**

```bash
git add src/data/publicLandingContent.ts
git commit -m "feat: clarify public landing product copy"
```

#### Task 3: Rewrite Product Preview Variants

**Files:**

- Modify: `src/components/public/LandingProductPreview.vue`
- Test: `tests/unit/public-landing.spec.ts`
- Reference: `tailwind.config.js`
- Reference: `src/views/schedule/Step5Result.vue`
- Reference: `src/views/schedule/WorkPerformance.vue`

- [ ] **Step 1: Add stable ids to every repeat data interface**

Required interface shape:

```ts
interface PreviewMetric {
  id: string;
  label: string;
  value: string;
}

interface OffRequestPreview {
  id: string;
  employee: string;
  date: string;
  approved: boolean;
  reason: string;
}
```

Apply the same `id` pattern to guide checks, guide cells, operation statuses, fairness rows, fairness metrics, and rolling history.

- [ ] **Step 2: Replace user-editable or label-based keys**

Do:

```vue
<div v-for="request in offRequests" :key="request.id"></div>
```

Do not:

```vue
<div :key="`${request.employee}-${request.date}`"></div>
```

- [ ] **Step 3: Align D/E/N/O colors with shift semantics**

Required direction:

```ts
const shiftClassMap: Record<ShiftCode, string> = {
  D: 'bg-shift-day/15 text-emerald-800',
  E: 'bg-shift-evening/15 text-sky-800',
  N: 'bg-shift-night/15 text-slate-800',
  OFF: 'bg-shift-off/40 text-slate-700',
};
```

If the exact Tailwind opacity syntax does not compile for custom colors, use the closest existing project token class that preserves D/E/N/O semantic meaning. Do not use violet/indigo as decorative night-shift styling.

- [ ] **Step 4: Remove mobile-hostile internal min widths**

Replace full table shrink-down with compressed rows. Any grid/table-like preview must use:

- `min-w-0` on flex/grid children
- `overflow-hidden` on preview wrapper
- 3-4 employees x 5-7 days maximum
- no internal `min-w-[460px]` that can create body-level horizontal overflow

- [ ] **Step 5: Rewrite `compare` variant as operation editing preview**

Required trust signals:

- `결과 직접 수정`
- `저장됨`
- `재검증 필요` or `재검증 완료`
- `Excel 내보내기`

Do not make `버전 A/B` candidate comparison the primary visual claim.

- [ ] **Step 6: Rewrite `fairness` variant as confirmed-history rolling preview**

Required trust signals:

- `확정 이력`
- `기간`
- `누적`
- `평균`
- `최소/최대`
- `확인 필요`

Do not show a single “이번 달 공정성 점수” as the main concept.

- [ ] **Step 7: Run targeted unit test**

Run:

```bash
pnpm test:unit -- tests/unit/public-landing.spec.ts
```

Expected:

- All six preview variant trust-signal assertions pass.
- Reveal/layout assertions may still fail until Task 4.

- [ ] **Step 8: Commit preview rewrite**

```bash
git add src/components/public/LandingProductPreview.vue
git commit -m "feat: redesign landing product preview variants"
```

#### Task 4: Refactor Public Landing Layout and Reveal

**Files:**

- Modify: `src/views/PublicLandingView.vue`
- Test: `tests/unit/public-landing.spec.ts`
- Test: `tests/e2e/public-launch.spec.ts`

- [ ] **Step 1: Replace value-section split layout**

Change value sections from:

```vue
class="mx-auto grid ... lg:grid-cols-[0.9fr_1.1fr] lg:items-center ..."
```

To a vertical structure:

```vue
class="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-16 sm:px-6 lg:px-8 lg:py-20"
```

Text block should stay constrained with `max-w-2xl` or `max-w-3xl`; preview block should be wide below the text.

- [ ] **Step 2: Make hero preview height stable without cropping core proof**

Remove blind `max-h-*` cropping if it hides core proof. Prefer a stable wrapper:

```vue
<div class="mx-auto mt-8 w-full max-w-5xl overflow-hidden rounded-lg">
  <LandingProductPreview variant="overview" />
</div>
```

If height control is required, use internal preview compression rather than outer crop.

- [ ] **Step 3: Implement progressive-enhancement reveal state**

Use one observer and visible-by-default fallback:

```ts
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

const sectionRefs = new Map<string, Element>();
const visibleSectionIds = ref<Set<string>>(
  new Set(publicLandingSections.map((section) => section.id))
);
let sectionObserver: IntersectionObserver | null = null;

const shouldReduceMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function setSectionRef(id: string, element: Element | null) {
  if (element) {
    sectionRefs.set(id, element);
  } else {
    sectionRefs.delete(id);
  }
}

onMounted(() => {
  if (
    typeof window === 'undefined' ||
    shouldReduceMotion() ||
    typeof window.IntersectionObserver === 'undefined'
  ) {
    return;
  }

  visibleSectionIds.value = new Set();
  sectionObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const sectionId = entry.target.getAttribute('id');
        if (!sectionId) continue;

        visibleSectionIds.value = new Set([...visibleSectionIds.value, sectionId]);
        sectionObserver?.unobserve(entry.target);
      }
    },
    { threshold: 0.18 }
  );

  sectionRefs.forEach((element) => sectionObserver?.observe(element));
});

onBeforeUnmount(() => {
  sectionObserver?.disconnect();
});
```

Adjust final implementation for lint and Vue template ref constraints. Keep the behavior: no observer means content stays visible.

- [ ] **Step 4: Apply text-first, preview-second reveal classes**

Required behavior:

- Text block appears first.
- Preview block appears 80-140ms later.
- Reduced motion and observer fallback do not apply hidden state.
- DOM content exists before animation starts.

- [ ] **Step 5: Run targeted unit and e2e tests**

Run:

```bash
pnpm test:unit -- tests/unit/public-landing.spec.ts
pnpm test:e2e -- --no-deps tests/e2e/public-launch.spec.ts
```

Expected:

- Unit tests pass.
- E2E logged-out route and 390px overflow checks pass.

- [ ] **Step 6: Commit layout/reveal change**

```bash
git add src/views/PublicLandingView.vue
git commit -m "feat: stack public landing previews with resilient reveal"
```

#### Task 5: Full Verification

**Files:**

- Verify only; no planned file edits unless a command fails.

- [ ] **Step 1: Run lint**

```bash
pnpm lint:check
```

Expected:

- Exit code 0.

- [ ] **Step 2: Run production build**

```bash
pnpm run build
```

Expected:

- Exit code 0.
- `vue-tsc -b` succeeds.
- `vite build` succeeds.

- [ ] **Step 3: Run targeted unit test**

```bash
pnpm test:unit -- tests/unit/public-landing.spec.ts
```

Expected:

- Exit code 0.

- [ ] **Step 4: Run targeted e2e test**

```bash
pnpm test:e2e -- --no-deps tests/e2e/public-launch.spec.ts
```

Expected:

- Exit code 0.

- [ ] **Step 5: Fix any failures before proceeding**

If any command fails:

- Fix only the failing implementation or test contract.
- Rerun the failed command.
- Rerun `pnpm lint:check` and `pnpm run build` after any `.vue` or `.ts` edit.

#### Task 6: Visual QA Handoff

**Files:**

- No required source edit.
- Optional follow-up after implementation: screenshot-based `/design-review`.

- [ ] **Step 1: Run local browser QA after implementation**

Use the project’s browser QA flow or `/design-review` after the dev server is available.

Minimum viewport checks:

- 390px mobile: no horizontal scroll; CTA not overlapped; preview does not crop essential states.
- 768px tablet: text then preview; preview primary surface first.
- 1280px desktop: section rhythm remains text above wide product preview.

- [ ] **Step 2: Confirm no new out-of-scope behavior**

Verify:

- No real solver/Supabase reads in `LandingProductPreview.vue`.
- No new CRUD, registration approval flow, analytics, or mobile-only page.
- No new image asset pipeline.
- No sticky scrollytelling.

- [ ] **Step 3: Final implementation commit if fixes were needed**

```bash
git add src tests
git commit -m "fix: polish public landing preview responsiveness"
```

Only run this commit if Task 6 produces additional source changes.

### 19.4 Acceptance Checklist

Implementation is complete only when every item is true:

- [ ] `tests/unit/public-landing.spec.ts` covers hero copy, section copy, all 6 preview variants, observer fallback, reduced motion, and observer cleanup.
- [ ] `tests/e2e/public-launch.spec.ts` covers logged-out 390px mobile overflow and CTA/preview visibility.
- [ ] `publicLandingHero` names 간호사 근무표 생성/검토 in the first viewport.
- [ ] `LandingProductPreview.vue` uses stable ids for all `v-for` keys in touched preview data.
- [ ] `compare` variant reads as 수정/저장/재검증/Excel, not candidate comparison first.
- [ ] `fairness` variant reads as 확정 이력 기반 rolling fairness, not a single monthly score.
- [ ] `PublicLandingView.vue` value sections use text above preview across mobile/tablet/desktop.
- [ ] Reveal animation is progressive enhancement; missing observer or reduced motion never causes hidden sections.
- [ ] `pnpm lint:check` passes.
- [ ] `pnpm run build` passes.
- [ ] `pnpm test:unit -- tests/unit/public-landing.spec.ts` passes.
- [ ] `pnpm test:e2e -- --no-deps tests/e2e/public-launch.spec.ts` passes.

### 19.5 Writing-Plans Verdict

**Verdict:** 보강 후 implementation-ready.

이 계획은 이제 strategy, design intent, engineering constraints, and executable checklist를 모두 포함한다. 다음 작업자는 Task 1부터 순서대로 실행하면 되고, 각 task가 실패 조건과 통과 조건을 명확히 갖는다.

## GSTACK REVIEW REPORT

| Review        | Trigger               | Why                             | Runs | Status | Findings                                     |
| ------------- | --------------------- | ------------------------------- | ---- | ------ | -------------------------------------------- |
| CEO Review    | `/plan-ceo-review`    | Scope & strategy                | 0    | —      | —                                            |
| Codex Review  | `/codex review`       | Independent 2nd opinion         | 0    | —      | —                                            |
| Eng Review    | `/plan-eng-review`    | Architecture & tests (required) | 5    | clean  | latest: 34 issues/test gaps, 0 critical gaps |
| Design Review | `/plan-design-review` | UI/UX gaps                      | 4    | clean  | score: 7/10 -> 9/10, 5 decisions added here  |

- **UNRESOLVED:** 0
- **VERDICT:** DESIGN + ENG CLEARED FOR IMPLEMENTATION. 구현 후 screenshot 기반 `/design-review`와 `pnpm lint:check`, `pnpm run build`, targeted unit/e2e 검증이 필요하다.
