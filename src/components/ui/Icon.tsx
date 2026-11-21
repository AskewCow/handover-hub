import type { ReactNode } from 'react';

const icons: Record<string, ReactNode> = {
  Dashboard: <path d="M4 4h6v6H4zM14 4h6v9h-6zM4 14h6v6H4zM14 17h6v3h-6z" />,
  'Role guide': <path d="M5 4h11a3 3 0 0 1 3 3v13H7a2 2 0 0 1-2-2V4Zm0 0v12h11M9 8h6M9 12h5" />,
  Onboarding: <path d="m5 12 4 4L19 6M5 6h6M5 20h14" />,
  Contacts: <path d="M16 20v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9.5 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM17 9h5M19.5 6.5v5" />,
  Tasks: <path d="M9 5h11M9 12h11M9 19h11M4 5h.01M4 12h.01M4 19h.01" />,
  'Decision log': <path d="M14 3v4a1 1 0 0 0 1 1h4M6 3h8l5 5v13H6zM9 13h6M9 17h5" />,
  'Buddy & check-in': <path d="M15 19a6 6 0 0 0-12 0M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM17 11l2 2 4-5" />,
  'Outgoing handover': <path d="M8 4H4v16h13v-4M12 3h8v8M20 3 9 14" />,
  'Ask assistant': <path d="M4 5h16v12H8l-4 4V5ZM8 9h8M8 13h5" />,
  'Lead view': <path d="M4 19V9M10 19V5M16 19v-7M22 19H2" />,
  Logo: <path d="M7 4v16M17 4v16M7 9h10M7 15h10" />,
};

export function Icon({ name, size = 19 }: { name: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {icons[name] ?? <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z" />}
    </svg>
  );
}
