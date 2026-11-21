// Fictional demo content for "Example Tech Society". No real people, contacts or logins.
// Dates are relative to the moment the seed runs, so stale flags and due dates stay meaningful.

const DAY = 86_400_000;
export const daysAgo = (n: number) => new Date(Date.now() - n * DAY).toISOString();
export const daysFromNow = (n: number) => new Date(Date.now() + n * DAY).toISOString();
export const dateOnly = (iso: string) => iso.slice(0, 10);

export function at(daysAhead: number, hour: number): string {
  const d = new Date(Date.now() + daysAhead * DAY);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

type Phase = 'Access' | 'Introductions' | 'First tasks';
type Status = 'todo' | 'in_progress' | 'done';
type CheckinStatus = 'not_booked' | 'scheduled' | 'complete';
type SectionKey = 'responsibilities' | 'recurring_tasks' | 'key_contacts' | 'decisions' | 'lessons';

export interface RoleSeed {
  role: {
    id: string;
    title: string;
    summary: string;
    peak_note: string;
    buddy_name: string;
    buddy_title: string;
    buddy_note: string;
    buddy_email: string;
    reviewedDaysAgo: number;
  };
  responsibilities: string[];
  week: [day: string, body: string][];
  recurring: [name: string, schedule: string, tool: string, duration: string][];
  steps: [title: string, phase: Phase, dueDay: number][];
  contacts: [name: string, owner: string, askAbout: string, updatedDaysAgo: number][];
  tasks: { title: string; status: Status; assignee: string | null; dueInDays: number | null; contact?: string; updatedDaysAgo?: number }[];
  decisions: [daysAgo: number, title: string, reason: string, triedBefore: string, author: string][];
  checkin: { status: CheckinStatus; inDays?: number; hour?: number; outcome?: string };
  handover: Partial<Record<SectionKey, [title: string, body: string]>>;
}

export const SOCIETY = 'Example Tech Society';
export const TERM = '2026/27';

export const roles: RoleSeed[] = [
  {
    role: {
      id: 'partnerships',
      title: 'Partnerships Lead',
      summary: 'Finds, signs and looks after the companies that sponsor society events.',
      peak_note: 'September and January, around sponsor renewal cycles.',
      buddy_name: 'Riley Nguyen',
      buddy_title: 'Former Partnerships Lead · 2025/26',
      buddy_note: 'Riley can help with partner history, negotiation context, and knowing when to bring in the Treasurer.',
      buddy_email: 'riley.outgoing@handoverhub.test',
      reviewedDaysAgo: 6,
    },
    responsibilities: [
      'Build and maintain partner relationships',
      'Create sponsorship packages and outreach plans',
      'Coordinate partner benefits across society events',
      'Track income, commitments, and renewals',
    ],
    week: [
      ['Mon', 'Review pipeline & replies'],
      ['Wed', 'Partner follow-ups'],
      ['Fri', 'Committee update'],
    ],
    recurring: [
      ['Pipeline review', 'Every Monday', 'Notion CRM', '30 min'],
      ['Finance reconciliation', 'Last Friday monthly', 'Finance sheet', '45 min'],
      ['Partner impact update', 'End of each term', 'Email + PDF', '2 hours'],
    ],
    steps: [
      ['Get access to partnerships inbox', 'Access', 1],
      ['Join the society workspace', 'Access', 1],
      ['Review active partner agreements', 'Access', 1],
      ['Meet outgoing Partnerships Lead', 'Introductions', 3],
      ['Introduction to Treasurer', 'Introductions', 4],
      ['Meet the Events Lead', 'Introductions', 5],
      ['Send a test partner follow-up', 'First tasks', 5],
      ['Update one CRM record', 'First tasks', 6],
      ['Draft your first pipeline update', 'First tasks', 7],
      ['Book your buddy check-in', 'First tasks', 7],
    ],
    contacts: [
      ['Jordan Lee', 'Treasurer', 'Budget approval & invoices', 9],
      ['Sam Patel', 'Events Lead', 'Partner benefits at events', 11],
      ['Partnerships Team', 'Shared inbox', 'Existing partner conversations', 17],
      ['Acme Partners', 'Community Manager', 'Current gold partnership', 47],
      ['Campus Services', 'External relations', 'Venue branding permissions', 25],
    ],
    tasks: [
      { title: 'Refresh sponsorship deck', status: 'todo', assignee: null, dueInDays: 4 },
      { title: 'Confirm autumn event inventory', status: 'todo', assignee: 'Sam Patel', dueInDays: 7 },
      { title: 'Email Acme about spring event stand', status: 'todo', assignee: 'Sam Patel', dueInDays: 3, contact: 'Acme Partners' },
      { title: 'Partner renewal outreach', status: 'in_progress', assignee: 'Alex Morgan', dueInDays: 6, contact: 'Acme Partners' },
      { title: 'Update prospect pipeline', status: 'in_progress', assignee: 'Alex Morgan', dueInDays: 0 },
      { title: 'Handover inbox access', status: 'done', assignee: 'Alex Morgan', dueInDays: null, updatedDaysAgo: 2 },
      { title: 'Review partner contracts', status: 'done', assignee: 'Jordan Lee', dueInDays: null, updatedDaysAgo: 3 },
    ],
    decisions: [
      [21, 'Prioritise multi-event partnerships', 'Longer partnerships create more value and reduce repeated sales work.', 'Single-event packages; partners found them too transactional.', 'Taylor Nash'],
      [70, 'Keep the sponsorship tiers to three', 'The simpler offer improved reply rates and reduced negotiation time.', 'Five customisable tiers, which caused confusion.', 'Morgan Chen'],
      [143, 'Move partner tracking into the shared CRM', 'Committee members needed visibility without relying on one person.', 'Personal spreadsheet and inbox labels.', 'Taylor Nash'],
    ],
    checkin: { status: 'scheduled', inDays: 2, hour: 14 },
    handover: {
      responsibilities: [
        'Owns every sponsor relationship from first email to renewal',
        'You are the single point of contact for partners. Events and Marketing deliver the benefits, but you agree them and check they happened. Finance is the Treasurer’s job: send them signed agreements and they raise invoices.',
      ],
      recurring_tasks: [
        'Monday pipeline review and end-of-term impact report',
        'Every Monday, go through the CRM and reply to anything older than three days. At the end of each term, send partners a short PDF with photos and attendance numbers; renewals are much easier when they have it.',
      ],
      key_contacts: [
        'Acme is the warmest partner; Campus Services is slow',
        'Acme’s community manager replies quickly and likes a call before anything is put in writing. Campus Services needs two weeks’ notice for any branding in college venues. Always copy the shared inbox so the committee can see the thread.',
      ],
    },
  },
  {
    role: {
      id: 'events',
      title: 'Events Coordinator',
      summary: 'Plans and runs society events, from booking rooms to the post-event survey.',
      peak_note: 'Freshers’ week and the run-up to the spring hackathon.',
      buddy_name: 'Priya Shah',
      buddy_title: 'Former Events Coordinator · 2025/26',
      buddy_note: 'Priya knows every venue contact and the hackathon timeline by heart.',
      buddy_email: 'priya@handoverhub.test',
      reviewedDaysAgo: 3,
    },
    responsibilities: ['Book venues and equipment', 'Run the event calendar', 'Deliver partner benefits at events', 'Collect attendance and feedback'],
    week: [['Tue', 'Room bookings and logistics'], ['Thu', 'Event night']],
    recurring: [['Room booking request', 'Three weeks before each event', 'College booking portal', '20 min'], ['Feedback survey', 'Day after each event', 'Google Forms', '15 min']],
    steps: [
      ['Get access to the booking portal', 'Access', 1],
      ['Join the events channel', 'Access', 1],
      ['Meet the Partnerships Lead', 'Introductions', 3],
      ['Shadow one event night', 'First tasks', 6],
      ['Book your first room', 'First tasks', 7],
    ],
    contacts: [
      ['Campus Services', 'Room bookings', 'Venues and AV equipment', 5],
      ['Sam Patel', 'Events Lead', 'Event night running order', 8],
      ['Student Union Events', 'Shared calendar', 'Clashing events and big nights', 12],
    ],
    tasks: [
      { title: 'Book lecture theatre for hackathon kickoff', status: 'in_progress', assignee: 'Jamie Rivera', dueInDays: 5 },
      { title: 'Order pizza for workshop night', status: 'done', assignee: 'Jamie Rivera', dueInDays: null, updatedDaysAgo: 1 },
    ],
    decisions: [[40, 'Run feedback surveys the day after, not at the door', 'Response rates doubled when people had time to reflect.', 'Paper forms at the exit, mostly left blank.', 'Priya Shah']],
    checkin: { status: 'complete', inDays: -4, hour: 13, outcome: 'Jamie has portal access and has shadowed one event. Next: book the hackathon rooms before the January rush.' },
    handover: {
      responsibilities: ['Everything on the night, plus the bookings before it', 'You own the room booking, the running order and the clean-up. Partnerships agree sponsor benefits; you make sure they happen.'],
      recurring_tasks: ['Bookings three weeks ahead', 'The college portal rejects anything later than that. Put every event in the shared calendar the same day you book it.'],
      key_contacts: ['Campus Services for rooms', 'They are helpful but need written requests through the portal; emails get lost.'],
      decisions: ['Next-day surveys', 'We moved surveys to the day after because door forms were left blank.'],
      lessons: ['Over-order chairs, under-order food', 'About 70% of sign-ups turn up. Plan food for that, but always have spare seats.'],
    },
  },
  {
    role: {
      id: 'marketing',
      title: 'Marketing Lead',
      summary: 'Runs the society’s social channels, posters and newsletter.',
      peak_note: 'The two weeks before every major event.',
      buddy_name: '',
      buddy_title: '',
      buddy_note: '',
      buddy_email: '',
      reviewedDaysAgo: 45,
    },
    responsibilities: ['Post on social channels', 'Design event posters'],
    week: [],
    recurring: [['Newsletter', 'Every second Friday', 'Mailing list tool', '1 hour']],
    steps: [['Get access to social accounts', 'Access', 1], ['Meet the Events Coordinator', 'Introductions', 4]],
    contacts: [
      ['Print Shop', 'Supplier', 'Poster printing and prices', 52],
      ['Campus Radio', 'Media partner', 'Event announcements', 38],
      ['Design Society', 'Partner society', 'Shared design resources', 61],
    ],
    tasks: [{ title: 'Schedule hackathon teaser posts', status: 'todo', assignee: null, dueInDays: 9 }],
    decisions: [],
    checkin: { status: 'not_booked' },
    handover: { responsibilities: ['Social channels and posters', 'Mostly Instagram and posters around campus.'] },
  },
  {
    role: {
      id: 'treasurer',
      title: 'Treasurer',
      summary: 'Keeps the society’s accounts, approves spending and invoices sponsors.',
      peak_note: 'Grant deadlines in October and the end-of-year audit.',
      buddy_name: 'Alexis Ford',
      buddy_title: 'Former Treasurer · 2025/26',
      buddy_note: 'Alexis can walk you through the audit and the grant forms.',
      buddy_email: 'alexis@handoverhub.test',
      reviewedDaysAgo: 14,
    },
    responsibilities: ['Approve spending requests', 'Raise sponsor invoices', 'Prepare the annual audit', 'Apply for society grants'],
    week: [['Mon', 'Approve spending requests'], ['Thu', 'Reconcile the bank feed']],
    recurring: [['Bank reconciliation', 'Weekly', 'Finance sheet', '30 min'], ['Grant application', 'October', 'Societies portal', '3 hours']],
    steps: [
      ['Get added to the society bank account', 'Access', 1],
      ['Get access to the finance sheet', 'Access', 1],
      ['Meet the Partnerships Lead', 'Introductions', 3],
      ['Approve your first spending request', 'First tasks', 6],
    ],
    contacts: [
      ['Societies Office', 'College finance', 'Grants and audit rules', 20],
      ['Partnerships Team', 'Shared inbox', 'Signed sponsor agreements', 9],
      ['Bank branch', 'Account manager', 'Signatory changes', 90],
    ],
    tasks: [{ title: 'Invoice Acme for gold tier', status: 'in_progress', assignee: 'Jordan Lee', dueInDays: 2 }],
    decisions: [[55, 'Require two approvers for spending over €200', 'Protects the society and the Treasurer personally.', 'Single approver, which caused one disputed refund.', 'Alexis Ford']],
    checkin: { status: 'scheduled', inDays: 1, hour: 11 },
    handover: {
      responsibilities: ['Money in, money out, and the audit', 'You approve spending, invoice sponsors and keep receipts for the audit.'],
      recurring_tasks: ['Weekly reconciliation', 'Match every bank line to a receipt on Thursdays. It takes 30 minutes if you never skip it.'],
      key_contacts: ['Societies Office', 'They answer grant questions quickly by email.'],
      decisions: ['Two approvers over €200', 'Introduced after a disputed refund last year.'],
    },
  },
];

export interface TestUser {
  email: string;
  fullName: string;
  memberType: 'incoming' | 'outgoing' | 'lead';
  roleId: string;
  joinedDaysAgo: number;
  /** Onboarding steps (by title) already ticked. */
  completedSteps?: string[];
}

export const testUsers: TestUser[] = [
  {
    email: 'alex.incoming@handoverhub.test',
    fullName: 'Alex Morgan',
    memberType: 'incoming',
    roleId: 'partnerships',
    joinedDaysAgo: 3,
    completedSteps: [
      'Get access to partnerships inbox',
      'Join the society workspace',
      'Review active partner agreements',
      'Meet outgoing Partnerships Lead',
      'Send a test partner follow-up',
      'Update one CRM record',
    ],
  },
  { email: 'riley.outgoing@handoverhub.test', fullName: 'Riley Nguyen', memberType: 'outgoing', roleId: 'partnerships', joinedDaysAgo: 200 },
  { email: 'morgan.lead@handoverhub.test', fullName: 'Morgan Chen', memberType: 'lead', roleId: 'partnerships', joinedDaysAgo: 400 },
  // A clean account for usability testing: no progress, nothing ticked.
  { email: 'tester@handoverhub.test', fullName: 'Test Participant', memberType: 'incoming', roleId: 'partnerships', joinedDaysAgo: 0 },
  // Incoming members of the other roles, so the lead view has a full committee.
  { email: 'jamie.events@handoverhub.test', fullName: 'Jamie Rivera', memberType: 'incoming', roleId: 'events', joinedDaysAgo: 9 },
  { email: 'casey.marketing@handoverhub.test', fullName: 'Casey Walsh', memberType: 'incoming', roleId: 'marketing', joinedDaysAgo: 5 },
  { email: 'jordan.treasurer@handoverhub.test', fullName: 'Jordan Lee', memberType: 'incoming', roleId: 'treasurer', joinedDaysAgo: 6 },
];
