-- Ticksy student schema alignment for Vercel + Supabase deployments
-- Run this in your Supabase SQL editor before using the latest frontend.

alter table public.students
  add column if not exists medical_history text,
  add column if not exists selected_days integer[] not null default '{1,2,3,4,5}';

-- Normalize older mode values into the new model.
update public.students
set mode = 'custom'
where mode = 'alternate';

update public.students
set mode = 'weekly'
where mode is null or mode not in ('weekly', 'custom');

-- If you had an older alternate_days column, copy it forward when selected_days is empty.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'students'
      and column_name = 'alternate_days'
  ) then
    execute $sql$
      update public.students
      set selected_days = alternate_days
      where mode = 'custom'
        and coalesce(array_length(selected_days, 1), 0) = 0
        and coalesce(array_length(alternate_days, 1), 0) > 0
    $sql$;
  end if;
end $$;

-- Ensure weekly students always have Mon-Fri selected.
update public.students
set selected_days = '{1,2,3,4,5}'
where mode = 'weekly';

-- Ensure custom students have at least one selected day.
update public.students
set selected_days = '{1}'
where mode = 'custom'
  and coalesce(array_length(selected_days, 1), 0) = 0;

alter table public.students
  alter column mode set default 'weekly';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'students_mode_check'
  ) then
    alter table public.students
      add constraint students_mode_check
      check (mode in ('weekly', 'custom'));
  end if;
end $$;
