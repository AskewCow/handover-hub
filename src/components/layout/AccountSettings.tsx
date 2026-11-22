import { useState, type FormEvent } from 'react';
import { useAuth } from '@/auth/AuthProvider';
import { Button, ErrorNote, Input, Modal, useToast } from '@/components/ui';
import { changePassword, updateOwnProfile } from '@/lib/api';
import { memberTypeLabels } from '@/lib/people';

/** Change your display name and password. Member type can only be changed by a lead. */
export function AccountSettings({ onClose }: { onClose: () => void }) {
  const { session, profile, refreshProfile } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(profile?.full_name ?? '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (password && password !== confirm) return setError('The two passwords don’t match.');
    setSaving(true);
    try {
      if (name.trim() && name.trim() !== profile?.full_name) await updateOwnProfile(session!.user.id, { full_name: name.trim() });
      if (password) await changePassword(password);
      await refreshProfile();
      toast(password ? 'Account updated and password changed' : 'Account updated');
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Account settings" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-xs text-slate-500">
          Signed in as <b>{session?.user.email}</b> · {profile ? memberTypeLabels[profile.member_type] : ''}
        </p>
        <Input label="Name" value={name} onChange={setName} required autoComplete="name" />
        <Input label="New password" type="password" value={password} onChange={setPassword} placeholder="Leave empty to keep your current password" minLength={8} autoComplete="new-password" />
        {password && <Input label="Confirm new password" type="password" value={confirm} onChange={setConfirm} required autoComplete="new-password" />}
        {error && <ErrorNote>{error}</ErrorNote>}
        <div className="flex justify-end gap-2">
          <Button secondary onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        </div>
      </form>
    </Modal>
  );
}
