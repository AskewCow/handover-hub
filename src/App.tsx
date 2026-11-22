import type { ComponentType } from 'react';
import { AuthPage } from '@/auth/AuthPage';
import { AuthProvider, useAuth } from '@/auth/AuthProvider';
import { AppShell } from '@/components/layout/AppShell';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';
import { Button, Card, Empty, ErrorNote, Spinner, ToastProvider } from '@/components/ui';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useView, type View } from '@/lib/navigation';
import { Assistant } from '@/pages/Assistant';
import { Buddy } from '@/pages/Buddy';
import { Contacts } from '@/pages/Contacts';
import { Dashboard } from '@/pages/Dashboard';
import { DecisionLog } from '@/pages/DecisionLog';
import { Handover } from '@/pages/Handover';
import { LeadView } from '@/pages/LeadView';
import { Messages } from '@/pages/Messages';
import { Onboarding } from '@/pages/Onboarding';
import { RoleGuide } from '@/pages/RoleGuide';
import { Tasks } from '@/pages/Tasks';
import { useWorkspace, WorkspaceProvider } from '@/workspace/WorkspaceProvider';

const pages: Record<View, ComponentType> = {
  Dashboard,
  'Role guide': RoleGuide,
  Onboarding,
  'Outreach contacts': Contacts,
  Tasks,
  'Decision log': DecisionLog,
  'Buddy & check-in': Buddy,
  Messages,
  'Outgoing handover': Handover,
  'Ask assistant': Assistant,
  'Lead view': LeadView,
};

/** Shows the current page once the selected role has loaded. */
function PageContent({ view }: { view: View }) {
  const { bundle, loading, error, roles, refresh } = useWorkspace();
  const Page = pages[view];

  if (view === 'Lead view') return <Page />;
  if (error) return <div className="space-y-4"><ErrorNote>Could not load this role: {error}</ErrorNote><Button secondary onClick={refresh}>Try again</Button></div>;
  if (!roles.length && !loading) return <Card><Empty title="No roles yet" text="Run the seed script or ask your society lead to add a role." /></Card>;
  if (!bundle) return <Spinner label="Loading role" />;
  return <Page key={bundle.role.id} />;
}

function SignedInApp() {
  const [view, setView] = useView();
  return (
    <WorkspaceProvider go={setView}>
      <AppShell view={view}>
        <ErrorBoundary resetKey={view}>
          <PageContent view={view} />
        </ErrorBoundary>
      </AppShell>
    </WorkspaceProvider>
  );
}

function Gate() {
  const { session, profile, loading, signOut } = useAuth();

  if (loading) return <Spinner label="Loading Handover Hub" />;
  if (!session) return <AuthPage />;
  if (!profile) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f5f7f4] p-4">
        <Card className="max-w-md p-6 text-center">
          <h1 className="font-semibold">Setting up your account…</h1>
          <p className="mt-2 text-sm text-slate-500">If this message stays, your profile could not be loaded. Sign out and try again.</p>
          <div className="mt-4"><Button secondary onClick={signOut}>Sign out</Button></div>
        </Card>
      </div>
    );
  }
  return <SignedInApp />;
}

function SetupNotice() {
  return (
    <div className="grid min-h-screen place-items-center bg-[#f5f7f4] p-4">
      <Card className="max-w-lg p-6">
        <h1 className="text-lg font-semibold">Supabase is not configured</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Copy <code>.env.example</code> to <code>.env.local</code> and set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_PUBLISHABLE_KEY</code>, then restart the dev server. On Vercel, add the same variables under Project Settings → Environment Variables and redeploy.
        </p>
      </Card>
    </div>
  );
}

export default function App() {
  if (!isSupabaseConfigured) return <SetupNotice />;
  return (
    <ToastProvider>
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </ToastProvider>
  );
}
