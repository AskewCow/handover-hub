// npm run seed — resets the demo content and creates/updates the test accounts.
// Safe to re-run: it replaces each demo role's content and resets test-account passwords and progress.
// It keeps assistant questions and private notes, which are evidence from testing.
//
// Needs in .env.local: VITE_SUPABASE_URL, SUPABASE_SECRET_KEY, TEST_USER_PASSWORD.
import { createClient } from '@supabase/supabase-js';
import { at, dateOnly, daysAgo, daysFromNow, roles, SOCIETY, TERM, testUsers } from './seed-data';

const url = process.env.VITE_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
const password = process.env.TEST_USER_PASSWORD;

if (!url || !secret || !password) {
  console.error('Missing VITE_SUPABASE_URL, SUPABASE_SECRET_KEY or TEST_USER_PASSWORD in .env.local');
  process.exit(1);
}
if (password.length < 8) {
  console.error('TEST_USER_PASSWORD must be at least 8 characters.');
  process.exit(1);
}

// The secret key bypasses row level security. It is only ever used here, on your own machine.
const db = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });

/** Awaits a Supabase call and throws a labelled error if it failed. */
async function check<R extends { data: unknown; error: { message: string } | null }>(label: string, promise: PromiseLike<R>): Promise<NonNullable<R['data']>> {
  const { data, error } = await promise;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data as NonNullable<R['data']>;
}

const CONTENT_TABLES = ['responsibilities', 'week_items', 'recurring_tasks', 'onboarding_steps', 'tasks', 'contacts', 'decisions', 'handover_sections', 'checkins'];

async function seedRoles() {
  const roleIds = roles.map(r => r.role.id);

  await check(
    'roles',
    db.from('roles').upsert(
      roles.map(({ role }, position) => {
        const { reviewedDaysAgo, ...rest } = role;
        return { ...rest, society: SOCIETY, term: TERM, position, reviewed_at: daysAgo(reviewedDaysAgo) };
      }),
    ),
  );

  // Tasks reference contacts, so they are deleted first (order of CONTENT_TABLES).
  for (const table of CONTENT_TABLES) {
    await check(`clear ${table}`, db.from(table).delete().in('role_id', roleIds));
  }

  for (const seed of roles) {
    const roleId = seed.role.id;
    const list = <T,>(items: T[], map: (item: T, position: number) => object) => items.map((item, i) => ({ role_id: roleId, ...map(item, i) }));

    await check('responsibilities', db.from('responsibilities').insert(list(seed.responsibilities, (body, position) => ({ body, position, updated_at: daysAgo(seed.role.reviewedDaysAgo) }))));
    if (seed.week.length) await check('week_items', db.from('week_items').insert(list(seed.week, ([day, body], position) => ({ day, body, position }))));
    await check('recurring_tasks', db.from('recurring_tasks').insert(list(seed.recurring, ([name, schedule, tool, duration], position) => ({ name, schedule, tool, duration, position }))));
    await check('onboarding_steps', db.from('onboarding_steps').insert(list(seed.steps, ([title, phase, due_day], position) => ({ title, phase, due_day, position }))));

    const contacts = await check(
      'contacts',
      db
        .from('contacts')
        .insert(list(seed.contacts, ([name, owner, ask_about, updated]) => ({ name, owner, ask_about, created_at: daysAgo(updated + 30), updated_at: daysAgo(updated) })))
        .select('id, name'),
    );
    const contactId = (name?: string) => contacts.find(c => c.name === name)?.id ?? null;

    await check(
      'tasks',
      db.from('tasks').insert(
        list(seed.tasks, (t, i) => ({
          title: t.title,
          status: t.status,
          assignee: t.assignee,
          due_date: t.dueInDays == null ? null : dateOnly(daysFromNow(t.dueInDays)),
          contact_id: contactId(t.contact),
          created_at: daysAgo(10 - i),
          updated_at: daysAgo(t.updatedDaysAgo ?? 1),
        })),
      ),
    );

    if (seed.decisions.length) {
      await check(
        'decisions',
        db.from('decisions').insert(
          list(seed.decisions, ([ago, title, reason, tried_before, author]) => ({ decided_on: dateOnly(daysAgo(ago)), title, reason, tried_before, author, created_by: null, created_at: daysAgo(ago) })),
        ),
      );
    }

    const { status, inDays, hour, outcome } = seed.checkin;
    await check('checkins', db.from('checkins').insert({ role_id: roleId, status, scheduled_at: inDays == null ? null : at(inDays, hour ?? 14), outcome: outcome ?? '' }));

    const sections = Object.entries(seed.handover).map(([section, [title, body]]) => ({ role_id: roleId, section, title, body, updated_by: null, updated_at: daysAgo(2) }));
    if (sections.length) await check('handover_sections', db.from('handover_sections').insert(sections));

    console.log(`✓ ${seed.role.title}`);
  }
}

async function seedUsers() {
  const existing = await check('list users', db.auth.admin.listUsers({ perPage: 1000 }));

  for (const u of testUsers) {
    const metadata = { full_name: u.fullName, member_type: u.memberType === 'lead' ? 'incoming' : u.memberType, role_id: u.roleId };
    let user = existing.users.find(x => x.email?.toLowerCase() === u.email);

    if (user) {
      await check(`update ${u.email}`, db.auth.admin.updateUserById(user.id, { password, user_metadata: metadata, email_confirm: true }));
    } else {
      user = (await check(`create ${u.email}`, db.auth.admin.createUser({ email: u.email, password, email_confirm: true, user_metadata: metadata }))).user!;
    }

    // The sign-up trigger never grants "lead"; set the final profile here.
    await check(
      `profile ${u.email}`,
      db.from('profiles').upsert({ id: user.id, full_name: u.fullName, member_type: u.memberType, role_id: u.roleId, created_at: daysAgo(u.joinedDaysAgo) }),
    );

    if (u.completedSteps?.length) {
      const steps = await check('steps', db.from('onboarding_steps').select('id, title').eq('role_id', u.roleId).in('title', u.completedSteps));
      await check(
        'completions',
        db.from('onboarding_completions').insert(steps.map((s, i) => ({ user_id: user!.id, step_id: s.id, completed_at: daysAgo(Math.max(0, u.joinedDaysAgo - i * 0.5)) }))),
      );
    }

    console.log(`✓ ${u.email} (${u.memberType}, ${u.roleId})`);
  }
}

try {
  console.log('Seeding demo roles…');
  await seedRoles();
  console.log('Creating test accounts…');
  await seedUsers();
  console.log('\nDone. All test accounts use the password in TEST_USER_PASSWORD.');
} catch (error) {
  console.error(`\nSeed failed: ${(error as Error).message}`);
  process.exit(1);
}
