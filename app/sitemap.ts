import type { MetadataRoute } from 'next'
import { getCanonicalUrl } from '@/lib/seo/canonical'

/**
 * Sitemap is the AUTHORITATIVE list of canonical, indexable URLs.
 *
 * Rules:
 *   - Only canonical URLs go here — no redirect sources, no UTM-tagged
 *     URLs, no paginated variants, no auth-walled pages.
 *   - Every URL is generated through getCanonicalUrl() so the format
 *     matches what each page sets in its alternates.canonical (HTTPS,
 *     non-www, no trailing slash).
 *   - The terminal SPA at /terminal/* is intentionally NOT here: the
 *     shell HTML has no SEO content, every sub-route serves the same
 *     near-empty document, and the SPA is gated by a noindex robots
 *     meta in public/terminal/index.html.
 *   - Auth pages (/login, /signup, /forgot-password, /dashboard/*)
 *     are intentionally NOT here — they carry an X-Robots-Tag
 *     `noindex` header set in next.config.js.
 *
 * If you add a new page that should be indexed, add it here AND make
 * sure its generateMetadata() exports an absolute canonical via
 * getCanonicalUrl().
 */

const RELEASED = new Date('2026-04-01')

type Entry = {
  path: string
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']
  priority: number
}

const routes: Entry[] = [
  // ── Top-level marketing ────────────────────────────────────────
  { path: '/',                changeFrequency: 'daily',   priority: 1.0 },
  { path: '/features',        changeFrequency: 'weekly',  priority: 0.9 },
  { path: '/pricing',         changeFrequency: 'weekly',  priority: 0.9 },
  { path: '/platform',        changeFrequency: 'weekly',  priority: 0.8 },
  { path: '/download',        changeFrequency: 'weekly',  priority: 0.8 },

  // ── Content ────────────────────────────────────────────────────
  { path: '/reports',         changeFrequency: 'daily',   priority: 0.8 },
  { path: '/about',           changeFrequency: 'monthly', priority: 0.6 },
  { path: '/careers',         changeFrequency: 'weekly',  priority: 0.5 },

  // ── Help / support ─────────────────────────────────────────────
  { path: '/help',            changeFrequency: 'weekly',  priority: 0.7 },
  { path: '/support',         changeFrequency: 'monthly', priority: 0.5 },
  { path: '/status',          changeFrequency: 'daily',   priority: 0.4 },

  // ── Programs ───────────────────────────────────────────────────
  { path: '/affiliates',      changeFrequency: 'monthly', priority: 0.5 },
  { path: '/refer',           changeFrequency: 'monthly', priority: 0.5 },

  // ── Legal ──────────────────────────────────────────────────────
  { path: '/privacy',         changeFrequency: 'yearly',  priority: 0.3 },
  { path: '/terms',           changeFrequency: 'yearly',  priority: 0.3 },
  { path: '/cookies',         changeFrequency: 'yearly',  priority: 0.3 },
  { path: '/refund-policy',   changeFrequency: 'yearly',  priority: 0.3 },
  { path: '/risk-disclaimer', changeFrequency: 'yearly',  priority: 0.3 },
]

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map(({ path, changeFrequency, priority }) => ({
    url: getCanonicalUrl(path),
    lastModified: RELEASED,
    changeFrequency,
    priority,
  }))
}
