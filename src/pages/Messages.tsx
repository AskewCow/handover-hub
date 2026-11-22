import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Avatar, Card, Empty, PageTitle, Spinner } from '@/components/ui';
import { listMessages, markConversationRead, sendMessage } from '@/lib/api';
import { formatMessageTime } from '@/lib/dates';
import { initials, memberTypeLabels } from '@/lib/people';
import type { Message, Profile } from '@/lib/types';
import { useWorkspace } from '@/workspace/WorkspaceProvider';

const POLL_MS = 10_000;

interface Conversation {
  person: Profile;
  last: Message | null;
  unread: number;
}

export function Messages() {
  const { userId, members, roles, conversationWith, openConversation, refreshUnread } = useWorkspace();
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const activeId = conversationWith;

  const load = useCallback(async () => {
    try {
      setMessages(await listMessages());
      setError('');
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  // Poll while the page is open so replies appear without refreshing.
  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  const others = members.filter(m => m.id !== userId);
  const roleTitle = (id: string | null) => roles.find(r => r.id === id)?.title;
  const describe = (p: Profile) => [roleTitle(p.role_id), memberTypeLabels[p.member_type]].filter(Boolean).join(' · ');

  const conversations: Conversation[] = useMemo(() => {
    const byPerson = new Map<string, Conversation>();
    for (const m of messages ?? []) {
      const otherId = m.sender_id === userId ? m.recipient_id : m.sender_id;
      const person = members.find(p => p.id === otherId);
      if (!person) continue;
      const c = byPerson.get(otherId) ?? { person, last: null, unread: 0 };
      c.last = m;
      if (m.recipient_id === userId && !m.read_at) c.unread += 1;
      byPerson.set(otherId, c);
    }
    // A conversation opened from "Send a message" shows even before the first message.
    const target = members.find(p => p.id === activeId);
    if (target && !byPerson.has(target.id)) byPerson.set(target.id, { person: target, last: null, unread: 0 });
    return [...byPerson.values()].sort((a, b) => (b.last?.created_at ?? '9').localeCompare(a.last?.created_at ?? '9'));
  }, [messages, members, userId, activeId]);

  const active = members.find(p => p.id === activeId) ?? null;
  const thread = (messages ?? []).filter(m => active && (m.sender_id === active.id || m.recipient_id === active.id));
  const unreadInThread = thread.some(m => m.recipient_id === userId && !m.read_at);

  // Opening a conversation marks its messages as read.
  useEffect(() => {
    if (!active || !unreadInThread) return;
    markConversationRead(userId, active.id)
      .then(() => Promise.all([load(), refreshUnread()]))
      .catch(() => undefined);
  }, [active, unreadInThread, userId, load, refreshUnread]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest' });
  }, [thread.length, activeId]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || !active || sending) return;
    setSending(true);
    try {
      await sendMessage(userId, active.id, body);
      setDraft('');
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  if (!messages && !error) return <Spinner label="Loading messages" />;

  return (
    <>
      <PageTitle eyebrow="Human support" title="Messages" description="Ask your buddy or anyone on the committee. Only the two people in a conversation can read it." />
      <div className="grid min-h-[min(600px,calc(100dvh-11rem))] gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <Card className="flex flex-col overflow-hidden">
          <div className="border-b border-slate-100 p-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-slate-600">New message to</span>
              <select
                value=""
                onChange={e => e.target.value && openConversation(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500"
              >
                <option value="">Choose a member…</option>
                {others.map(p => (
                  <option key={p.id} value={p.id}>{p.full_name}{roleTitle(p.role_id) ? ` (${roleTitle(p.role_id)})` : ''}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {conversations.length === 0 && <p className="px-3 py-8 text-center text-xs text-slate-400">No conversations yet.</p>}
            {conversations.map(c => (
              <button
                key={c.person.id}
                onClick={() => openConversation(c.person.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${c.person.id === activeId ? 'bg-emerald-50' : 'hover:bg-slate-50'}`}
              >
                <Avatar initials={initials(c.person.full_name)} tone={c.person.id === activeId ? 'green' : 'neutral'} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className={`truncate text-sm ${c.unread ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>{c.person.full_name}</span>
                    {c.last && <span className="shrink-0 text-[10px] text-slate-400">{formatMessageTime(c.last.created_at)}</span>}
                  </span>
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs text-slate-500">
                      {c.last ? `${c.last.sender_id === userId ? 'You: ' : ''}${c.last.body}` : describe(c.person)}
                    </span>
                    {c.unread > 0 && <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-emerald-600 px-1.5 text-[10px] font-bold text-white">{c.unread}</span>}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </Card>

        <Card className="flex flex-col overflow-hidden">
          {!active ? (
            <div className="grid flex-1 place-items-center">
              <Empty title="Pick a conversation" text="Choose someone on the left, or start a new message." />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
                <Avatar initials={initials(active.full_name)} />
                <div>
                  <h2 className="text-sm font-bold">{active.full_name}</h2>
                  <p className="text-xs text-slate-500">{describe(active)}</p>
                </div>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto p-5 sm:p-6" aria-live="polite">
                {thread.length === 0 && <p className="py-10 text-center text-sm text-slate-400">No messages yet. Say hello to {active.full_name.split(' ')[0]}.</p>}
                {thread.map(m => {
                  const mine = m.sender_id === userId;
                  return (
                    <div key={m.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-lg whitespace-pre-wrap rounded-2xl p-3.5 text-sm leading-6 ${mine ? 'rounded-tr-md bg-[#173532] text-white' : 'rounded-tl-md bg-slate-100 text-slate-700'}`}>{m.body}</div>
                      <span className="mt-1 text-[10px] text-slate-400">
                        {formatMessageTime(m.created_at)}
                        {mine && m.read_at ? ' · Read' : ''}
                      </span>
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>
              {error && <p className="px-5 text-xs text-rose-600">{error}</p>}
              <form onSubmit={submit} className="border-t border-slate-100 p-4">
                <div className="flex gap-2 rounded-xl border border-slate-200 bg-white p-2 focus-within:border-emerald-500">
                  <input
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    maxLength={2000}
                    className="min-w-0 flex-1 px-2 text-sm outline-none"
                    placeholder={`Message ${active.full_name.split(' ')[0]}…`}
                    aria-label="Message"
                  />
                  <button disabled={sending || !draft.trim()} className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
                    {sending ? 'Sending…' : 'Send'}
                  </button>
                </div>
              </form>
            </>
          )}
        </Card>
      </div>
    </>
  );
}
