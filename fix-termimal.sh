#!/usr/bin/env bash
set -e

REPO="https://github.com/Termimal/termimal.git"
BRANCH="fix/faq-schema-and-ordering"

echo "→ Cloning termimal..."
git clone "$REPO" termimal-fix
cd termimal-fix

git checkout -b "$BRANCH"

# ─────────────────────────────────────────────
# 1. Patch supabase/schema.sql
# ─────────────────────────────────────────────
python3 - << 'PYEOF'
with open("supabase/schema.sql", "r") as f:
    content = f.read()

faq_table = """
-- ─── FAQs (CMS-managed) ───
create table public.faqs (
  id         uuid default gen_random_uuid() primary key,
  question   text not null,
  answer     text not null,
  is_active  boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

"""

faq_rls = """
alter table public.faqs enable row level security;

create policy "Anyone can read active faqs"
  on public.faqs for select
  using (is_active = true);

"""

faq_trigger = """
create trigger update_faqs_updated_at before update on public.faqs
  for each row execute procedure public.update_updated_at();
"""

rls_marker = "-- ═══════════════════════════════════════════\n-- ROW LEVEL SECURITY"
trigger_marker = "create trigger update_profiles_updated_at"
insert_after_trigger = "create trigger update_articles_updated_at before update on public.articles\n  for each row execute procedure public.update_updated_at();"

# Insert table definition before RLS section
if "create table public.faqs" not in content:
    content = content.replace(rls_marker, faq_table + rls_marker)

# Insert RLS policy after articles policy
articles_rls = 'create policy "Anyone can read published articles" on public.articles for select using (status = \'published\');'
if '"Anyone can read active faqs"' not in content:
    content = content.replace(articles_rls, articles_rls + "\n" + faq_rls)

# Insert trigger after articles trigger
if "update_faqs_updated_at" not in content:
    content = content.replace(insert_after_trigger, insert_after_trigger + "\n" + faq_trigger)

with open("supabase/schema.sql", "w") as f:
    f.write(content)

print("✓ supabase/schema.sql patched")
PYEOF

# ─────────────────────────────────────────────
# 2. Patch components/HomeFaq.tsx
# ─────────────────────────────────────────────
python3 - << 'PYEOF'
with open("components/HomeFaq.tsx", "r") as f:
    content = f.read()

old_query = """\
      const { data } = await supabase
        .from('faqs')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true })"""

new_query = """\
      const { data } = await supabase
        .from('faqs')
        .select('id, question, answer')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })"""

if "sort_order" not in content:
    content = content.replace(old_query, new_query)

with open("components/HomeFaq.tsx", "w") as f:
    f.write(content)

print("✓ components/HomeFaq.tsx patched")
PYEOF

# ─────────────────────────────────────────────
# 3. Commit & push
# ─────────────────────────────────────────────
git add supabase/schema.sql components/HomeFaq.tsx
git commit -m "fix: add faqs table to schema and fix sort_order in HomeFaq"
git push origin "$BRANCH"

echo ""
echo "✅ Done! Branch '$BRANCH' pushed to termimal."
echo "   Open a PR at: https://github.com/Termimal/termimal/compare/$BRANCH"
