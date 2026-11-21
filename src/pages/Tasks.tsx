import { useState, type FormEvent } from 'react';
import { ActionMenu, Avatar, Button, Card, Input, Modal, PageTitle, Select, type MenuAction } from '@/components/ui';
import { deleteRow, insertRow, updateRow } from '@/lib/api';
import { dueLabel, formatShortDate, toDateInput } from '@/lib/dates';
import { findOverlap } from '@/lib/metrics';
import { initials, samePerson, shortName } from '@/lib/people';
import type { Task, TaskStatus } from '@/lib/types';
import { useRole } from '@/workspace/WorkspaceProvider';

const columns: { status: TaskStatus; title: string; dot: string }[] = [
  { status: 'todo', title: 'To do', dot: 'bg-slate-400' },
  { status: 'in_progress', title: 'In progress', dot: 'bg-sky-500' },
  { status: 'done', title: 'Done', dot: 'bg-emerald-500' },
];

const statusLabel = Object.fromEntries(columns.map(c => [c.status, c.title])) as Record<TaskStatus, string>;

function dateText(task: Task): string {
  if (task.status === 'done') return formatShortDate(task.updated_at);
  if (!task.due_date) return 'No due date';
  const label = dueLabel(task.due_date);
  return label === 'due today' || label === 'overdue' ? label.replace(/^\w/, c => c.toUpperCase()) : `Due ${formatShortDate(task.due_date)}`;
}

