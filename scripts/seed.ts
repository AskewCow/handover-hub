// npm run seed — resets the demo content and creates/updates the test accounts.
// Safe to re-run: it replaces each demo role's content and resets test-account passwords and progress.
// Test accounts (@handoverhub.test) and roles that are no longer in seed-data.ts are deleted.
//
// By default it keeps messages, assistant questions and private notes, which are evidence from testing.
// npm run seed:fresh also clears those for every test account: use it before each new test session.
//
// Needs in .env.local: VITE_SUPABASE_URL, SUPABASE_SECRET_KEY, TEST_USER_PASSWORD.
import { createClient } from '@supabase/supabase-js';
import { at, committee, dateOnly, daysAgo, daysFromNow, roles, SOCIETY, TERM, testUsers, welcomeMessages } from './seed-data';

const fresh = process.argv.includes('--fresh');
const TEST_DOMAIN = '@handoverhub.test';
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

  // Remove roles that are no longer part of the demo (their content is deleted with them).
  await check('remove old roles', db.from('roles').delete().not('id', 'in', `(${roleIds.join(',')})`));

  await check(
    'roles',
    db.from('roles').upsert(
      roles.map(({ role }, position) => {
        const { reviewedDaysAgo, ...rest } = role;
        // buddy_id is linked in linkBuddies(), once the accounts exist.
        return { ...rest, buddy_id: null, society: SOCIETY, term: TERM, position, reviewed_at: daysAgo(reviewedDaysAgo) };
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
    if (seed.recurring.length) await check('recurring_tasks', db.from('recurring_tasks').insert(list(seed.recurring, ([name, schedule, tool, duration], position) => ({ name, schedule, tool, duration, position }))));
    await check('onboarding_steps', db.from('onboarding_steps').insert(list(seed.steps, ([title, phase, due_day, link], position) => ({ title, phase, due_day, position, link: link ?? null }))));

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

    const sections = Object.entries(seed.handover).map(([section, [title, body]]) => ({ role_id: roleId, section, title, body, updated_by: null, updated_at: daysAgo(2) }));
    if (sections.length) await check('handover_sections', db.from('handover_sections').insert(sections));

    console.log(`✓ ${seed.role.title}`);
  }
}

async function seedCommittee() {
  await check('clear committee', db.from('committee_members').delete().not('id', 'is', null));
  await check(
    'committee',
    db.from('committee_members').insert(
      committee.map((m, position) => ({ name: m.name, committee_role: m.role, email: m.email, joined_on: m.joined, left_on: m.left ?? null, position })),
    ),
  );
  console.log(`✓ committee directory (${committee.length} people)`);
}

async function seedUsers(): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  const existing = await check('list users', db.auth.admin.listUsers({ perPage: 1000 }));

  // Delete test accounts that are no longer listed (their profile, messages and notes go with them).
  const wanted = new Set(testUsers.map(u => u.email));
  for (const old of existing.users.filter(x => x.email?.endsWith(TEST_DOMAIN) && !wanted.has(x.email))) {
    await check(`delete ${old.email}`, db.auth.admin.deleteUser(old.id));
    console.log(`✗ removed ${old.email}`);
  }

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

    if (u.checkin) {
      const { status, inDays, hour, outcome } = u.checkin;
      await check(
        'checkin',
        db.from('checkins').insert({ role_id: u.roleId, user_id: user.id, status, scheduled_at: inDays == null ? null : at(inDays, hour ?? 14), outcome: outcome ?? '' }),
      );
    }

    ids.set(u.email, user.id);
    console.log(`✓ ${u.email} (${u.memberType}, ${u.roleId})`);
  }
  return ids;
}

async function linkBuddies(ids: Map<string, string>) {
  for (const seed of roles) {
    if (!seed.buddyEmail) continue;
    await check(`buddy for ${seed.role.id}`, db.from('roles').update({ buddy_id: ids.get(seed.buddyEmail) }).eq('id', seed.role.id));
  }
}

/** --fresh: clear messages, assistant questions and private notes for every test account. */
async function clearActivity(ids: Map<string, string>) {
  const userIds = [...ids.values()];
  const list = `(${userIds.join(',')})`;
  await check('clear messages', db.from('messages').delete().or(`sender_id.in.${list},recipient_id.in.${list}`));
  await check('clear questions', db.from('assistant_questions').delete().in('user_id', userIds));
  await check('clear notes', db.from('checkin_notes').delete().in('user_id', userIds));
  console.log('✓ cleared messages, assistant questions and private notes');
}

async function seedMessages(ids: Map<string, string>) {
  for (const m of welcomeMessages) {
    const sender_id = ids.get(m.from)!;
    const recipient_id = ids.get(m.to)!;
    await check('clear welcome', db.from('messages').delete().eq('sender_id', sender_id).eq('recipient_id', recipient_id).eq('body', m.body));
    await check('welcome message', db.from('messages').insert({ sender_id, recipient_id, body: m.body, created_at: daysAgo(m.hoursAgo / 24) }));
  }
}

try {
  console.log('Seeding demo roles…');
  await seedRoles();
  await seedCommittee();
  console.log('Creating test accounts…');
  const ids = await seedUsers();
  await linkBuddies(ids);
  if (fresh) await clearActivity(ids);
  await seedMessages(ids);
  console.log('✓ buddies linked and welcome message sent');
  console.log('\nDone. All test accounts use the password in TEST_USER_PASSWORD.');
} catch (error) {
  console.error(`\nSeed failed: ${(error as Error).message}`);
  process.exit(1);
}
