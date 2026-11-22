import { Button, Card, Icon, PageTitle, Pill, Progress } from '@/components/ui';
import { greeting, relativeDays } from '@/lib/dates';
import { attentionItems, completeness, knowledgeItems, lastUpdated, onboardingProgress, PHASES, phaseLabels } from '@/lib/metrics';
import { firstName } from '@/lib/people';
import { useRole } from '@/workspace/WorkspaceProvider';

const dotTone = { red: 'bg-rose-400', amber: 'bg-amber-400', blue: 'bg-sky-400' } as const;

export function Dashboard() {
  const { bundle, profile, go } = useRole();
  const { role } = bundle;
  const score = completeness(bundle);
  const onboarding = onboardingProgress(bundle);
  const attention = attentionItems(bundle, profile.created_at);
  const phases = PHASES.map(phase => ({ phase, ...onboardingProgress(bundle, phase) }));
  const currentPhase = phases.findIndex(p => p.done < p.total);
  const notStarted = onboarding.total > 0 && onboarding.done === 0;
  const finished = onboarding.total > 0 && onboarding.done === onboarding.total;

  return (
    <>
      <PageTitle
        eyebrow={`${role.term} committee transition`}
        title={`${greeting()}, ${firstName(profile.full_name)}`}
        description="Here’s what needs your attention to feel confident in your new role."
        action={
          <Button onClick={() => go('Onboarding')} className={notStarted ? 'attention-pulse' : ''}>
            {notStarted ? 'Start onboarding' : finished ? 'Review onboarding' : 'Continue onboarding'}{' '}
            <span className={notStarted ? 'attention-nudge' : ''}>→</span>
          </Button>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[1.4fr_.9fr]">
        <Card className="relative overflow-hidden p-5 sm:p-6">
          <div className="absolute right-0 top-0 h-36 w-36 translate-x-10 -translate-y-10 rounded-full bg-emerald-100/60" />
          <div className="relative">
            <div className="mb-8 flex items-start justify-between">
              <div>
                <Pill tone="green">{role.id === profile.role_id ? 'YOUR ROLE' : 'PREVIEWING'}</Pill>
                <h2 className="mt-3 text-xl font-semibold text-slate-950">{role.title}</h2>
                <p className="mt-1 text-sm text-slate-500">{role.society} · {role.term}</p>
              </div>
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-100 text-emerald-700"><Icon name="Contacts" size={23} /></div>
            </div>
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-700">Handover completeness</span>
              <span className="font-bold text-emerald-700">{score}%</span>
            </div>
            <Progress value={score} />
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500">
              <span><b className="text-slate-800">{knowledgeItems(bundle)}</b> knowledge items</span>
              <span><b className="text-slate-800">{bundle.contacts.length}</b> key contacts</span>
              <span>Updated {relativeDays(lastUpdated(bundle))}</span>
            </div>
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-950">Onboarding progress</h2>
            <span className="text-sm font-bold text-sky-600">{onboarding.done} of {onboarding.total}</span>
          </div>
          <div className="my-4"><Progress value={onboarding.percent} tone="blue" /></div>
          <div className="space-y-3">
            {phases.map((p, i) => {
              const complete = p.total > 0 && p.done === p.total;
              const current = i === currentPhase;
              return (
                <div key={p.phase} className="flex items-center gap-3">
                  <span className={`grid h-6 w-6 place-items-center rounded-full text-xs font-bold ${complete ? 'bg-emerald-500 text-white' : current ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-400'}`}>
                    {complete ? '✓' : i + 1}
                  </span>
                  <span className={`text-sm ${complete || current ? 'font-medium text-slate-700' : 'text-slate-400'}`}>{phaseLabels[p.phase]}</span>
                  <span className="ml-auto text-xs text-slate-400">{p.done}/{p.total}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.4fr_.9fr]">
        <Card className="p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-rose-500">Needs attention</p>
              <h2 className="mt-1 font-semibold text-slate-950">{attention.length ? 'A few things to tidy up' : 'Everything is up to date'}</h2>
            </div>
            <span className="grid h-8 w-8 place-items-center rounded-full bg-rose-50 text-sm font-bold text-rose-600">{attention.length}</span>
          </div>
          {attention.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">No stale contacts, overdue steps or unowned tasks. Nice work.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {attention.slice(0, 6).map(item => (
                <button key={item.key} onClick={() => go(item.target)} className="group grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 py-3.5 text-left sm:flex">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${dotTone[item.tone]}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-slate-800">{item.title}</span>
                    <span className="block truncate text-xs text-slate-500">{item.detail}</span>
                  </span>
                  <span className="col-start-2 sm:col-auto"><Pill tone={item.tone}>{item.badge}</Pill></span>
                  <span className="row-span-2 text-slate-300 transition group-hover:translate-x-1 sm:row-span-1">→</span>
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card className="bg-[#172b2a] p-5 text-white sm:p-6">
          <div className="mb-8 flex items-start justify-between">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/10"><Icon name="Ask assistant" /></div>
            <Pill tone="green">ROLE-SPECIFIC</Pill>
          </div>
          <h2 className="text-lg font-semibold">Not sure where to start?</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">Ask a question and get an answer grounded in your handover notes.</p>
          <button onClick={() => go('Ask assistant')} className="mt-6 flex w-full items-center justify-between rounded-xl bg-white px-4 py-3 text-left text-sm font-semibold text-slate-800">
            <span>Ask about your role...</span>
            <span>→</span>
          </button>
        </Card>
      </div>
    </>
  );
}
