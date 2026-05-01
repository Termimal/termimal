#!/usr/bin/env ts-node
/**
 * Build-time canonical sanity check.
 *
 * Walks the app/ directory and verifies that every routable page
 * (page.tsx / page.ts / layout.tsx that owns a route) either
 *   (a) sets `alternates.canonical` via getCanonicalUrl(...), OR
 *   (b) explicitly declares `robots: { index: false }`.
 *
 * Also checks:
 *   - No two distinct routes resolve to the same canonical.
 *   - No relative-string canonicals slipped back in.
 *   - The site origin env (NEXT_PUBLIC_SITE_URL) is set in production.
 *
 * Wire this into package.json:
 *   "prebuild": "tsx scripts/check-canonicals.ts"
 *
 * Exits 1 on any violation so CI fails.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const APP_DIR = join(process.cwd(), 'app')

type Issue = { file: string; line?: number; message: string }
const issues: Issue[] = []

/**
 * Recursively walk app/ and yield every .tsx/.ts file.
 */
function* walk(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      // Ignore route groups starting with _ (private) and .next, node_modules
      if (name.startsWith('_') || name === 'node_modules' || name === '.next') continue
      yield* walk(full)
    } else if (/\.(tsx?|jsx?)$/.test(name)) {
      yield full
    }
  }
}

/**
 * A "metadata file" owns a route's metadata. In Next App Router that's
 * page.tsx / page.ts (always) and layout.tsx (when no co-located page).
 * We focus on page.tsx because layout-only metadata is unusual.
 */
function isMetadataFile(file: string): boolean {
  const base = file.split(sep).pop() ?? ''
  return base === 'page.tsx' || base === 'page.ts' || base === 'layout.tsx'
}

/**
 * Pull the route path from a file path:
 *   app/about/page.tsx              -> /about
 *   app/page.tsx                    -> /
 *   app/(marketing)/foo/page.tsx    -> /foo   (route groups are stripped)
 *   app/blog/[slug]/page.tsx        -> /blog/[slug]
 */
function routeFromFile(file: string): string {
  const rel = relative(APP_DIR, file).split(sep).slice(0, -1) // drop filename
  const parts: string[] = []
  for (const seg of rel) {
    if (seg.startsWith('(') && seg.endsWith(')')) continue // route group
    if (seg.startsWith('@')) continue // parallel slot
    parts.push(seg)
  }
  return '/' + parts.join('/')
}

/**
 * Cheap textual check: does the file mention generateMetadata or
 * `export const metadata` and reference alternates.canonical via the
 * approved helper? We deliberately don't parse TS — we just look for
 * the helper call so refactors that drift away from it are caught.
 */
