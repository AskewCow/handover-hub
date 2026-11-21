import { useState } from 'react';
import { Button, Card, Empty, PageTitle, Pill } from '@/components/ui';
import { updateRole } from '@/lib/api';
import { isStale, relativeDays } from '@/lib/dates';
import { newDraftId, syncList, type DraftRow } from '@/lib/syncList';
import type { RecurringTask, Responsibility, WeekItem } from '@/lib/types';
import { useRole } from '@/workspace/WorkspaceProvider';

export function RoleGuide() {
  const { bundle, run } = useRole();
  const [editing, setEditing] = useState(false);
  const { role, responsibilities, weekItems, recurringTasks } = bundle;
  const stale = isStale(role.reviewed_at);

  if (editing) return <RoleGuideEditor onDone={() => setEditing(false)} />;

  return (
    <>
      <PageTitle
        eyebrow="Role guide"
        title={role.title}
        description="Your source of truth for what the role involves, how the year flows, and where to focus."
        action={
          <>
            {stale && <Button secondary onClick={() => run(() => updateRole(role.id, { reviewed_at: new Date().toISOString() }), 'Marked as reviewed')}>Mark as reviewed</Button>}
            <Button secondary onClick={() => setEditing(true)}>Edit role guide</Button>
          </>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span>Last reviewed {relativeDays(role.reviewed_at)}</span>
        {stale && <Pill tone="red">Stale</Pill>}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <h2 className="mb-5 text-lg font-semibold">Core responsibilities</h2>
          {responsibilities.length === 0 ? (
            <Empty title="No responsibilities yet" text="Edit the role guide to describe what this role owns." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {responsibilities.map((r, i) => (
                <div key={r.id} className="flex gap-3 rounded-xl bg-slate-50 p-4">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-emerald-100 text-xs font-bold text-emerald-700">{i + 1}</span>
                  <span className="text-sm font-medium leading-6 text-slate-700">{r.body}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold">Typical week</h2>
          {weekItems.length === 0 ? (
            <p className="text-sm text-slate-500">Not described yet.</p>
          ) : (
            <div className="space-y-4">
              {weekItems.map(w => (
                <div key={w.id} className="flex gap-3">
                  <span className="w-9 text-xs font-bold uppercase text-emerald-600">{w.day}</span>
                  <span className="text-sm text-slate-600">{w.body}</span>
                </div>
              ))}
            </div>
          )}
          {role.peak_note && (
            <div className="mt-6 rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs leading-5 text-amber-800"><b>Peak workload:</b> {role.peak_note}</div>
          )}
        </Card>
      </div>
      <Card className="mt-4 overflow-hidden">
        <div className="border-b border-slate-100 p-6"><h2 className="text-lg font-semibold">Recurring tasks & deadlines</h2></div>
        {recurringTasks.length === 0 ? (
          <Empty title="No recurring tasks" text="Add the jobs that come round every week, month or term." />
        ) : (
          <div className="divide-y divide-slate-100">
            {recurringTasks.map(x => (
              <div key={x.id} className="grid grid-cols-2 gap-x-3 gap-y-2 px-5 py-4 text-sm sm:grid-cols-[1.4fr_1fr_1fr_.5fr] sm:px-6">
                <b className="col-span-2 sm:col-span-1">{x.name}</b>
                <span className="text-slate-500"><span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wide text-slate-400 sm:hidden">Schedule</span>{x.schedule}</span>
                <span className="text-slate-500"><span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wide text-slate-400 sm:hidden">Tool</span>{x.tool}</span>
                <span className="col-span-2 text-slate-400 sm:col-span-1"><span className="mr-1 text-[10px] font-bold uppercase tracking-wide text-slate-400 sm:hidden">Time:</span>{x.duration}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}

// ---------------------------------------------------------------------------
// Edit mode
// ---------------------------------------------------------------------------

const cellClass = 'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100';

function RemoveButton({ onClick }: { onClick: () => void }) {
  return <button type="button" onClick={onClick} className="shrink-0 px-2 text-lg text-slate-300 hover:text-rose-500" aria-label="Remove">×</button>;
}

function AddButton({ children, onClick }: { children: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="mt-3 text-sm font-bold text-emerald-700 hover:underline">+ {children}</button>;
}

/** Editable list state with helpers to change, add and remove rows. */
function useDraftList<T>(initial: DraftRow<T>[]) {
  const [rows, setRows] = useState(initial);
  return {
    rows,
    change: (id: string, values: Partial<T>) => setRows(rs => rs.map(r => (r.id === id ? { ...r, ...values } : r))),
    add: (values: Partial<T>) => setRows(rs => [...rs, { ...values, id: newDraftId() } as DraftRow<T>]),
    remove: (id: string) => setRows(rs => rs.filter(r => r.id !== id)),
  };
}

function RoleGuideEditor({ onDone }: { onDone: () => void }) {
  const { bundle, run } = useRole();
  const { role } = bundle;
  const resp = useDraftList<Responsibility>(bundle.responsibilities);
  const week = useDraftList<WeekItem>(bundle.weekItems);
  const recurring = useDraftList<RecurringTask>(bundle.recurringTasks);
  const [peakNote, setPeakNote] = useState(role.peak_note);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const ok = await run(
      () =>
        Promise.all([
          syncList('responsibilities', role.id, bundle.responsibilities, resp.rows, ['body']),
          syncList('week_items', role.id, bundle.weekItems, week.rows, ['day', 'body']),
          syncList('recurring_tasks', role.id, bundle.recurringTasks, recurring.rows, ['name', 'schedule', 'tool', 'duration']),
          updateRole(role.id, { peak_note: peakNote.trim(), reviewed_at: new Date().toISOString() }),
        ]),
      'Role guide saved',
    );
    setSaving(false);
    if (ok) onDone();
  }

  return (
    <>
      <PageTitle
        eyebrow="Editing role guide"
        title={role.title}
        description="Saving also marks the guide as reviewed, which clears its stale flag."
        action={
          <>
            <Button secondary onClick={onDone}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</Button>
          </>
        }
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <h2 className="mb-4 text-lg font-semibold">Core responsibilities</h2>
          <div className="space-y-2">
            {resp.rows.map((r, i) => (
              <div key={r.id} className="flex items-center gap-2">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-emerald-100 text-xs font-bold text-emerald-700">{i + 1}</span>
                <input className={cellClass} value={r.body ?? ''} onChange={e => resp.change(r.id, { body: e.target.value })} placeholder="What does this role own?" aria-label={`Responsibility ${i + 1}`} />
                <RemoveButton onClick={() => resp.remove(r.id)} />
              </div>
            ))}
          </div>
          <AddButton onClick={() => resp.add({ body: '' })}>Add responsibility</AddButton>
        </Card>
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold">Typical week</h2>
          <div className="space-y-2">
            {week.rows.map(w => (
              <div key={w.id} className="flex items-center gap-2">
                <input className={`${cellClass} w-16 shrink-0`} value={w.day ?? ''} onChange={e => week.change(w.id, { day: e.target.value })} placeholder="Mon" aria-label="Day" />
                <input className={cellClass} value={w.body ?? ''} onChange={e => week.change(w.id, { body: e.target.value })} placeholder="What happens" aria-label="Activity" />
                <RemoveButton onClick={() => week.remove(w.id)} />
              </div>
            ))}
          </div>
          <AddButton onClick={() => week.add({ day: '', body: '' })}>Add day</AddButton>
          <label className="mt-5 block">
            <span className="mb-1.5 block text-xs font-bold text-slate-600">Peak workload</span>
            <textarea className={`${cellClass} min-h-20`} value={peakNote} onChange={e => setPeakNote(e.target.value)} placeholder="When is this role busiest?" />
          </label>
        </Card>
      </div>
      <Card className="mt-4 p-6">
        <h2 className="mb-4 text-lg font-semibold">Recurring tasks & deadlines</h2>
        <div className="space-y-3">
          {recurring.rows.map(x => (
            <div key={x.id} className="grid gap-2 sm:grid-cols-[1.4fr_1fr_1fr_.6fr_auto]">
              <input className={cellClass} value={x.name ?? ''} onChange={e => recurring.change(x.id, { name: e.target.value })} placeholder="Task" aria-label="Task" />
              <input className={cellClass} value={x.schedule ?? ''} onChange={e => recurring.change(x.id, { schedule: e.target.value })} placeholder="Every Monday" aria-label="Schedule" />
              <input className={cellClass} value={x.tool ?? ''} onChange={e => recurring.change(x.id, { tool: e.target.value })} placeholder="Tool" aria-label="Tool" />
              <input className={cellClass} value={x.duration ?? ''} onChange={e => recurring.change(x.id, { duration: e.target.value })} placeholder="30 min" aria-label="Time" />
              <RemoveButton onClick={() => recurring.remove(x.id)} />
            </div>
          ))}
        </div>
        <AddButton onClick={() => recurring.add({ name: '', schedule: '', tool: '', duration: '' })}>Add recurring task</AddButton>
      </Card>
    </>
  );
}
