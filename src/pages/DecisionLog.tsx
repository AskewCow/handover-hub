import { useState, type FormEvent } from 'react';
import { ActionMenu, Button, Card, Empty, Input, PageTitle, Pill, SearchInput } from '@/components/ui';
import { deleteRow, insertRow, updateRow } from '@/lib/api';
import { formatDate, toDateInput } from '@/lib/dates';
import { shortName } from '@/lib/people';
import type { Decision } from '@/lib/types';
import { useRole } from '@/workspace/WorkspaceProvider';

export function DecisionLog() {
  const { bundle, run } = useRole();
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Decision | 'new' | null>(null);

  const q = query.toLowerCase();
  const decisions = bundle.decisions.filter(d => [d.title, d.reason, d.tried_before, d.author].join(' ').toLowerCase().includes(q));

  return (
    <>
      <PageTitle
        eyebrow="Institutional memory"
        title="Decision log"
        description="Understand not just what was decided, but why—so the next committee doesn’t repeat old work."
        action={<Button onClick={() => setEditing(editing === 'new' ? null : 'new')}>+ Add decision</Button>}
      />
      {editing && <DecisionForm key={editing === 'new' ? 'new' : editing.id} decision={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      <SearchInput value={query} onChange={setQuery} placeholder="Search decisions, reasons, or authors..." className="max-w-md" />
      <div className="space-y-3">
        {decisions.map(d => (
          <Card key={d.id} className="p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="w-28 shrink-0 text-xs font-bold text-slate-400">{formatDate(d.decided_on)}</div>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-semibold">{d.title}</h2>
                  <div className="flex items-center gap-3">
                    {d.author && <Pill tone="purple">{shortName(d.author)}</Pill>}
                    <ActionMenu
                      label={`Actions for ${d.title}`}
                      actions={[
                        { label: 'Edit decision', onSelect: () => setEditing(d) },
                        {
                          label: 'Delete decision',
                          danger: true,
                          onSelect: () => window.confirm(`Delete “${d.title}”?`) && void run(() => deleteRow('decisions', d.id), 'Decision deleted'),
                        },
                      ]}
                    />
                  </div>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600"><b className="text-slate-800">Reason:</b> {d.reason}</p>
                {d.tried_before && (
                  <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500"><b>What we tried before:</b> {d.tried_before}</p>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
      {!decisions.length && (
        <Card>
          <Empty
            title={bundle.decisions.length ? 'No decisions found' : 'No decisions recorded yet'}
            text={bundle.decisions.length ? 'Try a broader search, or record a new decision.' : 'Record a decision and the reason behind it.'}
          />
        </Card>
      )}
    </>
  );
}

function DecisionForm({ decision, onClose }: { decision: Decision | null; onClose: () => void }) {
  const { bundle, profile, run } = useRole();
  const [title, setTitle] = useState(decision?.title ?? '');
  const [reason, setReason] = useState(decision?.reason ?? '');
  const [triedBefore, setTriedBefore] = useState(decision?.tried_before ?? '');
  const [author, setAuthor] = useState(decision?.author ?? profile.full_name);
  const [decidedOn, setDecidedOn] = useState(toDateInput(decision?.decided_on ?? new Date().toISOString()));
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const values = { title: title.trim(), reason: reason.trim(), tried_before: triedBefore.trim(), author: author.trim(), decided_on: decidedOn };
    const ok = await run(
      () => (decision ? updateRow<Decision>('decisions', decision.id, values) : insertRow<Decision>('decisions', { ...values, role_id: bundle.role.id })),
      decision ? 'Decision updated' : 'Decision recorded',
    );
    setSaving(false);
    if (ok) onClose();
  }

  return (
    <Card className="mb-5 p-6">
      <h2 className="mb-4 font-semibold">{decision ? 'Edit decision' : 'Record a decision'}</h2>
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <Input label="Decision" value={title} onChange={setTitle} placeholder="What did you decide?" required />
        <Input label="Reason" value={reason} onChange={setReason} placeholder="Why was this the right call?" required />
        <Input label="What was tried before?" value={triedBefore} onChange={setTriedBefore} placeholder="Add useful context" />
        <Input label="Author" value={author} onChange={setAuthor} placeholder="Your name" required />
        <Input label="Date decided" type="date" value={decidedOn} onChange={setDecidedOn} required />
        <div className="flex items-end justify-end gap-2 sm:col-span-2">
          <Button secondary onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save decision'}</Button>
        </div>
      </form>
    </Card>
  );
}
