# Brand Logo SVG 전환 + 다크모드 대응 Implementation Plan

> **SSOT:** 상세 RCA·구현 plan은 [`docs/plans/2026-06-15-brand-logo-dark-mode-fix.ko.md`](../../plans/2026-06-15-brand-logo-dark-mode-fix.ko.md)를 따른다. 본 문서는 실행 태스크 레퍼런스용 사본이다.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `main_logo.png`를 벡터 기반 `BrandLogo`로 교체해 라이트/다크 환경 모두에서 테두리 헤일로 없이 선명하게 보이게 한다.

**Architecture:** 기존 E1 로고(3개 인터록 콤마 마크 + `everyshift` 워드마크)를 **수동 트레이스한 SVG path**로 재현한다. `BrandLogo.vue`는 단일 인라인 SVG(또는 마크 SVG + DOM 워드마크)를 렌더하고, 색상은 **CSS custom properties**로 주입한다. 라이트는 현행 브랜드 색, 다크는 `prefers-color-scheme: dark` 및 향후 앱 다크모드 토큰에 맞는 대비 색을 사용한다. PNG용 `background: #fff` 패치는 제거한다.

**Tech Stack:** Vue 3.5 (`<script setup>`), TypeScript 5.8, Tailwind CSS 3.4, Vitest, `DESIGN.md` 토큰

**관련 문서:**

- `DESIGN.md` — Color System, Dark Mode 섹션
- `docs/launch/launch-core/assets/brand-exploration/README.md` — 기존 PNG export 규칙
- `src/components/brand/BrandLogo.vue` — 현재 PNG `<img>` 구현
- `tests/unit/brand-logo.spec.ts` — 단위 테스트
- `tests/unit/public-landing.spec.ts` — public header color-scheme 테스트

**Scope guard (이번 plan 범위 밖):**

- PWA favicon / apple-touch-icon 일괄 교체 (별도 follow-up)
- 앱 전체 다크모드 UI 구현 (로고만 선제 대응)
- 로고 디자인 리디자인 (E1 마크 형태 유지)

---

## 배경 / Root cause 요약

| 문제                 | 원인                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------ |
| 다크모드 테두리 깨짐 | `main_logo.png`가 흰 배경 매트 위 anti-alias로 export됨 (`bKGD: white`, 1-bit alpha) |
| 흰 박스 테두리       | `.brand-logo-image { background: #fff; border-radius; padding }` PNG 헤일로 우회     |
| 축소 시 흐림         | 래스터 이미지 스케일링                                                               |

SVG + CSS 변수 전환 시 위 3가지가 구조적으로 해소된다.

---

## 핵심 설계 결정

| 항목            | 결정                                                                                                         |
| --------------- | ------------------------------------------------------------------------------------------------------------ |
| 에셋 형태       | **인라인 SVG** in `BrandLogo.vue` + 선택적 `src/assets/brand/logo-mark.svg` 아카이브                         |
| 워드마크        | **DOM `<span>` + Pretendard** (SVG `<text>`보다 작은 크기에서 선명)                                          |
| 색상 전략       | 마크 3색 + 워드마크 1색을 CSS 변수로 분리                                                                    |
| 다크모드 트리거 | 1차: `@media (prefers-color-scheme: dark)` / 2차: `.dark` 또는 `[data-theme="dark"]` hook (토큰만 미리 정의) |
| 사이즈 API      | 기존 `size: 'sm' \| 'md'`, `alt` prop **유지** (breaking change 금지)                                        |
| PNG             | 마이그레이션 후 `main_logo.png`는 archive 참조용으로만 유지, import 제거                                     |

### 색상 토큰 (초안 — 구현 시 `DESIGN.md`에 반영)

**Light (현행 E1 근사)**

| Token                   | 용도         | 값                               |
| ----------------------- | ------------ | -------------------------------- |
| `--brand-logo-mark-1`   | 마크 상단/좌 | `#C9A227` (gold ochre)           |
| `--brand-logo-mark-2`   | 마크 우측    | `#14B8A6` (teal)                 |
| `--brand-logo-mark-3`   | 마크 하단/좌 | `#1E3A5F` (navy)                 |
| `--brand-logo-wordmark` | 텍스트       | `#134E4A` (`--color-accent-ink`) |

