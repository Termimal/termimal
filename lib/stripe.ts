import Stripe from 'stripe'

// Stripe SDK is initialised lazily so a missing key fails at the call site
// (with a clear message) rather than at module import time on the edge.
function buildStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  return new Stripe(key, {
    apiVersion: '2024-04-10',
    typescript: true,
  })
}

let _stripe: Stripe | null = null
export const stripe: Stripe = new Proxy({} as Stripe, {
  get(_target, prop, receiver) {
    if (!_stripe) _stripe = buildStripe()
    return Reflect.get(_stripe, prop, receiver)
  },
}) as Stripe

/**
 * Plan / price-id catalogue.
 * Prefers env vars (real Stripe IDs starting with `price_…`). The historic
 * fallbacks like `'price_pro_monthly'` are NOT real Stripe price IDs and
 * would always 400 at the API. We now return `null` for un-configured
 * tiers so callers fail fast with a clear "plan not configured" instead.
 */
const env = (k: string): string | null => {
  const v = process.env[k]
  return v && v.startsWith('price_') ? v : null
}

export type PlanKey = 'free' | 'pro_monthly' | 'pro_yearly' | 'premium_monthly' | 'premium_yearly'

export const PLANS: Record<PlanKey, { name: string; priceId: string | null; tier: 'free' | 'pro' | 'premium' }> = {
  free:            { name: 'Free',    priceId: null,                                tier: 'free'    },
  pro_monthly:     { name: 'Pro',     priceId: env('STRIPE_PRO_MONTHLY_PRICE_ID'),  tier: 'pro'     },
  pro_yearly:      { name: 'Pro',     priceId: env('STRIPE_PRO_YEARLY_PRICE_ID'),   tier: 'pro'     },
  premium_monthly: { name: 'Premium', priceId: env('STRIPE_PREMIUM_MONTHLY_PRICE_ID'), tier: 'premium' },
  premium_yearly:  { name: 'Premium', priceId: env('STRIPE_PREMIUM_YEARLY_PRICE_ID'),  tier: 'premium' },
}

/**
 * Map a Stripe price ID to a plan tier by EXACT match against the
 * configured env vars. Substring matching (the previous behaviour) was
 * brittle: a price like `price_promo_premium_xyz` would have been
 * misclassified as Pro.
 */
export function planFromPriceId(priceId: string | null | undefined): 'free' | 'pro' | 'premium' {
  if (!priceId) return 'free'
  if (priceId === process.env.STRIPE_PRO_MONTHLY_PRICE_ID) return 'pro'
  if (priceId === process.env.STRIPE_PRO_YEARLY_PRICE_ID) return 'pro'
  if (priceId === process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID) return 'premium'
  if (priceId === process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID) return 'premium'
  return 'free'
}
