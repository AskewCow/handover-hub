import { useEffect, useState } from 'react';
import { Button, Card, Empty, Input, PageTitle, Pill, Progress, Textarea } from '@/components/ui';
import { saveHandoverSection } from '@/lib/api';
import { relativeDays } from '@/lib/dates';
import { HANDOVER_SECTIONS } from '@/lib/handoverSections';
import { isSectionFilled } from '@/lib/metrics';
import { useRole } from '@/workspace/WorkspaceProvider';

/**
 * The outgoing handover belongs to the role: the person leaving writes it, the person arriving reads it.
 * Incoming members see the notes read-only; outgoing members and leads get the guided form.
 */
export function Handover() {
  const { profile } = useRole();
  return profile.member_type === 'incoming' ? <HandoverNotes /> : <HandoverForm />;
}

function HandoverNotes() {
  const { bundle } = useRole();
  const written = HANDOVER_SECTIONS.filter(s => isSectionFilled(bundle, s.key)).length;
  const lastSaved = bundle.handover.reduce<string | null>((latest, s) => (!latest || s.updated_at > latest ? s.updated_at : latest), null);

  return (
    <>
      <PageTitle
        eyebrow={`From the previous ${bundle.role.title}`}
        title="Handover notes"
        description="What the person who held this role before you wanted you to know. Ask your buddy if anything here is unclear or out of date."
        action={lastSaved ? <Pill tone="neutral">Written {relativeDays(lastSaved)}</Pill> : undefined}
      />
      {written === 0 ? (
        <Card><Empty title="No handover notes yet" text="The previous holder of this role hasn’t written their handover. Ask your buddy for the essentials." /></Card>
      ) : (
        <div className="space-y-4">
          {HANDOVER_SECTIONS.map((section, i) => {
            const note = bundle.handover.find(h => h.section === section.key);
            const filled = isSectionFilled(bundle, section.key);
            return (
              <Card key={section.key} className="p-5 sm:p-6">
                <div className="flex gap-4">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">{i + 1}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{section.label}</p>
                    {filled ? (
                      <>
                        <h2 className="mt-1 font-semibold text-slate-900">{note!.title}</h2>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{note!.body}</p>
                      </>
                    ) : (
                      <p className="mt-1 text-sm text-slate-400">Not written yet.</p>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}

function HandoverForm() {
  const { bundle, run } = useRole();
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
    <Pill tone="green">Handover complete</Pill>
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
      <Card className="mb-5 p-5">
        <div className="mb-3 flex justify-between text-sm">
          <b>{filledCount} of {sections.length} sections complete</b>
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
