# Handover Hub

A web app that helps student societies hand over roles: onboarding checklists, contacts, a task tracker, a decision log and a handover buddy, so incoming members can build on past work.

For each committee role it brings together:

| Page | What it does |
|---|---|
| **Dashboard** | Handover completeness, onboarding progress and a "needs attention" list (stale contacts, due steps, unowned tasks, duplicate work). |
| **Role guide** | Responsibilities, typical week, peak workload and recurring tasks. Editable; flagged stale if not reviewed in 30 days. |
| **Onboarding** | Day-1 and week-1 checklist. Each member ticks their own steps; due dates count from when they joined. |
| **Contacts** | Who owns each relationship and who to ask about what. Anything not updated in 30 days is marked **Stale**. |
| **Tasks** | Shared board. Warns when two people own open tasks for the same contact (or with the same title). |
| **Decision log** | What was decided, why, and what was tried before. Searchable. |
| **Buddy & check-in** | Named buddy, week-1 check-in booking and outcome, private notes (visible only to you). |
| **Outgoing handover** | Guided five-step form for the leaver, saved as drafts. |
| **Ask assistant** | Answers questions using only the role's own content, with sources. Runs on the server so the API key stays private. |
| **Lead view** | Society leads only: completeness, stale items and check-in status for every role, CSV export, and recent assistant questions. |

All demo content is fictional ("Example Tech Society"). No real people, contacts or logins.

## Tech stack

- **Front end:** React 18, TypeScript, Vite, Tailwind CSS 4
- **Accounts and database:** Supabase (email/password auth, Postgres, row level security)
- **Hosting:** Vercel (static site + two serverless functions in `api/`)
- **Assistant:** Claude Haiku 5.5 through the Anthropic SDK, called only from `api/ask.ts`

All of it runs on free tiers. The only cost is assistant usage, capped at 40 questions per member per day.

## Project structure

```
api/
  ask.ts              POST /api/ask — the assistant (server only)
  keepalive.ts        GET /api/keepalive — daily ping so free Supabase never pauses
scripts/
  seed.ts             npm run seed — demo content + test accounts
  seed-data.ts        the fictional demo content
supabase/
  schema.sql          tables, triggers and row level security (run once)
src/
  auth/               sign-in / sign-up page and session provider
  components/ui/      design-system pieces (Card, Pill, Button, forms, modal, menu, toast)
  components/layout/  sidebar shell and error boundary
  lib/                types, Supabase queries (api.ts), metrics, dates, navigation
  pages/              one file per screen
  workspace/          loads the selected role and provides `run()` for saving
```

## Setup

### 1. Supabase (free)

1. Create a project at [supabase.com](https://supabase.com).
2. **SQL Editor** → paste all of `supabase/schema.sql` → **Run**.
3. **Authentication → Sign In / Providers → Email**: turn **off** "Confirm email" (test accounts use addresses that can't receive mail).
4. **Project Settings → API Keys**: copy the project URL, the **publishable** key and the **secret** key.

### 2. Local environment

```powershell
Copy-Item .env.example .env.local
```

Fill in `.env.local`:

| Variable | Where it's used |
|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | Browser and server. Safe to expose. |
| `SUPABASE_SECRET_KEY` | Only `npm run seed`, on your machine. **Never** put it in Vercel or a `VITE_` variable. |
| `TEST_USER_PASSWORD` | Password for every test account. |
| `ANTHROPIC_API_KEY` | Only `api/ask.ts`. |

### 3. Demo data and test accounts

```powershell
npm install
```

```powershell
npm run seed
```

This creates four roles (Partnerships Lead, Events Coordinator, Marketing Lead, Treasurer) and these accounts, all with the password from `TEST_USER_PASSWORD`:

| Email | Who | Use it to |
|---|---|---|
| `alex.incoming@handoverhub.test` | Alex Morgan, incoming Partnerships Lead | See a member part-way through onboarding |
| `riley.outgoing@handoverhub.test` | Riley Nguyen, outgoing Partnerships Lead | Write the outgoing handover |
| `morgan.lead@handoverhub.test` | Morgan Chen, society lead | Open the Lead view |
| `tester@handoverhub.test` | Test Participant, incoming | Usability testing from a clean start |
| `jamie.events@…`, `casey.marketing@…`, `jordan.treasurer@…` | Incoming members of the other roles | Fill out the Lead view |

Re-running `npm run seed` resets the demo content, passwords and checklist progress. It keeps assistant questions and private notes, since those are evidence from testing. Stale flags and due dates are relative to when you seed, so re-seed shortly before a test session.

### 4. Run locally

```powershell
npm run dev
```

Open http://localhost:5173. The assistant works locally too: Vite routes `/api/*` to the same files Vercel uses.

### 5. Deploy to Vercel (free)

1. Push to GitHub, then **Add New → Project** on [vercel.com](https://vercel.com) and import the repository (the Vite preset is detected).
2. Before the first deploy, add **Environment Variables**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` and `ANTHROPIC_API_KEY`. The `VITE_` values are built into the page, so redeploy whenever you change them.
3. Deploy. `vercel.json` adds a daily cron hitting `/api/keepalive`, which stops the free Supabase project from pausing after a week without activity.
4. In Supabase, **Authentication → URL Configuration**: set the Site URL to your Vercel URL.

## Security notes

- Row level security is on for every table. Signed-in members share the role content. Checklist ticks and private notes belong to their owner, and only leads can read everyone's assistant questions.
- Self sign-up can choose "incoming" or "outgoing" but never "lead"; leads are set by the seed script or in the Supabase table editor (`profiles.member_type`).
- The Anthropic key and the Supabase secret key never reach the browser.

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Local dev server with the API routes |
| `npm run build` | Type-check and build for production |
| `npm run typecheck` | Type-check only |
| `npm run seed` | Reset demo content and test accounts |

---

Built as the practical action for a Trinity College Dublin research project on knowledge transfer in student societies.
