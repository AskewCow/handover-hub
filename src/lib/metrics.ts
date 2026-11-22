// Derived numbers shown on the dashboard and lead view. Everything is computed from a RoleBundle,
// so the dashboard and the lead view always agree.
import { HANDOVER_SECTIONS } from './handoverSections';
import { addDays, daysSince, dueLabel, isStale } from './dates';
import { samePerson } from './people';
import type { Contact, OnboardingPhase, OnboardingStep, RoleBundle, Task } from './types';

export const PHASES: OnboardingPhase[] = ['Access', 'Introductions', 'First tasks'];

export const phaseLabels: Record<OnboardingPhase, string> = {
  Access: 'Access & accounts',
  Introductions: 'Meet your people',
  'First tasks': 'First responsibilities',
};

export function isSectionFilled(bundle: RoleBundle, key: string): boolean {
  const section = bundle.handover.find(s => s.section === key);
  return Boolean(section && section.title.trim() && section.body.trim());
}

export function staleContacts(bundle: RoleBundle): Contact[] {
  return bundle.contacts.filter(c => isStale(c.updated_at));
}

/** Contacts plus the role guide itself (if it has not been reviewed in 30 days). */
export function staleCount(bundle: RoleBundle): number {
  return staleContacts(bundle).length + (isStale(bundle.role.reviewed_at) ? 1 : 0);
}

/**
 * Handover completeness (0–100). Each check is worth one point:
 * role guide, typical week, committee directory, onboarding checklist, contacts, decision log,
 * named buddy, check-in booked and contact freshness; the five outgoing-handover sections are
 * worth three points between them.
 */
export function completeness(bundle: RoleBundle): number {
  const checks = [
    bundle.responsibilities.length > 0,
    bundle.weekItems.length > 0,
    bundle.committee.length > 0,
    bundle.steps.length > 0,
    bundle.contacts.length > 0,
    bundle.decisions.length > 0,
    bundle.role.buddy_name.trim() !== '',
    bundle.checkin != null && bundle.checkin.status !== 'not_booked',
  ];
  const freshness = bundle.contacts.length ? 1 - staleContacts(bundle).length / bundle.contacts.length : 1;
  const handover = (HANDOVER_SECTIONS.filter(s => isSectionFilled(bundle, s.key)).length / HANDOVER_SECTIONS.length) * 3;
  const score = checks.filter(Boolean).length + freshness + handover;
  return Math.round((score / (checks.length + 1 + 3)) * 100);
}

/** Number of documented items in the role (shown as "knowledge items"). */
export function knowledgeItems(bundle: RoleBundle): number {
  return (
    bundle.responsibilities.length +
    bundle.weekItems.length +
    bundle.committee.length +
    bundle.contacts.length +
    bundle.decisions.length +
    HANDOVER_SECTIONS.filter(s => isSectionFilled(bundle, s.key)).length
  );
}

/** Most recent edit anywhere in the role. */
export function lastUpdated(bundle: RoleBundle): string {
  const dates = [
    bundle.role.updated_at,
    ...bundle.responsibilities.map(x => x.updated_at),
    ...bundle.weekItems.map(x => x.updated_at),
    ...bundle.committee.map(x => x.updated_at),
    ...bundle.contacts.map(x => x.updated_at),
    ...bundle.tasks.map(x => x.updated_at),
    ...bundle.decisions.map(x => x.created_at),
    ...bundle.handover.map(x => x.updated_at),
  ];
  return dates.reduce((latest, d) => (d > latest ? d : latest), dates[0]);
}

export function onboardingProgress(bundle: RoleBundle, phase?: OnboardingPhase) {
  const steps = phase ? bundle.steps.filter(s => s.phase === phase) : bundle.steps;
  const done = steps.filter(s => bundle.completedStepIds.has(s.id)).length;
  return { done, total: steps.length, percent: steps.length ? Math.round((done / steps.length) * 100) : 0 };
}

