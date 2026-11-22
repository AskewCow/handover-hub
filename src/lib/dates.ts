// Date helpers. All "stale" logic in the app uses STALE_AFTER_DAYS from here.

export const STALE_AFTER_DAYS = 30;
const DAY_MS = 86_400_000;

export function daysSince(iso: string, now = new Date()): number {
  return Math.floor((now.getTime() - new Date(iso).getTime()) / DAY_MS);
}

export function isStale(iso: string, now = new Date()): boolean {
  return daysSince(iso, now) > STALE_AFTER_DAYS;
}

/** "12 Jun 2025" */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** "12 Jun" */
export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/** "Friday, 20 June · 14:00–14:30" */
export function formatSlot(iso: string, minutes = 30): string {
  const start = new Date(iso);
  const end = new Date(start.getTime() + minutes * 60_000);
  const day = start.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const time = (d: Date) => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return `${day} · ${time(start)}–${time(end)}`;
}

/** "14:05" today, otherwise "21 Nov, 14:05" */
export function formatMessageTime(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return d.toDateString() === now.toDateString() ? time : `${formatShortDate(iso)}, ${time}`;
}

/** "today", "yesterday", "3 days ago" */
export function relativeDays(iso: string, now = new Date()): string {
  const days = daysSince(iso, now);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

/** Due-date wording for a future or past date: "due today", "due tomorrow", "due in 4 days", "overdue". */
export function dueLabel(iso: string, now = new Date()): string {
  const start = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((start(new Date(iso)) - start(now)) / DAY_MS);
  if (diff < 0) return 'overdue';
  if (diff === 0) return 'due today';
  if (diff === 1) return 'due tomorrow';
  return `due in ${diff} days`;
}

export function addDays(iso: string, days: number): string {
  return new Date(new Date(iso).getTime() + days * DAY_MS).toISOString();
}

/** Value for <input type="date"> */
export function toDateInput(iso: string | null): string {
  return iso ? iso.slice(0, 10) : '';
}

/** Value for <input type="datetime-local"> in the viewer's timezone. */
export function toDateTimeInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function greeting(now = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}