**Dark (`prefers-color-scheme: dark`)**

| Token                   | 용도            | 값        |
| ----------------------- | --------------- | --------- |
| `--brand-logo-mark-1`   | 밝은 gold       | `#E8C547` |
| `--brand-logo-mark-2`   | 밝은 teal       | `#5EEAD4` |
| `--brand-logo-mark-3`   | 밝은 slate-blue | `#7BA3D4` |
| `--brand-logo-wordmark` | 텍스트          | `#E2F5F2` |

> 구현자는 SVG 적용 후 **WCAG 대비**를 육안 + 스냅샷으로 확인하고, 필요 시 토큰만 미세 조정한다. 마크 색은 `shift.*` 토큰과 혼용하지 않는다.

---

## 파일 구조

### Create

| File                                         | Responsibility                                   |
| -------------------------------------------- | ------------------------------------------------ |
| `src/assets/brand/logo-mark.svg`             | 마크 단독 벡터 아카이브 (Figma/디자인 handoff용) |
| `src/components/brand/brand-logo.tokens.css` | 라이트/다크 CSS 변수 정의                        |

### Modify

| File                                                         | Responsibility                                                       |
| ------------------------------------------------------------ | -------------------------------------------------------------------- |
| `src/components/brand/BrandLogo.vue`                         | PNG → SVG 마크 + DOM 워드마크, 토큰 import                           |
| `src/style.css`                                              | `brand-logo.tokens.css` import (또는 BrandLogo scoped에서 `@import`) |
| `tests/unit/brand-logo.spec.ts`                              | img → svg/div 구조 assertion 업데이트                                |
| `DESIGN.md`                                                  | Brand Logo / Dark surface 토큰 섹션 추가                             |
| `docs/launch/launch-core/assets/brand-exploration/README.md` | SVG가 SSOT임을 명시                                                  |

### Unchanged (참고)

| File                                     | Note                                    |
| ---------------------------------------- | --------------------------------------- |
| `src/components/layout/Header.vue`       | `<BrandLogo size="md" />` 그대로        |
| `src/components/public/PublicHeader.vue` | `<BrandLogo size="sm" alt="" />` 그대로 |

---

## 사전 조건 (구현자 체크)

- [ ] `main_logo.png` (560×149) 원본을 디자인 뷰어에서 열어 **마크 영역 vs 워드마크 영역** 경계 확인
- [ ] `DESIGN.md` 읽기 — brand color vs shift color 분리 규칙 숙지
- [ ] `pnpm dev`로 헤더(`/app`)와 랜딩(`/`)에서 현행 로고 스크린샷 확보 (before baseline)
- [ ] OS 또는 DevTools에서 `prefers-color-scheme: dark` 강제 방법 확인

---

### Task 1: SVG 마크 path 제작 + 아카이브 파일 추가

**Files:**

- Create: `src/assets/brand/logo-mark.svg`
- Reference: `src/assets/brand/main_logo.png`

- [ ] **Step 1: 마크 영역만 벡터 트레이스**

Figma / Illustrator / Inkscape로 `main_logo.png`의 **원형 인터록 마크**(워드마크 제외)를 trace한다.

요구사항:

- `<path>` 또는 `<g>` 3개 요소로 **색 영역 분리** (나중에 `fill="var(--brand-logo-mark-N)"` 적용)
- `viewBox="0 0 40 40"` (또는 정사각 비율) — 정수 좌표 우선
- embedded raster `<image>` **금지**
- stroke 없이 fill only (헤일로 방지)

`logo-mark.svg` 스켈레톤:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" fill="none" role="img" aria-hidden="true">
  <path d="<!-- trace mark segment 1 -->" fill="var(--brand-logo-mark-1, #C9A227)" />
  <path d="<!-- trace mark segment 2 -->" fill="var(--brand-logo-mark-2, #14B8A6)" />
  <path d="<!-- trace mark segment 3 -->" fill="var(--brand-logo-mark-3, #1E3A5F)" />