function checkFile(file: string): {
  hasMetadata: boolean
  hasCanonical: boolean
  isNoindex: boolean
  hasRelativeCanonical: boolean
  canonicalArg: string | null
} {
  const text = readFileSync(file, 'utf8')

  const hasMetadata =
    /export\s+(const\s+metadata|async\s+function\s+generateMetadata)/.test(text)

  const hasCanonical = /getCanonicalUrl\s*\(/.test(text)

  const isNoindex = /robots\s*:\s*\{[^}]*index\s*:\s*false/.test(text)

  const hasRelativeCanonical = /alternates\s*:\s*\{[^}]*canonical\s*:\s*['"]\//.test(text)

  // Extract first getCanonicalUrl('...') argument if present.
  const m = text.match(/getCanonicalUrl\s*\(\s*['"]([^'"]+)['"]\s*\)/)
  const canonicalArg = m ? m[1] : null

  return { hasMetadata, hasCanonical, isNoindex, hasRelativeCanonical, canonicalArg }
}

// ── 1. NEXT_PUBLIC_SITE_URL must be set in production ────────────────
if (process.env.NODE_ENV === 'production' || process.env.CF_PAGES === '1' || process.env.VERCEL === '1') {
  if (!process.env.NEXT_PUBLIC_SITE_URL || !process.env.NEXT_PUBLIC_SITE_URL.startsWith('https://')) {
    issues.push({
      file: '.env',
      message: 'NEXT_PUBLIC_SITE_URL must be set to an absolute https://… URL in production builds. Found: ' + JSON.stringify(process.env.NEXT_PUBLIC_SITE_URL),
    })
  }
}

// ── 2. Walk every metadata file ──────────────────────────────────────
const seenCanonicals = new Map<string, string>() // canonical → first file

for (const file of walk(APP_DIR)) {
  if (!isMetadataFile(file)) continue

  const route = routeFromFile(file)

  // Routes inside dashboard / admin / api / auth / (auth) are not
  // public-indexable; they get noindex headers via next.config.js.
  // /login, /signup, /forgot-password also carry X-Robots-Tag headers.
  // Skip them — but warn if they accidentally set a canonical.
  const isWalledGarden =
    /\/(dashboard|admin|api|auth)(\/|$)/.test(route) ||
    route === '/login' ||
    route === '/signup' ||
    route === '/forgot-password'

  const { hasMetadata, hasCanonical, isNoindex, hasRelativeCanonical, canonicalArg } =
    checkFile(file)

  // Layout files without metadata are fine (most layouts don't carry SEO).
  if (file.endsWith('layout.tsx') && !hasMetadata) continue

  if (isWalledGarden) {
    if (hasCanonical) {
      issues.push({
        file,
        message: `Route ${route} is in a walled-garden path (dashboard/admin/api/auth) and should NOT set a canonical.`,
      })
    }
    continue
  }

  // Public page must declare metadata. BUT: a route's metadata can
  // legitimately come from a sibling layout.tsx (a common pattern for
  // 'use client' pages, which can't export metadata themselves).
  // Treat the route as covered if EITHER the page.tsx OR the
  // layout.tsx in the same folder has metadata + a canonical.
  if (!hasMetadata) {
    const sibling = file.endsWith('page.tsx')
      ? file.replace(/page\.tsx$/, 'layout.tsx')
      : file.replace(/layout\.tsx$/, 'page.tsx')
    let siblingHasCanonical = false
    try {
      const siblingText = readFileSync(sibling, 'utf8')
      siblingHasCanonical =
        /export\s+(const\s+metadata|async\s+function\s+generateMetadata)/.test(siblingText) &&
        /getCanonicalUrl\s*\(/.test(siblingText)
    } catch { /* sibling missing */ }
    if (siblingHasCanonical) continue
    issues.push({
      file,
      message: `Route ${route} has no metadata export and no sibling layout.tsx with one. Add either generateMetadata() with a canonical or robots: { index: false }.`,
    })
    continue
  }

  if (hasRelativeCanonical) {
    issues.push({
      file,
      message: `Route ${route} uses a RELATIVE canonical string. Replace with getCanonicalUrl('${route}').`,
    })
  }

  if (!hasCanonical && !isNoindex) {
    issues.push({
      file,
      message: `Route ${route} is missing both a canonical (getCanonicalUrl) and robots.index=false. Pick one.`,
    })
    continue
  }

  if (hasCanonical && canonicalArg) {
    if (!canonicalArg.startsWith('/')) {
      issues.push({
        file,
        message: `Route ${route} passes a non-rooted path to getCanonicalUrl: '${canonicalArg}'. Must start with '/'.`,
      })
      continue
    }
    const prev = seenCanonicals.get(canonicalArg)
    if (prev && prev !== file) {
      issues.push({
        file,
        message: `Route ${route} canonicalises to '${canonicalArg}', which is also claimed by ${prev}.`,
      })
    } else {
      seenCanonicals.set(canonicalArg, file)
    }
  }
}

// ── 3. Report ────────────────────────────────────────────────────────
if (issues.length === 0) {
  // eslint-disable-next-line no-console
  console.log('[check-canonicals] OK — every public route has a canonical or explicit noindex.')
  process.exit(0)
}

for (const i of issues) {
  // eslint-disable-next-line no-console
  console.error(`[check-canonicals] ${i.file}${i.line ? `:${i.line}` : ''}\n  ${i.message}`)
}
// eslint-disable-next-line no-console
console.error(`\n[check-canonicals] ${issues.length} issue(s) found.`)
process.exit(1)
