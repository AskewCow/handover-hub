// Name helpers shared by avatars, task cards and the sidebar.

/** "Alex Morgan" → "AM" */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .map(word => word.replace(/[^\p{L}\p{N}]/gu, '')) // "#committee (Discord)" → "CD"
    .filter(Boolean)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/** "Alex Morgan" → "Alex M." */
export function shortName(name: string): string {
  const [first, ...rest] = name.trim().split(/\s+/);
  return rest.length ? `${first} ${rest[rest.length - 1][0]}.` : first;
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? '';
}

/** Case-insensitive comparison of two people's names. */
export function samePerson(a: string | null, b: string | null): boolean {
  return Boolean(a && b && a.trim().toLowerCase() === b.trim().toLowerCase());
}

export const memberTypeLabels = {
  incoming: 'Incoming member',
  outgoing: 'Outgoing member',
  lead: 'Society lead',
} as const;
