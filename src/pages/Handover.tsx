import { useEffect, useState } from 'react';
import { Button, Card, Input, PageTitle, Pill, Progress, Textarea } from '@/components/ui';
import { saveHandoverSection } from '@/lib/api';
import { relativeDays } from '@/lib/dates';
import { HANDOVER_SECTIONS } from '@/lib/handoverSections';
import { isSectionFilled } from '@/lib/metrics';
import { useRole } from '@/workspace/WorkspaceProvider';

/**
 * The outgoing handover belongs to the role: the person leaving writes it and the next person reads it.
 * Incoming members are told it was written by the previous holder, so a full bar isn't mistaken for their own progress.
 */
export function Handover() {
  const { bundle, run, profile } = useRole();
  const isIncoming = profile.member_type === 'incoming';
  const sections = HANDOVER_SECTIONS;
  const filled = sections.map(s => isSectionFilled(bundle, s.key));
  const filledCount = filled.filter(Boolean).length;
  const [step, setStep] = useState(() => Math.max(0, filled.indexOf(false)) % sections.length);
  const current = sections[step];
  const saved = bundle.handover.find(s => s.section === current.key);

  const [title, setTitle] = useState(saved?.title ?? '');
  const [body, setBody] = useState(saved?.body ?? '');
  const [saving, setSaving] = useState(false);

  // Load the selected section's saved text whenever the step (or role) changes.
  useEffect(() => {
    setTitle(saved?.title ?? '');
    setBody(saved?.body ?? '');
  }, [current.key, bundle.role.id]); // eslint-disable-line react-hooks/exhaustive-deps -- reset only on navigation, not on every refresh

  const dirty = title !== (saved?.title ?? '') || body !== (saved?.body ?? '');
  const lastSaved = bundle.handover.reduce<string | null>((latest, s) => (!latest || s.updated_at > latest ? s.updated_at : latest), null);

  async function saveThenGo(next: number) {
    if (dirty) {
      setSaving(true);
      const ok = await run(() => saveHandoverSection(bundle.role.id, current.key, { title: title.trim(), body: body.trim() }), 'Draft saved');
      setSaving(false);
      if (!ok) return;
    }
    setStep(Math.min(sections.length - 1, Math.max(0, next)));
  }

  const isLast = step === sections.length - 1;
  const statusPill = saving ? (
    <Pill tone="neutral">Saving…</Pill>
  ) : filledCount === sections.length ? (
    <Pill tone="green">{isIncoming ? 'Completed by the previous lead' : 'Handover complete'}</Pill>
  ) : lastSaved ? (
    <Pill tone="amber">Draft saved {relativeDays(lastSaved)}</Pill>
  ) : (
    <Pill tone="neutral">Not started</Pill>
  );

  return (
    <>
      <PageTitle
        eyebrow="Outgoing committee"
        title="Build your handover"
        description={`Turn what you know into a clear, useful starting point for the next ${bundle.role.title}.`}
        action={statusPill}
      />
      {isIncoming && (
        <div className="mb-5 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm leading-6 text-sky-800">
          <b>This isn’t your progress.</b> The previous {bundle.role.title} filled in this handover when they left
          {filledCount === sections.length ? ', so every section is green' : ''}. Read it to get started. You’ll write your own here when you hand the role over.
        </div>
      )}
      <Card className="mb-5 p-5">
        <div className="mb-3 flex justify-between text-sm">
          <b>{filledCount} of {sections.length} sections {isIncoming ? 'written by the previous lead' : 'complete'}</b>
          <span className="font-bold text-emerald-700">{Math.round((filledCount / sections.length) * 100)}%</span>
        </div>
        <Progress value={(filledCount / sections.length) * 100} />
        <div className="mt-4 hidden justify-between md:flex">
          {sections.map((s, i) => (
            <button onClick={() => saveThenGo(i)} key={s.key} className={`text-xs font-semibold ${i === step ? 'text-emerald-700' : filled[i] ? 'text-slate-600' : 'text-slate-300'}`}>
              {s.label}
            </button>
          ))}
        </div>
      </Card>
      <div className="grid gap-4 lg:grid-cols-[.65fr_1.35fr]">
        <Card className="p-4">
          <p className="px-3 py-2 text-xs font-bold uppercase tracking-widest text-slate-400">Handover sections</p>
          {sections.map((s, i) => (
            <button
              onClick={() => saveThenGo(i)}
              key={s.key}
              className={`mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold ${i === step ? 'bg-emerald-50 text-emerald-800' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <span className={`grid h-6 w-6 place-items-center rounded-full text-xs ${filled[i] ? 'bg-emerald-500 text-white' : i === step ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-100 text-slate-400'}`}>
                {filled[i] ? '✓' : i + 1}
              </span>
              {s.label}
            </button>
          ))}
        </Card>
        <Card className="p-5 sm:p-8">
          <Pill tone="green">STEP {step + 1}</Pill>
          <h2 className="mt-3 text-xl font-semibold">{current.label}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">{current.prompt}</p>
          <div className="mt-6 space-y-4">
            <Input label={`${current.label} title`} value={title} onChange={setTitle} placeholder={current.titlePlaceholder} />
            <Textarea label="Useful context" value={body} onChange={setBody} placeholder={current.bodyPlaceholder} />
          </div>
          {saved && !dirty && <p className="mt-3 text-xs text-slate-400">Saved {relativeDays(saved.updated_at)}</p>}
          {dirty && <p className="mt-3 text-xs text-amber-600">Unsaved changes</p>}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:flex sm:justify-between">
            <Button secondary onClick={() => saveThenGo(step - 1)} disabled={saving || step === 0}>← Back</Button>
            <Button onClick={() => saveThenGo(isLast ? step : step + 1)} disabled={saving}>
              {isLast ? 'Save handover' : 'Save & continue →'}
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}
