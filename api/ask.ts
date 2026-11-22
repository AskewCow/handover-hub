// POST /api/ask — the Ask assistant.
// Runs on the server (a Vercel function in production, a Vite middleware in dev) so the Anthropic
// API key never reaches the browser. Answers come only from the selected role's own content.
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5';
const DAILY_LIMIT = 40; // questions per member per 24 hours, to keep API costs predictable
const MAX_QUESTION_LENGTH = 500;

const SECTIONS = ['Role guide', 'Onboarding', 'Contacts', 'Tasks', 'Decision log', 'Buddy & check-in', 'Outgoing handover'] as const;

const AnswerSchema = z.object({
  answer: z.string(),
  sources: z.array(z.object({ section: z.enum(SECTIONS), label: z.string() })),
});

const SYSTEM_PROMPT = `You are the Handover Hub assistant for one committee role in a student society.
You help an incoming member find information in their role's handover documentation.

Rules:
- Answer only from the handover content provided in the user's message. Do not use outside knowledge about the society, its partners or its people, and do not guess names, dates or numbers.
- If the content does not answer the question, say so plainly and suggest who to ask instead (the named buddy, or the contact listed for that topic).
- If the relevant information looks out of date (marked STALE), say so.
- Keep answers short and practical: at most about 120 words, plain sentences, no markdown headings.
- In "sources", list each part of the content you relied on: "section" is the section name exactly as given in the content's [Section · Label] tags, and "label" is the short label after the dot. Return an empty list if you could not answer from the content.`;

type Row = Record<string, unknown>;

