-- Ticksy production student schema sync
-- Run this in the actual Supabase project used by your frontend before deployment.

alter table public.students
  add column if not exists mode text default 'weekly',
  add column if not exists medical_history text,
  add column if not exists selected_days integer[] not null default '{1,2,3,4,5}',
  add column if not exists alternate_days integer[];

-- Normalize legacy mode values.
update public.students
set mode = 'custom'
where mode = 'alternate';

update public.students
set mode = 'weekly'
where mode is null or mode not in ('weekly', 'custom');

-- Carry forward any legacy alternate_days into selected_days for custom students.
update public.students
set selected_days = alternate_days
where mode = 'custom'
  and coalesce(array_length(selected_days, 1), 0) = 0
  and coalesce(array_length(alternate_days, 1), 0) > 0;

-- Ensure weekly students always have Mon-Fri selected.
update public.students
set selected_days = '{1,2,3,4,5}'
where mode = 'weekly'
  and (
    selected_days is null
    or coalesce(array_length(selected_days, 1), 0) = 0
  );

-- Ensure custom students have at least one selected day.
update public.students
set selected_days = '{1}'
where mode = 'custom'
  and coalesce(array_length(selected_days, 1), 0) = 0;

alter table public.students
  alter column mode set default 'weekly';

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'students_mode_check'
  ) then
    alter table public.students
      drop constraint students_mode_check;
  end if;

  alter table public.students
    add constraint students_mode_check
    check (mode in ('weekly', 'custom'));
end $$;

create index if not exists students_user_id_idx on public.students(user_id);
create index if not exists students_mode_idx on public.students(mode);
