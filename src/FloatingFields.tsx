import React, { useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface FloatingInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const FloatingInput: React.FC<FloatingInputProps> = ({
  label,
  error,
  className = '',
  id,
  placeholder = ' ',
  ...props
}) => {
  const autoId = useId();
  const inputId = id || autoId;

  return (
    <div className="relative w-full">
      <input
        id={inputId}
        placeholder={placeholder}
        className={`peer w-full rounded-xl border bg-white/[0.035] px-4 pt-5 pb-2 text-sm text-slate-100 placeholder-transparent outline-none transition-all duration-150 focus:bg-white/[0.06] focus:border-sky-400/70 focus:ring-2 focus:ring-sky-500/15 ${
          error ? 'border-rose-500/60' : 'border-white/10 hover:border-white/20'
        } ${className}`}
        {...props}
      />
      <label
        htmlFor={inputId}
        className="pointer-events-none absolute left-4 top-2 text-[11px] font-medium tracking-wide text-slate-400 transition-all duration-150 peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-placeholder-shown:font-normal peer-placeholder-shown:text-slate-400 peer-focus:top-2 peer-focus:text-[11px] peer-focus:font-medium peer-focus:text-sky-300"
      >
        {label}
      </label>
      {error && <p className="mt-1 text-xs text-rose-400">{error}</p>}
    </div>
  );
};

interface FloatingPasswordInputProps extends Omit<FloatingInputProps, 'type'> {
  label: string;
}

export const FloatingPasswordInput: React.FC<FloatingPasswordInputProps> = ({
  label,
  error,
  className = '',
  id,
  placeholder = ' ',
  ...props
}) => {
  const [visible, setVisible] = useState(false);
  const autoId = useId();
  const inputId = id || autoId;

  return (
    <div className="relative w-full">
      <input
        id={inputId}
        type={visible ? 'text' : 'password'}
        placeholder={placeholder}
        className={`peer w-full rounded-xl border bg-white/[0.035] pl-4 pr-11 pt-5 pb-2 text-sm text-slate-100 placeholder-transparent outline-none transition-all duration-150 focus:bg-white/[0.06] focus:border-sky-400/70 focus:ring-2 focus:ring-sky-500/15 ${
          error ? 'border-rose-500/60' : 'border-white/10 hover:border-white/20'
        } ${className}`}
        {...props}
      />
      <label
        htmlFor={inputId}
        className="pointer-events-none absolute left-4 top-2 text-[11px] font-medium tracking-wide text-slate-400 transition-all duration-150 peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-placeholder-shown:font-normal peer-placeholder-shown:text-slate-400 peer-focus:top-2 peer-focus:text-[11px] peer-focus:font-medium peer-focus:text-sky-300"
      >
        {label}
      </label>
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-slate-200"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
      {error && <p className="mt-1 text-xs text-rose-400">{error}</p>}
    </div>
  );
};

interface FloatingTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

export const FloatingTextarea: React.FC<FloatingTextareaProps> = ({
  label,
  error,
  className = '',
  id,
  placeholder = ' ',
  rows = 3,
  ...props
}) => {
  const autoId = useId();
  const inputId = id || autoId;

  return (
    <div className="relative w-full">
      <textarea
        id={inputId}
        rows={rows}
        placeholder={placeholder}
        className={`peer w-full rounded-xl border bg-white/[0.035] px-4 pt-6 pb-2.5 text-sm text-slate-100 placeholder-transparent outline-none transition-all duration-150 focus:bg-white/[0.06] focus:border-sky-400/70 focus:ring-2 focus:ring-sky-500/15 ${
          error ? 'border-rose-500/60' : 'border-white/10 hover:border-white/20'
        } ${className}`}
        {...props}
      />
      <label
        htmlFor={inputId}
        className="pointer-events-none absolute left-4 top-2 text-[11px] font-medium tracking-wide text-slate-400 transition-all duration-150 peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:font-normal peer-placeholder-shown:text-slate-400 peer-focus:top-2 peer-focus:text-[11px] peer-focus:font-medium peer-focus:text-sky-300"
      >
        {label}
      </label>
      {error && <p className="mt-1 text-xs text-rose-400">{error}</p>}
    </div>
  );
};

interface FloatingSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: Array<{ value: string | number; label: string }>;
}

export const FloatingSelect: React.FC<FloatingSelectProps> = ({
  label,
  options,
  className = '',
  id,
  ...props
}) => {
  const autoId = useId();
  const selectId = id || autoId;

  return (
    <div className="relative w-full">
      <select
        id={selectId}
        className={`w-full appearance-none rounded-xl border border-white/10 bg-[#0c1324] px-4 pt-5 pb-2 text-sm text-slate-100 outline-none transition-all duration-150 hover:border-white/20 focus:border-sky-400/70 focus:ring-2 focus:ring-sky-500/15 ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-[#0b1120] text-slate-100">
            {opt.label}
          </option>
        ))}
      </select>
      <label
        htmlFor={selectId}
        className="pointer-events-none absolute left-4 top-2 text-[11px] font-medium tracking-wide text-sky-300/90"
      >
        {label}
      </label>
    </div>
  );
};
