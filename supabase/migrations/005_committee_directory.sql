-- Migration 005: committee directory (everyone on the committee, their role, email and dates).
-- Shown in the Role guide. Safe to re-run; keeps existing data.

create table if not exists public.committee_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  committee_role text not null default '',
  email text not null default '',
  joined_on date,
  left_on date, -- null while they are still on the committee
  position int not null default 0,
  updated_at timestamptz not null default now()
);

drop trigger if exists set_updated_at on public.committee_members;
create trigger set_updated_at before update on public.committee_members
  for each row execute function public.set_updated_at();

alter table public.committee_members enable row level security;
grant select, insert, update, delete on public.committee_members to authenticated;
grant all on public.committee_members to service_role;

drop policy if exists "members manage committee_members" on public.committee_members;
create policy "members manage committee_members" on public.committee_members for all to authenticated
  using (true) with check (true);
