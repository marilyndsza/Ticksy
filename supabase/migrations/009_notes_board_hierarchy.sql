alter table public.notes
  add column if not exists is_pinned boolean not null default false,
  add column if not exists board_order integer not null default 0;

update public.notes
set is_pinned = false
where is_pinned is null;

with ordered_notes as (
  select id, row_number() over (order by created_at asc) - 1 as next_order
  from public.notes
)
update public.notes
set board_order = ordered_notes.next_order
from ordered_notes
where public.notes.id = ordered_notes.id
  and (public.notes.board_order is null or public.notes.board_order = 0);
