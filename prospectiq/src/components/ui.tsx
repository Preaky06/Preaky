'use client';
// Composants d'interface de base (style Pro Spectre).
import { forwardRef, useEffect, useRef } from 'react';
import { Loader2, X } from 'lucide-react';
import { cx, buttonClass, type ButtonVariant, type ButtonSize } from './styles';

export { cx, buttonClass };

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ variant, size, loading, className, children, disabled, ...rest }, ref) {
  return (
    <button ref={ref} type="button" className={cx(buttonClass(variant, size), className)} disabled={disabled || loading} {...rest}>
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
});

export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx('rounded-2xl border border-line bg-white shadow-card', className)} {...rest}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action, icon }: { title: React.ReactNode; subtitle?: React.ReactNode; action?: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
      <div className="flex items-start gap-3">
        {icon && <span className="mt-0.5 grid size-8 place-items-center rounded-lg bg-electric-50 text-electric-600">{icon}</span>}
        <div>
          <h2 className="text-[15px] font-semibold text-night-900">{title}</h2>
          {subtitle && <p className="mt-0.5 text-[13px] text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

const TONES = {
  neutral: 'bg-slate-100 text-slate-700 ring-slate-200',
  accent: 'bg-electric-50 text-electric-700 ring-electric-100',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  warning: 'bg-amber-50 text-amber-800 ring-amber-100',
  danger: 'bg-rose-50 text-rose-700 ring-rose-100',
  night: 'bg-night-900 text-white ring-night-900',
};

/** `wrap` : libellé long autorisé à passer à la ligne (sinon il déborderait sur mobile). */
export function Badge({ tone = 'neutral', className, children, title, wrap = false }: { tone?: keyof typeof TONES; className?: string; children: React.ReactNode; title?: string; wrap?: boolean }) {
  return (
    <span
      title={title}
      className={cx('inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold ring-1 ring-inset', wrap ? 'max-w-full flex-wrap rounded-lg leading-snug' : 'rounded-full whitespace-nowrap', TONES[tone], className)}
    >
      {children}
    </span>
  );
}

export const inputClass =
  'w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-night-900 shadow-sm placeholder:text-slate-400 focus:border-electric-500 focus:outline-none focus:ring-2 focus:ring-electric-500/20 disabled:bg-slate-50 aria-[invalid=true]:border-rose-400';

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cx(inputClass, 'h-10', className)} {...rest} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...rest }, ref) {
  return <textarea ref={ref} className={cx(inputClass, className)} {...rest} />;
});

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...rest }, ref) {
  return (
    <select ref={ref} className={cx(inputClass, 'h-10 pr-8', className)} {...rest}>
      {children}
    </select>
  );
});

export function Field({ label, htmlFor, hint, error, children, className }: { label: React.ReactNode; htmlFor?: string; hint?: React.ReactNode; error?: string | null; children: React.ReactNode; className?: string }) {
  return (
    <div className={cx('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className="block text-[13px] font-semibold text-night-800">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-xs font-medium text-rose-600" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

export function Checkbox({ label, hint, className, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { label: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <label className={cx('flex cursor-pointer items-start gap-2.5 text-sm text-night-800', className)}>
      <input type="checkbox" className="mt-0.5 size-4 rounded border-line accent-electric-600" {...rest} />
      <span>
        {label}
        {hint && <span className="block text-xs text-slate-500">{hint}</span>}
      </span>
    </label>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cx('size-5 animate-spin text-electric-600', className)} />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('animate-pulse rounded-lg bg-slate-200/70', className)} />;
}

export function EmptyState({ icon, title, children, action }: { icon?: React.ReactNode; title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-white/60 px-6 py-12 text-center">
      {icon && <div className="mb-3 grid size-12 place-items-center rounded-xl bg-electric-50 text-electric-600">{icon}</div>}
      <h3 className="text-[15px] font-semibold text-night-900">{title}</h3>
      {children && <div className="mt-1 max-w-md text-sm text-slate-500">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Modal({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className={cx('m-auto w-[calc(100%-2rem)] rounded-2xl border border-line bg-white p-0 text-night-900 shadow-pop backdrop:bg-night-950/40 backdrop:backdrop-blur-sm', wide ? 'max-w-2xl' : 'max-w-md')}
    >
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <h2 className="text-base font-semibold">{title}</h2>
        <button type="button" aria-label="Fermer" onClick={onClose} className="rounded-md p-1 text-slate-500 hover:bg-slate-100">
          <X className="size-4" />
        </button>
      </div>
      <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
      {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
    </dialog>
  );
}

export function Meter({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="font-medium text-slate-600">{label}</span>
        <span className="tabular-nums text-slate-500">
          {value.toLocaleString('fr-FR')} / {max.toLocaleString('fr-FR')}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuenow={value} aria-valuemax={max} aria-label={label}>
        <div className={cx('h-full rounded-full transition-all', pct >= 90 ? 'bg-rose-500' : pct >= 70 ? 'bg-amber-500' : 'bg-electric-500')} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <nav className="flex items-center justify-center gap-2" aria-label="Pagination">
      <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Précédent
      </Button>
      <span className="text-sm tabular-nums text-slate-600">
        Page {page} sur {totalPages.toLocaleString('fr-FR')}
      </span>
      <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
        Suivant
      </Button>
    </nav>
  );
}
