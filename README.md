# Handover Hub

A web app that helps student societies hand over roles: onboarding checklists, contacts, a task tracker, a decision log and a handover buddy, so incoming members can build on past work.

For each committee role it brings together:

| Page | What it does |
|---|---|
| **Dashboard** | Handover completeness, onboarding progress and a "needs attention" list (stale contacts, due steps, unowned tasks, duplicate work). |
| **Role guide** | Responsibilities, typical week, peak workload and the role's **outreach contacts** (companies and partners, who owns each one, what to ask them). Contacts not updated in 30 days are marked **Stale**. Editable; the guide is flagged stale if not reviewed in 30 days. |
| **Onboarding** | Day-1 and week-1 checklist. Each member ticks their own steps; due dates count from when they joined. |
| **Contacts** | The committee directory: everyone's role, email, and when they joined or left ("Current member" if still on the committee). |
| **Tasks** | Shared board. Warns when two people own open tasks for the same contact (or with the same title). |
| **Decision log** | What was decided, why, and what was tried before. Searchable. |
| **Buddy & check-in** | Named buddy (a member account), week-1 check-in booking and outcome, private notes (visible only to you). Booking or moving the check-in messages the buddy. |
| **Messages** | Private in-app messages between members, with an unread badge in the sidebar. "Send a message" on the buddy card opens the conversation. |
| **Handover notes** | The role's handover in five numbered sections, written by the previous lead and kept current by whoever holds the role. Shows who last edited each section. |
| **Ask assistant** | Answers questions using only the role's own content, with sources. Runs on the server so the API key stays private. |
| **Lead view** | Society leads only: completeness, stale items and check-in status for every role, CSV export, and recent assistant questions. |

The workspace is set up for the Claude Builder Club. The demo people, partners and contact details are fictional, with no real logins or personal data.

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
   - Already ran an older `schema.sql`? Run the files in `supabase/migrations/` in order instead (002 adds messages, 003 makes week-1 check-ins per member, 004 adds onboarding step links, 005 adds the committee directory).
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

This sets up the Claude Builder Club **Partnerships & Outreach Lead** role from the club's onboarding document (partners, owners, outreach rules, open leads and decisions) and these accounts, all with the password from `TEST_USER_PASSWORD`:

| Email | Who | Use it to |
|---|---|---|
| `ambassador@handoverhub.test` | CBC Ambassador: onboarding buddy and society lead | Reply to new members' messages, see the Lead view |
| `roman.incoming@handoverhub.test` | Roman M., incoming Partnerships & Outreach Lead | The user test: starts from scratch, Red Bull is unclaimed |
| `tester@handoverhub.test` | Test Participant, brand new | Usability testing from a clean start |
| `tester2@handoverhub.test` | Second Participant, brand new | A second test session |

Personal contact details from the onboarding document (emails, phone numbers, handles) are deliberately not in the app: the repository is public and anyone can sign up. Each partner lists its CBC owner to ask instead.

Re-running `npm run seed` resets the demo content, passwords and checklist progress, and removes test accounts or roles no longer in `scripts/seed-data.ts`. It keeps messages, assistant questions and private notes as testing evidence. **Before each test session run `npm run seed:fresh`**, which also clears those, so the participant starts with an empty inbox.

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
- Messages can only be read by their sender and recipient, and only the recipient can mark them read.
- Members can change their own name and password under **Account settings** (sidebar menu). There is no "forgot password" email: Supabase's built-in mailer only delivers to your own team's addresses, so a lead resets passwords in Supabase (Authentication → Users) or by re-running the seed for test accounts.
- Self sign-up can choose "incoming" or "outgoing" but never "lead"; leads are set by the seed script or in the Supabase table editor (`profiles.member_type`).
- The Anthropic key and the Supabase secret key never reach the browser.

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Local dev server with the API routes |
| `npm run build` | Type-check and build for production |
| `npm run typecheck` | Type-check only |
| `npm run seed` | Reset demo content and test accounts |
| `npm run seed:fresh` | Same, and clear test accounts' messages, questions and notes |

---

Built as the practical action for a Trinity College Dublin research project on knowledge transfer in student societies.
