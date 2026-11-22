-- Migration 003: each incoming member books their own week-1 check-in.
-- Before this, check-ins belonged to the role, so two new members in the same role shared one.
-- Safe to re-run. Existing check-ins are removed (run `npm run seed` afterwards to recreate the demo ones).

delete from public.checkins where true;
alter table public.checkins add column if not exists user_id uuid references public.profiles on delete cascade;
alter table public.checkins alter column user_id set default auth.uid();
alter table public.checkins alter column user_id set not null;
alter table public.checkins drop constraint if exists checkins_pkey;
alter table public.checkins add primary key (role_id, user_id);
