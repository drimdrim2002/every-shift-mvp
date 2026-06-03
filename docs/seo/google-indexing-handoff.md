# Google 색인 미생성 — 세션 핸드오프 (2026-05-30)

> **새 세션에서 이 파일을 `@docs/seo/google-indexing-handoff.md` 로 첨부하고 이어서 진행하세요.**

## 현재 상태 (한 줄)

- **네이버**: 수집·검색 반영 **정상** (사용자 확인)
- **Google**: Search Console에서 **`/` 색인 생성 안 됨** (중복 페이지 이슈 대응을 위해 robots.txt/sitemap.xml 수정 커밋 `95d2cd1` 배포 진행)
- **프로덕션 배포**: SEO 코드 커밋 `f3b9753` 및 추가 수정 `95d2cd1` 배포 완료, 라이브 HTML 검증 통과

---

## 원래 증상

- Vercel 배포 후 Google·네이버 검색 노출 기대
- `site:everyshift.co.kr` / `site:www.everyshift.co.kr` → **거의/전혀 결과 없음** (미색인)
- 이후 네이버는 개선, **Google만 지속 이슈**

---

## 원인 진단 (코드 리뷰 시점)

| 원인                                   | 심각도      | 조치 여부                                          |
| -------------------------------------- | ----------- | -------------------------------------------------- |
| Vue SPA(CSR) — 본문이 JS 후 렌더       | 높음        | 부분 완화 (빌드 시 정적 HTML 주입)                 |
| SEO 폴백이 `#app` 안 → `mount` 시 삭제 | 높음        | **수정 완료** (`#seo-static-landing` 밖)           |
| Search Console / 네이버 미등록         | 높음 (운영) | 사용자 **배포 전** 등록·제출 완료                  |
| `og-image.png` 404, OG 상대 URL        | 중간        | **수정 완료**                                      |
| www vs apex 분산                       | 중간        | 프로덕션 **301 확인** (`everyshift.co.kr` → `www`) |

---

## 구현·배포한 코드 (커밋 `f3b9753`)

**메시지:** `feat(seo): inject static landing HTML and public route meta for crawlers`

### 주요 변경

1. **`#seo-static-landing`** — `#app` 밖, Vue mount 후에도 유지
2. **빌드 주입** — `scripts/seo/render-landing-seo-html.ts` + `vite-plugin-seo-html-inject.ts` (`transformIndexHtml`)
3. **콘텐츠 단일 소스** — `src/data/publicLandingContent.ts` → `visiblePublicLandingSections` (UI·SEO 동일, `preview !== 'compare'` 제외)
4. **H1** — 슬로건 `·` 구분 (`모두의 근무표 · 근무표의 모든 것`)
5. **`@unhead/vue`** — `src/seo/usePublicRouteSeo.ts`, 랜딩/로그인/회원가입 메타, 로그인·가입 `noindex`
6. **`public/og-image.png`**, `index.html` `__SITE_URL__` / `__OG_IMAGE_URL__` 치환
7. **`robots.txt`** — `Disallow: /app`
8. **`sitemap.xml`** — `lastmod` 2026-05-30
9. **문서** — `docs/seo/search-engine-registration-guide.md`
10. **테스트** — `tests/unit/render-landing-seo-html.spec.ts`

### 관련 파일

- `index.html`, `vite.config.ts`, `src/main.ts`, `src/router/index.ts`
- `src/views/PublicLandingView.vue`, `Login.vue`, `Signup.vue`
- `public/robots.txt`, `public/sitemap.xml`, `public/og-image.png`
- `scripts/seo/*`, `src/seo/*`

---

## 프로덕션 배포 검증 (2026-05-30, curl)

**Base URL:** `https://www.everyshift.co.kr`

| 체크                                           | 결과 |
| ---------------------------------------------- | ---- |
| `/` HTTP 200                                   | OK   |
| `#seo-static-landing` + H1 `모두의 근무표 · …` | OK   |
| 섹션 `<h2>` 4개, `flexible-operations` 없음    | OK   |
| placeholder `__SITE_URL__` 누수 없음           | OK   |
| canonical / og:image 절대 URL                  | OK   |
| `/og-image.png` 200 (~53KB PNG)                | OK   |
| `/robots.txt`, `/sitemap.xml`                  | OK   |
| `/google1742d25e23edd734.html`                 | OK   |
| apex → www 301                                 | OK   |
| JS bundle `/assets/index-*.js` 200             | OK   |

**참고:** `/login` 첫 HTML의 `<title>`은 SPA 공통 `index.html` 타이틀(랜딩). `noindex`는 클라이언트 `@unhead` 적용.

---

## 사용자가 이미 한 운영 작업

> **배포 전**에 아래를 완료했다고 함. 배포 후 **전체 재등록은 불필요**; **홈 URL 재검사·색인 요청 1회**는 권장했으나 Google은 여전히 미색인.

