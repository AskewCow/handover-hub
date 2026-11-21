import { useEffect, useState, type FormEvent } from 'react';
import { Button, Card, Empty, PageTitle, Progress } from '@/components/ui';
import { deleteRow, insertRow, setStepCompleted } from '@/lib/api';
import { dueLabel } from '@/lib/dates';
import { PHASES, stepDueDate } from '@/lib/metrics';
import type { OnboardingPhase, OnboardingStep } from '@/lib/types';
import { useRole } from '@/workspace/WorkspaceProvider';

const phaseDueDay: Record<OnboardingPhase, number> = { Access: 1, Introductions: 5, 'First tasks': 7 };

export function Onboarding() {
  const { bundle, profile, userId, run } = useRole();
  const [editing, setEditing] = useState(false);
  // Optimistic copy of the ticks so checkboxes respond instantly.
  const [completed, setCompleted] = useState(bundle.completedStepIds);
  useEffect(() => {
    setCompleted(bundle.completedStepIds);
  }, [bundle.completedStepIds]);

  const steps = bundle.steps;
  const done = steps.filter(s => completed.has(s.id)).length;
  const percent = steps.length ? Math.round((done / steps.length) * 100) : 0;

  function toggle(step: OnboardingStep) {
    const next = !completed.has(step.id);
    setCompleted(prev => {
      const copy = new Set(prev);
      if (next) copy.add(step.id);
      else copy.delete(step.id);
      return copy;
    });
    void run(() => setStepCompleted(step.id, userId, next));
  }

  const heading = done === steps.length && steps.length ? 'Onboarding complete' : done === 0 ? 'Let’s get you started' : 'You’re making good progress';

  return (
    <>
      <PageTitle
        eyebrow="Your first week"
        title="Onboarding checklist"
        description="A guided path from getting access to confidently taking on your first responsibilities."
        action={<Button secondary onClick={() => setEditing(e => !e)}>{editing ? 'Done editing' : 'Edit steps'}</Button>}
      />
      <Card className="mb-5 p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-semibold">{heading}</h2>
            <p className="mt-1 text-sm text-slate-500">{done} of {steps.length} steps complete</p>
          </div>
          <div className="w-full sm:w-64"><Progress value={percent} tone="blue" /></div>
        </div>
      </Card>
      {steps.length === 0 && !editing ? (
        <Card><Empty title="No onboarding steps yet" text="Use “Edit steps” to build the day-1 and week-1 checklist." /></Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {PHASES.map((phase, pi) => {
            const phaseSteps = steps.filter(s => s.phase === phase);
            return (
              <Card key={phase} className="p-5">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{pi === 0 ? 'Day 1' : 'Week 1'}</p>
                    <h2 className="mt-1 font-semibold">{phase}</h2>
                  </div>
                  <span className="text-xs font-bold text-slate-400">{phaseSteps.filter(s => completed.has(s.id)).length}/{phaseSteps.length}</span>
                </div>
                <div className="space-y-2">
                  {phaseSteps.map(s => {
                    const isDone = completed.has(s.id);
                    const due = dueLabel(stepDueDate(s, profile.created_at));
                    return (
                      <div key={s.id} className="flex items-start gap-1">
                        <label className="flex flex-1 cursor-pointer gap-3 rounded-xl p-3 transition hover:bg-slate-50">
                          <input type="checkbox" checked={isDone} onChange={() => toggle(s)} className="mt-0.5 h-5 w-5 shrink-0 accent-emerald-600" />
                          <span>
                            <span className={`block text-sm leading-5 ${isDone ? 'text-slate-400 line-through' : 'font-medium text-slate-700'}`}>{s.title}</span>
                            {!isDone && <span className={`mt-0.5 block text-[11px] ${due === 'overdue' ? 'text-rose-500' : 'text-slate-400'}`}>{due}</span>}
                          </span>
                        </label>
                        {editing && (
                          <button onClick={() => run(() => deleteRow('onboarding_steps', s.id), 'Step removed')} className="mt-2.5 px-2 text-lg text-slate-300 hover:text-rose-500" aria-label={`Remove ${s.title}`}>×</button>
                        )}
                      </div>
                    );
                  })}
                </div>
                {editing && <AddStep phase={phase} position={steps.length} />}
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}

function AddStep({ phase, position }: { phase: OnboardingPhase; position: number }) {
  const { bundle, run } = useRole();
  const [title, setTitle] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const ok = await run(
      () => insertRow<OnboardingStep>('onboarding_steps', { role_id: bundle.role.id, title: title.trim(), phase, due_day: phaseDueDay[phase], position }),
      'Step added',
    );
    if (ok) setTitle('');
  }

  return (
    <form onSubmit={submit} className="mt-3 flex gap-2">
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Add a step…" aria-label={`New ${phase} step`} className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
      <button className="rounded-lg bg-slate-950 px-3 text-sm font-bold text-white">Add</button>
    </form>
  );
}
