import type { HandoverSectionKey } from './types';

export interface HandoverSectionDef {
  key: HandoverSectionKey;
  label: string;
  prompt: string;
  titlePlaceholder: string;
  bodyPlaceholder: string;
}

/** The five steps of the outgoing member's guided handover form, in order. */
export const HANDOVER_SECTIONS: HandoverSectionDef[] = [
  {
    key: 'responsibilities',
    label: 'Responsibilities',
    prompt: 'Describe what the role is really responsible for, including the parts nobody wrote down.',
    titlePlaceholder: 'e.g. Owns every sponsor relationship from first email to renewal',
    bodyPlaceholder: 'What does the next person own, and where do their responsibilities stop?',
  },
  {
    key: 'recurring_tasks',
    label: 'Recurring tasks',
    prompt: 'List the jobs that come round every week, month or term, and how long they take.',
    titlePlaceholder: 'e.g. Monday pipeline review',
    bodyPlaceholder: 'When does it happen, which tool is used, and what goes wrong if it is skipped?',
  },
  {
    key: 'key_contacts',
    label: 'Key contacts',
    prompt: 'Add the people and organisations the next lead will rely on. Include context they won’t find in an address book.',
    titlePlaceholder: 'e.g. Jordan (Treasurer) for invoices',
    bodyPlaceholder: 'Who should they talk to, about what, and how warm is each relationship?',
  },
  {
    key: 'decisions',
    label: 'Decisions & reasons',
    prompt: 'Record the decisions that shaped the role this year and why they were made, so they are not re-argued.',
    titlePlaceholder: 'e.g. We moved to three sponsorship tiers',
    bodyPlaceholder: 'What was decided, why, and what had been tried before?',
  },
  {
    key: 'lessons',
    label: 'Lessons learned',
    prompt: 'Share what you wish you had known in your first week, including any worries you had.',
    titlePlaceholder: 'e.g. Start renewals six weeks before term',
    bodyPlaceholder: 'What worked, what did not, and what would you do differently?',
  },
];
