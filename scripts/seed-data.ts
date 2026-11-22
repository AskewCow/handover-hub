// Demo workspace for the Claude Builder Club Partnerships & Outreach role, based on the club's
// onboarding document (2 Oct 2026). Partner names, deals and rules come from that document.
// Personal contact details (emails, phone numbers, handles) are deliberately left out: the repo is
// public and the site allows sign-ups. People are referred to by role or first name + initial.
// Dates are relative to when the seed runs, so stale flags and due dates stay meaningful.

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
    reviewedDaysAgo: number;
  };
  /** Email of the test account that acts as buddy (linked after accounts exist). */
  buddyEmail?: string;
  responsibilities: string[];
  week: [day: string, body: string][];
  recurring: [name: string, schedule: string, tool: string, duration: string][];
  /** link: an app page such as '#/buddy', or an external https:// URL (opens in a new tab). */
  steps: [title: string, phase: Phase, dueDay: number, link?: string][];
  contacts: [name: string, owner: string, askAbout: string, updatedDaysAgo: number][];
  tasks: { title: string; status: Status; assignee: string | null; dueInDays: number | null; contact?: string; updatedDaysAgo?: number }[];
  decisions: [daysAgo: number, title: string, reason: string, triedBefore: string, author: string][];
  handover: Partial<Record<SectionKey, [title: string, body: string]>>;
}

export const SOCIETY = 'Claude Builder Club';

/**
 * Committee directory shown in the Role guide. Names other than the ambassadors are made up, and the
 * emails use the reserved .example domain, so none of them reach a real person.
 */
export const committee: { name: string; role: string; email: string; joined: string; left?: string }[] = [
  { name: 'Adam B.', role: 'Ambassador', email: 'adam.b@cbc.example', joined: '2025-09-15' },
  { name: 'Pavlo K.', role: 'Ambassador', email: 'pavlo.k@cbc.example', joined: '2025-09-15' },
  { name: 'Roman M.', role: 'Partnerships & Outreach Lead', email: 'roman.m@cbc.example', joined: '2026-11-22' },
  { name: 'Brian W.', role: 'Outreach', email: 'brian.w@cbc.example', joined: '2026-01-20' },
  { name: 'Niamh C.', role: 'Workshop Coordinator', email: 'niamh.c@cbc.example', joined: '2026-09-22' },
  { name: 'Ciara D.', role: 'Social Media', email: 'ciara.d@cbc.example', joined: '2025-10-06' },
  { name: 'Ethan L.', role: 'Backend Developer', email: 'ethan.l@cbc.example', joined: '2026-02-09' },
  { name: 'Maya R.', role: 'Frontend Developer', email: 'maya.r@cbc.example', joined: '2026-09-22' },
  { name: 'Sophie K.', role: 'Outreach', email: 'sophie.k@cbc.example', joined: '2025-10-06', left: '2026-06-12' },
];
export const TERM = '2026/27';

const AMBASSADOR = 'CBC Ambassador';
/** The onboarding document was written on 2 Oct 2026; decisions in it date from then or earlier. */
const DOC_AGE_DAYS = Math.round((Date.now() - new Date('2026-10-02T12:00:00Z').getTime()) / DAY);

