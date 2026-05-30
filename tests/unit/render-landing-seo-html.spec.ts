import { describe, expect, it } from 'vitest'
import { renderLandingSeoHtml } from '../../scripts/seo/render-landing-seo-html'
import { publicLandingHero } from '@/data/publicLandingContent'

describe('renderLandingSeoHtml', () => {
  it('includes hero and section copy for crawlers', () => {
    const html = renderLandingSeoHtml()

    expect(html).toContain(publicLandingHero.sloganLines[0])
    expect(html).toContain('모두의 근무표')
    expect(html).toContain(publicLandingHero.body.slice(0, 24))
    expect(html).toContain('<h1>')
    expect(html).toContain('href="/login"')
    expect(html).toContain('href="/signup"')
    expect(html).toContain('모두의 근무표 · 근무표의 모든 것')
    expect(html).not.toContain('id="flexible-operations"')
  })
})
