import { useState, type FormEvent } from 'react';
import { ActionMenu, Avatar, Button, Card, Empty, Input, Modal, PageTitle, Pill, SearchInput } from '@/components/ui';
import { deleteRow, insertRow, markContactChecked, updateRow } from '@/lib/api';
import { formatDate, isStale, STALE_AFTER_DAYS } from '@/lib/dates';
import { initials } from '@/lib/people';
import type { Contact } from '@/lib/types';
import { useRole } from '@/workspace/WorkspaceProvider';

const columns = 'md:grid-cols-[1.1fr_.8fr_1.4fr_.8fr_.35fr]';

export function Contacts() {
  const { bundle, run } = useRole();
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Contact | 'new' | null>(null);

  const q = query.toLowerCase();
  const shown = bundle.contacts.filter(c => [c.name, c.owner, c.ask_about].join(' ').toLowerCase().includes(q));
  const staleTotal = bundle.contacts.filter(c => isStale(c.updated_at)).length;

  function remove(c: Contact) {
    if (window.confirm(`Delete ${c.name}? This cannot be undone.`)) void run(() => deleteRow('contacts', c.id), 'Contact deleted');
  }

  return (
    <>
      <PageTitle
        eyebrow="People & partners"
        title="Contacts"
        description="Know who owns each relationship and who to ask when you need help."
        action={<Button onClick={() => setEditing('new')}>+ Add contact</Button>}
      />
      <div className="flex flex-col gap-x-4 sm:flex-row sm:items-start sm:justify-between">
        <SearchInput value={query} onChange={setQuery} placeholder="Search contacts..." />
        {staleTotal > 0 && (
          <p className="mb-4 text-xs text-rose-600">
            {staleTotal} {staleTotal === 1 ? 'contact has' : 'contacts have'} not been checked in over {STALE_AFTER_DAYS} days.
          </p>
        )}
      </div>
      {/* No overflow-hidden here: it would clip the row action menus. */}
      <Card>
        <div className={`hidden ${columns} rounded-t-2xl border-b border-slate-100 bg-slate-50/70 px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 md:grid`}>
          <span>Contact</span><span>Owner</span><span>Who to ask about what</span><span>Last updated</span><span />
        </div>
        <div className="divide-y divide-slate-100">
          {shown.map((c, i) => {
            const stale = isStale(c.updated_at);
            return (
              <div key={c.id} className={`relative grid gap-3 px-5 py-4 pr-12 text-sm ${columns} md:items-center md:px-6`}>
                <div className="flex items-center gap-3"><Avatar initials={initials(c.name)} tone={i % 2 ? 'blue' : 'green'} /><b>{c.name}</b></div>
                <span className="text-slate-600"><span className="mr-2 text-[10px] font-bold uppercase tracking-wide text-slate-400 md:hidden">Owner</span>{c.owner}</span>
                <span className="text-slate-600"><span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400 md:hidden">Ask about</span>{c.ask_about}</span>
                <div className="flex flex-wrap items-center gap-2 text-slate-500">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 md:hidden">Updated</span>
                  {formatDate(c.updated_at)} {stale && <Pill tone="red">Stale</Pill>}
                </div>
                <ActionMenu
                  className="absolute right-5 top-5 md:static"
                  label={`Actions for ${c.name}`}
                  actions={[
                    { label: 'Mark as up to date', onSelect: () => void run(() => markContactChecked(c.id), `${c.name} marked as up to date`) },
                    { label: 'Edit contact', onSelect: () => setEditing(c) },
                    { label: 'Delete contact', onSelect: () => remove(c), danger: true },
                  ]}
                />
              </div>
            );
          })}
        </div>
        {!shown.length && (
          <Empty
            title={bundle.contacts.length ? 'No contacts found' : 'No contacts yet'}
            text={bundle.contacts.length ? 'Try a different name, owner, or topic.' : 'Add the people this role relies on.'}
          />
        )}
      </Card>
      {editing && <ContactForm contact={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function ContactForm({ contact, onClose }: { contact: Contact | null; onClose: () => void }) {
  const { bundle, run } = useRole();
  const [name, setName] = useState(contact?.name ?? '');
  const [owner, setOwner] = useState(contact?.owner ?? '');
  const [askAbout, setAskAbout] = useState(contact?.ask_about ?? '');
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const values = { name: name.trim(), owner: owner.trim(), ask_about: askAbout.trim() };
    const ok = await run(
      () => (contact ? updateRow<Contact>('contacts', contact.id, values) : insertRow<Contact>('contacts', { ...values, role_id: bundle.role.id })),
      contact ? 'Contact updated' : 'Contact added',
    );
    setSaving(false);
    if (ok) onClose();
  }

  return (
    <Modal title={contact ? `Edit ${contact.name}` : 'Add a contact'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Input label="Name" value={name} onChange={setName} placeholder="Person or organisation" required />
        <Input label="Owner" value={owner} onChange={setOwner} placeholder="Their role, or who owns the relationship" required />
        <Input label="Who to ask about what" value={askAbout} onChange={setAskAbout} placeholder="What should people go to them for?" required />
        <p className="text-xs text-slate-400">Saving sets “last updated” to today. Contacts are flagged as stale after {STALE_AFTER_DAYS} days.</p>
        <div className="flex justify-end gap-2">
          <Button secondary onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save contact'}</Button>
        </div>
      </form>
    </Modal>
  );
}