export function Tasks() {
  const { bundle, profile, run } = useRole();
  const [editing, setEditing] = useState<Task | 'new' | null>(null);
  const contactName = (id: string | null) => bundle.contacts.find(c => c.id === id)?.name;

  function actionsFor(task: Task): MenuAction[] {
    const moves = columns
      .filter(c => c.status !== task.status)
      .map(c => ({ label: `Move to ${c.title}`, onSelect: () => void run(() => updateRow<Task>('tasks', task.id, { status: c.status })) }));
    return [
      ...moves,
      ...(!samePerson(task.assignee, profile.full_name) ? [{ label: 'Assign to me', onSelect: () => setEditing({ ...task, assignee: profile.full_name }) }] : []),
      { label: 'Edit task', onSelect: () => setEditing(task) },
      {
        label: 'Delete task',
        danger: true,
        onSelect: () => window.confirm(`Delete “${task.title}”?`) && void run(() => deleteRow('tasks', task.id), 'Task deleted'),
      },
    ];
  }

  return (
    <>
      <PageTitle
        eyebrow="Shared work"
        title="Task tracker"
        description="Keep work visible, avoid duplicated effort, and make ownership clear."
        action={<Button onClick={() => setEditing('new')}>+ New task</Button>}
      />
      <div className="mb-5 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <span className="font-bold">!</span>
        <span><b>Before assigning:</b> we’ll warn you if a task or contact is already owned by someone else.</span>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {columns.map(col => {
          const tasks = bundle.tasks.filter(t => t.status === col.status);
          return (
            <section key={col.status} className="rounded-2xl bg-slate-100/70 p-3">
              <div className="flex items-center justify-between px-2 py-2">
                <div className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${col.dot}`} /><h2 className="text-sm font-bold">{col.title}</h2></div>
                <span className="text-xs text-slate-400">{tasks.length}</span>
              </div>
              <div className="space-y-3">
                {tasks.length === 0 && <p className="px-2 py-6 text-center text-xs text-slate-400">Nothing here yet</p>}
                {tasks.map(t => {
                  const overlap = t.status !== 'done' ? findOverlap(bundle.tasks, t) : null;
                  const contact = contactName(t.contact_id);
                  return (
                    <div key={t.id} role="button" tabIndex={0} onClick={() => setEditing(t)} onKeyDown={e => e.key === 'Enter' && setEditing(t)}>
                      <Card className="cursor-pointer p-4 transition hover:-translate-y-0.5 hover:shadow-md">
                        <div className="mb-5 flex items-start justify-between gap-3">
                          <div>
                            <h3 className={`text-sm font-semibold leading-5 ${t.status === 'done' ? 'text-slate-400 line-through' : ''}`}>{t.title}</h3>
                            {contact && <p className="mt-1 text-[11px] text-slate-400">Contact: {contact}</p>}
                          </div>
                          <ActionMenu actions={actionsFor(t)} label={`Actions for ${t.title}`} />
                        </div>
                        {overlap && (
                          <div className="mb-3 rounded-lg bg-amber-50 px-2.5 py-2 text-[11px] font-semibold text-amber-700">
                            Overlaps with {shortName(overlap.assignee!)}’s “{overlap.title}”
                          </div>
                        )}
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-2 text-slate-500">
                            <Avatar initials={t.assignee ? initials(t.assignee) : '?'} tone="neutral" size="sm" />
                            {t.assignee ? shortName(t.assignee) : 'Unassigned'}
                          </span>
                          <span className={t.status !== 'done' && t.due_date && dueLabel(t.due_date) === 'overdue' ? 'text-rose-500' : 'text-slate-400'}>{dateText(t)}</span>
                        </div>
                      </Card>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
      {editing && <TaskForm task={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function TaskForm({ task, onClose }: { task: Task | null; onClose: () => void }) {
  const { bundle, profile, run } = useRole();
  const saved = task ? bundle.tasks.find(t => t.id === task.id) : undefined;
  const [title, setTitle] = useState(task?.title ?? '');
  const [assignee, setAssignee] = useState(task?.assignee ?? '');
  const [dueDate, setDueDate] = useState(toDateInput(task?.due_date ?? null));
  const [contactId, setContactId] = useState(task?.contact_id ?? '');
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? 'todo');
  const [saving, setSaving] = useState(false);

  const candidate = { id: task?.id, title, contact_id: contactId || null, assignee: assignee.trim() || null };
  const overlap = status !== 'done' ? findOverlap(bundle.tasks, candidate) : null;
  const takingOver = saved?.assignee && assignee.trim() && !samePerson(saved.assignee, assignee) ? saved.assignee : null;
  const knownNames = [...new Set([profile.full_name, ...bundle.tasks.map(t => t.assignee).filter((n): n is string => Boolean(n))])];

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const values: Partial<Task> = {
      title: title.trim(),
      assignee: assignee.trim() || null,
      due_date: dueDate || null,
      contact_id: contactId || null,
      status,
    };
    const ok = await run(
      () => (task ? updateRow<Task>('tasks', task.id, values) : insertRow<Task>('tasks', { ...values, role_id: bundle.role.id })),
      task ? 'Task updated' : 'Task created',
    );
    setSaving(false);
    if (ok) onClose();
  }

  return (
    <Modal title={task ? 'Edit task' : 'New task'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Input label="Task" value={title} onChange={setTitle} placeholder="What needs doing?" required />
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block">
              <span className="mb-1.5 flex items-center justify-between text-xs font-bold text-slate-600">
                Assignee
                {!samePerson(assignee, profile.full_name) && (
                  <button type="button" onClick={() => setAssignee(profile.full_name)} className="font-bold text-emerald-700 hover:underline">Assign to me</button>
                )}
              </span>
              <input
                list="task-assignees"
                value={assignee}
                onChange={e => setAssignee(e.target.value)}
                placeholder="Leave empty if unassigned"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
              <datalist id="task-assignees">{knownNames.map(n => <option key={n} value={n} />)}</datalist>
            </label>
          </div>
          <Input label="Due date" type="date" value={dueDate} onChange={setDueDate} />
          <Select
            label="Related contact"
            value={contactId}
            onChange={setContactId}
            options={[{ value: '', label: 'None' }, ...bundle.contacts.map(c => ({ value: c.id, label: c.name }))]}
            hint="Linking a contact lets us spot two people emailing the same person."
          />
          <Select label="Status" value={status} onChange={setStatus} options={columns.map(c => ({ value: c.status, label: statusLabel[c.status] }))} />
        </div>

        {overlap && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800" role="alert">
            <b>Possible duplicate work.</b> {overlap.assignee} already owns “{overlap.title}”
            {overlap.contact_id && overlap.contact_id === candidate.contact_id ? ` with ${bundle.contacts.find(c => c.id === overlap.contact_id)?.name ?? 'the same contact'}` : ''} ({statusLabel[overlap.status].toLowerCase()}). Check with them before you start.
          </div>
        )}
        {takingOver && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800" role="alert">
            <b>Already assigned to {takingOver}.</b> Saving will reassign it to {assignee.trim()}.
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button secondary onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Saving…' : overlap || takingOver ? 'Save anyway' : 'Save task'}</Button>
        </div>
      </form>
    </Modal>
  );
}
