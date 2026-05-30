import type { Plugin } from 'vite'
import { renderLandingSeoHtml, SEO_LANDING_INJECT_MARKER } from './render-landing-seo-html'

const DEFAULT_SITE_URL = 'https://www.everyshift.co.kr'

function resolveSiteUrl(env: Record<string, string>): string {
  const configured = (env.VITE_SITE_URL || '').trim().replace(/\/$/, '')
  return configured || DEFAULT_SITE_URL
}

function applySiteUrlToHtml(html: string, siteUrl: string): string {
  const ogImageUrl = `${siteUrl}/og-image.png`

  return html.replaceAll('__SITE_URL__', siteUrl).replaceAll('__OG_IMAGE_URL__', ogImageUrl)
}

export function seoHtmlInjectPlugin(env: Record<string, string> = {}): Plugin {
  const siteUrl = resolveSiteUrl(env)

  return {
    name: 'everyshift-seo-html-inject',
    transformIndexHtml(html) {
      const seoHtml = renderLandingSeoHtml()

      if (!html.includes(SEO_LANDING_INJECT_MARKER)) {
        throw new Error(`Missing ${SEO_LANDING_INJECT_MARKER} in index.html`)
      }

      const withSeo = html.replace(SEO_LANDING_INJECT_MARKER, seoHtml)
      return applySiteUrlToHtml(withSeo, siteUrl)
    },
  }
}