/** The member's due date for a step, counted from when their account was created. */
export function stepDueDate(step: OnboardingStep, joinedAt: string): string {
  return addDays(joinedAt, Math.max(0, step.due_day - 1));
}

// ---------------------------------------------------------------------------
// Duplicate-work detection for the task tracker
// ---------------------------------------------------------------------------

/**
 * Another open task that works on the same contact (or has the same title) but is owned
 * by someone else. This is the "two people email the same sponsor" problem.
 */
export function findOverlap(
  tasks: Task[],
  candidate: { id?: string; title: string; contact_id: string | null; assignee: string | null },
): Task | null {
  const title = candidate.title.trim().toLowerCase();
  return (
    tasks.find(
      t =>
        t.id !== candidate.id &&
        t.status !== 'done' &&
        Boolean(t.assignee) &&
        !samePerson(t.assignee, candidate.assignee) &&
        ((candidate.contact_id != null && t.contact_id === candidate.contact_id) ||
          (title !== '' && t.title.trim().toLowerCase() === title)),
    ) ?? null
  );
}

// ---------------------------------------------------------------------------
// "Needs attention" panel
// ---------------------------------------------------------------------------

export type AttentionTarget = 'Contacts' | 'Onboarding' | 'Tasks' | 'Role guide' | 'Buddy & check-in';

export interface AttentionItem {
  key: string;
  title: string;
  detail: string;
  target: AttentionTarget;
  badge: string;
  tone: 'red' | 'amber' | 'blue';
}

export function attentionItems(bundle: RoleBundle, joinedAt: string, now = new Date()): AttentionItem[] {
  const items: AttentionItem[] = [];

  for (const c of staleContacts(bundle)) {
    items.push({
      key: `stale-${c.id}`,
      title: 'Outreach contact may be out of date',
      detail: `${c.name} · last checked ${daysSince(c.updated_at, now)} days ago`,
      target: 'Role guide',
      badge: 'Stale',
      tone: 'red',
    });
  }

  if (isStale(bundle.role.reviewed_at, now)) {
    items.push({
      key: 'stale-guide',
      title: 'Role guide needs a review',
      detail: `${bundle.role.title} · not reviewed in ${daysSince(bundle.role.reviewed_at, now)} days`,
      target: 'Role guide',
      badge: 'Stale',
      tone: 'red',
    });
  }

  const nextStep = bundle.steps
    .filter(s => !bundle.completedStepIds.has(s.id))
    .sort((a, b) => a.due_day - b.due_day || a.position - b.position)[0];
  if (nextStep) {
    const due = dueLabel(stepDueDate(nextStep, joinedAt), now);
    items.push({
      key: `step-${nextStep.id}`,
      title: nextStep.title,
      detail: `${nextStep.due_day <= 1 ? 'Day 1' : 'Week 1'} onboarding · ${due}`,
      target: 'Onboarding',
      badge: due === 'overdue' ? 'Overdue' : 'Due soon',
      tone: 'amber',
    });
  }

  for (const t of bundle.tasks) {
    if (t.status === 'done') continue;
    if (!t.assignee) {
      items.push({ key: `owner-${t.id}`, title: `${t.title} needs an owner`, detail: 'Task tracker', target: 'Tasks', badge: 'Unassigned', tone: 'blue' });
      continue;
    }
    const overlap = findOverlap(bundle.tasks, t);
    // Report each overlapping pair once.
    if (overlap && t.id < overlap.id) {
      items.push({
        key: `overlap-${t.id}`,
        title: 'Possible duplicate work',
        detail: `“${t.title}” overlaps with ${overlap.assignee}’s “${overlap.title}”`,
        target: 'Tasks',
        badge: 'Overlap',
        tone: 'amber',
      });
    }
  }

  if (!bundle.checkin || bundle.checkin.status === 'not_booked') {
    items.push({ key: 'checkin', title: 'Book the week-1 check-in', detail: 'Buddy & check-in', target: 'Buddy & check-in', badge: 'Not booked', tone: 'amber' });
  }

  return items;
}