export const roles: RoleSeed[] = [
  {
    role: {
      id: 'partnerships',
      title: 'Partnerships & Outreach Lead',
      summary: 'Finds and looks after the companies that support CBC: sponsors, hackathon partners, food, drinks and venues.',
      peak_note: 'The weeks before a hackathon: the Innovation Hub needs at least 3 weeks’ notice and food orders scale with headcount.',
      buddy_name: AMBASSADOR,
      buddy_title: 'Ambassador · Claude Builder Club',
      buddy_note: 'Your ambassador approves new outreach on Discord, signs off anything involving money or deliverables, and knows the history of every partner.',
      reviewedDaysAgo: 3,
    },
    buddyEmail: 'ambassador@handoverhub.test',
    responsibilities: [
      'Look after CBC’s current partners and keep each one’s owner and status up to date',
      'Run new outreach, coordinated on Discord so no firm is contacted twice',
      'Agree what CBC offers each partner: talent pool, promotion, on-campus workshops or co-hosted hackathons',
      'Check with an ambassador before agreeing to money or deliverables on the club’s behalf',
      'Find a drinks partner for events (Red Bull or an alternative)',
    ],
    week: [
      ['Mon', 'Check Discord for new leads, replies and anything waiting on an ambassador’s approval'],
      ['Wed', 'Follow up with the partners you own and log any updates in the app'],
      ['Fri', 'Post a short outreach update on Discord and plan next week’s contacts'],
    ],
    recurring: [],
    steps: [
      ['Read the Partnerships & Outreach onboarding doc', 'Access', 1, 'https://docs.google.com/document/d/1X2nSCCgecxXKYO68qT2lawRw3OSHdLzqYqZTSCWTtIw/edit?usp=sharing'],
      ['Join the CBC Discord', 'Access', 1, 'https://discord.gg/rFe8tJ88ww'],
      ['Open the ServiceNow partnership proposal with your @tcd email', 'Access', 1, 'https://drive.google.com/file/d/1N4ubnkq0UzcwMxzd0bj2CAwne7nlyKX4/view?usp=sharing'],
      ['Meet your ambassador (your onboarding buddy)', 'Introductions', 3, '#/buddy'],
      ['Go through the role guide', 'Introductions', 3, '#/role-guide'],
      ['Learn who owns each outreach partner', 'Introductions', 4, '#/role-guide'],
      ['Look through the decision log', 'First tasks', 5, '#/decisions'],
      ['Book your week-1 check-in with your ambassador', 'First tasks', 7, '#/buddy'],
    ],
    contacts: [
      ['ServiceNow', 'Adam B.', 'Sponsor, €3,000: hackathon promotion on our socials and Discord, Trinity talent pool, on-campus workshops. Our only written proposal', 12],
      ['Superteam (Solana)', 'Pavlo K.', 'Hackathon partner: fully funded hackathons (food, venue, judges). Discussing monetary funding; they want winners to build on in Colosseum', 6],
      ['Bobo’s Burgers (Dame Street)', 'Brian W.', 'Food for large events, about €7 a head for burger and fries. Used at two hackathons; they want large orders and Google reviews', DOC_AGE_DAYS],
      ['Innovation Hub (formerly Portal)', 'Adam B.', 'Free event space for 100, 1st floor of the Business building. Needs at least 3 weeks’ notice', 20],
      ['Red Bull', 'Unclaimed', 'Open drinks partner lead. The old campus rep gave free crates for good event photos; we haven’t reached the new rep yet', 4],
      [AMBASSADOR, 'Ambassador', 'Approves new outreach and any money or deliverables for the club', 2],
    ],
    tasks: [
      { title: 'Contact Red Bull’s new campus rep', status: 'todo', assignee: null, dueInDays: 7, contact: 'Red Bull' },
      { title: 'Follow up on Superteam monetary funding', status: 'in_progress', assignee: 'Pavlo K.', dueInDays: 5, contact: 'Superteam (Solana)' },
      { title: 'Plan a ServiceNow workshop on campus', status: 'todo', assignee: 'Adam B.', dueInDays: 14, contact: 'ServiceNow' },
      { title: 'Confirm Bobo’s order for the next hackathon', status: 'todo', assignee: 'Brian W.', dueInDays: 10, contact: 'Bobo’s Burgers (Dame Street)' },
      { title: 'Shortlist alternative drinks partners', status: 'todo', assignee: null, dueInDays: 7 },
      { title: 'Book the Innovation Hub for the next hackathon', status: 'done', assignee: 'Adam B.', dueInDays: null, contact: 'Innovation Hub (formerly Portal)', updatedDaysAgo: 5 },
    ],
    decisions: [
      [DOC_AGE_DAYS, 'No direct competitors as partners', 'Microsoft, Google, OpenAI and Meta are off limits. Other AI firms are allowed but discouraged.', '', AMBASSADOR],
      [DOC_AGE_DAYS, 'All outreach is coordinated on Discord and approved by an ambassador', 'Stops two people contacting the same firm. The approval message also tells everyone the firm is taken.', 'Members reaching out without checking, so the same firm was contacted twice.', AMBASSADOR],
      [DOC_AGE_DAYS, 'Use the ServiceNow proposal as the template for new partners', 'It is our only written agreement and shows how to tier the offer around Co-Innovation Hacks. Ignore its pricing, which was specific to ServiceNow.', '', AMBASSADOR],
      [DOC_AGE_DAYS + 30, 'Host hackathons at the Innovation Hub', 'It is free, holds 100 people and is on campus.', '', AMBASSADOR],
      [DOC_AGE_DAYS + 20, 'Use Bobo’s for food at large events', 'About €7 a head for burger and fries, and it worked well at two hackathons.', '', AMBASSADOR],
    ],
    handover: {
      responsibilities: [
        'Own CBC’s partner relationships and new outreach',
        'Four active partners, each with one CBC owner: ServiceNow (sponsor), Superteam/Solana (hackathon partner), Bobo’s (food) and the Innovation Hub (venue). Your job is to keep these healthy and find new ones, starting with a drinks partner.',
      ],
      recurring_tasks: [
        'The outreach routine: check, ask, then message',
        '1. Search Discord for the company name or ask if anyone has contacted them. 2. Ask an ambassador on Discord and wait for their approval; that message also marks the firm as taken. 3. Message the company; it is now yours. If you stop pursuing a firm, say so on Discord.',
      ],
      key_contacts: [
        'Ask each partner’s CBC owner for their contact',
        'ServiceNow and the Innovation Hub: Adam B. Superteam: Pavlo K. Bobo’s: Brian W. The full contact list is in the club’s onboarding doc, not in this app.',
      ],
      decisions: [
        'No competitors; one template; ambassador signs off',
        'Microsoft, Google, OpenAI and Meta are off limits. Use the ServiceNow proposal as the template (ignore its pricing). Run any money or deliverables past an ambassador first.',
      ],
      lessons: [
        'Know what each partner actually cares about',
        'Superteam measures success by one good startup idea reaching Colosseum, not headcount, and they were impressed by how organised we were. Red Bull gave free crates in return for high-quality photos of students at events. For food, drinks and venues the offer is simple: large orders and visibility with students.',
      ],
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
  checkin?: { status: CheckinStatus; inDays?: number; hour?: number; outcome?: string };
}

export const testUsers: TestUser[] = [
  // The onboarding buddy and society lead. Sign in as this account to reply to messages during a test.
  { email: 'ambassador@handoverhub.test', fullName: AMBASSADOR, memberType: 'lead', roleId: 'partnerships', joinedDaysAgo: 400 },
  // The incoming Partnerships & Outreach Lead for the user test: starts from scratch.
  { email: 'roman.incoming@handoverhub.test', fullName: 'Roman M.', memberType: 'incoming', roleId: 'partnerships', joinedDaysAgo: 0 },
  // Brand-new accounts for usability tests: nothing ticked, no check-in, no messages.
  { email: 'tester@handoverhub.test', fullName: 'Test Participant', memberType: 'incoming', roleId: 'partnerships', joinedDaysAgo: 0 },
  { email: 'tester2@handoverhub.test', fullName: 'Second Participant', memberType: 'incoming', roleId: 'partnerships', joinedDaysAgo: 0 },
];

/** Messages already in the demo inbox. Re-seeding replaces only these, unless run with --fresh. */
/** Messages already in the demo inbox. Re-seeding replaces only these, unless run with --fresh. */
export const welcomeMessages: { from: string; to: string; body: string; hoursAgo: number }[] = [];
