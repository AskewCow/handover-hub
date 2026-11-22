// The role's outreach contacts (companies and partners), shown as a section of the Role guide.
import { useState, type FormEvent } from 'react';
import { ActionMenu, Avatar, Button, Card, Empty, Input, Modal, Pill, SearchInput } from '@/components/ui';
import { deleteRow, insertRow, markContactChecked, updateRow } from '@/lib/api';
import { formatDate, isStale, STALE_AFTER_DAYS } from '@/lib/dates';
import { initials } from '@/lib/people';
import type { Contact } from '@/lib/types';
import { useRole } from '@/workspace/WorkspaceProvider';

const columns = 'md:grid-cols-[1.1fr_.8fr_1.4fr_.8fr_.35fr]';

export function OutreachContacts() {
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
    // No overflow-hidden here: it would clip the row action menus.
    <Card className="mt-4">
      <div className="flex flex-col gap-4 border-b border-slate-100 p-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Outreach contacts</h2>
          <p className="mt-1 text-xs text-slate-500">The companies and partners this role works with, who owns each relationship, and what to ask them about.</p>
          {staleTotal > 0 && (
            <p className="mt-2 text-xs text-rose-600">
              {staleTotal} {staleTotal === 1 ? 'contact has' : 'contacts have'} not been checked in over {STALE_AFTER_DAYS} days.
            </p>
          )}
        </div>
        <Button onClick={() => setEditing('new')} className="shrink-0 whitespace-nowrap">+ Add contact</Button>
      </div>
      <div className="px-6 pt-4">
        <SearchInput value={query} onChange={setQuery} placeholder="Search outreach contacts..." />
      </div>
      <div className={`hidden ${columns} border-y border-slate-100 bg-slate-50/70 px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 md:grid`}>
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
          title={bundle.contacts.length ? 'No contacts found' : 'No outreach contacts yet'}
          text={bundle.contacts.length ? 'Try a different name, owner, or topic.' : 'Add the companies and partners this role works with.'}
        />
      )}
      {editing && <ContactForm contact={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </Card>
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
    <Modal title={contact ? `Edit ${contact.name}` : 'Add an outreach contact'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Input label="Company or partner" value={name} onChange={setName} placeholder="e.g. Red Bull" required />
        <Input label="Owner" value={owner} onChange={setOwner} placeholder="Who on the committee owns this relationship?" required />
        <Input label="Who to ask about what" value={askAbout} onChange={setAskAbout} placeholder="What do we work with them on?" required />
        <p className="text-xs text-slate-400">Saving sets “last updated” to today. Contacts are flagged as stale after {STALE_AFTER_DAYS} days.</p>
        <div className="flex justify-end gap-2">
          <Button secondary onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save contact'}</Button>
        </div>
      </form>
    </Modal>
  );
}
