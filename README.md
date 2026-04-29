# Termimal Website

Production-ready marketing website + customer portal + admin panel for Termimal.

## Stack

- **Next.js 14** (App Router)
- **Supabase** (PostgreSQL + Auth + Realtime)
- **Stripe** (Subscriptions + Billing)
- **Tailwind CSS** (Styling)
- **Vercel** (Hosting)

## Setup

### 1. Clone and install

```bash
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `supabase/schema.sql`
3. Go to **Settings → API** and copy your keys
4. Go to **Authentication → URL Configuration** and set:
   - Site URL: `http://localhost:3000`
   - Redirect URLs: `http://localhost:3000/api/auth/callback`
5. (Optional) Enable Google/GitHub OAuth in **Authentication → Providers**

### 3. Set up Stripe

1. Create an account at [stripe.com](https://stripe.com)
2. Create 2 products (Pro, Premium) with monthly + yearly prices each
3. Copy the API keys from **Developers → API Keys**
4. Set up webhook at **Developers → Webhooks**:
   - Endpoint URL: `https://your-domain.com/api/stripe/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`

### 4. Environment variables

```bash
cp .env.local.example .env.local
```

Fill in all values:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_SITE_URL`

### 5. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 6. Deploy to Vercel

1. Push to GitHub
2. Import in [vercel.com](https://vercel.com)
3. Add all environment variables
4. Deploy

Update `NEXT_PUBLIC_SITE_URL` to your production domain.
Update Stripe webhook URL to your production domain.
Update Supabase redirect URLs to your production domain.

## Routes

### Public
| Route | Description |
|---|---|
| `/` | Homepage |
| `/pricing` | Pricing page |
| `/features` | Features page |
| `/download` | Desktop app download |
| `/web-terminal` | Web terminal preview |
| `/login` | Sign in (Supabase Auth) |
| `/signup` | Create account (Supabase Auth) |
| `/forgot-password` | Password reset |

### Dashboard (requires auth)
| Route | Description |
|---|---|
| `/dashboard` | Account overview |
| `/dashboard/billing` | Subscription & invoices |
| `/dashboard/downloads` | Terminal downloads |
| `/dashboard/workspaces` | Saved workspaces |
| `/dashboard/alerts` | Alert management |
| `/dashboard/referrals` | Referral center |
| `/dashboard/profile` | Profile & security |

### Admin (requires auth + admin role)
| Route | Description |
|---|---|
| `/admin` | Admin dashboard |
| `/admin/users` | User management |
| `/admin/subscriptions` | Plans & coupons |
| `/admin/content` | Blog CMS |
| `/admin/translations` | i18n management |
| `/admin/settings` | Feature flags & system |

### API
| Route | Description |
|---|---|
| `/api/auth/callback` | Supabase auth callback |
| `/api/stripe/create-checkout` | Create Stripe checkout |
| `/api/stripe/create-portal` | Stripe billing portal |
| `/api/stripe/webhook` | Stripe webhook handler |

## Database

Schema is in `supabase/schema.sql`. Tables:

- `profiles` — user data + subscription state
- `watchlists` — user watchlists
- `alerts` — price/indicator alerts
- `workspaces` — saved layouts
- `referral_events` — referral tracking
- `support_tickets` — support system
- `articles` — blog CMS
- `invoices` — payment history
- `audit_logs` — admin audit trail
- `translations` — i18n key/values
- `feature_flags` — feature toggles
- `system_settings` — app config

All tables have RLS (Row Level Security) enabled.
