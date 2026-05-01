# SEO policy

This document is the source of truth for canonical URLs, indexability,
and the sitemap on termimal.com.

## Canonical-URL rules

1. **Always absolute.** Every `alternates.canonical` value is an absolute
   `https://termimal.com/...` URL produced by
   `getCanonicalUrl()` from `lib/seo/canonical.ts`. Relative strings
   (`'/about'`) are rejected by the prebuild check.

2. **Always HTTPS, always non-www.** The helper enforces both.

3. **No trailing slash** except on the root (`/`).

4. **Tracking parameters are stripped.**
   `middleware.ts` 301-redirects any GET with `utm_*`, `ref`, `fbclid`,
   `gclid`, `msclkid`, `mc_cid`, `mc_eid`, `yclid`, `dclid`, `igshid`,
   `wbraid`, `gbraid`, `campaign`, `source`, `medium` to the same path
   without those params. Internal links must NEVER include them.

5. **No global canonical.** `app/layout.tsx` deliberately does not
   set `alternates.canonical`. Each page sets its own.

## Pages that intentionally do NOT get indexed

| URL pattern        | Reason                                                                | Mechanism                                         |
|--------------------|-----------------------------------------------------------------------|---------------------------------------------------|
| `/login`           | Auth gate, no SEO value, account-enumeration risk if indexed          | `X-Robots-Tag: noindex,nofollow,noarchive` (next.config.js) |
| `/signup`          | Same                                                                  | Same                                              |
| `/forgot-password` | Same                                                                  | Same                                              |
| `/auth/*`          | OAuth callback URLs                                                   | Same                                              |
| `/dashboard/*`     | Authenticated user dashboard, every URL is per-user                   | Same                                              |
| `/api/*`           | Server endpoints                                                      | Same                                              |
| `/terminal`        | SPA shell — empty until React hydrates, every sub-route serves the same near-empty HTML | `<meta name="robots" content="noindex,follow" />` in `public/terminal/index.html` |
| `/terminal/*`      | All SPA sub-routes serve the same shell HTML                          | Same — covered by the shell's noindex             |

## Pages that ARE indexed

See `app/sitemap.ts`. The sitemap is the authoritative list of canonical,
indexable URLs. Every page in it sets a self-canonical via `getCanonicalUrl()`.

## Build-time enforcement

`npm run check:seo` (also wired as `prebuild`) walks `app/` and fails if:

- Any public page is missing both a `getCanonicalUrl()` canonical and an
  explicit `robots: { index: false }`
- Any page passes a non-`/`-rooted string to `getCanonicalUrl()`
- Two distinct routes resolve to the same canonical
- Any walled-garden route (`/dashboard`, `/admin`, `/auth`, `/api`)
  accidentally sets a canonical
- `NEXT_PUBLIC_SITE_URL` is missing or non-https in production

## Dynamic-route canonicals

Dynamic routes derive canonical from the actual params, never a hardcoded
string. Example for a `[slug]` route:

```ts
// app/blog/[slug]/page.tsx
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  return {
    alternates: { canonical: getCanonicalUrl(`/blog/${slug}`) },
  }
}
```

## Paginated routes

Paginated list pages canonicalise to page 1 and noindex pages 2+:

```ts
// app/blog/page/[n]/page.tsx
export async function generateMetadata({ params }: { params: Promise<{ n: string }> }): Promise<Metadata> {
  const { n } = await params
  if (n === '1') {
    return { alternates: { canonical: getCanonicalUrl('/blog') } }
  }
  return {
    alternates: { canonical: getCanonicalUrl('/blog') },
    robots: { index: false, follow: true },
  }
}
```

## Cloudflare-side checks

Verify in the Cloudflare dashboard:

- **No Page Rules / Transform Rules** rewrite URLs in a way that
  conflicts with the canonical direction. Specifically: there must NOT
  be a `www.termimal.com → termimal.com` rule that conflicts with the
  helper (we use non-www, so any www→apex rule is consistent and
  fine — but verify it).
- **Cache rules** must not serve cached responses with a stale `Link:
  rel=canonical` header from a prior deploy.
- **Email Address Obfuscation / Rocket Loader** must not inject
  inline `<script>` tags that break our CSP. Disable both for
  termimal.com if necessary.
- **Cloudflare** must NOT strip the `X-Robots-Tag` HTTP header. Some
  optimisation features (Auto Minify) are safe; aggressive header
  stripping is not.
