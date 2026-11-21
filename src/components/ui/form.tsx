// Controlled form fields matching the design's input style.
import type { ReactNode } from 'react';

const fieldClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100';

function Label({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-slate-600">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-slate-400">{hint}</span>}
    </label>
  );
}

interface InputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'email' | 'password' | 'date' | 'datetime-local';
  required?: boolean;
  hint?: string;
  autoComplete?: string;
  minLength?: number;
}

export function Input({ label, value, onChange, placeholder, type = 'text', required = false, hint, autoComplete, minLength }: InputProps) {
  return (
    <Label label={label} hint={hint}>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        minLength={minLength}
        className={fieldClass}
      />
    </Label>
  );
}

interface TextareaProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}

export function Textarea({ label, value, onChange, placeholder, required = false }: TextareaProps) {
  return (
    <Label label={label}>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="min-h-28 w-full rounded-xl border border-slate-200 p-3.5 text-sm outline-none focus:border-emerald-500"
      />
    </Label>
  );
}

interface SelectProps<T extends string> {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  hint?: string;
}

export function Select<T extends string>({ label, value, onChange, options, hint }: SelectProps<T>) {
  return (
    <Label label={label} hint={hint}>
      <select value={value} onChange={e => onChange(e.target.value as T)} className={fieldClass}>
        {options.map(o => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Label>
  );
}
