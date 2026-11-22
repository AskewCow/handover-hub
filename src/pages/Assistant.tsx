import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Card, Icon, PageTitle, Pill, type Tone } from '@/components/ui';
import { askAssistant } from '@/lib/api';
import { ASSISTANT_SUGGESTIONS } from '@/lib/config';
import { firstName } from '@/lib/people';
import type { AskSource } from '@/lib/types';
import { useRole } from '@/workspace/WorkspaceProvider';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  sources?: AskSource[];
  failed?: boolean;
}


const sourceTone: Record<string, Tone> = {
  'Role guide': 'blue',
  Onboarding: 'purple',
  'Outreach contacts': 'green',
  Tasks: 'amber',
  'Decision log': 'purple',
  'Buddy & check-in': 'green',
  'Outgoing handover': 'blue',
};

export function Assistant() {
  const { bundle, profile } = useRole();
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [pending, setPending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const roleId = bundle.role.id;

  useEffect(() => {
    setMessages([]);
  }, [roleId]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, pending]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const text = question.trim();
    if (!text || pending) return;
    setMessages(m => [...m, { role: 'user', text }]);
    setQuestion('');
    setPending(true);
    try {
      const { answer, sources } = await askAssistant(roleId, text);
      setMessages(m => [...m, { role: 'assistant', text: answer, sources }]);
    } catch (err) {
      setMessages(m => [...m, { role: 'assistant', text: (err as Error).message, failed: true }]);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <PageTitle eyebrow="Grounded support" title="Ask your role assistant" description={`Get quick answers based only on the ${bundle.role.title} handover content.`} />
      <div className="grid min-h-[min(600px,calc(100dvh-11rem))] gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <Card className="flex flex-col overflow-hidden">
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#173532] text-white"><Icon name="Ask assistant" /></span>
            <div>
              <h2 className="text-sm font-bold">Handover assistant</h2>
              <p className="text-xs text-emerald-600">{pending ? 'Searching the handover…' : 'Ready · role content only'}</p>
            </div>
          </div>
          <div className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-8" aria-live="polite">
            <div className="max-w-xl rounded-2xl rounded-tl-md bg-slate-100 p-4 text-sm leading-6 text-slate-700">
              Hi {firstName(profile.full_name)}. I can help you find answers in your role guide, decision log, contacts, and handover notes. What would you like to know?
            </div>
            {messages.map((m, i) =>
              m.role === 'user' ? (
                <div key={i} className="ml-auto max-w-lg whitespace-pre-wrap rounded-2xl rounded-tr-md bg-[#173532] p-4 text-sm text-white">{m.text}</div>
              ) : (
                <div key={i} className={`max-w-xl whitespace-pre-wrap rounded-2xl rounded-tl-md p-4 text-sm leading-6 ${m.failed ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-700'}`}>
                  {m.text}
                  {m.sources && m.sources.length > 0 && (
                    <div className="mt-3 border-t border-slate-200 pt-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Sources</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {m.sources.map(s => (
                          <Pill key={`${s.section}-${s.label}`} tone={sourceTone[s.section] ?? 'neutral'}>{s.section} · {s.label}</Pill>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ),
            )}
            {pending && (
              <div className="flex max-w-xl gap-1.5 rounded-2xl rounded-tl-md bg-slate-100 p-4" aria-label="Assistant is typing">
                {[0, 1, 2].map(d => <span key={d} className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: `${d * 150}ms` }} />)}
              </div>
            )}
            <div ref={endRef} />
          </div>
          <form onSubmit={submit} className="border-t border-slate-100 p-4">
            <div className="flex gap-2 rounded-xl border border-slate-200 bg-white p-2 focus-within:border-emerald-500">
              <input
                value={question}
                onChange={e => setQuestion(e.target.value)}
                maxLength={500}
                className="min-w-0 flex-1 px-2 text-sm outline-none"
                placeholder="Ask about contacts, tasks, or decisions..."
                aria-label="Your question"
              />
              <button disabled={pending || !question.trim()} className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Send</button>
            </div>
          </form>
        </Card>
        <div className="space-y-4">
          <Card className="border-amber-200 bg-amber-50 p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-amber-700">Keep in mind</p>
            <h3 className="mt-2 font-semibold text-amber-950">Only as accurate as the documentation</h3>
            <p className="mt-2 text-xs leading-5 text-amber-800">Check source links and ask your buddy when something feels incomplete or outdated.</p>
          </Card>
          <Card className="p-5">
            <h3 className="text-sm font-bold">Try asking</h3>
            {ASSISTANT_SUGGESTIONS.map(q => (
              <button onClick={() => setQuestion(q)} key={q} className="mt-3 block w-full rounded-xl bg-slate-50 p-3 text-left text-xs leading-5 text-slate-600 hover:bg-slate-100">“{q}”</button>
            ))}
          </Card>
        </div>
      </div>
    </>
  );
}
