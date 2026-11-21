import { useEffect, useState } from 'react';
import { Button, Card, Empty, ErrorNote, PageTitle, Pill, Progress, Spinner } from '@/components/ui';
import { listAllProfiles, listAssistantQuestions, loadRoleBundle, type AssistantQuestion } from '@/lib/api';
import { relativeDays } from '@/lib/dates';
import { completeness, staleCount } from '@/lib/metrics';
import { shortName } from '@/lib/people';
import type { CheckinStatus, Profile, RoleBundle } from '@/lib/types';
import { useWorkspace } from '@/workspace/WorkspaceProvider';

const checkinPill: Record<CheckinStatus, { label: string; tone: 'green' | 'amber' | 'blue' }> = {
  complete: { label: 'Complete', tone: 'green' },
  scheduled: { label: 'Scheduled', tone: 'blue' },
  not_booked: { label: 'Not booked', tone: 'amber' },
};

interface RoleSummary {
  bundle: RoleBundle;
  score: number;
  stale: number;
  checkin: CheckinStatus;
}

function downloadCsv(rows: RoleSummary[]) {
  const header = ['Role', 'Completeness %', 'Stale items', 'Check-in', 'Incoming member'];
  const lines = rows.map(r => [r.bundle.role.title, r.score, r.stale, checkinPill[r.checkin].label, r.bundle.incomingMember?.full_name ?? '']);
  const csv = [header, ...lines].map(cols => cols.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const link = Object.assign(document.createElement('a'), { href: url, download: `committee-readiness-${new Date().toISOString().slice(0, 10)}.csv` });
  link.click();
  URL.revokeObjectURL(url);
}

export function LeadView() {
  const { profile, roles, userId, setRoleId, go } = useWorkspace();
  const [rows, setRows] = useState<RoleSummary[] | null>(null);
  const [questions, setQuestions] = useState<AssistantQuestion[]>([]);
  const [people, setPeople] = useState<Profile[]>([]);
  const [error, setError] = useState('');
  const isLead = profile.member_type === 'lead';

  useEffect(() => {
    if (!isLead || !roles.length) return;
    Promise.all([Promise.all(roles.map(r => loadRoleBundle(r.id, userId))), listAssistantQuestions(), listAllProfiles()])
      .then(([bundles, qs, ps]) => {
        setRows(bundles.map(b => ({ bundle: b, score: completeness(b), stale: staleCount(b), checkin: b.checkin?.status ?? 'not_booked' })));
        setQuestions(qs);
        setPeople(ps);
      })
      .catch(err => setError((err as Error).message));
  }, [isLead, roles, userId]);

  if (!isLead) {
    return (
      <>
        <PageTitle eyebrow="Society overview" title="Committee readiness" description="See where each role’s handover stands and step in before knowledge gets lost." />
        <Card><Empty title="For society leads" text="Only society leads can see the committee overview. Ask your lead if you need this view." /></Card>
      </>
    );
  }
  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!rows) return <Spinner label="Loading committee overview" />;

  const average = rows.length ? Math.round(rows.reduce((sum, r) => sum + r.score, 0) / rows.length) : 0;
  const staleTotal = rows.reduce((sum, r) => sum + r.stale, 0);
  const rolesWithStale = rows.filter(r => r.stale > 0).length;
  const booked = rows.filter(r => r.checkin !== 'not_booked').length;
  const lowest = [...rows].sort((a, b) => a.score - b.score)[0];
  const nameOf = (id: string) => people.find(p => p.id === id)?.full_name ?? 'A member';
  const roleTitle = (id: string) => roles.find(r => r.id === id)?.title ?? id;

  function open(roleId: string) {
    setRoleId(roleId);
    go('Dashboard');
  }

  return (
    <>
      <PageTitle
        eyebrow="Society overview"
        title="Committee readiness"
        description="See where each role’s handover stands and step in before knowledge gets lost."
        action={<Button secondary onClick={() => downloadCsv(rows)}>Export overview</Button>}
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Average completeness</p>
          <p className="mt-2 text-3xl font-semibold">{average}%</p>
          <p className={`mt-1 text-xs ${lowest && lowest.score < 70 ? 'text-amber-600' : 'text-emerald-600'}`}>{lowest ? `Lowest: ${lowest.bundle.role.title} (${lowest.score}%)` : 'No roles yet'}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Stale items</p>
          <p className="mt-2 text-3xl font-semibold">{staleTotal}</p>
          <p className={`mt-1 text-xs ${staleTotal ? 'text-rose-600' : 'text-emerald-600'}`}>{staleTotal ? `Across ${rolesWithStale} ${rolesWithStale === 1 ? 'role' : 'roles'}` : 'Everything is fresh'}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Check-ins booked</p>
          <p className="mt-2 text-3xl font-semibold">{booked}<span className="text-lg text-slate-300"> / {rows.length}</span></p>
          <p className={`mt-1 text-xs ${booked < rows.length ? 'text-amber-600' : 'text-emerald-600'}`}>
            {booked < rows.length ? `${rows.length - booked} ${rows.length - booked === 1 ? 'needs' : 'need'} attention` : 'All booked'}
          </p>
        </Card>
      </div>
      <Card className="overflow-hidden">
        <div className="hidden grid-cols-[1.2fr_1.2fr_.7fr_.8fr_.6fr] bg-slate-50 px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 md:grid">
          <span>Role</span><span>Completeness</span><span>Stale</span><span>Check-in</span><span>Incoming</span>
        </div>
        <div className="divide-y divide-slate-100">
          {rows.map(r => (
            <button key={r.bundle.role.id} onClick={() => open(r.bundle.role.id)} className="grid w-full grid-cols-2 gap-x-3 gap-y-4 px-5 py-5 text-left text-sm transition hover:bg-slate-50/70 md:grid-cols-[1.2fr_1.2fr_.7fr_.8fr_.6fr] md:items-center md:px-6">
              <div className="col-span-2 md:col-span-1"><b>{r.bundle.role.title}</b><p className="mt-1 text-xs text-slate-400">{r.bundle.role.society}</p></div>
              <div className="col-span-2 flex items-center gap-3 md:col-span-1">
                <div className="w-full max-w-36 md:w-24"><Progress value={r.score} small tone={r.score < 70 ? 'amber' : 'mint'} /></div>
                <b className="text-xs">{r.score}%</b>
              </div>
              <span className={r.stale === 0 ? 'text-emerald-600' : 'text-rose-600'}><span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400 md:hidden">Updates</span>{r.stale} stale</span>
              <span><span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400 md:hidden">Check-in</span><Pill tone={checkinPill[r.checkin].tone}>{checkinPill[r.checkin].label}</Pill></span>
              <span className="col-span-2 text-slate-500 md:col-span-1"><span className="mr-2 text-[10px] font-bold uppercase tracking-wide text-slate-400 md:hidden">Incoming</span>{r.bundle.incomingMember ? shortName(r.bundle.incomingMember.full_name) : '—'}</span>
            </button>
          ))}
        </div>
      </Card>

      <Card className="mt-4 p-5 sm:p-6">
        <h2 className="font-semibold">Recent assistant questions</h2>
        <p className="mt-1 text-xs text-slate-500">What members ask shows where the documentation has gaps.</p>
        {questions.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">No questions asked yet.</p>
        ) : (
          <div className="mt-4 divide-y divide-slate-100">
            {questions.map(q => (
              <div key={q.id} className="flex flex-col gap-1 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <span className="text-slate-700">“{q.question}”</span>
                <span className="shrink-0 text-xs text-slate-400">{shortName(nameOf(q.user_id))} · {roleTitle(q.role_id)} · {relativeDays(q.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
