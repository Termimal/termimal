import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

export const revalidate = 0; // Ensures it updates instantly when you change it in Admin

export default async function SiteBanner() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data } = await supabase
    .from('site_settings')
    .select('promo_active, promo_text, promo_link')
    .eq('id', 'global')
    .single()

  // If the toggle is OFF in the admin panel, render absolutely nothing
  if (!data?.promo_active || !data?.promo_text) return null

  // If the toggle is ON, render the banner
  return (
    <div className="w-full py-2.5 px-4 text-center text-sm font-medium z-50 relative" style={{ background: 'var(--acc)', color: 'white' }}>
      <Link href={data.promo_link || '#'} className="hover:opacity-80 transition-opacity flex items-center justify-center gap-2">
        <span>{data.promo_text}</span>
        <span className="opacity-80">&rarr;</span>
      </Link>
    </div>
  )
}
