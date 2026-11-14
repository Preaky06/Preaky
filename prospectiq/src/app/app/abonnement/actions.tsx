'use client';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { Button } from '@/components/ui';
import { useToast } from '@/components/toast';
import { api, toastError } from '@/lib/client';

function useRedirect() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const go = async (path: string, body: unknown = {}) => {
    setBusy(true);
    try {
      const r = await api<{ url: string }>(path, { body });
      location.href = r.url;
    } catch (e) {
      toastError(toast, e);
      setBusy(false);
    }
  };
  return { busy, go };
}

export function BillingActions() {
  const { busy, go } = useRedirect();
  return (
    <Button variant="secondary" loading={busy} onClick={() => go('/api/billing/portal')} data-testid="portal">
      Gérer mon abonnement et mes factures
    </Button>
  );
}

export function PlanButton({ plan, current, disabled, hasSubscription }: { plan: string; current: boolean; disabled: boolean; hasSubscription: boolean }) {
  const { busy, go } = useRedirect();
  if (current) return <Button className="w-full" variant="secondary" disabled>Offre actuelle</Button>;
  if (hasSubscription)
    return (
      <Button className="w-full" variant="secondary" loading={busy} disabled={disabled} onClick={() => go('/api/billing/portal')}>
        Changer pour cette offre
      </Button>
    );
  return (
    <Button className="w-full" variant={plan === 'pro' ? 'accent' : 'primary'} loading={busy} disabled={disabled} onClick={() => go('/api/billing/checkout', { plan })} data-testid={`subscribe-${plan}`}>
      Choisir {plan === 'starter' ? 'Starter' : plan === 'pro' ? 'Pro' : 'Business'}
    </Button>
  );
}

function Notice() {
  const p = useSearchParams();
  if (p.get('succes'))
    return <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">Paiement reçu, merci ! Votre offre est activée dès la confirmation de Stripe (quelques secondes). Actualisez la page si elle n’apparaît pas encore.</p>;
  if (p.get('annule')) return <p className="rounded-xl border border-line bg-white px-4 py-3 text-sm text-slate-600">Paiement annulé : aucun montant n’a été prélevé.</p>;
  return null;
}

export function BillingNotice() {
  return (
    <Suspense>
      <Notice />
    </Suspense>
  );
}
