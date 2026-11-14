'use client';
// Navigation publique : section en cours surlignée, menu mobile qui se ferme après un choix (ou Échap).
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu, X, ArrowUpRight } from 'lucide-react';
import { cx, buttonClass } from './styles';

export const NAV = [
  { href: '/#radar', id: 'radar', label: 'Radar' },
  { href: '/#fonctionnalites', id: 'fonctionnalites', label: 'Fonctionnalités' },
  { href: '/#tarifs', id: 'tarifs', label: 'Tarifs' },
  { href: '/confiance', id: null, label: 'Confiance' },
  { href: '/outils/audit-site', id: null, label: 'Audit gratuit' },
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

export function SiteNav() {
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
      <nav className="hidden items-center gap-0.5 text-[14.5px] text-night-900/75 lg:flex" aria-label="Navigation principale">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            aria-current={isActive(n) ? 'true' : undefined}
            className={cx('inline-flex h-9 items-center rounded-full px-3 whitespace-nowrap transition-colors', isActive(n) ? 'bg-night-900/[0.06] text-night-900' : 'hover:text-night-900')}
          >
            {n.label}
          </Link>
        ))}
      </nav>
      <button type="button" onClick={() => setOpen((o) => !o)} className="grid size-9 place-items-center rounded-full hover:bg-night-900/5 min-[360px]:size-10 lg:hidden" aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'} aria-expanded={open} aria-controls="menu-mobile">
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>
      {open && (
        <div id="menu-mobile" className="absolute inset-x-0 top-[calc(100%+8px)] animate-rise rounded-3xl border border-line bg-white p-3 text-night-900 shadow-pop lg:hidden">
          <nav className="grid gap-0.5 text-[15px] font-medium" aria-label="Navigation mobile">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="rounded-2xl px-3 py-2.5 hover:bg-slate-100">
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="mt-2 grid grid-cols-2 gap-2 border-t border-line pt-3">
            <Link href="/connexion" onClick={() => setOpen(false)} className={cx(buttonClass('secondary', 'md'), 'rounded-xl')}>
              Connexion
            </Link>
            <Link href="/inscription" onClick={() => setOpen(false)} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-brand-violet px-4 text-sm font-semibold text-white">
              Essai gratuit
              <ArrowUpRight className="size-4" />
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