</svg>
```

- [ ] **Step 2: 육안 비교**

PNG 원본과 나란히 놓고 형태 일치 확인. 허용 오차: 픽셀 단위 미세 차이; 실루엣·비율은 동일해야 함.

- [ ] **Step 3: Commit**

```bash
git add src/assets/brand/logo-mark.svg
git commit -m "assets: add vector brand mark SVG traced from E1 logo"
```

---

### Task 2: 브랜드 로고 CSS 토큰 정의

**Files:**

- Create: `src/components/brand/brand-logo.tokens.css`
- Modify: `src/style.css`

- [ ] **Step 1: 토큰 파일 작성**

```css
/* src/components/brand/brand-logo.tokens.css */
:root {
  --brand-logo-mark-1: #c9a227;
  --brand-logo-mark-2: #14b8a6;
  --brand-logo-mark-3: #1e3a5f;
  --brand-logo-wordmark: #134e4a;
}

@media (prefers-color-scheme: dark) {
  :root {
    --brand-logo-mark-1: #e8c547;
    --brand-logo-mark-2: #5eead4;
    --brand-logo-mark-3: #7ba3d4;
    --brand-logo-wordmark: #e2f5f2;
  }
}

/* Future app dark mode hook — wire when product ships dark UI */
.dark,
[data-theme='dark'] {
  --brand-logo-mark-1: #e8c547;
  --brand-logo-mark-2: #5eead4;
  --brand-logo-mark-3: #7ba3d4;
  --brand-logo-wordmark: #e2f5f2;
}
```

- [ ] **Step 2: `src/style.css`에 import**

```css
@import './components/brand/brand-logo.tokens.css';
```

(`@import`는 `@tailwind` directives **위**에 배치)

- [ ] **Step 3: Commit**

```bash
git add src/components/brand/brand-logo.tokens.css src/style.css
git commit -m "feat: add brand logo light/dark CSS tokens"
```

---

### Task 3: `BrandLogo.vue` SVG 전환 (TDD)

**Files:**

- Modify: `tests/unit/brand-logo.spec.ts`
- Modify: `src/components/brand/BrandLogo.vue`

- [ ] **Step 1: 실패 테스트 작성**

`tests/unit/brand-logo.spec.ts`를 SVG 구조에 맞게 수정:

```typescript
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import BrandLogo from '@/components/brand/BrandLogo.vue';

describe('BrandLogo', () => {
  it('renders vector mark and wordmark with sm sizing', () => {
    const wrapper = mount(BrandLogo);

    const logo = wrapper.get('[data-test="brand-logo"]');

    expect(logo.attributes('aria-label')).toBe('everyshift');
    expect(logo.classes()).toContain('h-8');
    expect(logo.find('[data-test="brand-logo-mark"]').exists()).toBe(true);
    expect(logo.find('.brand-logo-wordmark').text()).toBe('everyshift');
    expect(logo.find('img').exists()).toBe(false);
  });

  it('renders md sizing when requested', () => {
    const wrapper = mount(BrandLogo, { props: { size: 'md' } });
    expect(wrapper.get('[data-test="brand-logo"]').classes()).toContain('h-10');
  });

  it('applies CSS variable fills on mark paths', () => {
    const wrapper = mount(BrandLogo);
    const paths = wrapper.findAll('[data-test="brand-logo-mark"] path');
    expect(paths.length).toBe(3);
    expect(paths[0]?.attributes('fill')).toBe('var(--brand-logo-mark-1)');
  });

  it('hides decorative label when alt is empty', () => {
    const wrapper = mount(BrandLogo, { props: { alt: '' } });
    const logo = wrapper.get('[data-test="brand-logo"]');
    expect(logo.attributes('aria-hidden')).toBe('true');
  });
});
```

- [ ] **Step 2: 테스트 실행 — FAIL 확인**

```bash
pnpm vitest run tests/unit/brand-logo.spec.ts
```

Expected: FAIL (`img` still present / paths missing)

- [ ] **Step 3: `BrandLogo.vue` 구현**

```vue
<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    size?: 'sm' | 'md';
    alt?: string;
  }>(),
  {
    size: 'sm',
    alt: 'everyshift',
  }
);

const rootClass = computed(() =>
  props.size === 'md'
    ? 'brand-logo brand-logo--md h-10 gap-2.5'
    : 'brand-logo brand-logo--sm h-8 gap-2'
);
</script>

