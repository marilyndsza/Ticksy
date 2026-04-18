alter table public.students
  add column if not exists date_joined date,
  add column if not exists age integer;

update public.students
set age = null
where age is not null and age < 0;
