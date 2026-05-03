-- Signup hardening: profile field length limits + disposable email block.
-- Apply via Supabase Dashboard → SQL Editor → New query → paste & run.

-- 1. Length CHECK constraints on profiles.
alter table public.profiles
  drop constraint if exists profiles_full_name_length_check,
  drop constraint if exists profiles_country_length_check,
  drop constraint if exists profiles_timezone_length_check,
  drop constraint if exists profiles_language_length_check,
  drop constraint if exists profiles_email_length_check;

alter table public.profiles
  add constraint profiles_full_name_length_check
    check (full_name is null or char_length(full_name) <= 100),
  add constraint profiles_country_length_check
    check (country is null or char_length(country) <= 56),
  add constraint profiles_timezone_length_check
    check (timezone is null or char_length(timezone) <= 64),
  add constraint profiles_language_length_check
    check (language is null or char_length(language) <= 16),
  add constraint profiles_email_length_check
    check (email is null or char_length(email) <= 254);

-- 2. Disposable email blocklist table + trigger on auth.users.
create table if not exists public.disposable_email_domains (
  domain text primary key
);

-- Seed common disposable domains. Extend this list any time.
insert into public.disposable_email_domains (domain) values
  ('10minutemail.com'),('10minutemail.net'),('20minutemail.com'),('33mail.com'),
  ('anonbox.net'),('burnermail.io'),('discardmail.com'),('disposablemail.com'),
  ('dispostable.com'),('dropmail.me'),('email-temp.com'),('emailondeck.com'),
  ('fakeinbox.com'),('getairmail.com'),('grr.la'),('guerrillamail.com'),
  ('guerrillamail.net'),('guerrillamail.org'),('guerrillamailblock.com'),('harakirimail.com'),
  ('inboxalias.com'),('inboxbear.com'),('inboxkitten.com'),('jetable.org'),
  ('mailcatch.com'),('maildrop.cc'),('mailinator.com'),('mailinator.net'),
  ('mailnesia.com'),('mintemail.com'),('mohmal.com'),('mytemp.email'),
  ('mytrashmail.com'),('nada.email'),('nobulk.com'),('nowmymail.com'),
  ('proxymail.eu'),('rcpt.at'),('sharklasers.com'),('shitmail.me'),
  ('spam4.me'),('spambox.us'),('spamgourmet.com'),('temp-mail.com'),
  ('temp-mail.org'),('temp-mail.ru'),('tempail.com'),('tempemail.com'),
  ('tempinbox.com'),('tempmail.eu'),('tempmail.us.com'),('tempmail.ws'),
  ('tempmaildemand.com'),('throwawaymail.com'),('trashmail.com'),('trashmail.de'),
  ('trashmail.net'),('trbvm.com'),('vomoto.com'),('wegwerfmail.de'),
  ('yopmail.com'),('yopmail.fr'),('yopmail.net'),('zetmail.com')
on conflict (domain) do nothing;

create or replace function public.block_disposable_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_domain text;
begin
  if new.email is null then
    return new;
  end if;
  v_domain := lower(split_part(new.email, '@', 2));
  if exists (select 1 from public.disposable_email_domains where domain = v_domain) then
    raise exception 'Disposable email addresses are not allowed.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists block_disposable_signup_trigger on auth.users;
create trigger block_disposable_signup_trigger
  before insert on auth.users
  for each row
  execute function public.block_disposable_signup();
