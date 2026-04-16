-- Batch holidays for month-level attendance planning
-- Run this in the same Supabase project before using holiday marking in Calendar.

create table if not exists public.batch_holidays (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  slot_id uuid references public.slots(id) on delete cascade,
  holiday_date date not null,
  created_at timestamptz default now(),
  unique(slot_id, holiday_date)
);

alter table public.batch_holidays enable row level security;

drop policy if exists user_owns_batch_holidays on public.batch_holidays;

create policy user_owns_batch_holidays
on public.batch_holidays
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create index if not exists batch_holidays_user_id_idx on public.batch_holidays(user_id);
create index if not exists batch_holidays_slot_date_idx on public.batch_holidays(slot_id, holiday_date);
