// All reads and writes to Supabase go through this module, so pages never build queries themselves.
import { supabase } from './supabase';
import type {
  AskAnswer,
  Checkin,
  Contact,
  Decision,
  HandoverSection,
  HandoverSectionKey,
  OnboardingStep,
  Profile,
  RecurringTask,
  Responsibility,
  Role,
  RoleBundle,
  Task,
  WeekItem,
} from './types';

/** Tables whose rows have a uuid `id` and are edited with the generic helpers below. */
export type ContentTable =
  | 'responsibilities'
  | 'week_items'
  | 'recurring_tasks'
  | 'onboarding_steps'
  | 'contacts'
  | 'tasks'
  | 'decisions';

function unwrap<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(error.message);
  return data as T;
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function getProfile(userId: string): Promise<Profile | null> {
  return unwrap(await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()) as Profile | null;
}

/** Role names for the sign-up form; callable before signing in. */
export async function listRoleOptions(): Promise<{ id: string; title: string }[]> {
  return unwrap(await supabase.rpc('role_options')) as { id: string; title: string }[];
}

export async function updateOwnProfile(userId: string, values: Pick<Partial<Profile>, 'full_name' | 'role_id'>): Promise<void> {
  unwrap(await supabase.from('profiles').update(values).eq('id', userId));
}

export async function listRoles(): Promise<Role[]> {
  return unwrap(await supabase.from('roles').select('*').order('position')) as Role[];
}

export async function loadRoleBundle(roleId: string, userId: string): Promise<RoleBundle> {
  const byRole = <T,>(table: string, order: string, ascending = true) =>
    supabase.from(table).select('*').eq('role_id', roleId).order(order, { ascending }).then(r => unwrap(r) as T[]);

  const [role, responsibilities, weekItems, recurringTasks, steps, contacts, tasks, decisions, handover, checkin, incoming] =
    await Promise.all([
      supabase.from('roles').select('*').eq('id', roleId).single().then(r => unwrap(r) as Role),
      byRole<Responsibility>('responsibilities', 'position'),
      byRole<WeekItem>('week_items', 'position'),
      byRole<RecurringTask>('recurring_tasks', 'position'),
      byRole<OnboardingStep>('onboarding_steps', 'position'),
      byRole<Contact>('contacts', 'name'),
      byRole<Task>('tasks', 'created_at'),
      byRole<Decision>('decisions', 'decided_on', false),
      byRole<HandoverSection>('handover_sections', 'section'),
      supabase.from('checkins').select('*').eq('role_id', roleId).maybeSingle().then(r => unwrap(r) as Checkin | null),
      supabase
        .from('profiles')
        .select('*')
        .eq('role_id', roleId)
        .eq('member_type', 'incoming')
        .order('created_at')
        .limit(1)
        .then(r => (unwrap(r) as Profile[])[0] ?? null),
    ]);

  const stepIds = steps.map(s => s.id);
  const completed = stepIds.length
    ? (unwrap(
        await supabase.from('onboarding_completions').select('step_id').eq('user_id', userId).in('step_id', stepIds),
      ) as { step_id: string }[])
    : [];

  return {
    role,
    responsibilities,
    weekItems,
    recurringTasks,
    steps,
    completedStepIds: new Set(completed.map(c => c.step_id)),
    contacts,
    tasks,
    decisions,
    checkin,
    handover,
    incomingMember: incoming,
  };
}

export async function listAllProfiles(): Promise<Profile[]> {
  return unwrap(await supabase.from('profiles').select('*').order('full_name')) as Profile[];
}

export interface AssistantQuestion {
  id: string;
  user_id: string;
  role_id: string;
  question: string;
  created_at: string;
}

/** Leads see every member's questions (RLS); everyone else only their own. */
export async function listAssistantQuestions(limit = 20): Promise<AssistantQuestion[]> {
  return unwrap(
    await supabase.from('assistant_questions').select('*').order('created_at', { ascending: false }).limit(limit),
  ) as AssistantQuestion[];
}

export async function getCheckinNote(roleId: string, userId: string): Promise<string> {
  const row = unwrap(
    await supabase.from('checkin_notes').select('body').eq('role_id', roleId).eq('user_id', userId).maybeSingle(),
  ) as { body: string } | null;
  return row?.body ?? '';
}

// ---------------------------------------------------------------------------
// Generic writes for content tables
// ---------------------------------------------------------------------------

export async function insertRow<T>(table: ContentTable, values: Partial<T>): Promise<T> {
  return unwrap(await supabase.from(table).insert(values as never).select().single()) as T;
}

export async function updateRow<T>(table: ContentTable, id: string, values: Partial<T>): Promise<T> {
  return unwrap(await supabase.from(table).update(values as never).eq('id', id).select().single()) as T;
}

export async function deleteRow(table: ContentTable, id: string): Promise<void> {
  unwrap(await supabase.from(table).delete().eq('id', id));
}

// ---------------------------------------------------------------------------
// Specific writes
// ---------------------------------------------------------------------------

export async function updateRole(roleId: string, values: Partial<Role>): Promise<void> {
  unwrap(await supabase.from('roles').update(values).eq('id', roleId));
}

/** Confirms a contact is still correct, which resets its "last updated" date. */
export async function markContactChecked(contactId: string): Promise<void> {
  unwrap(await supabase.from('contacts').update({ updated_at: new Date().toISOString() }).eq('id', contactId));
}

export async function setStepCompleted(stepId: string, userId: string, completed: boolean): Promise<void> {
  if (completed) {
    unwrap(await supabase.from('onboarding_completions').upsert({ step_id: stepId, user_id: userId }));
  } else {
    unwrap(await supabase.from('onboarding_completions').delete().eq('step_id', stepId).eq('user_id', userId));
  }
}

export async function saveCheckinNote(roleId: string, userId: string, body: string): Promise<void> {
  unwrap(await supabase.from('checkin_notes').upsert({ role_id: roleId, user_id: userId, body }));
}

export async function saveCheckin(roleId: string, values: Partial<Checkin>): Promise<void> {
  unwrap(await supabase.from('checkins').upsert({ role_id: roleId, ...values }));
}

export async function saveHandoverSection(
  roleId: string,
  section: HandoverSectionKey,
  values: { title: string; body: string },
): Promise<void> {
  unwrap(await supabase.from('handover_sections').upsert({ role_id: roleId, section, ...values }));
}

// ---------------------------------------------------------------------------
// Ask assistant (server function in /api/ask keeps the Anthropic key private)
// ---------------------------------------------------------------------------

export async function askAssistant(roleId: string, question: string): Promise<AskAnswer> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Your session has expired. Please sign in again.');

  const response = await fetch('/api/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ roleId, question }),
  });
  const body = (await response.json().catch(() => ({}))) as Partial<AskAnswer> & { error?: string };
  if (!response.ok) throw new Error(body.error ?? 'The assistant is unavailable right now.');
  return { answer: body.answer ?? '', sources: body.sources ?? [] };
}
