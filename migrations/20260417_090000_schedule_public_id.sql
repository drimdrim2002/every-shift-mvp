create or replace function public.generate_schedule_public_id()
returns text
language plpgsql
as $$
declare
  candidate text;
begin
  loop
    candidate := 'sch_' || encode(gen_random_bytes(6), 'hex');
    exit when not exists (
      select 1
      from public.schedules
      where public_id = candidate
    );
  end loop;

  return candidate;
end;
$$;

alter table public.schedules
add column if not exists public_id text;

update public.schedules
set public_id = public.generate_schedule_public_id()
where public_id is null;

alter table public.schedules
alter column public_id set default public.generate_schedule_public_id();

alter table public.schedules
alter column public_id set not null;

alter table public.schedules
drop constraint if exists schedules_public_id_format_check;

alter table public.schedules
add constraint schedules_public_id_format_check
check (public_id ~ '^sch_[0-9a-f]{12}$');

create unique index if not exists schedules_public_id_key
on public.schedules (public_id);
