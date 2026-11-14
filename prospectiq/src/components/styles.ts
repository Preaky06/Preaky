// Helpers de style purs, utilisables côté serveur comme côté client.
export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

export type ButtonVariant = 'primary' | 'accent' | 'brand' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export const buttonClass = (variant: ButtonVariant = 'primary', size: ButtonSize = 'md') =>
  cx(
    'inline-flex items-center justify-center gap-2 font-semibold whitespace-nowrap transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 active:translate-y-px',
    size === 'sm' && 'h-8 rounded-lg px-3 text-[13px]',
    size === 'md' && 'h-10 rounded-xl px-4 text-sm',
    size === 'lg' && 'h-12 rounded-xl px-6 text-[15px]',
    variant === 'primary' && 'bg-night-900 text-white shadow-sm hover:bg-night-800',
    variant === 'accent' && 'bg-brand-violet text-white shadow-brand hover:bg-violet-700',
    variant === 'brand' && 'bg-brand-violet text-white shadow-brand hover:bg-violet-700',
    variant === 'secondary' && 'border border-night-900/10 bg-white text-night-900 shadow-sm hover:border-night-900/25 hover:bg-white',
    variant === 'ghost' && 'text-night-700 hover:bg-night-900/5',
    variant === 'danger' && 'border border-rose-200 bg-white text-rose-700 hover:bg-rose-50',
  );

