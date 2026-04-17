alter table public.students
  add column if not exists payment_mode text,
  add column if not exists fee_amount numeric(10,2);

update public.students
set payment_mode = null
where payment_mode is not null
  and payment_mode not in ('cash', 'online');

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'students_payment_mode_check'
  ) then
    alter table public.students
      drop constraint students_payment_mode_check;
  end if;

  alter table public.students
    add constraint students_payment_mode_check
    check (payment_mode is null or payment_mode in ('cash', 'online'));
end $$;
