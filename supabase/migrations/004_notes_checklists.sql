-- Notes board checklist support
-- Run this in the same Supabase project before using workout-image checklists.

alter table public.notes
  add column if not exists kind text default 'note',
  add column if not exists checklist_items jsonb not null default '[]'::jsonb,
  add column if not exists source_image_name text,
  add column if not exists workout_date date,
  add column if not exists keep_forever boolean not null default false;

update public.notes
set kind = 'note'
where kind is null or kind not in ('note', 'checklist');

alter table public.notes
  alter column kind set default 'note';

alter table public.notes
  alter column checklist_items set default '[]'::jsonb;

alter table public.notes
  alter column keep_forever set default false;

update public.notes
set keep_forever = false
where keep_forever is null;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'notes_kind_check'
  ) then
    alter table public.notes
      drop constraint notes_kind_check;
  end if;

  alter table public.notes
    add constraint notes_kind_check
    check (kind in ('note', 'checklist'));
end $$;
