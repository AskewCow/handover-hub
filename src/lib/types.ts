// Row types mirroring supabase/schema.sql. Keep the two in sync.

export type MemberType = 'incoming' | 'outgoing' | 'lead';
export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type OnboardingPhase = 'Access' | 'Introductions' | 'First tasks';
export type CheckinStatus = 'not_booked' | 'scheduled' | 'complete';
export type HandoverSectionKey = 'responsibilities' | 'recurring_tasks' | 'key_contacts' | 'decisions' | 'lessons';

export interface Role {
  id: string;
  title: string;
  society: string;
  term: string;
  summary: string;
  peak_note: string;
  position: number;
  buddy_name: string;
  buddy_title: string;
  buddy_note: string;
  buddy_email: string;
  checkin_prompts: string[];
  reviewed_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  member_type: MemberType;
  role_id: string | null;
  created_at: string;
}

export interface Responsibility {
  id: string;
  role_id: string;
  body: string;
  position: number;
  updated_at: string;
}

export interface WeekItem {
  id: string;
  role_id: string;
  day: string;
  body: string;
  position: number;
  updated_at: string;
}

export interface RecurringTask {
  id: string;
  role_id: string;
  name: string;
  schedule: string;
  tool: string;
  duration: string;
  position: number;
  updated_at: string;
}

export interface OnboardingStep {
  id: string;
  role_id: string;
  title: string;
  phase: OnboardingPhase;
  due_day: number;
  position: number;
}

export interface Contact {
  id: string;
  role_id: string;
  name: string;
  owner: string;
  ask_about: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  role_id: string;
  title: string;
  status: TaskStatus;
  assignee: string | null;
  due_date: string | null;
  contact_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Decision {
  id: string;
  role_id: string;
  decided_on: string;
  title: string;
  reason: string;
  tried_before: string;
  author: string;
  created_by: string | null;
  created_at: string;
}

export interface Checkin {
  role_id: string;
  status: CheckinStatus;
  scheduled_at: string | null;
  outcome: string;
  updated_at: string;
}

export interface HandoverSection {
  role_id: string;
  section: HandoverSectionKey;
  title: string;
  body: string;
  updated_by: string | null;
  updated_at: string;
}

/** Everything the app shows for one role, loaded in a single round of queries. */
export interface RoleBundle {
  role: Role;
  responsibilities: Responsibility[];
  weekItems: WeekItem[];
  recurringTasks: RecurringTask[];
  steps: OnboardingStep[];
  completedStepIds: Set<string>;
  contacts: Contact[];
  tasks: Task[];
  decisions: Decision[];
  checkin: Checkin | null;
  handover: HandoverSection[];
  /** The profile currently holding this role as an incoming member, if any. */
  incomingMember: Profile | null;
}

/** Source label returned by the Ask assistant. */
export interface AskSource {
  section: string;
  label: string;
}

export interface AskAnswer {
  answer: string;
  sources: AskSource[];
}
