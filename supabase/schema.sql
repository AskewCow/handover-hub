-- Handover Hub database schema.
-- Run once in Supabase → SQL Editor (safe to re-run: it drops and recreates the app's objects).
-- Demo content and test accounts are added afterwards with `npm run seed`.

-- ---------------------------------------------------------------------------
-- Reset (app objects only; auth.users is left untouched)
-- ---------------------------------------------------------------------------
drop trigger if exists on_auth_user_created on auth.users;
drop table if exists public.messages, public.assistant_questions, public.handover_sections, public.checkin_notes,
  public.checkins, public.decisions, public.tasks, public.contacts, public.onboarding_completions,
  public.onboarding_steps, public.recurring_tasks, public.week_items, public.responsibilities,
  public.profiles, public.roles cascade;
drop function if exists public.handle_new_user, public.set_updated_at, public.is_lead, public.ping,
  public.role_options cascade;
drop type if exists public.member_type, public.task_status, public.onboarding_phase,
  public.checkin_status, public.handover_section cascade;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.member_type as enum ('incoming', 'outgoing', 'lead');
create type public.task_status as enum ('todo', 'in_progress', 'done');
create type public.onboarding_phase as enum ('Access', 'Introductions', 'First tasks');
create type public.checkin_status as enum ('not_booked', 'scheduled', 'complete');
create type public.handover_section as enum ('responsibilities', 'recurring_tasks', 'key_contacts', 'decisions', 'lessons');

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------
create function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- One committee role (e.g. Partnerships Lead) and its role-guide basics.
create table public.roles (
  id text primary key,
  title text not null,
  society text not null default 'Claude Builder Club',
  term text not null default '2025/26',
  summary text not null default '',
  peak_note text not null default '',
  position int not null default 0,
  buddy_name text not null default '',
  buddy_title text not null default '',
  buddy_note text not null default '',
  checkin_prompts text[] not null default array[
    'What feels unclear or harder than expected?',
    'Are you waiting on access, context, or another person?',
    'What is one decision you feel ready to own?',
    'What should we revisit at the end of week two?'
  ],
  reviewed_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One row per account. Created automatically on sign-up (see trigger below).
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text not null default '',
  member_type public.member_type not null default 'incoming',
  role_id text references public.roles on delete set null,
  created_at timestamptz not null default now()
);

create table public.responsibilities (
  id uuid primary key default gen_random_uuid(),
  role_id text not null references public.roles on delete cascade,
  body text not null,
  position int not null default 0,
  updated_at timestamptz not null default now()
);

-- "Typical week" entries on the role guide.
create table public.week_items (
  id uuid primary key default gen_random_uuid(),
  role_id text not null references public.roles on delete cascade,
  day text not null,
  body text not null,
  position int not null default 0,
  updated_at timestamptz not null default now()
);

create table public.recurring_tasks (
  id uuid primary key default gen_random_uuid(),
  role_id text not null references public.roles on delete cascade,
  name text not null,
  schedule text not null default '',
  tool text not null default '',
  duration text not null default '',
  position int not null default 0,
  updated_at timestamptz not null default now()
);

create table public.onboarding_steps (
  id uuid primary key default gen_random_uuid(),
  role_id text not null references public.roles on delete cascade,
  title text not null,
  phase public.onboarding_phase not null,
  due_day int not null default 1, -- days after the member joined
  position int not null default 0,
  link text -- optional: an app page such as '#/buddy', or an external https:// URL
);

-- Each member ticks their own checklist.
create table public.onboarding_completions (
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  step_id uuid not null references public.onboarding_steps on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, step_id)
);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  role_id text not null references public.roles on delete cascade,
  name text not null,
  owner text not null default '',
  ask_about text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  role_id text not null references public.roles on delete cascade,
  title text not null,
  status public.task_status not null default 'todo',
  assignee text,
  due_date date,
  contact_id uuid references public.contacts on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.decisions (
  id uuid primary key default gen_random_uuid(),
  role_id text not null references public.roles on delete cascade,
  decided_on date not null default current_date,
  title text not null,
  reason text not null default '',
  tried_before text not null default '',
  author text not null default '',
  created_by uuid references auth.users on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

-- Each incoming member's week-1 check-in with their buddy.
create table public.checkins (
  role_id text not null references public.roles on delete cascade,
  user_id uuid not null references public.profiles on delete cascade default auth.uid(),
  status public.checkin_status not null default 'not_booked',
  scheduled_at timestamptz,
  outcome text not null default '',
  updated_at timestamptz not null default now(),
  primary key (role_id, user_id)
);

-- Private notes: only the author can read them.
create table public.checkin_notes (
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  role_id text not null references public.roles on delete cascade,
  body text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

-- The outgoing member's guided handover form (one draft per section per role).
create table public.handover_sections (
  role_id text not null references public.roles on delete cascade,
  section public.handover_section not null,
  title text not null default '',
  body text not null default '',
  updated_by uuid references auth.users on delete set null default auth.uid(),
  updated_at timestamptz not null default now(),
  primary key (role_id, section)
);

-- Questions asked to the assistant: used for rate limiting and as test evidence.
create table public.assistant_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  role_id text not null references public.roles on delete cascade,
  question text not null,
  created_at timestamptz not null default now()
);

create index on public.responsibilities (role_id);
create index on public.week_items (role_id);
create index on public.recurring_tasks (role_id);
create index on public.onboarding_steps (role_id);
create index on public.contacts (role_id);
create index on public.tasks (role_id);
create index on public.decisions (role_id);
create index on public.assistant_questions (user_id, created_at);

-- updated_at triggers
do $$
declare t text;
begin
  foreach t in array array['roles', 'responsibilities', 'week_items', 'recurring_tasks', 'contacts',
                           'tasks', 'checkins', 'checkin_notes', 'handover_sections'] loop
    execute format('create trigger set_updated_at before update on public.%I
                    for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Auth: create a profile for every new account
-- ---------------------------------------------------------------------------
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  requested_type text := new.raw_user_meta_data ->> 'member_type';
  requested_role text := new.raw_user_meta_data ->> 'role_id';
begin
  insert into public.profiles (id, full_name, member_type, role_id)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    -- Self sign-up can never grant the lead role; leads are set by `npm run seed` or in the dashboard.
    case when requested_type = 'outgoing' then 'outgoing'::public.member_type else 'incoming'::public.member_type end,
    (select id from public.roles where id = requested_role)
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.is_lead() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and member_type = 'lead');
$$;

-- Called daily by /api/keepalive so the free Supabase project is never paused for inactivity.
create function public.ping() returns int
language sql stable as $$ select 1 $$;
grant execute on function public.ping() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- API access
-- Granted explicitly, so this works whether or not the project was created with
-- "Grant API access to new tables automatically". Row level security below still
-- decides which rows each signed-in member can touch.
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant execute on function public.is_lead() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Row level security
-- The society shares one workspace: any signed-in member can read and edit role content.
-- Personal data (checklist ticks, private notes, assistant questions) stays with its owner.
-- ---------------------------------------------------------------------------
alter table public.roles enable row level security;
alter table public.profiles enable row level security;
alter table public.responsibilities enable row level security;
alter table public.week_items enable row level security;
alter table public.recurring_tasks enable row level security;
alter table public.onboarding_steps enable row level security;
alter table public.onboarding_completions enable row level security;
alter table public.contacts enable row level security;
alter table public.tasks enable row level security;
alter table public.decisions enable row level security;
alter table public.checkins enable row level security;
alter table public.checkin_notes enable row level security;
alter table public.handover_sections enable row level security;
alter table public.assistant_questions enable row level security;

-- Roles: everyone reads and updates; only leads add or remove roles.
create policy "members read roles" on public.roles for select to authenticated using (true);
create policy "members update roles" on public.roles for update to authenticated using (true) with check (true);
create policy "leads insert roles" on public.roles for insert to authenticated with check (public.is_lead());
create policy "leads delete roles" on public.roles for delete to authenticated using (public.is_lead());

-- Profiles: names are visible to members. Members may change their own name and role,
-- but never their member type (so nobody can make themselves a lead).
create policy "members read profiles" on public.profiles for select to authenticated using (true);
create policy "members update own profile" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.profiles from authenticated;
grant update (full_name, role_id) on public.profiles to authenticated;

-- Role names for the sign-up form (shown before the visitor has an account).
create function public.role_options() returns table (id text, title text)
language sql stable security definer set search_path = '' as $$
  select id, title from public.roles order by position;
$$;
grant execute on function public.role_options() to anon, authenticated;

-- Shared role content: full access for signed-in members.
do $$
declare t text;
begin
  foreach t in array array['responsibilities', 'week_items', 'recurring_tasks', 'onboarding_steps',
                           'contacts', 'tasks', 'decisions', 'checkins', 'handover_sections'] loop
    execute format('create policy "members manage %1$s" on public.%1$I for all to authenticated
                    using (true) with check (true)', t);
  end loop;
end $$;

-- Personal rows.
create policy "own checklist ticks" on public.onboarding_completions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own private notes" on public.checkin_notes for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "ask questions as yourself" on public.assistant_questions for insert to authenticated
  with check (user_id = auth.uid());
create policy "read own questions, leads read all" on public.assistant_questions for select to authenticated
  using (user_id = auth.uid() or public.is_lead());

-- ---------------------------------------------------------------------------
-- Messages and buddy accounts (same as migrations/002_messages.sql)
-- ---------------------------------------------------------------------------
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