<template>
  <div
    data-test="brand-logo"
    class="inline-flex shrink-0 items-center"
    :class="rootClass"
    :role="alt ? 'img' : undefined"
    :aria-label="alt || undefined"
    :aria-hidden="alt ? undefined : 'true'"
  >
    <svg
      data-test="brand-logo-mark"
      class="brand-logo__mark block h-full w-auto shrink-0"
      viewBox="0 0 40 40"
      xmlns="http://www.w3.org/2000/svg"
      shape-rendering="geometricPrecision"
      aria-hidden="true"
    >
      <!-- Paste traced paths from logo-mark.svg; keep fill via CSS vars -->
      <path fill="var(--brand-logo-mark-1)" d="..." />
      <path fill="var(--brand-logo-mark-2)" d="..." />
      <path fill="var(--brand-logo-mark-3)" d="..." />
    </svg>

    <span class="brand-logo-wordmark whitespace-nowrap" aria-hidden="true"> everyshift </span>
  </div>
</template>

<style scoped>
.brand-logo-wordmark {
  color: var(--brand-logo-wordmark);
  font-family: var(--font-sans, 'Pretendard Variable', 'Pretendard', 'Noto Sans KR', sans-serif);
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1;
  -webkit-font-smoothing: antialiased;
}

.brand-logo--sm .brand-logo-wordmark {
  font-size: 15px;
}

