import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Button, Card, Input, Modal, PageTitle, Pill, Textarea } from '@/components/ui';
import { getCheckinNote, saveCheckin, saveCheckinNote, updateRole } from '@/lib/api';
import { formatSlot, toDateTimeInput } from '@/lib/dates';
import { initials } from '@/lib/people';
import type { CheckinStatus } from '@/lib/types';
import { useRole } from '@/workspace/WorkspaceProvider';

const statusPill: Record<CheckinStatus, { label: string; tone: 'blue' | 'green' | 'amber' }> = {
  scheduled: { label: 'SCHEDULED', tone: 'blue' },
  complete: { label: 'COMPLETE', tone: 'green' },
  not_booked: { label: 'NOT BOOKED', tone: 'amber' },
};

export function Buddy() {
  const { bundle, run } = useRole();
  const { role, checkin } = bundle;
  const [dialog, setDialog] = useState<'buddy' | 'schedule' | 'complete' | null>(null);
  const status = checkin?.status ?? 'not_booked';
  const pill = statusPill[status];

  return (
    <>
      <PageTitle eyebrow="Human support" title="Buddy & week-1 check-in" description="Documentation gets you started. Your buddy helps you navigate the things that aren’t written down." />
      <div className="grid gap-4 lg:grid-cols-[.8fr_1.2fr]">
        <Card className="overflow-hidden">
          <div className="h-20 bg-[#d9f3e7]" />
          <div className="px-6 pb-6">
            <div className="-mt-9 grid h-16 w-16 place-items-center rounded-2xl border-4 border-white bg-[#173532] text-lg font-bold text-white">{role.buddy_name ? initials(role.buddy_name) : '?'}</div>
            {role.buddy_name ? (
              <>
                <Pill tone="green">YOUR BUDDY</Pill>
                <h2 className="mt-3 text-xl font-semibold">{role.buddy_name}</h2>
                <p className="mt-1 text-sm text-slate-500">{role.buddy_title}</p>
                {role.buddy_note && <p className="mt-5 text-sm leading-6 text-slate-600">{role.buddy_note}</p>}
              </>
            ) : (
              <>
                <Pill tone="amber">NO BUDDY YET</Pill>
                <p className="mt-3 text-sm leading-6 text-slate-600">Name someone who knows this role and can answer the questions the documents can’t.</p>
              </>
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              {role.buddy_email && (
                <a
                  href={`mailto:${role.buddy_email}?subject=${encodeURIComponent(`${role.title} handover question`)}`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:-translate-y-px hover:border-slate-300"
                >
                  Send a message
                </a>
              )}
              <Button secondary onClick={() => setDialog('buddy')}>{role.buddy_name ? 'Edit buddy' : 'Add buddy'}</Button>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex flex-col justify-between gap-4 xl:flex-row">
            <div>
              <Pill tone={pill.tone}>{pill.label}</Pill>
              <h2 className="mt-3 text-lg font-semibold">Week-1 check-in</h2>
              <p className="mt-1 text-sm text-slate-500">
                {checkin?.scheduled_at ? formatSlot(checkin.scheduled_at) : 'Pick a 30-minute slot with your buddy in your first week.'}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-start gap-2">
              {status !== 'complete' && <Button secondary onClick={() => setDialog('schedule')}>{status === 'scheduled' ? 'Reschedule' : 'Book check-in'}</Button>}
              {status === 'scheduled' && <Button onClick={() => setDialog('complete')}>Mark complete</Button>}
              {status === 'complete' && <Button secondary onClick={() => run(() => saveCheckin(role.id, { status: 'scheduled' }), 'Check-in reopened')}>Reopen</Button>}
            </div>
          </div>
          <div className="my-6 h-px bg-slate-100" />
          <h3 className="text-sm font-bold">Suggested prompts</h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {role.checkin_prompts.map((p, i) => (
              <div key={p} className="flex gap-2.5 rounded-xl bg-slate-50 p-3 text-sm leading-5 text-slate-600">
                <span className="font-bold text-emerald-600">{String(i + 1).padStart(2, '0')}</span>
                {p}
              </div>
            ))}
          </div>
          {checkin?.outcome && (
            <div className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-emerald-700">Outcome</p>
              {checkin.outcome}
            </div>
          )}
        </Card>
      </div>

      <PrivateNotes />

      {dialog === 'buddy' && <BuddyForm onClose={() => setDialog(null)} />}
      {dialog === 'schedule' && <ScheduleForm onClose={() => setDialog(null)} />}
      {dialog === 'complete' && <CompleteForm onClose={() => setDialog(null)} />}
    </>
  );
}

function PrivateNotes() {
  const { bundle, userId } = useRole();
  const roleId = bundle.role.id;
  const [body, setBody] = useState('');
  const [state, setState] = useState<'loading' | 'saved' | 'saving' | 'error'>('loading');
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    setState('loading');
    getCheckinNote(roleId, userId)
      .then(text => {
        setBody(text);
        setState('saved');
      })
      .catch(() => setState('error'));
  }, [roleId, userId]);

  function change(text: string) {
    setBody(text);
    setState('saving');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      saveCheckinNote(roleId, userId, text)
        .then(() => setState('saved'))
        .catch(() => setState('error'));
    }, 700);
  }

  const label = { loading: 'Loading…', saved: 'Saved automatically', saving: 'Saving…', error: 'Could not save. Check your connection.' }[state];

  return (
    <Card className="mt-4 p-5 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold">Private check-in notes</h2>
          <p className="mt-1 text-xs text-slate-500">Visible only to you</p>
        </div>
        <span className={`text-xs ${state === 'error' ? 'text-rose-500' : 'text-slate-400'}`} aria-live="polite">{label}</span>
      </div>
      <textarea
        value={body}
        onChange={e => change(e.target.value)}
        disabled={state === 'loading'}
        aria-label="Private check-in notes"
        className="mt-4 min-h-28 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm outline-none focus:border-emerald-500"
        placeholder="Capture questions, blockers, or anything you want to discuss..."
      />
    </Card>
  );
}

