import { useCallback, useEffect, useState } from 'react';

export type View =
  | 'Dashboard'
  | 'Role guide'
  | 'Onboarding'
  | 'Contacts'
  | 'Tasks'
  | 'Decision log'
  | 'Buddy & check-in'
  | 'Messages'
  | 'Outgoing handover'
  | 'Ask assistant'
  | 'Lead view';

export const navGroups: { label: string; items: View[] }[] = [
  { label: 'Workspace', items: ['Dashboard', 'Role guide', 'Onboarding', 'Contacts', 'Tasks', 'Decision log'] },
  { label: 'Support', items: ['Buddy & check-in', 'Messages', 'Ask assistant'] },
  { label: 'Manage', items: ['Outgoing handover', 'Lead view'] },
];

const slugs: Record<View, string> = {
  Dashboard: 'dashboard',
  'Role guide': 'role-guide',
  Onboarding: 'onboarding',
  Contacts: 'contacts',
  Tasks: 'tasks',
  'Decision log': 'decisions',
  'Buddy & check-in': 'buddy',
  Messages: 'messages',
  'Outgoing handover': 'handover',
  'Ask assistant': 'ask',
  'Lead view': 'lead',
};

function viewFromHash(): View {
  const slug = window.location.hash.replace(/^#\/?/, '');
  return (Object.keys(slugs) as View[]).find(v => slugs[v] === slug) ?? 'Dashboard';
}

/** Current page, kept in the URL hash so refreshes and the back button work. */
export function useView(): [View, (view: View) => void] {
  const [view, setViewState] = useState<View>(viewFromHash);

  useEffect(() => {
    const onHashChange = () => setViewState(viewFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const setView = useCallback((next: View) => {
    window.location.hash = `/${slugs[next]}`;
    setViewState(next);
    window.scrollTo({ top: 0 });
  }, []);

  return [view, setView];
}
