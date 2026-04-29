import type { MetadataRoute } from 'next'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://termimal.com'

const RELEASED = new Date('2026-04-01')

type Entry = {
  path: string
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']
  priority: number
}

const routes: Entry[] = [
  { path: '',                 changeFrequency: 'daily',   priority: 1.0 },
  { path: '/features',        changeFrequency: 'weekly',  priority: 0.9 },
  { path: '/pricing',         changeFrequency: 'weekly',  priority: 0.9 },
  { path: '/platform',        changeFrequency: 'weekly',  priority: 0.8 },
  { path: '/terminal',    changeFrequency: 'weekly',  priority: 0.8 },
  { path: '/download',        changeFrequency: 'weekly',  priority: 0.8 },
  { path: '/reports',         changeFrequency: 'daily',   priority: 0.8 },
  { path: '/about',           changeFrequency: 'monthly', priority: 0.6 },
  { path: '/careers',         changeFrequency: 'weekly',  priority: 0.5 },
  { path: '/help',            changeFrequency: 'weekly',  priority: 0.7 },
  { path: '/support',         changeFrequency: 'monthly', priority: 0.5 },
  { path: '/status',          changeFrequency: 'daily',   priority: 0.4 },
  { path: '/affiliates',      changeFrequency: 'monthly', priority: 0.5 },
  { path: '/refer',           changeFrequency: 'monthly', priority: 0.5 },
  { path: '/privacy',         changeFrequency: 'yearly',  priority: 0.3 },
  { path: '/terms',           changeFrequency: 'yearly',  priority: 0.3 },
  { path: '/cookies',         changeFrequency: 'yearly',  priority: 0.3 },
  { path: '/refund-policy',   changeFrequency: 'yearly',  priority: 0.3 },
  { path: '/risk-disclaimer', changeFrequency: 'yearly',  priority: 0.3 },
]

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map(({ path, changeFrequency, priority }) => ({
    url: `${siteUrl}${path}`,
    lastModified: RELEASED,
    changeFrequency,
    priority,
  }))
}
