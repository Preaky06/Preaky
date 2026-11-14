'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { LayoutDashboard, Search, KanbanSquare, MessageSquareText, ListChecks, History, Settings, CreditCard, Shield, LogOut, Menu, X, Sparkles, ArrowUpRight, Radar } from 'lucide-react';
import { Logo } from './logo';
import { Meter, cx } from './ui';
import { api } from '@/lib/client';

export interface ShellUser {
  name: string;
  email: string;
  orgName: string;
  isAdmin: boolean;
  plan: { name: string; prospects: number; aiMessages: number };
  usage: { prospects: number; aiMessages: number };
  unread?: number;
}

const NAV = [
  { href: '/app', label: 'Tableau de bord', icon: LayoutDashboard, group: 'Prospection' },
  { href: '/app/radar', label: 'Radar', icon: Radar, group: 'Prospection' },
  { href: '/app/recherche', label: 'Recherche', icon: Search, group: 'Prospection' },
  { href: '/app/crm', label: 'CRM', icon: KanbanSquare, group: 'Prospection' },
  { href: '/app/messages', label: 'Messages', icon: MessageSquareText, group: 'Prospection' },
  { href: '/app/listes', label: 'Listes', icon: ListChecks, group: 'Prospection' },
  { href: '/app/recherches', label: 'Historique', icon: History, group: 'Prospection' },
  { href: '/app/parametres', label: 'Paramètres', icon: Settings, group: 'Compte' },
  { href: '/app/abonnement', label: 'Abonnement', icon: CreditCard, group: 'Compte' },
];

export function AppShell({ user, children }: { user: ShellUser; children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const active = (href: string) => (href === '/app' ? path === '/app' : path.startsWith(href));
  const logout = async () => {
    await api('/api/auth/logout', { method: 'POST', body: {} }).catch(() => {});
    router.push('/connexion');
    router.refresh();
  };
  const items = [...NAV, ...(user.isAdmin ? [{ href: '/admin', label: 'Administration', icon: Shield, group: 'Compte' }] : [])];
  const nav = (
    <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3" aria-label="Navigation de l’application">
      {['Prospection', 'Compte'].map((group) => (
        <div key={group}>
          <p className="px-3 pb-2 font-mono text-[10.5px] font-medium tracking-[0.14em] text-slate-500 uppercase">[ {group} ]</p>
          <div className="flex flex-col gap-0.5">
            {items
              .filter((i) => i.group === group)
              .map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  aria-current={active(href) ? 'page' : undefined}
                  className={cx(
                    'relative flex items-center gap-3 rounded-full px-3.5 py-2 text-sm font-medium transition-colors',
                    active(href) ? 'bg-white text-night-900 shadow-float' : 'text-slate-400 hover:bg-white/[0.07] hover:text-white',
                  )}
                >
                  <Icon className={cx('size-4', active(href) && 'text-brand-violet')} />
                  {label}
                  {href === '/app/radar' && !!user.unread && (
                    <span className="ml-auto rounded-full bg-brand-violet px-1.5 py-px text-[11px] font-semibold text-white tabular-nums" data-testid="radar-badge">
                      {user.unread > 99 ? '99+' : user.unread}
                    </span>
                  )}
                </Link>
              ))}
          </div>
        </div>
      ))}
    </nav>
  );
  const upgrade = user.plan.name !== 'Business';
  const initials = user.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
  const footer = (
    <div className="space-y-3 p-3">
      <div className="space-y-3 rounded-[20px] border border-dashed border-white/15 p-3.5 text-white [&_span]:text-slate-300">
        <div className="flex items-center justify-between text-xs">
          <span className="font-mono text-[10.5px] tracking-[0.12em] uppercase">Offre</span>
          <b className="rounded-full bg-brand-violet px-2 py-0.5 font-mono text-[10.5px] font-medium tracking-[0.08em] text-white uppercase">{user.plan.name}</b>
        </div>
        <Meter label="Prospects analysés" value={user.usage.prospects} max={user.plan.prospects} />
        <Meter label="Messages générés" value={user.usage.aiMessages} max={user.plan.aiMessages} />
        {upgrade && (
          <Link href="/app/abonnement" onClick={() => setOpen(false)} className="flex items-center justify-center gap-1.5 rounded-full bg-white/10 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/15">
            <Sparkles className="size-3.5 text-violet-300" />
            Changer d’offre
            <ArrowUpRight className="size-3.5" />
          </Link>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 rounded-xl px-1.5 py-1">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white text-xs font-bold text-night-900">{initials}</span>
          <div className="min-w-0">
            <p className="break-words text-sm font-semibold text-white">{user.name}</p>
            <p className="break-words text-xs text-slate-400">{user.orgName}</p>
          </div>
        </div>
        <button type="button" onClick={logout} className="rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="Se déconnecter" title="Se déconnecter" data-testid="logout">
          <LogOut className="size-4" />
        </button>
      </div>
    </div>
  );
  const top = (
    <div className="px-3 pt-5 pb-4">
      <div className="px-3">
        <Logo dark href="/app" />
      </div>
      <Link href="/app/recherche" onClick={() => setOpen(false)} className="mt-5 flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-violet text-sm font-semibold text-white shadow-brand transition-colors hover:bg-violet-500">
        <Search className="size-4" />
        Nouvelle recherche
      </Link>
    </div>
  );
  return (
    <div className="paper-dots relative isolate min-h-dvh lg:pl-[17.5rem]">
      <div className="halo-duo pointer-events-none absolute inset-x-0 top-0 -z-10 h-[26rem] opacity-60" aria-hidden="true" />
      <aside className="island fixed top-3 bottom-3 left-3 z-40 hidden w-64 flex-col overflow-hidden rounded-[28px] shadow-pop lg:flex">
        {top}
        {nav}
        {footer}
      </aside>
      <header className="sticky top-0 z-30 px-3 pt-3 lg:hidden">
        <div className="flex h-14 items-center justify-between rounded-full border border-white bg-white/80 pr-2 pl-5 shadow-float ring-1 ring-night-900/[0.06] backdrop-blur-xl">
          <Logo href="/app" />
          <button type="button" onClick={() => setOpen(true)} className="grid size-10 place-items-center rounded-full hover:bg-night-900/5" aria-label="Ouvrir le menu">
            <Menu className="size-5" />
          </button>
        </div>
      </header>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-night-950/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="island absolute top-3 bottom-3 left-3 flex w-72 max-w-[calc(100%-1.5rem)] animate-rise flex-col overflow-hidden rounded-[28px]">
            <button type="button" onClick={() => setOpen(false)} className="absolute top-4 right-3 rounded-lg p-2 text-white hover:bg-white/10" aria-label="Fermer le menu">
              <X className="size-5" />
            </button>
            {top}
            {nav}
            {footer}
          </aside>
        </div>
      )}
      <main id="contenu" className="mx-auto max-w-[1240px] px-4 py-6 sm:px-6 lg:px-8 lg:py-10">{children}</main>
    </div>
  );
}

export function PageTitle({ title, subtitle, action }: { title: string; subtitle?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-display text-[2rem] leading-[1.05] font-semibold tracking-[-0.045em] text-night-900 sm:text-[2.4rem]">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-slate-600">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
