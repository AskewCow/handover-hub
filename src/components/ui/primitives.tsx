// Visual building blocks taken from the Figma Make design. Pages compose these and never restyle them.
import type { ReactNode } from 'react';
import { Icon } from './Icon';

export type Tone = 'green' | 'amber' | 'red' | 'blue' | 'neutral' | 'purple';

export function Progress({ value, tone = 'mint', small = false }: { value: number; tone?: 'mint' | 'amber' | 'blue'; small?: boolean }) {
  const color = tone === 'amber' ? 'bg-amber-400' : tone === 'blue' ? 'bg-sky-500' : 'bg-emerald-500';
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className={`w-full overflow-hidden rounded-full bg-slate-100 ${small ? 'h-1.5' : 'h-2'}`} role="progressbar" aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={100}>
      <div className={`${color} h-full rounded-full transition-all duration-500`} style={{ width: `${clamped}%` }} />
    </div>
  );
}

const pillTones: Record<Tone, string> = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/10',
  amber: 'bg-amber-50 text-amber-700 ring-amber-600/10',
  red: 'bg-rose-50 text-rose-700 ring-rose-600/10',
  blue: 'bg-sky-50 text-sky-700 ring-sky-600/10',
  purple: 'bg-violet-50 text-violet-700 ring-violet-600/10',
  neutral: 'bg-slate-100 text-slate-600 ring-slate-500/10',
};

export function Pill({ children, tone = 'neutral' }: { children: ReactNode; tone?: Tone }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset ${pillTones[tone]}`}>{children}</span>;
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  // A custom background or border colour replaces the default instead of competing with it.
  const background = /(^|\s)bg-/.test(className) ? '' : 'bg-white';
  const border = /(^|\s)border-(?!\d|t|b|l|r|x|y)/.test(className) ? '' : 'border-slate-200/80';
  return <section className={`rounded-2xl border ${border} ${background} shadow-[0_1px_2px_rgba(15,23,42,0.03)] ${className}`}>{children}</section>;
}

export function PageTitle({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description: string; action?: ReactNode }) {
  return (
    <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="mb-1 text-xs font-bold uppercase tracking-[.16em] text-emerald-600">{eyebrow}</p>}
        <h1 className="text-[30px] font-semibold tracking-[-.035em] text-slate-950 sm:text-[34px]">{title}</h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>
      </div>
      {action && <div className="flex shrink-0 gap-2 [&>button]:w-full sm:[&>button]:w-auto">{action}</div>}
    </header>
  );
}

interface ButtonProps {
  children: ReactNode;
  secondary?: boolean;
  danger?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit';
  className?: string;
}

export function Button({ children, secondary = false, danger = false, disabled = false, onClick, type = 'button', className = '' }: ButtonProps) {
  const look = danger
    ? 'bg-rose-600 text-white hover:bg-rose-700'
    : secondary
      ? 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300'
      : 'bg-slate-950 text-white hover:bg-slate-800';
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition hover:-translate-y-px disabled:pointer-events-none disabled:opacity-50 ${look} ${className}`}
    >
      {children}
    </button>
  );
}

export function Empty({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className="grid place-items-center px-6 py-16 text-center">
      <div className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-slate-100 text-slate-400"><Icon name="Tasks" /></div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{text}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Avatar({ initials, tone = 'green', size = 'md' }: { initials: string; tone?: 'green' | 'blue' | 'purple' | 'neutral'; size?: 'sm' | 'md' }) {
  const tones = {
    green: 'bg-emerald-100 text-emerald-700',
    blue: 'bg-sky-100 text-sky-700',
    purple: 'bg-[#d8b4fe] text-violet-950',
    neutral: 'bg-slate-100 text-slate-600',
  };
  const sizes = { sm: 'h-6 w-6 text-[9px]', md: 'h-9 w-9 text-xs' };
  return <span className={`grid shrink-0 place-items-center rounded-full font-bold ${tones[tone]} ${sizes[size]}`}>{initials}</span>;
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="grid place-items-center py-24 text-sm text-slate-400" role="status">
      <span className="mb-3 h-7 w-7 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600" />
      {label}…
    </div>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">{children}</div>;
}

/** Search box used on the contacts and decision log pages. */
export function SearchInput({ value, onChange, placeholder, className = 'max-w-sm' }: { value: string; onChange: (v: string) => void; placeholder: string; className?: string }) {
  return (
    <div className={`mb-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 ${className}`}>
      <span className="text-slate-400" aria-hidden="true">⌕</span>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} className="w-full bg-transparent text-sm outline-none" />
    </div>
  );
}
