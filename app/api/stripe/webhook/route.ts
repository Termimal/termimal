export const runtime = 'edge';
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe } from '@/lib/stripe'
import { createAdminSupabase } from '@/lib/supabase/server'
import Stripe from 'stripe'

export async function POST(request: Request) {
  const body = await request.text()
  const headerList = await headers()
  const signature = headerList.get('Stripe-Signature') as string

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (error: any) {
    console.error('Webhook signature verification failed:', error.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createAdminSupabase()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.supabase_user_id
        if (userId && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
          const planName = getPlanFromPrice(subscription.items.data[0]?.price.id)

          await supabase.from('profiles').update({
            stripe_subscription_id: subscription.id,
            plan: planName,
            subscription_status: subscription.status,
            billing_interval: subscription.items.data[0]?.price.recurring?.interval || 'month',
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            trial_ends_at: subscription.trial_end
              ? new Date(subscription.trial_end * 1000).toISOString()
              : null,
          }).eq('id', userId)
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata?.supabase_user_id
        if (userId) {
          const planName = getPlanFromPrice(subscription.items.data[0]?.price.id)
          await supabase.from('profiles').update({
            plan: planName,
            subscription_status: subscription.status,
            billing_interval: subscription.items.data[0]?.price.recurring?.interval || 'month',
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          }).eq('id', userId)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata?.supabase_user_id
        if (userId) {
          await supabase.from('profiles').update({
            plan: 'free',
            subscription_status: 'canceled',
            stripe_subscription_id: null,
          }).eq('id', userId)
        }
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (profile) {
          await supabase.from('invoices').insert({
            user_id: profile.id,
            stripe_invoice_id: invoice.id,
            amount: (invoice.amount_paid || 0) / 100,
            currency: invoice.currency,
            status: 'paid',
            invoice_url: invoice.hosted_invoice_url,
            invoice_pdf: invoice.invoice_pdf,
            period_start: new Date((invoice.period_start || 0) * 1000).toISOString(),
            period_end: new Date((invoice.period_end || 0) * 1000).toISOString(),
          })
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (profile) {
          await supabase.from('profiles').update({
            subscription_status: 'past_due',
          }).eq('id', profile.id)
        }
        break
      }
    }
  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

function getPlanFromPrice(priceId: string): 'free' | 'pro' | 'premium' {
  // Map your Stripe price IDs to plan names
  // Update these when you create products in Stripe
  if (priceId.includes('pro')) return 'pro'
  if (priceId.includes('premium')) return 'premium'
  return 'free'
}


