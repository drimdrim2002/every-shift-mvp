import { useHead, useSeoMeta } from '@unhead/vue'
import { DEFAULT_PAGE_TITLE, NOINDEX_ROBOTS, SITE_NAME, toAbsoluteUrl } from '@/seo/siteMeta'

interface PublicRouteSeoInput {
  title: string
  description: string
  canonicalPath: string
  noindex?: boolean
}

function resolveDocumentTitle(title: string, noindex: boolean): string {
  if (!noindex && title === DEFAULT_PAGE_TITLE) {
    return DEFAULT_PAGE_TITLE
  }

  return `${title} | ${SITE_NAME}`
}

export function usePublicRouteSeo({
  title,
  description,
  canonicalPath,
  noindex = false,
}: PublicRouteSeoInput): void {
  const documentTitle = resolveDocumentTitle(title, noindex)
  const canonicalUrl = toAbsoluteUrl(canonicalPath)
  const ogImageUrl = toAbsoluteUrl('/og-image.png')

  useSeoMeta({
    title: documentTitle,
    description,
    robots: noindex ? NOINDEX_ROBOTS : 'index, follow',
    ogTitle: documentTitle,
    ogDescription: description,
    ogUrl: canonicalUrl,
    ogImage: ogImageUrl,
    ogSiteName: SITE_NAME,
    twitterCard: 'summary_large_image',
    twitterTitle: documentTitle,
    twitterDescription: description,
    twitterImage: ogImageUrl,
  })

  useHead({
    link: [{ rel: 'canonical', href: canonicalUrl }],
  })
}
