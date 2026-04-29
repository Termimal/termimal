// Stripe webhook handler.
//
// Runtime is Node (NOT edge) because:
//   1. `stripe.webhooks.constructEvent` uses Node's `crypto` synchronously;
//      on the edge runtime that throws or, worse, falls back to a no-op
//      that silently bypasses signature verification.
//   2. We need the raw request body byte-for-byte. On Node, Next gives us
//      `request.text()` which preserves it.
//
// This route also implements idempotency: we record `event.id` in
// `processed_webhooks` (with a unique constraint). If Stripe retries the
// same event we short-circuit before running any side effects.
export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe, planFromPriceId } from '@/lib/stripe'
import { createAdminSupabase } from '@/lib/supabase/server'
import Stripe from 'stripe'

export async function POST(request: Request) {
  const body = await request.text()
  const headerList = await headers()
  const signature = headerList.get('Stripe-Signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    // Fail closed: a misconfigured server should NEVER process a webhook
    // unauthenticated. Returning 500 makes Stripe retry once we fix the env.
    console.error('STRIPE_WEBHOOK_SECRET is not configured')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown'
    console.error('Webhook signature verification failed:', msg)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createAdminSupabase()

  // ── Idempotency ──────────────────────────────────────────────────────
  // Insert event.id with ON CONFLICT DO NOTHING. If the row already
  // existed we've already processed this event (Stripe is retrying); ack
  // with 200 so the retry loop ends.
  const { error: dedupeErr } = await supabase
    .from('processed_webhooks')
    .insert({ event_id: event.id, type: event.type })
  if (dedupeErr) {
    if ((dedupeErr as { code?: string }).code === '23505') {
      // Unique-violation: already processed.
      return NextResponse.json({ received: true, deduped: true })
    }
    // Any other DB error means we DON'T know if we've seen this event.
    // Return 500 so Stripe retries — better to double-process (which is
    // also idempotent below) than to silently drop the event.
    console.error('Webhook dedupe insert failed:', dedupeErr)
  }

  /**
   * Find the user_id behind a Stripe customer/subscription event. We
   * prefer the `stripe_customer_id` lookup (authoritative — set when we
   * created the customer) over `metadata.supabase_user_id` (which can be
   * absent on dashboard-edited subscriptions or arbitrarily set by anyone
   * with portal access).
   */
  async function resolveUserId(opts: { customerId?: string | null; metadata?: Stripe.Metadata | null }): Promise<string | null> {
    const cid = opts.customerId || null
    if (cid) {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', cid)
        .maybeSingle()
      if (data?.id) return data.id
    }
    return opts.metadata?.supabase_user_id || null
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (!session.subscription) break
        const userId = await resolveUserId({
          customerId: session.customer as string | null,
          metadata: session.metadata,
        })
        if (!userId) break

        const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
        const tier = planFromPriceId(subscription.items.data[0]?.price.id)
        await supabase.from('profiles').update({
          stripe_subscription_id: subscription.id,
          plan: tier,
          subscription_status: subscription.status,
          billing_interval: subscription.items.data[0]?.price.recurring?.interval || 'month',
          current_period_end: subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : null,
          trial_ends_at: subscription.trial_end
            ? new Date(subscription.trial_end * 1000).toISOString()
            : null,
        }).eq('id', userId)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = await resolveUserId({
          customerId: subscription.customer as string | null,
          metadata: subscription.metadata,
        })
        if (!userId) break
        const tier = planFromPriceId(subscription.items.data[0]?.price.id)
        await supabase.from('profiles').update({
          plan: tier,
          subscription_status: subscription.status,
          billing_interval: subscription.items.data[0]?.price.recurring?.interval || 'month',
          current_period_end: subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : null,
        }).eq('id', userId)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = await resolveUserId({
          customerId: subscription.customer as string | null,
          metadata: subscription.metadata,
        })
        if (!userId) break
        await supabase.from('profiles').update({
          plan: 'free',
          subscription_status: 'canceled',
          stripe_subscription_id: null,
        }).eq('id', userId)
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        const userId = await resolveUserId({ customerId: invoice.customer as string | null })
        if (!userId) break
        // Idempotent insert by stripe_invoice_id — replays of the same
        // invoice.paid event won't create duplicate rows.
        await supabase.from('invoices').upsert({
          user_id: userId,
          stripe_invoice_id: invoice.id,
          amount: (invoice.amount_paid || 0) / 100,
          currency: invoice.currency,
          status: 'paid',
          invoice_url: invoice.hosted_invoice_url,
          invoice_pdf: invoice.invoice_pdf,
          period_start: invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null,
          period_end:   invoice.period_end   ? new Date(invoice.period_end * 1000).toISOString()   : null,
        }, { onConflict: 'stripe_invoice_id' })
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const userId = await resolveUserId({ customerId: invoice.customer as string | null })
        if (!userId) break
        await supabase.from('profiles').update({
          subscription_status: 'past_due',
        }).eq('id', userId)
        break
      }
    }
  } catch (err) {
    console.error('Webhook processing error:', err)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
