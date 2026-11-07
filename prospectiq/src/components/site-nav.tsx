'use client';
// Navigation publique : section en cours surlignée, menu mobile qui se ferme après un choix (ou Échap).
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu, X, ArrowRight } from 'lucide-react';
import { cx, buttonClass } from './styles';

export const NAV = [
  { href: '/#fonctionnalites', id: 'fonctionnalites', label: 'Fonctionnalités' },
  { href: '/#score', id: 'score', label: 'Score' },
  { href: '/confiance', id: null, label: 'Confiance' },
  { href: '/#tarifs', id: 'tarifs', label: 'Tarifs' },
  { href: '/#faq', id: 'faq', label: 'FAQ' },
] as const;

function useActiveSection(enabled: boolean) {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    if (!enabled || !('IntersectionObserver' in window)) return;
    const els = NAV.map((n) => (n.id ? document.getElementById(n.id) : null)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: '-40% 0px -55% 0px' },
    );
    els.forEach((el) => io.observe(el));
    const onTop = () => window.scrollY < 200 && setActive(null);
    window.addEventListener('scroll', onTop, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener('scroll', onTop);
    };
  }, [enabled]);
  return active;
}

export function SiteNav({ dark }: { dark: boolean }) {
  const path = usePathname();
  const active = useActiveSection(path === '/');
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  const isActive = (n: (typeof NAV)[number]) => (n.id ? path === '/' && active === n.id : path === n.href);

  return (
    <>
      <nav className={cx('hidden items-center gap-0.5 rounded-full p-1 text-sm font-medium md:flex', dark ? 'bg-white/[0.04] text-slate-300 ring-1 ring-white/10' : 'bg-night-900/[0.03] text-slate-600 ring-1 ring-line')} aria-label="Navigation principale">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            aria-current={isActive(n) ? 'true' : undefined}
            className={cx(
              'rounded-full px-3.5 py-1.5 transition-colors',
              isActive(n) ? (dark ? 'bg-white/12 text-white' : 'bg-white text-night-900 shadow-sm') : dark ? 'hover:text-white' : 'hover:text-night-900',
            )}
          >
            {n.label}
          </Link>
        ))}
      </nav>
      <button type="button" onClick={() => setOpen((o) => !o)} className={cx('grid size-9 place-items-center rounded-lg md:hidden', dark ? 'hover:bg-white/10' : 'hover:bg-slate-100')} aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'} aria-expanded={open} aria-controls="menu-mobile">
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>
      {open && (
        <div id="menu-mobile" className="absolute inset-x-0 top-16 animate-rise border-b border-line bg-white px-4 pt-3 pb-5 text-night-900 shadow-pop md:hidden">
          <nav className="grid gap-1 text-[15px] font-medium" aria-label="Navigation mobile">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="rounded-xl px-3 py-2.5 hover:bg-slate-100">
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-line pt-4">
            <Link href="/connexion" onClick={() => setOpen(false)} className={buttonClass('secondary', 'md')}>
              Connexion
            </Link>
            <Link href="/inscription" onClick={() => setOpen(false)} className={buttonClass('accent', 'md')}>
              Essai gratuit
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
