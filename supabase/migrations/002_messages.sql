-- Migration 002: in-app messages and buddy accounts.
-- For a project that already ran the original schema.sql. Safe to re-run; keeps existing data.
-- (A fresh project only needs schema.sql, which already includes this.)

-- The buddy is now a member account, so messages reach them.
alter table public.roles add column if not exists buddy_id uuid references public.profiles on delete set null;
alter table public.roles drop column if exists buddy_email;

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles on delete cascade default auth.uid(),
  recipient_id uuid not null references public.profiles on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists messages_recipient_idx on public.messages (recipient_id, read_at);
create index if not exists messages_sender_idx on public.messages (sender_id, created_at);

alter table public.messages enable row level security;
grant select, insert on public.messages to authenticated;
grant update (read_at) on public.messages to authenticated;
grant all on public.messages to service_role;

drop policy if exists "read your conversations" on public.messages;
drop policy if exists "send as yourself" on public.messages;
drop policy if exists "mark received messages read" on public.messages;

-- Only the two people in a conversation can see it.
create policy "read your conversations" on public.messages for select to authenticated
  using (sender_id = auth.uid() or recipient_id = auth.uid());
create policy "send as yourself" on public.messages for insert to authenticated
  with check (sender_id = auth.uid() and recipient_id <> auth.uid());
-- Recipients can only change read_at (see the column grant above).
create policy "mark received messages read" on public.messages for update to authenticated
  using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());