### Google Search Console

- [x] 속성 등록 (`https://www.everyshift.co.kr`)
- [x] 소유 확인 (HTML 파일 `google1742d25e23edd734.html`)
- [x] Sitemap 제출 (`sitemap.xml`)
- [x] URL 검사 → `/` 색인 생성 요청 (배포 **전** 시점)

### 네이버 서치어드바이저

- [x] 사이트 등록·소유 확인
- [x] Sitemap 제출
- [x] 웹페이지 수집 요청 (`/`)
- [x] **배포 후 정상 동작 확인** (사용자)

### 배포 후 Google 대응

- 사용자 질의: sitemap/색인 요청을 **다시** 해야 하는지 → **sitemap 재제출 필수 아님**, **`/` URL 재검사 + 색인 요청 1회 권장**
- **실제 Google 색인:** 여전히 **미생성** (본 문서 작성 시점)

---

## 아직 하지 않은 것 (다음 세션 후보)

### Google 쪽 즉시 확인

1. **GSC → URL 검사 → `https://www.everyshift.co.kr/`**
   - **라이브 URL 테스트** (배포 후 HTML)
   - 크롤링된 HTML에 `seo-static-landing`, `모두의 근무표 ·` 포함 여부
   - **색인 생성 요청** 재실행 (배포 후 1회)
2. **Pages / 색인 생성** — 상태: “크롤됨 - 현재 색인 생성 안 됨” / “robots.txt에 의해 차단” / “리디렉션” 등 **거부 사유** 스크린샷·문구 확인
3. **`site:www.everyshift.co.kr`** vs **`site:everyshift.co.kr`** — 어느 호스트에 URL이 잡히는지
4. **속성 URL 접두어** — 등록한 속성이 `www`와 정확히 일치하는지 (도메인 속성 vs URL 접두어)

### 기술·구조 추가 조사

5. **GSC가 보는 HTML vs curl** — 라이브 테스트 결과가 curl과 동일한지 (JS 렌더링 vs raw HTML)
6. **Soft 404 / 중복** — 단일 H1·thin content 판정 여부
7. **[완료] `/login`, `/signup` in sitemap + 홈만 집중** — sitemap에서 로그인·가입 제거 및 robots.txt 차단 완료 (`95d2cd1`)
8. **Google 전용:** `robots` meta, `X-Robots-Tag` 응답 헤더 (Vercel) 확인
9. **Search Console → 설정 → 크롤링** — robots.txt 가져오기 성공 여부
10. **신규 도메인** — 색인 지연 vs 정책적 제외 구분 (2~4주 관찰 vs 명시적 오류)

### 코드 후속 (필요 시만)

11. **`/login` `/signup` 경로별 prerender** 또는 최소 head 분리 (SPA 동일 index 이슈)
12. **Google Search Console HTML 태그** 소유 확인 추가 (파일 외 이중 확인)
13. **Rich Results Test / URL Inspection API** 로 구조화 데이터 오류

---

## 알려진 제약·리스크

- **SPA**: Google은 JS 렌더링하지만, 네이버보다 느리거나 큐에 밀릴 수 있음
- **sr-only + aria-hidden** SEO 블록: 본문은 DOM에 있으나 숨김 처리 — 클로킹 오해 가능성은 낮으나 GSC 스크린샷과 대조 필요
- **색인 ≠ 순위**: 색인되어도 일반 키워드 상위는 별개
- **이전 GSC 요청**은 구 HTML 기준일 수 있음 → **배포 후 재요청 미실행 가능성** (사용자 확인 필요)

---

## 새 세션용 시작 프롬프트 (복사)

```text
EveryShift Google 색인 이슈를 이어서 조사해줘.

컨텍스트: @docs/seo/google-indexing-handoff.md

상황:
- 네이버 서치어드바이저: 정상 (수집·검색 OK)
- Google Search Console: / 색인 생성 안 됨 (site: 검색 여전히 미약)
- SEO 코드 f3b9753 배포 완료, 프로덕션 curl로 seo-static-landing·4섹션·og-image 검증됨
- GSC/네이버 sitemap·소유확인·색인(수집) 요청은 배포 전에 완료함

목표: Google이 https://www.everyshift.co.kr/ 를 색인하지 않는 원인 규명 및 수정.

먼저 GSC에서 확인할 항목(거부 사유, 라이브 URL vs curl)을 정리하고, 필요한 코드/설정 변경을 제안해줘.
```

---

## 참고 링크·파일

- 운영 가이드: [search-engine-registration-guide.md](./search-engine-registration-guide.md)
- 프로덕션: https://www.everyshift.co.kr/
- Sitemap: https://www.everyshift.co.kr/sitemap.xml
- GSC: https://search.google.com/search-console
- 라이브 HTML 스모크: `curl -sL https://www.everyshift.co.kr/ | grep -E 'seo-static-landing|모두의 근무표 ·'`