function FormActions({ onClose, saving, label }: { onClose: () => void; saving: boolean; label: string }) {
  return (
    <div className="flex justify-end gap-2">
      <Button secondary onClick={onClose}>Cancel</Button>
      <Button type="submit" disabled={saving}>{saving ? 'Saving…' : label}</Button>
    </div>
  );
}

function BuddyForm({ onClose }: { onClose: () => void }) {
  const { bundle, run } = useRole();
  const { role } = bundle;
  const [name, setName] = useState(role.buddy_name);
  const [title, setTitle] = useState(role.buddy_title);
  const [note, setNote] = useState(role.buddy_note);
  const [email, setEmail] = useState(role.buddy_email);
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const ok = await run(
      () => updateRole(role.id, { buddy_name: name.trim(), buddy_title: title.trim(), buddy_note: note.trim(), buddy_email: email.trim() }),
      'Buddy saved',
    );
    setSaving(false);
    if (ok) onClose();
  }

  return (
    <Modal title="Handover buddy" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Input label="Name" value={name} onChange={setName} placeholder="Riley Nguyen" required />
        <Input label="Role or relationship" value={title} onChange={setTitle} placeholder="Former Partnerships Lead · 2024/25" />
        <Input label="Email" type="email" value={email} onChange={setEmail} placeholder="Used by the “Send a message” button" />
        <Textarea label="What they can help with" value={note} onChange={setNote} placeholder="Partner history, negotiation context…" />
        <FormActions onClose={onClose} saving={saving} label="Save buddy" />
      </form>
    </Modal>
  );
}

function ScheduleForm({ onClose }: { onClose: () => void }) {
  const { bundle, run } = useRole();
  const [when, setWhen] = useState(toDateTimeInput(bundle.checkin?.scheduled_at ?? null));
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const ok = await run(() => saveCheckin(bundle.role.id, { status: 'scheduled', scheduled_at: new Date(when).toISOString() }), 'Check-in scheduled');
    setSaving(false);
    if (ok) onClose();
  }

  return (
    <Modal title="Schedule the week-1 check-in" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Input label="Date and time" type="datetime-local" value={when} onChange={setWhen} required hint="Check-ins last 30 minutes." />
        <FormActions onClose={onClose} saving={saving} label="Save slot" />
      </form>
    </Modal>
  );
}

function CompleteForm({ onClose }: { onClose: () => void }) {
  const { bundle, run } = useRole();
  const [outcome, setOutcome] = useState(bundle.checkin?.outcome ?? '');
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const ok = await run(() => saveCheckin(bundle.role.id, { status: 'complete', outcome: outcome.trim() }), 'Check-in marked complete');
    setSaving(false);
    if (ok) onClose();
  }

  return (
    <Modal title="How did the check-in go?" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Textarea label="Outcome (shared with the committee)" value={outcome} onChange={setOutcome} placeholder="What was agreed, what is still blocked, and what to revisit in week two?" required />
        <FormActions onClose={onClose} saving={saving} label="Mark complete" />
      </form>
    </Modal>
  );
}