const HANDOVER_LABELS: Record<string, string> = {
  responsibilities: 'Responsibilities',
  recurring_tasks: 'Recurring tasks',
  key_contacts: 'Key contacts',
  decisions: 'Decisions & reasons',
  lessons: 'Lessons learned',
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function isStale(iso: unknown): boolean {
  return typeof iso === 'string' && Date.now() - new Date(iso).getTime() > 30 * 86_400_000;
}

async function rows(db: SupabaseClient, table: string, roleId: string, order: string): Promise<Row[]> {
  const { data, error } = await db.from(table).select('*').eq('role_id', roleId).order(order);
  if (error) throw new Error(error.message);
  return (data ?? []) as Row[];
}

/** Turns the role's content into a tagged plain-text document for the model. */
async function buildContext(db: SupabaseClient, roleId: string, userId: string): Promise<string | null> {
  const { data: role, error } = await db.from('roles').select('*').eq('id', roleId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!role) return null;

  const [responsibilities, week, recurring, steps, contacts, tasks, decisions, handover, checkins, committee] = await Promise.all([
    rows(db, 'responsibilities', roleId, 'position'),
    rows(db, 'week_items', roleId, 'position'),
    rows(db, 'recurring_tasks', roleId, 'position'),
    rows(db, 'onboarding_steps', roleId, 'position'),
    rows(db, 'contacts', roleId, 'name'),
    rows(db, 'tasks', roleId, 'created_at'),
    rows(db, 'decisions', roleId, 'decided_on'),
    rows(db, 'handover_sections', roleId, 'section'),
    rows(db, 'checkins', roleId, 'role_id'),
    db.from('committee_members').select('*').order('position').then(r => (r.data ?? []) as Row[]),
  ]);
  const contactName = (id: unknown) => contacts.find(c => c.id === id)?.name;
  const checkin = checkins.find(c => c.user_id === userId);

  const parts = [
    `ROLE: ${role.title} at ${role.society} (${role.term})${isStale(role.reviewed_at) ? ' — role guide STALE (not reviewed in 30+ days)' : ''}`,
    `[Role guide · Core responsibilities]\n${responsibilities.map(r => `- ${r.body}`).join('\n') || '(none)'}`,
    `[Role guide · Typical week]\n${week.map(w => `- ${w.day}: ${w.body}`).join('\n') || '(none)'}${role.peak_note ? `\nPeak workload: ${role.peak_note}` : ''}`,
    `[Role guide · Recurring tasks]\n${recurring.map(r => `- ${r.name} — ${r.schedule}; tool: ${r.tool}; time: ${r.duration}`).join('\n') || '(none)'}`,
    `[Contacts · Committee directory]\n${committee
      .map(m => `- ${m.name}: ${m.committee_role}, ${m.email || 'no email'}, joined ${m.joined_on ?? 'unknown'}, ${m.left_on ? `left ${m.left_on}` : 'still on the committee'}`)
      .join('\n') || '(none)'}`,
    `[Onboarding · Checklist]\n${steps.map(s => `- (${s.phase}, due day ${s.due_day}) ${s.title}`).join('\n') || '(none)'}`,
    `[Role guide · Outreach contacts]\n${contacts.map(c => `- ${c.name} (${c.owner}): ask about ${c.ask_about}${isStale(c.updated_at) ? ' — STALE, last updated over 30 days ago' : ''}`).join('\n') || '(none)'}`,
    `[Tasks · Task tracker]\n${tasks
      .map(t => `- ${t.title} — status: ${t.status}; owner: ${t.assignee ?? 'unassigned'}${t.due_date ? `; due ${t.due_date}` : ''}${t.contact_id ? `; contact: ${contactName(t.contact_id)}` : ''}`)
      .join('\n') || '(none)'}`,
    `[Decision log · Decisions]\n${decisions
      .map(d => `- ${d.decided_on}: ${d.title}. Reason: ${d.reason}${d.tried_before ? ` Tried before: ${d.tried_before}` : ''} (by ${d.author})`)
      .join('\n') || '(none)'}`,
    `[Buddy & check-in · Buddy]\n${role.buddy_name ? `${role.buddy_name}, ${role.buddy_title}. ${role.buddy_note}` : '(no buddy named)'}\nYour week-1 check-in: ${checkin ? `${checkin.status}${checkin.scheduled_at ? ` at ${checkin.scheduled_at}` : ''}` : 'not booked'}`,
    `[Outgoing handover · Notes from the previous holder]\n${handover.map(h => `- ${HANDOVER_LABELS[String(h.section)] ?? h.section}: ${h.title}. ${h.body}`).join('\n') || '(none)'}`,
  ];
  return parts.join('\n\n');
}

export async function POST(request: Request): Promise<Response> {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseKey) return json(500, { error: 'The server is missing its Supabase settings.' });
  if (!process.env.ANTHROPIC_API_KEY) return json(503, { error: 'The assistant is not set up yet (missing API key).' });

  // Authenticate as the signed-in member, so row level security applies to every query below.
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return json(401, { error: 'Please sign in to use the assistant.' });
  const db = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: auth, error: authError } = await db.auth.getUser(token);
  if (authError || !auth.user) return json(401, { error: 'Your session has expired. Please sign in again.' });

  const input = (await request.json().catch(() => ({}))) as { roleId?: unknown; question?: unknown };
  const question = typeof input.question === 'string' ? input.question.trim() : '';
  const roleId = typeof input.roleId === 'string' ? input.roleId : '';
  if (!question || !roleId) return json(400, { error: 'Please type a question.' });
  if (question.length > MAX_QUESTION_LENGTH) return json(400, { error: `Please keep questions under ${MAX_QUESTION_LENGTH} characters.` });

  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { count } = await db
    .from('assistant_questions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', auth.user.id)
    .gte('created_at', since);
  if ((count ?? 0) >= DAILY_LIMIT) return json(429, { error: `You have reached today’s limit of ${DAILY_LIMIT} questions. Try again tomorrow, or ask your buddy.` });

  let context: string | null;
  try {
    context = await buildContext(db, roleId, auth.user.id);
  } catch {
    return json(500, { error: 'Could not read the handover content.' });
  }
  if (!context) return json(404, { error: 'That role could not be found.' });

  const client = new Anthropic();
  try {
    const response = await client.messages.parse({
      model: MODEL,
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      output_config: { effort: 'low', format: zodOutputFormat(AnswerSchema) },
      messages: [
        {
          role: 'user',
          content: `<handover_content>\n${context}\n</handover_content>\n\nToday's date: ${new Date().toISOString().slice(0, 10)}\n\nQuestion: ${question}`,
        },
      ],
    });

    if (response.stop_reason === 'refusal') {
      return json(200, { answer: 'I can’t help with that question. Try rephrasing it, or ask your buddy.', sources: [] });
    }
    const parsed = response.parsed_output;
    if (!parsed) return json(502, { error: 'The assistant returned an unexpected reply. Please try again.' });

    await db.from('assistant_questions').insert({ user_id: auth.user.id, role_id: roleId, question });
    return json(200, parsed);
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return json(503, { error: 'The assistant is busy right now. Please try again in a minute.' });
    if (error instanceof Anthropic.AuthenticationError) return json(503, { error: 'The assistant is not configured correctly (invalid API key).' });
    if (error instanceof Anthropic.APIError) return json(502, { error: `The assistant is unavailable (error ${error.status}). Please try again.` });
    return json(500, { error: 'Something went wrong while answering. Please try again.' });
  }
}
