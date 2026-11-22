import { useEffect, useState } from 'react';
import { Button, Card, Input, PageTitle, Pill, Progress, Textarea } from '@/components/ui';
import { saveHandoverSection } from '@/lib/api';
import { relativeDays } from '@/lib/dates';
import { HANDOVER_SECTIONS } from '@/lib/handoverSections';
import { isSectionFilled } from '@/lib/metrics';
import { useRole } from '@/workspace/WorkspaceProvider';

/**
 * Handover notes belong to the role: each lead reads them when they start and keeps them current.
 * New members are told who wrote them and that they can (and should) edit anything outdated.
 */
export function Handover() {
  const { bundle, run, profile, members } = useRole();
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
      const ok = await run(() => saveHandoverSection(bundle.role.id, current.key, { title: title.trim(), body: body.trim() }), 'Changes saved');
      setSaving(false);
      if (!ok) return;
    }
    setStep(Math.min(sections.length - 1, Math.max(0, next)));
  }

  const isLast = step === sections.length - 1;
  const editedBy = (id: string | null) => members.find(m => m.id === id)?.full_name ?? 'the previous lead';
  const statusPill = saving ? (
    <Pill tone="neutral">Saving…</Pill>
  ) : lastSaved ? (
    <Pill tone={filledCount === sections.length ? 'green' : 'amber'}>
      {filledCount === sections.length ? `All ${sections.length} sections written` : `${filledCount} of ${sections.length} sections written`} · last edited {relativeDays(lastSaved)}
    </Pill>
  ) : (
    <Pill tone="neutral">Not started</Pill>
  );
  const primaryLabel = dirty ? (isLast ? 'Save changes' : 'Save changes & continue →') : isLast ? 'Up to date' : 'Next →';

  return (
    <>
      <PageTitle
        eyebrow="Knowledge carried forward"
        title="Handover notes"
        description={`The current handover for the ${bundle.role.title}. If something is missing or has changed, edit it so the next person starts from the truth.`}
        action={statusPill}
      />
      {isIncoming && (
        <div className="mb-5 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm leading-6 text-sky-800">
          <b>Written by the previous lead.</b> This is how the role works today. Spotted something outdated or missing? Edit it here: you’re now
          responsible for keeping it current.
        </div>
      )}
      <Card className="mb-5 p-5">
        <div className="mb-3 flex justify-between text-sm">
          <b>{filledCount} of {sections.length} sections written</b>
          <span className="font-bold text-emerald-700">{Math.round((filledCount / sections.length) * 100)}%</span>
        </div>
        <Progress value={(filledCount / sections.length) * 100} />
        <div className="mt-4 hidden justify-between md:flex">
          {sections.map((s, i) => (
            <button onClick={() => saveThenGo(i)} key={s.key} className={`text-xs font-semibold ${i === step ? 'text-emerald-700' : filled[i] ? 'text-slate-600' : 'text-slate-300'}`}>
              {i + 1}. {s.label}
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
              <span><span className="mr-1 text-slate-400">{i + 1}.</span>{s.label}</span>
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
          {saved && !dirty && <p className="mt-3 text-xs text-slate-400">Last edited {relativeDays(saved.updated_at)} by {editedBy(saved.updated_by)}</p>}
          {dirty && <p className="mt-3 text-xs text-amber-600">Unsaved changes</p>}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:flex sm:justify-between">
            <Button secondary onClick={() => saveThenGo(step - 1)} disabled={saving || step === 0}>← Back</Button>
            <Button onClick={() => saveThenGo(isLast ? step : step + 1)} disabled={saving || (isLast && !dirty)}>
              {saving ? 'Saving…' : primaryLabel}
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}
