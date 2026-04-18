create table if not exists public.batch_makeup_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  slot_id uuid references public.slots(id) on delete cascade,
  session_date date not null,
  created_at timestamptz default now(),
  unique(slot_id, session_date)
);

alter table public.batch_makeup_sessions enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'batch_makeup_sessions'
      and policyname = 'user_owns_batch_makeup_sessions'
  ) then
    create policy "user_owns_batch_makeup_sessions"
    on public.batch_makeup_sessions
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
  end if;
end $$;

create index if not exists batch_makeup_sessions_slot_id_idx
  on public.batch_makeup_sessions(slot_id);

create index if not exists batch_makeup_sessions_user_id_idx
  on public.batch_makeup_sessions(user_id);
