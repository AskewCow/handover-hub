// Modal dialog and "•••" action menu.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Card } from './primitives';

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/30 p-4" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-xl">
        <Card className="p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <h2 className="font-semibold">{title}</h2>
            <button onClick={onClose} className="text-xl leading-none text-slate-400 hover:text-slate-700" aria-label="Close">×</button>
          </div>
          {children}
        </Card>
      </div>
    </div>
  );
}

export interface MenuAction {
  label: string;
  onSelect: () => void;
  danger?: boolean;
}

/** The design's "•••" button, opening a small list of actions. */
export function ActionMenu({
  actions,
  label = 'More actions',
  className = '',
  placement = 'down',
}: {
  actions: MenuAction[];
  label?: string;
  className?: string;
  placement?: 'down' | 'up';
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div ref={ref} className={`relative ${className}`} onClick={e => e.stopPropagation()}>
      <button onClick={() => setOpen(o => !o)} className="text-slate-400 hover:text-slate-700" aria-label={label} aria-expanded={open}>•••</button>
      {open && (
        <div className={`absolute right-0 ${placement === 'up' ? 'bottom-6' : 'top-6'} z-30 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg`}>
          {actions.map(a => (
            <button
              key={a.label}
              onClick={() => {
                setOpen(false);
                a.onSelect();
              }}
              className={`block w-full px-3.5 py-2 text-left text-xs font-semibold hover:bg-slate-50 ${a.danger ? 'text-rose-600' : 'text-slate-700'}`}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
