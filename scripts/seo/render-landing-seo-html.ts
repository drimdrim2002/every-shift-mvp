import {
  publicLandingHero,
  visiblePublicLandingSections,
} from '../../src/data/publicLandingContent'

const SEO_LANDING_INJECT_MARKER = '<!-- SEO_LANDING_INJECT -->'

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

export function renderLandingSeoHtml(): string {
  const slogan = publicLandingHero.sloganLines.join(' · ')
  const h1 = `${publicLandingHero.kicker} — ${slogan}`

  const sectionBlocks = visiblePublicLandingSections
    .map(
      (section) => `
        <section id="${escapeHtml(section.id)}">
          <h2>${escapeHtml(section.headline)}</h2>
          <p>${escapeHtml(section.description)}</p>
        </section>`,
    )
    .join('')

  return `
    <header>
      <nav aria-label="주요 메뉴">
        <a href="/">홈</a>
        <a href="/login">로그인</a>
        <a href="/signup">회원가입</a>
      </nav>
    </header>
    <main>
      <article>
        <h1>${escapeHtml(h1)}</h1>
        <p>${escapeHtml(publicLandingHero.body)}</p>
        ${sectionBlocks}
      </article>
    </main>
    <footer>
      <p>© 2026 EveryShift. 교대 근무표 자동 생성 AI 솔루션, 모두의 근무표.</p>
    </footer>
  `.trim()
}

export { SEO_LANDING_INJECT_MARKER }
