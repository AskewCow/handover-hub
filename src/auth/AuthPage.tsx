import { useEffect, useState, type FormEvent } from 'react';
import { Button, ErrorNote, Icon, Input, Select } from '@/components/ui';
import { listRoleOptions } from '@/lib/api';
import { SOCIETY_NAME } from '@/lib/config';
import { useAuth } from './AuthProvider';

type Mode = 'sign-in' | 'sign-up';

const memberOptions = [
  { value: 'incoming' as const, label: 'Incoming member (taking on a role)' },
  { value: 'outgoing' as const, label: 'Outgoing member (handing over a role)' },
];

export function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('sign-in');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [memberType, setMemberType] = useState<'incoming' | 'outgoing'>('incoming');
  const [roleId, setRoleId] = useState('');
  const [roles, setRoles] = useState<{ value: string; label: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    listRoleOptions()
      .then(options => {
        setRoles(options.map(o => ({ value: o.id, label: o.title })));
        setRoleId(id => id || options[0]?.id || '');
      })
      .catch(() => setRoles([]));
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (mode === 'sign-in') {
        await signIn(email.trim(), password);
      } else {
        const { needsConfirmation } = await signUp({ fullName: fullName.trim(), email: email.trim(), password, memberType, roleId });
        if (needsConfirmation) setNotice('Check your inbox to confirm your email, then sign in.');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen bg-[#f5f7f4] lg:grid-cols-[1fr_1.1fr]">
      <aside className="hidden flex-col justify-between bg-[#112522] p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#6ee7b7] text-[#102521]"><Icon name="Logo" size={21} /></span>
          <div>
            <p className="font-semibold tracking-tight">Handover Hub</p>
            <p className="text-[10px] uppercase tracking-widest text-slate-400">{SOCIETY_NAME}</p>
          </div>
        </div>
        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-[.16em] text-emerald-300">Knowledge carried forward</p>
          <h1 className="max-w-md text-4xl font-semibold leading-tight tracking-[-.035em]">Take over a committee role without starting from scratch.</h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-slate-300">
            Role guides, onboarding checklists, contacts with owners, a shared task tracker, a decision log and a named buddy, all in one place.
          </p>
        </div>
        <p className="text-[11px] text-slate-500">All workspace data is fictional.</p>
      </aside>

      <main className="grid place-items-center p-4 sm:p-8">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#6ee7b7] text-[#102521]"><Icon name="Logo" size={21} /></span>
            <p className="font-semibold tracking-tight">Handover Hub</p>
          </div>

          <p className="mb-1 text-xs font-bold uppercase tracking-[.16em] text-emerald-600">{mode === 'sign-in' ? 'Welcome back' : 'Get started'}</p>
          <h2 className="text-[30px] font-semibold tracking-[-.035em] text-slate-950">{mode === 'sign-in' ? 'Sign in' : 'Create your account'}</h2>
          <p className="mt-1.5 text-sm leading-6 text-slate-500">
            {mode === 'sign-in' ? 'Use your society account or one of the test accounts.' : 'Join your society’s workspace and pick the role you are taking on or handing over.'}
          </p>

          <form onSubmit={submit} className="mt-7 space-y-4">
            {mode === 'sign-up' && <Input label="Full name" value={fullName} onChange={setFullName} placeholder="Alex Morgan" required autoComplete="name" />}
            <Input label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" required autoComplete="email" />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder={mode === 'sign-up' ? 'At least 8 characters' : 'Your password'}
              required
              minLength={mode === 'sign-up' ? 8 : undefined}
              autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
            />
            {mode === 'sign-up' && (
              <>
                <Select label="I am" value={memberType} onChange={setMemberType} options={memberOptions} />
                {roles.length > 0 && <Select label="Role" value={roleId} onChange={setRoleId} options={roles} />}
              </>
            )}

            {error && <ErrorNote>{error}</ErrorNote>}
            {notice && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>}

            <Button type="submit" disabled={busy} className="w-full">
              {busy ? 'Please wait…' : mode === 'sign-in' ? 'Sign in' : 'Create account'} <span>→</span>
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            {mode === 'sign-in' ? 'New to the society?' : 'Already have an account?'}{' '}
            <button
              onClick={() => {
                setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in');
                setError('');
                setNotice('');
              }}
              className="font-bold text-emerald-700 hover:underline"
            >
              {mode === 'sign-in' ? 'Create an account' : 'Sign in'}
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}