.brand-logo--md .brand-logo-wordmark {
  font-size: 17px;
}
</style>
```

**제거할 것 (PNG 시대 잔재):**

- `import mainLogo from '@/assets/brand/main_logo.png'`
- `.brand-logo-image { background-color: #fff; border-radius; padding }`
- `color-scheme: only light` on logo element (토큰이 다크 대응)

- [ ] **Step 4: 테스트 통과 확인**

```bash
pnpm vitest run tests/unit/brand-logo.spec.ts
```

Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/brand/BrandLogo.vue tests/unit/brand-logo.spec.ts
git commit -m "feat: replace PNG brand logo with theme-aware SVG mark"
```

---

### Task 4: 회귀 테스트 + 문서 업데이트

**Files:**

- Modify: `tests/unit/public-landing.spec.ts` (필요 시만)
- Modify: `DESIGN.md`
- Modify: `docs/launch/launch-core/assets/brand-exploration/README.md`

- [ ] **Step 1: public landing 테스트 실행**

```bash
pnpm vitest run tests/unit/public-landing.spec.ts
```

`[data-test="brand-logo"]` 존재 assertion은 유지되어야 함. 실패 시 selector만 수정.

- [ ] **Step 2: `DESIGN.md`에 Brand Logo 섹션 추가**

`### Dark Mode` 근처 또는 `## Color System` 하위에 추가:

```markdown
### Brand Logo Tokens

- Logo is vector (`BrandLogo.vue`); do not ship raster wordmarks for UI chrome.
- Colors use `--brand-logo-mark-{1,2,3}` and `--brand-logo-wordmark`.
- Light surfaces: default `:root` tokens.
- Dark OS preference: `@media (prefers-color-scheme: dark)` overrides.
- Future in-app dark mode: `.dark` / `[data-theme='dark']` uses the same overrides.
- Do not add white background patches behind the logo.
```

- [ ] **Step 3: brand-exploration README 업데이트**

- `main_logo.png` → legacy reference
- `logo-mark.svg` + `BrandLogo.vue` → app SSOT

- [ ] **Step 4: Commit**

```bash
git add DESIGN.md docs/launch/launch-core/assets/brand-exploration/README.md tests/unit/public-landing.spec.ts
git commit -m "docs: document SVG brand logo tokens and dark mode behavior"
```

---

### Task 5: 시각 QA (라이트 / 다크) + Workflow Checks

**Files:** (코드 변경 없을 수 있음)

- [ ] **Step 1: 라이트 모드 확인**

```bash
pnpm dev
```

확인 위치:

- `/` public header (`BrandLogo size="sm"`)
- `/app` app header (`BrandLogo size="md"`)

체크리스트:

- [ ] E1 마크 형태가 PNG와 시각적으로 동일
- [ ] 워드마크 수직 정렬 (`items-center`, gap 적절)
- [ ] 흰 박스 테두리 없음
- [ ] Retina(2x)에서 가장자리 선명

- [ ] **Step 2: 다크 모드 확인**

Chrome DevTools → Rendering → `prefers-color-scheme: dark` 또는 OS 다크모드

체크리스트:

- [ ] 마크/텍스트 주변 **흰 헤일로 없음**
- [ ] 어두운 배경(브라우저 chrome, devtools 시뮬레이션)에서 대비 충분
- [ ] 색상이 과채도/네온이 아닌지 (`DESIGN.md` anti-goals)

- [ ] **Step 3: Workflow Checks**

```bash
pnpm lint:check
pnpm run build
```

Expected: both PASS (errors 0)

- [ ] **Step 4: 최종 commit (QA 스냅샷 메모가 있다면)**

스크린샷은 repo에 넣지 않아도 됨. 필요 시 `docs/launch/.../brand-exploration/`에 before/after PNG 1장씩 optional.

---

## 수동 QA 시나리오 (새 세션용)

| #   | 시나리오                                                                                       | 기대 결과                                          |
| --- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| 1   | 라이트 `/app` 헤더                                                                             | 로고 선명, 흰 테두리 없음                          |
| 2   | 라이트 `/` 헤더                                                                                | sm 사이즈 정상                                     |
| 3   | `prefers-color-scheme: dark` + 흰 헤더                                                         | 로고 다크 토큰 적용, 헤일로 없음                   |
| 4   | `prefers-color-scheme: dark` + 어두운 배경 페이지(임의 div `bg-slate-900`)에 `BrandLogo` mount | 워드마크 읽기 가능, 헤일로 없음                    |
| 5   | `alt=""` (PublicHeader)                                                                        | `aria-hidden="true"`, 부모 링크 `sr-only` 유지     |
| 6   | Windows 11 + OS 다크모드 (가능 시)                                                             | 기존 버튼 `ButtonFace` 이슈와 무관하게 로고만 정상 |

---

## 리스크 & 완화

| 리스크                                         | 완화                                                                          |
| ---------------------------------------------- | ----------------------------------------------------------------------------- |
| 수동 trace 품질 편차                           | PNG overlay 50% 비교, Task 1 Step 2 gate                                      |
| 다크 토큰이 헤더 `bg-white`에서 과밝음         | 헤더는 라이트 고정이므로 **OS 다크만** 우선 검증; in-app dark는 hook만 준비   |
| SVG path 번들 크기 증가                        | 마크 path만 3개; 워드마크는 DOM text                                          |
| `public-landing` color-scheme 테스트 의미 변화 | 로고가 다크 대응해도 public shell `only_light` 유지 가능 — 테스트 의도 문서화 |

---

## 완료 기준 (Definition of Done)

- [ ] `BrandLogo.vue`가 PNG를 import하지 않음
- [ ] 라이트/다크 모두 헤일로·흰 박스 없음
- [ ] `tests/unit/brand-logo.spec.ts` 전체 통과
- [ ] `pnpm lint:check` / `pnpm run build` 통과
- [ ] `DESIGN.md`에 브랜드 로고 토큰 문서화
- [ ] E1 마크 실루엣 유지 (리디자인 아님)

---

## 새 세션 시작 프롬프트 (복사용)

```text
/docs/superpowers/plans/2026-06-15-brand-logo-svg-dark-mode.ko.md 플랜을 따라 Brand Logo SVG 전환을 구현해주세요.

순서:
1. Task 1부터 순차 진행
2. main_logo.png E1 마크를 유지한 채 SVG path 트레이스
3. 다크모드 CSS 토큰 + BrandLogo.vue 전환
4. 테스트/문서/Workflow Checks까지 완료

참고: @DESIGN.md, @src/components/brand/BrandLogo.vue
```

---

## Execution Handoff

**Plan saved to:** `docs/superpowers/plans/2026-06-15-brand-logo-svg-dark-mode.ko.md`

**실행 옵션:**

1. **Subagent-Driven (권장)** — Task마다 새 서브에이전트 + 단계별 리뷰
2. **Inline Execution** — 새 세션에서 `executing-plans` 스킬로 일괄 진행

새 세션에서는 위 **「새 세션 시작 프롬프트」**를 붙여넣으면 바로 시작할 수 있습니다.
