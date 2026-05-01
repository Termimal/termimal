/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: false,
    // Allow next/image to load brand-accurate social icons from the
    // Simple Icons CDN. Used by <SocialIcons /> in the footer.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.simpleicons.org',
      },
    ],
  },
  // Tree-shake icon-by-icon imports from lucide-react and barrel imports from
  // @supabase/supabase-js so the marketing pages don't ship every icon and
  // every Supabase helper they don't actually use. Saves ≈100 KB of JS.
  experimental: {
    optimizePackageImports: ['lucide-react', '@supabase/supabase-js', '@supabase/ssr'],
  },
  async headers() {
    const NOINDEX = [
      { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
    ]
    return [
      { source: '/login',            headers: NOINDEX },
      { source: '/signup',           headers: NOINDEX },
      { source: '/forgot-password',  headers: NOINDEX },
      { source: '/auth/:path*',      headers: NOINDEX },
      { source: '/dashboard/:path*', headers: NOINDEX },
      { source: '/api/:path*',       headers: NOINDEX },
    ]
  },
  async redirects() {
    return [
      { source: '/faq',          destination: '/help',            permanent: true },
      { source: '/disclaimer',   destination: '/risk-disclaimer', permanent: true },
      { source: '/contact',      destination: '/support',         permanent: true },
      // Old iframe page → real same-origin terminal route.
      { source: '/web-terminal', destination: '/terminal',        permanent: true },
    ]
  },
  async rewrites() {
    // SPA fallback for the embedded Vite terminal: any deep link under
    // /terminal/* without a file extension serves the SPA's index.html so
    // the React Router inside takes over (basename = "/terminal").
    return {
      beforeFiles: [
        { source: '/terminal',                    destination: '/terminal/index.html' },
        { source: '/terminal/:path((?!.*\\.).*)', destination: '/terminal/index.html' },
      ],
    }
  },
}

module.exports = nextConfig
