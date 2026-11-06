'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { LayoutDashboard, Search, KanbanSquare, MessageSquareText, ListChecks, History, Settings, CreditCard, Shield, LogOut, Menu, X } from 'lucide-react';
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
}

const NAV = [
  { href: '/app', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/app/recherche', label: 'Recherche', icon: Search },
  { href: '/app/crm', label: 'CRM', icon: KanbanSquare },
  { href: '/app/messages', label: 'Messages', icon: MessageSquareText },
  { href: '/app/listes', label: 'Listes', icon: ListChecks },
  { href: '/app/recherches', label: 'Historique', icon: History },
  { href: '/app/parametres', label: 'Paramètres', icon: Settings },
  { href: '/app/abonnement', label: 'Abonnement', icon: CreditCard },
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
  const nav = (
    <nav className="flex flex-1 flex-col gap-0.5 px-3" aria-label="Navigation de l’application">
      {[...NAV, ...(user.isAdmin ? [{ href: '/admin', label: 'Administration', icon: Shield }] : [])].map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={() => setOpen(false)}
          aria-current={active(href) ? 'page' : undefined}
          className={cx('flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors', active(href) ? 'bg-white/10 text-white' : 'text-night-100/70 text-slate-300 hover:bg-white/5 hover:text-white')}
        >
          <Icon className="size-4" />
          {label}
        </Link>
      ))}
    </nav>
  );
  const footer = (
    <div className="space-y-4 border-t border-white/10 p-4">
      <div className="space-y-3 rounded-xl bg-white/5 p-3 text-white [&_span]:text-slate-300">
        <div className="flex items-center justify-between text-xs">
          <span>Offre</span>
          <b className="text-white">{user.plan.name}</b>
        </div>
        <Meter label="Prospects analysés" value={user.usage.prospects} max={user.plan.prospects} />
        <Meter label="Messages générés" value={user.usage.aiMessages} max={user.plan.aiMessages} />
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{user.name}</p>
          <p className="truncate text-xs text-slate-400">{user.orgName}</p>
        </div>
        <button type="button" onClick={logout} className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="Se déconnecter" title="Se déconnecter" data-testid="logout">
          <LogOut className="size-4" />
        </button>
      </div>
    </div>
  );
  return (
    <div className="min-h-dvh lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-night-900 lg:flex">
        <div className="px-6 py-5">
          <Logo dark href="/app" />
        </div>
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
          <aside className="absolute inset-y-0 left-0 flex w-72 animate-rise flex-col bg-night-900">
            <div className="flex items-center justify-between px-5 py-4">
              <Logo dark href="/app" />
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-2 text-white hover:bg-white/10" aria-label="Fermer le menu">
                <X className="size-5" />
              </button>
            </div>
            {nav}
            {footer}
          </aside>
        </div>
      )}
      <main className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
    </div>
  );
}

export function PageTitle({ title, subtitle, action }: { title: string; subtitle?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-night-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
