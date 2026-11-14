import { requireUser } from '@/lib/auth';
import { one } from '@/lib/db';
import { usageOf } from '@/lib/quota';
import { features } from '@/lib/env';
import { PLANS, PAID_PLANS } from '@/lib/plans';
import { PageTitle } from '@/components/app-shell';
import { Card, CardHeader, Meter, Badge } from '@/components/ui';
import { BillingActions, PlanButton, BillingNotice } from './actions';
import { Check, CreditCard } from 'lucide-react';

export const dynamic = 'force-dynamic';

const STATUS: Record<string, string> = {
  active: 'Actif',
  trialing: 'Période d’essai',
  past_due: 'Paiement en retard',
  canceled: 'Résilié',
  unpaid: 'Impayé',
  incomplete: 'Paiement incomplet',
  incomplete_expired: 'Paiement expiré',
  paused: 'En pause',
};

export default async function BillingPage() {
  const user = await requireUser();
  const usage = await usageOf(user.orgId);
  const org = await one<{ plan_source: string | null; subscription_status: string | null; current_period_end: string | null; stripe_customer_id: string | null }>(
    'select plan_source, subscription_status, current_period_end, stripe_customer_id from orgs where id = $1',
    [user.orgId],
  );
  const stripeOn = features.stripe();
  const owner = user.role === 'owner';
  const hasSub = !!org?.subscription_status && ['active', 'trialing', 'past_due'].includes(org.subscription_status);
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1, 1);

  return (
    <div className="animate-fade-in space-y-6">
      <PageTitle title="Abonnement" subtitle="Votre offre, votre consommation du mois et vos factures." />
      <BillingNotice />
      {!stripeOn && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" data-testid="billing-disabled">
          Le paiement en ligne n’est pas encore configuré sur cette instance : la souscription est momentanément indisponible. Votre offre actuelle reste utilisable normalement.
        </p>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader icon={<CreditCard className="size-4" />} title={`Offre ${user.plan.name}`} subtitle={user.plan.price ? `${user.plan.price} € HT / mois` : 'Gratuite'} action={org?.subscription_status ? <Badge tone={hasSub ? 'success' : 'warning'}>{STATUS[org.subscription_status] || org.subscription_status}</Badge> : undefined} />
          <div className="space-y-4 p-5">
            {org?.current_period_end && hasSub && <p className="text-sm text-slate-600">Prochaine échéance : {new Date(org.current_period_end).toLocaleDateString('fr-FR', { dateStyle: 'long' })}</p>}
            {org?.plan_source === 'admin' && <p className="text-sm text-slate-600">Offre attribuée manuellement par l’administrateur.</p>}
            {org?.subscription_status === 'past_due' && <p className="text-sm font-medium text-rose-700">Le dernier paiement a échoué. Mettez à jour votre moyen de paiement pour conserver votre offre.</p>}
            {owner && stripeOn && org?.stripe_customer_id && <BillingActions />}
            {!owner && <p className="text-sm text-slate-500">Seul le propriétaire du compte peut gérer l’abonnement.</p>}
          </div>
        </Card>
        <Card>
          <CardHeader title="Consommation du mois" subtitle={`Remise à zéro le ${nextMonth.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`} />
          <div className="space-y-4 p-5">
            <Meter label="Prospects analysés" value={usage.prospects} max={user.plan.prospects} />
            <Meter label="Messages générés" value={usage.aiMessages} max={user.plan.aiMessages} />
            <p className="text-xs text-slate-500">
              Un prospect est décompté la première fois que vous analysez une entreprise dans le mois ; relancer son analyse ne coûte rien de plus. Les recherches ({usage.searches.toLocaleString('fr-FR')} ce mois-ci) sont illimitées.
            </p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-3">
        {PAID_PLANS.map((id) => {
          const p = PLANS[id];
          const current = user.plan.id === id;
          return (
            <Card key={id} className={current ? 'ring-2 ring-electric-500' : id === 'pro' ? 'ring-1 ring-night-900/10' : ''} data-testid={`plan-${id}`}>
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{p.name}</h3>
                  {current ? <Badge tone="accent">Votre offre</Badge> : id === 'pro' ? <Badge tone="night">Le plus choisi</Badge> : null}
                </div>
                <p className="mt-2">
                  <span className="text-3xl font-bold tracking-tight">{p.price} €</span>
                  <span className="text-sm text-slate-500"> HT / mois</span>
                </p>
                <ul className="mt-4 space-y-2 text-sm">
                  {p.pitch.map((x) => (
                    <li key={x} className="flex gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-electric-600" />
                      {x}
                    </li>
                  ))}
                </ul>
                <div className="mt-5">
                  <PlanButton plan={id} current={current} disabled={!stripeOn || !owner} hasSubscription={hasSub} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      <p className="text-xs text-slate-500">Paiement sécurisé par Stripe. Sans engagement : résiliable à tout moment depuis « Gérer mon abonnement », l’offre reste active jusqu’à la fin de la période payée. Les factures sont disponibles dans le même espace.</p>
    </div>
  );
}
