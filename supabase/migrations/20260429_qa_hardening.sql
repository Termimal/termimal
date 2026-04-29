-- ════════════════════════════════════════════════════════════════════
-- QA hardening migration
-- Date: 2026-04-29
--
-- Closes the security gaps surfaced by the Phase-6 audit:
--   1. Lock down updatable columns on `profiles` so users cannot
--      self-promote `role`, `plan`, or any `stripe_*` field.
--   2. Enable RLS + appropriate policies on `feature_flags`,
--      `translations`, and `system_settings` (currently anon-writable).
--   3. Add `processed_webhooks` table for Stripe event idempotency.
--   4. Add `on delete set null` / `cascade` to FKs that previously
--      blocked user deletion.
--   5. Harden `handle_new_user` trigger with a non-guessable referral
--      code and explicit search_path.
--
-- Run from the Supabase SQL editor. Idempotent — safe to re-run.
-- ════════════════════════════════════════════════════════════════════

-- ─── 1. profiles: prevent privilege escalation via UPDATE ───
-- The previous policy `using (auth.uid() = id)` allowed users to update
-- ANY column of their own row, including `plan` and `role`. The fix
-- below replaces that update policy with one whose `with check` clause
-- enforces that privileged columns must equal their existing values.
-- Practically: a malicious update like
--     update profiles set plan = 'premium' where id = auth.uid()
-- will be rejected by the WITH CHECK constraint (the candidate row
-- has plan='premium' but the comparison row in profiles still has the
-- old plan, so the predicate is false → row blocked).

drop policy if exists "Users can update own profile" on public.profiles;

create policy "Users can update own profile"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role                   = (select role                   from public.profiles where id = auth.uid())
    and plan                   = (select plan                   from public.profiles where id = auth.uid())
    and subscription_status    is not distinct from (select subscription_status    from public.profiles where id = auth.uid())
    and stripe_customer_id     is not distinct from (select stripe_customer_id     from public.profiles where id = auth.uid())
    and stripe_subscription_id is not distinct from (select stripe_subscription_id from public.profiles where id = auth.uid())
    and trial_ends_at          is not distinct from (select trial_ends_at          from public.profiles where id = auth.uid())
    and current_period_end     is not distinct from (select current_period_end     from public.profiles where id = auth.uid())
    and billing_interval       is not distinct from (select billing_interval       from public.profiles where id = auth.uid())
    and referral_code          is not distinct from (select referral_code          from public.profiles where id = auth.uid())
  );

-- Allow users to delete their own profile (cascades to their data).
-- Used by the "Delete account" button.
drop policy if exists "Users can delete own profile" on public.profiles;
create policy "Users can delete own profile"
  on public.profiles
  for delete
  using (auth.uid() = id);


-- ─── 2. feature_flags / translations / system_settings RLS ───
-- These tables previously had no `enable row level security`, which
-- means the anon key could read AND write them via the REST API.
-- system_settings includes `maintenance_mode` and version strings —
-- we definitely don't want anonymous writes.

alter table public.feature_flags    enable row level security;
alter table public.translations     enable row level security;
alter table public.system_settings  enable row level security;

-- feature_flags: world-readable (used by the app to toggle UI), no
-- writes from clients (admins use the service-role key).
drop policy if exists "feature_flags read" on public.feature_flags;
create policy "feature_flags read"
  on public.feature_flags for select
  using (true);

-- translations: world-readable.
drop policy if exists "translations read" on public.translations;
create policy "translations read"
  on public.translations for select
  using (true);

-- system_settings: also world-readable so the marketing site can show
-- maintenance banners, but the values exposed must be safe.
drop policy if exists "system_settings read" on public.system_settings;
create policy "system_settings read"
  on public.system_settings for select
  using (true);


-- ─── 3. Stripe webhook idempotency ───
create table if not exists public.processed_webhooks (
  event_id text primary key,
  type     text not null,
  received_at timestamptz default now()
);

-- This table is only ever written by the service-role key from the
-- webhook handler, but enabling RLS prevents accidental reads via
-- the anon key.
alter table public.processed_webhooks enable row level security;
-- No client policies — service role bypasses RLS, which is what we want.


-- ─── 4. FK on-delete behaviour ───
-- Without these clauses, deleting a user fails with "violates foreign
-- key constraint" because rows in referenced tables still point at the
-- deleted profile. We use `set null` for soft references (referrer,
-- assignee, author) and `cascade` for owned data.

-- profiles.referred_by → profiles(id)
do $$ begin
  alter table public.profiles
    drop constraint if exists profiles_referred_by_fkey;
  alter table public.profiles
    add constraint profiles_referred_by_fkey
    foreign key (referred_by) references public.profiles(id) on delete set null;
end $$;

-- referral_events.referrer_id / referred_id
do $$ begin
  alter table public.referral_events
    drop constraint if exists referral_events_referrer_id_fkey;
  alter table public.referral_events
    add constraint referral_events_referrer_id_fkey
    foreign key (referrer_id) references public.profiles(id) on delete cascade;
  alter table public.referral_events
    drop constraint if exists referral_events_referred_id_fkey;
  alter table public.referral_events
    add constraint referral_events_referred_id_fkey
    foreign key (referred_id) references public.profiles(id) on delete cascade;
end $$;

-- support_tickets.assigned_to
do $$ begin
  alter table public.support_tickets
    drop constraint if exists support_tickets_assigned_to_fkey;
  alter table public.support_tickets
    add constraint support_tickets_assigned_to_fkey
    foreign key (assigned_to) references public.profiles(id) on delete set null;
end $$;

-- articles.author_id
do $$ begin
  alter table public.articles
    drop constraint if exists articles_author_id_fkey;
  alter table public.articles
    add constraint articles_author_id_fkey
    foreign key (author_id) references public.profiles(id) on delete set null;
end $$;

-- audit_logs.user_id
do $$ begin
  alter table public.audit_logs
    drop constraint if exists audit_logs_user_id_fkey;
  alter table public.audit_logs
    add constraint audit_logs_user_id_fkey
    foreign key (user_id) references public.profiles(id) on delete set null;
end $$;


-- ─── 5. handle_new_user — non-guessable referral code + search_path ───
-- The previous code generated `'REF' || substring(id::text, 1, 8)`, which
-- is enumerable from a leaked user ID. Replace with 8 hex chars from
-- gen_random_bytes (cryptographic). Also hard-set search_path to defeat
-- search-path injection on a SECURITY DEFINER function.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  ref_code text;
begin
  ref_code := 'REF' || upper(encode(gen_random_bytes(4), 'hex'));
  insert into public.profiles (id, email, full_name, referral_code, referred_by)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    ref_code,
    -- Optional referral attribution: signup form passes the ?ref code in
    -- options.data.referral_code; we look up the referrer by their code.
    (select id from public.profiles
       where referral_code = nullif(new.raw_user_meta_data->>'referral_code', '')
       limit 1)
  );
  return new;
end;
$$;

-- Same hardening for the timestamp trigger.
create or replace function public.update_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
