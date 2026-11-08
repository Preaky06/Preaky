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
          <p className="px-3 pb-1.5 text-[10px] font-semibold tracking-[0.14em] text-slate-500 uppercase">{group}</p>
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
                    'relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    active(href) ? 'bg-white/[0.08] text-white before:absolute before:inset-y-2 before:-left-3 before:w-1 before:rounded-r-full before:bg-electric-400' : 'text-slate-400 hover:bg-white/5 hover:text-white',
                  )}
                >
                  <Icon className={cx('size-4', active(href) && 'text-electric-300')} />
                  {label}
                  {href === '/app/radar' && !!user.unread && (
                    <span className="ml-auto rounded-full bg-electric-500 px-1.5 py-px text-[11px] font-semibold text-white tabular-nums" data-testid="radar-badge">
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
      <div className="space-y-3 rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-3.5 text-white [&_span]:text-slate-300">
        <div className="flex items-center justify-between text-xs">
          <span>Offre</span>
          <b className="rounded-full bg-electric-500/20 px-2 py-0.5 text-[11px] text-electric-200">{user.plan.name}</b>
        </div>
        <Meter label="Prospects analysés" value={user.usage.prospects} max={user.plan.prospects} />
        <Meter label="Messages générés" value={user.usage.aiMessages} max={user.plan.aiMessages} />
        {upgrade && (
          <Link href="/app/abonnement" onClick={() => setOpen(false)} className="flex items-center justify-center gap-1.5 rounded-lg bg-white/10 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/15">
            <Sparkles className="size-3.5 text-electric-300" />
            Changer d’offre
            <ArrowUpRight className="size-3.5" />
          </Link>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 rounded-xl px-1.5 py-1">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-electric-500 to-violet-500 text-xs font-bold text-white">{initials}</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{user.name}</p>
            <p className="truncate text-xs text-slate-400">{user.orgName}</p>
          </div>
        </div>
        <button type="button" onClick={logout} className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="Se déconnecter" title="Se déconnecter" data-testid="logout">
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
      <Link href="/app/recherche" onClick={() => setOpen(false)} className="mt-5 flex h-10 items-center justify-center gap-2 rounded-xl bg-electric-600 text-sm font-semibold text-white shadow-glow transition-colors hover:bg-electric-500">
        <Search className="size-4" />
        Nouvelle recherche
      </Link>
    </div>
  );
  return (
    <div className="min-h-dvh bg-[radial-gradient(70%_320px_at_60%_0%,rgba(99,102,241,0.07),transparent)] lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-white/5 bg-night-950 bg-[radial-gradient(120%_50%_at_0%_0%,rgba(99,102,241,0.16),transparent)] lg:flex">
        {top}
        {nav}
        {footer}
      </aside>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-white/85 px-4 backdrop-blur lg:hidden">
        <Logo href="/app" />
        <button type="button" onClick={() => setOpen(true)} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Ouvrir le menu">
          <Menu className="size-5" />
        </button>
      </header>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-night-950/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 animate-rise flex-col bg-night-950">
            <button type="button" onClick={() => setOpen(false)} className="absolute top-4 right-3 rounded-lg p-2 text-white hover:bg-white/10" aria-label="Fermer le menu">
              <X className="size-5" />
            </button>
            {top}
            {nav}
            {footer}
          </aside>
        </div>
      )}
      <main id="contenu" className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 lg:px-10 lg:py-9">{children}</main>
    </div>
  );
}

export function PageTitle({ title, subtitle, action }: { title: string; subtitle?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-[1.6rem] leading-tight font-semibold tracking-[-0.02em] text-night-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
