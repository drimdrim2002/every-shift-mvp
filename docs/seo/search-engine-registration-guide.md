# Search Engine Registration Guide (EveryShift)

This guide is for **operators**, not automated deployment. Complete these steps after SEO-related code is deployed to production.

## Before deploy

1. Confirm `https://everyshift.co.kr` redirects to `https://www.everyshift.co.kr` (301).
2. Verify these URLs return **200**:
   - `/robots.txt`
   - `/sitemap.xml`
   - `/google1742d25e23edd734.html`
   - `/naver63b1f8e659c7ada897c2d261e472b6e6.html`

## After deploy

### Google Search Console

1. Open https://search.google.com/search-console
2. Add property: `https://www.everyshift.co.kr`
3. Verify ownership via HTML file (`google1742d25e23edd734.html`)
4. Submit sitemap: `https://www.everyshift.co.kr/sitemap.xml`
5. URL Inspection → `https://www.everyshift.co.kr/` → **Request indexing**
6. Re-run live URL test and confirm landing copy appears in the crawled HTML

### Naver Search Advisor

1. Open https://searchadvisor.naver.com/
2. Register the same host (`www`)
3. Verify ownership (meta tag in `index.html` or HTML file)
4. Submit sitemap
5. **Request collection** for `https://www.everyshift.co.kr/`

## Smoke test

```bash
curl -sL https://www.everyshift.co.kr/ | grep -E '모두의 근무표|교대 근무표'
```

You should see landing keywords in the first HTML response (without executing JavaScript).

## Success criteria (1–2 weeks)

- `site:www.everyshift.co.kr` shows at least one URL
- GSC **Pages** reports `/` as indexed
