// Contacts: the committee directory. Everyone on the committee, their role, how to reach them,
// and when they joined or left. Shared by every role (outreach partners live in the Role guide).
import { useState, type FormEvent } from 'react';
import { ActionMenu, Avatar, Button, Card, Empty, Input, Modal, PageTitle, Pill, SearchInput } from '@/components/ui';
import { deleteRow, insertRow, updateRow } from '@/lib/api';
import { formatDate, toDateInput } from '@/lib/dates';
import { initials } from '@/lib/people';
import type { CommitteeMember } from '@/lib/types';
import { useRole } from '@/workspace/WorkspaceProvider';

const columns = 'md:grid-cols-[1.1fr_1fr_1.3fr_.7fr_.8fr_.3fr]';

export function Contacts() {
  const { bundle, run } = useRole();
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<CommitteeMember | 'new' | null>(null);

  const members = bundle.committee;
  const q = query.toLowerCase();
  const shown = members.filter(m => [m.name, m.committee_role, m.email].join(' ').toLowerCase().includes(q));
  const current = members.filter(m => !m.left_on).length;

  function remove(m: CommitteeMember) {
    if (window.confirm(`Remove ${m.name} from the directory? This cannot be undone.`)) {
      void run(() => deleteRow('committee_members', m.id), `${m.name} removed`);
    }
  }

  return (
    <>
      <PageTitle
        eyebrow="Committee"
        title="Contacts"
        description="Everyone on the committee, what they do, how to reach them, and when they joined or left."
        action={<Button onClick={() => setEditing('new')}>+ Add member</Button>}
      />
      <div className="flex flex-col gap-x-4 sm:flex-row sm:items-start sm:justify-between">
        <SearchInput value={query} onChange={setQuery} placeholder="Search by name, role or email..." />
        <p className="mb-4 text-xs text-slate-500">{current} current {current === 1 ? 'member' : 'members'} · {members.length - current} former</p>
      </div>
      {/* No overflow-hidden here: it would clip the row action menus. */}
      <Card>
        <div className={`hidden ${columns} gap-3 rounded-t-2xl border-b border-slate-100 bg-slate-50/70 px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 md:grid`}>
          <span>Name</span><span>Role</span><span>Email</span><span>Joined</span><span>Left</span><span />
        </div>
        <div className="divide-y divide-slate-100">
          {shown.map((m, i) => (
            <div key={m.id} className={`relative grid grid-cols-2 gap-x-3 gap-y-2 px-5 py-4 pr-12 text-sm ${columns} md:items-center md:px-6`}>
              <div className="col-span-2 flex items-center gap-3 md:col-span-1">
                <Avatar initials={initials(m.name)} tone={m.left_on ? 'neutral' : i % 2 ? 'blue' : 'green'} />
                <b className={m.left_on ? 'text-slate-400' : ''}>{m.name}</b>
              </div>
              <span className="text-slate-600"><Label>Role</Label>{m.committee_role}</span>
              <span className="min-w-0 truncate"><Label>Email</Label>{m.email ? <a href={`mailto:${m.email}`} className="text-emerald-700 hover:underline">{m.email}</a> : '—'}</span>
              <span className="text-slate-500"><Label>Joined</Label>{m.joined_on ? formatDate(m.joined_on) : '—'}</span>
              <span className="text-slate-500"><Label>Left</Label>{m.left_on ? formatDate(m.left_on) : <Pill tone="green">Current member</Pill>}</span>
              <ActionMenu
                className="absolute right-5 top-5 md:static"
                label={`Actions for ${m.name}`}
                actions={[
                  { label: 'Edit member', onSelect: () => setEditing(m) },
                  ...(!m.left_on
                    ? [{ label: 'Mark as left today', onSelect: () => void run(() => updateRow<CommitteeMember>('committee_members', m.id, { left_on: new Date().toISOString().slice(0, 10) }), `${m.name} marked as left`) }]
                    : []),
                  { label: 'Remove from directory', onSelect: () => remove(m), danger: true },
                ]}
              />
            </div>
          ))}
        </div>
        {!shown.length && (
          <Empty
            title={members.length ? 'No one found' : 'No committee members yet'}
            text={members.length ? 'Try a different name, role or email.' : 'Add the people on your committee.'}
          />
        )}
      </Card>
      {editing && <MemberForm member={editing === 'new' ? null : editing} position={members.length} onClose={() => setEditing(null)} />}
    </>
  );
}

/** Column name shown above each value on small screens, where the table header is hidden. */
function Label({ children }: { children: string }) {
  return <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wide text-slate-400 md:hidden">{children}</span>;
}

function MemberForm({ member, position, onClose }: { member: CommitteeMember | null; position: number; onClose: () => void }) {
  const { run } = useRole();
  const [name, setName] = useState(member?.name ?? '');
  const [role, setRole] = useState(member?.committee_role ?? '');
  const [email, setEmail] = useState(member?.email ?? '');
  const [joined, setJoined] = useState(toDateInput(member?.joined_on ?? new Date().toISOString()));
  const [left, setLeft] = useState(toDateInput(member?.left_on ?? null));
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const values = { name: name.trim(), committee_role: role.trim(), email: email.trim(), joined_on: joined || null, left_on: left || null };
    const ok = await run(
      () => (member ? updateRow<CommitteeMember>('committee_members', member.id, values) : insertRow<CommitteeMember>('committee_members', { ...values, position })),
      member ? 'Member updated' : 'Member added',
    );
    setSaving(false);
    if (ok) onClose();
  }

  return (
    <Modal title={member ? `Edit ${member.name}` : 'Add a committee member'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Input label="Name" value={name} onChange={setName} placeholder="e.g. Niamh C." required />
        <Input label="Role" value={role} onChange={setRole} placeholder="e.g. Workshop Coordinator" required />
        <Input label="Email" type="email" value={email} onChange={setEmail} placeholder="name@example.com" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Joined" type="date" value={joined} onChange={setJoined} />
          <Input label="Left" type="date" value={left} onChange={setLeft} hint="Leave empty if they’re still on the committee." />
        </div>
        <div className="flex justify-end gap-2">
          <Button secondary onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save member'}</Button>
        </div>
      </form>
    </Modal>
  );
}
