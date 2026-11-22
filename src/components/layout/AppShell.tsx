import { useState, type ReactNode } from 'react';
import { useAuth } from '@/auth/AuthProvider';
import { ActionMenu, Avatar, Icon, useToast } from '@/components/ui';
import { updateOwnProfile } from '@/lib/api';
import { SOCIETY_NAME } from '@/lib/config';
import { navGroups, type View } from '@/lib/navigation';
import { initials, memberTypeLabels } from '@/lib/people';
import { useWorkspace } from '@/workspace/WorkspaceProvider';
import { AccountSettings } from './AccountSettings';

export function AppShell({ view, children }: { view: View; children: ReactNode }) {
  const { signOut, refreshProfile } = useAuth();
  const { profile, roles, roleId, setRoleId, isOwnRole, go, userId, bundle, unread } = useWorkspace();
  const toast = useToast();
  const [menu, setMenu] = useState(false);
  const [settings, setSettings] = useState(false);
  const society = bundle?.role.society ?? roles[0]?.society ?? SOCIETY_NAME;
  const selectedRole = roles.find(r => r.id === roleId);

  async function makeMyRole() {
    try {
      await updateOwnProfile(userId, { role_id: roleId });
      await refreshProfile();
      toast(`${selectedRole?.title ?? 'This role'} is now your role`);
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f7f4] text-slate-900">
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[264px] max-w-[88vw] flex-col bg-[#112522] text-white transition-transform duration-300 lg:max-w-none lg:translate-x-0 ${menu ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-[76px] items-center gap-3 border-b border-white/10 px-6">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#6ee7b7] text-[#102521]"><Icon name="Logo" size={21} /></span>
          <div>
            <p className="font-semibold tracking-tight">Handover Hub</p>
            <p className="text-[10px] uppercase tracking-widest text-slate-400">{society}</p>
          </div>
          <button onClick={() => setMenu(false)} className="ml-auto text-slate-400 lg:hidden" aria-label="Close navigation">×</button>
        </div>

        <div className="px-4 py-4">
          <label className="block rounded-xl border border-white/10 bg-white/[.06] px-3 py-2">
            <span className="block text-[9px] font-bold uppercase tracking-widest text-slate-400">Viewing role</span>
            <select value={roleId} onChange={e => setRoleId(e.target.value)} className="mt-0.5 w-full bg-transparent text-xs font-semibold text-white outline-none">
              {roles.map(r => (
                <option key={r.id} value={r.id} className="text-slate-900">{r.title}</option>
              ))}
            </select>
          </label>
        </div>

        <nav className="sidebar-scroll flex-1 overflow-y-auto px-3 pb-4">
          {navGroups.map(g => (
            <div key={g.label} className="mb-4">
              <p className="mb-1 px-3 text-[9px] font-bold uppercase tracking-[.16em] text-slate-500">{g.label}</p>
              {g.items.map(item => (
                <button
                  key={item}
                  onClick={() => {
                    go(item);
                    setMenu(false);
                  }}
                  aria-current={view === item ? 'page' : undefined}
                  className={`mb-0.5 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium transition ${view === item ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                >
                  <span className={view === item ? 'text-emerald-300' : ''}><Icon name={item} size={17} /></span>
                  {item}
                  {item === 'Messages' && unread > 0 && (
                    <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-emerald-400 px-1.5 text-[10px] font-bold text-[#102521]" aria-label={`${unread} unread`}>{unread}</span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3 rounded-xl p-2">
            <Avatar initials={initials(profile.full_name)} tone="purple" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold">{profile.full_name}</p>
              <p className="text-[10px] text-slate-400">{memberTypeLabels[profile.member_type]}</p>
            </div>
            <div>
              <ActionMenu
                label="Account menu"
                placement="up"
                actions={[
                  ...(!isOwnRole && selectedRole ? [{ label: `Make ${selectedRole.title} my role`, onSelect: () => void makeMyRole() }] : []),
                  { label: 'Account settings', onSelect: () => setSettings(true) },
                  { label: 'Sign out', onSelect: () => void signOut(), danger: true },
                ]}
              />
            </div>
          </div>
        </div>
      </aside>

      {settings && <AccountSettings onClose={() => setSettings(false)} />}
      {menu && <button className="fixed inset-0 z-30 bg-slate-950/30 lg:hidden" onClick={() => setMenu(false)} aria-label="Close navigation" />}

      <main className="min-h-screen lg:pl-[264px]">
        <div className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200/70 bg-white/90 px-4 backdrop-blur sm:px-5 lg:hidden">
          <button onClick={() => setMenu(true)} className="grid h-10 w-10 place-items-center text-xl" aria-label="Open navigation">☰</button>
          <b className="text-sm">Handover Hub</b>
          <Avatar initials={initials(profile.full_name)} size="md" />
        </div>
        <div className="mx-auto max-w-[1220px] p-4 sm:p-8 lg:p-10 xl:p-12">
          {!isOwnRole && selectedRole && (
            <div className="mb-5 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
              Previewing <b>{selectedRole.title}</b>. This is not your role, so the checklist and check-in reflect that role’s handover.
            </div>
          )}
          {children}
          <footer className="mt-12 flex flex-col gap-2 border-t border-slate-200 py-6 text-[11px] text-slate-400 sm:flex-row sm:items-center sm:justify-between">
            <span>Handover Hub · {society}</span>
            <span>Knowledge carried forward</span>
          </footer>
        </div>
      </main>
    </div>
  );
}
