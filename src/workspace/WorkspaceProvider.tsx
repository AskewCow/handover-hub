// Loads the roles and the selected role's content, and gives pages one consistent way to save changes.
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '@/auth/AuthProvider';
import { useToast } from '@/components/ui';
import { countUnread, listAllProfiles, listRoles, loadRoleBundle } from '@/lib/api';
import type { View } from '@/lib/navigation';
import type { Profile, Role, RoleBundle } from '@/lib/types';

interface Workspace {
  userId: string;
  profile: Profile;
  roles: Role[];
  roleId: string;
  setRoleId: (id: string) => void;
  /** True when the selected role is the one on the signed-in member's profile. */
  isOwnRole: boolean;
  bundle: RoleBundle | null;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  /**
   * Runs a save, shows a toast, then reloads the role. Returns false if it failed,
   * so forms can stay open with the user's input.
   */
  run: (action: () => Promise<unknown>, successMessage?: string) => Promise<boolean>;
  go: (view: View) => void;
  /** Everyone in the society (for buddies, messages and the lead view). */
  members: Profile[];
  /** Unread messages for the signed-in member, refreshed every 30 seconds. */
  unread: number;
  refreshUnread: () => Promise<void>;
  /** The person the Messages page should open with (set by "Send a message"). */
  conversationWith: string | null;
  openConversation: (profileId: string | null) => void;
}

const WorkspaceContext = createContext<Workspace | null>(null);

export function WorkspaceProvider({ go, children }: { go: (view: View) => void; children: ReactNode }) {
  const { session, profile } = useAuth();
  const toast = useToast();
  const [roles, setRoles] = useState<Role[]>([]);
  const [roleId, setRoleId] = useState('');
  const [bundle, setBundle] = useState<RoleBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [members, setMembers] = useState<Profile[]>([]);
  const [unread, setUnread] = useState(0);
  const [conversationWith, setConversationWith] = useState<string | null>(null);
  const userId = session!.user.id;

  useEffect(() => {
    listAllProfiles().then(setMembers).catch(() => setMembers([]));
  }, [profile]);

  const refreshUnread = useCallback(async () => {
    setUnread(await countUnread(userId).catch(() => 0));
  }, [userId]);

  useEffect(() => {
    void refreshUnread();
    const timer = window.setInterval(() => void refreshUnread(), 30_000);
    return () => window.clearInterval(timer);
  }, [refreshUnread]);

  const openConversation = useCallback(
    (profileId: string | null) => {
      setConversationWith(profileId);
      go('Messages');
    },
    [go],
  );

  useEffect(() => {
    listRoles()
      .then(list => {
        setRoles(list);
        setRoleId(current => current || profile?.role_id || list[0]?.id || '');
        if (!list.length) setLoading(false);
      })
      .catch(err => {
        setError((err as Error).message);
        setLoading(false);
      });
  }, [profile?.role_id]);

  const refresh = useCallback(async () => {
    if (!roleId) return;
    try {
      setBundle(await loadRoleBundle(roleId, profile!));
      setError('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [roleId, profile]);

  useEffect(() => {
    setLoading(true);
    setBundle(null);
    void refresh();
  }, [refresh]);

  const run = useCallback(
    async (action: () => Promise<unknown>, successMessage?: string) => {
      try {
        await action();
        if (successMessage) toast(successMessage);
        await refresh();
        return true;
      } catch (err) {
        toast((err as Error).message || 'Something went wrong. Please try again.', 'error');
        return false;
      }
    },
    [refresh, toast],
  );

  if (!profile) return null;

  return (
    <WorkspaceContext.Provider
      value={{
        userId,
        profile,
        roles,
        roleId,
        setRoleId,
        isOwnRole: roleId === profile.role_id,
        bundle,
        loading,
        error,
        refresh,
        run,
        go,
        members,
        unread,
        refreshUnread,
        conversationWith,
        openConversation,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): Workspace {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used inside WorkspaceProvider');
  return ctx;
}

/** For pages: the selected role's content. Pages are only rendered once it has loaded. */
export function useRole(): Workspace & { bundle: RoleBundle } {
  const ws = useWorkspace();
  if (!ws.bundle) throw new Error('useRole called before the role finished loading');
  return ws as Workspace & { bundle: RoleBundle };
}
