# Pull request

## Summary
<!-- 1–3 bullets: what changed and why. -->

## SEO checklist
- [ ] New pages have `generateMetadata()` with absolute `alternates.canonical` via `getCanonicalUrl()` (no relative strings)
- [ ] No new redirects were added without removing the source URL from `app/sitemap.ts`
- [ ] No new pages added to `app/sitemap.ts` that are intentionally `noindex`
- [ ] Dynamic routes (`[slug]`, `[id]`, …) derive canonical from the actual params, not a hardcoded string
- [ ] Paginated variants (`/blog/page/2`) canonicalise to page 1 and set `robots: { index: false, follow: true }`
- [ ] No global canonical was added to `app/layout.tsx` (must be per-page)
- [ ] Ran `npm run check:seo` locally and it passed
- [ ] No new tracking parameters (`utm_*`, `ref`, `fbclid`, `gclid`) appear in any internal link — they belong on outbound campaigns only

## Test plan
<!-- How to verify the change. Include reproduction steps if it's a fix. -->

## Screenshots (if UI)
<!-- Drag and drop here. -->
