'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { Briefcase, Gauge, User, Users, Database, PartyPopper } from 'lucide-react';
import { PageTitle } from '@/components/app-shell';
import { Button, Card, CardHeader, Checkbox, Field, Input, Modal, Skeleton, Textarea, Badge } from '@/components/ui';
import { useToast } from '@/components/toast';
import { api, toastError } from '@/lib/client';
import { SERVICES, SECTORS, SIZES } from '@/lib/sectors';
import { CRITERIA_LABELS, DEFAULT_WEIGHTS, type Weights, type Offer } from '@/lib/scoring';

interface Me {
  user: { name: string; email: string; role: string; orgName: string; plan: { name: string; seats: number; features: { team: boolean } } };
}

function SettingsPage() {
  const toast = useToast();
  const router = useRouter();
  const welcome = useSearchParams().get('bienvenue');
  const [me, setMe] = useState<Me['user'] | null>(null);
  const [offer, setOffer] = useState<Offer | null>(null);
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);
  const [orgName, setOrgName] = useState('');
  const [profile, setProfile] = useState({ name: '', email: '', currentPassword: '', newPassword: '' });
  const [team, setTeam] = useState<{ members: { id: string; name: string; email: string; role: string }[]; invitations: { email: string }[]; seats: number } | null>(null);
  const [invite, setInvite] = useState('');
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePw, setDeletePw] = useState('');
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    api<Me>('/api/me').then((r) => {
      setMe(r.user);
      setProfile((p) => ({ ...p, name: r.user.name, email: r.user.email }));
    });
    api<{ orgName: string; offer: Offer; weights: Weights }>('/api/settings').then((r) => {
      setOffer(r.offer);
      setWeights(r.weights);
      setOrgName(r.orgName);
    });
    api<NonNullable<typeof team>>('/api/team').then(setTeam).catch(() => {});
  }, []);

  const save = async (section: string, payload: unknown, url = '/api/settings', method = 'PUT') => {
    setSaving(section);
    try {
      await api(url, { method, body: payload });
      toast('Modifications enregistrées.', 'success');
      router.refresh();
    } catch (e) {
      toastError(toast, e);
    } finally {
      setSaving(null);
    }
  };
  const toggle = (k: 'services' | 'sectors' | 'sizes', id: string) => setOffer((o) => (o ? { ...o, [k]: o[k].includes(id) ? o[k].filter((x) => x !== id) : [...o[k], id] } : o));
  const sum = Object.values(weights).reduce((s, v) => s + Number(v || 0), 0);

  if (!me || !offer) return <Skeleton className="h-96" />;
  const owner = me.role === 'owner';

  return (
    <div className="animate-fade-in space-y-6">
      <PageTitle title="Paramètres" subtitle={`${me.orgName} · offre ${me.plan.name}`} />
      {welcome && (
        <Card className="flex items-start gap-3 border-electric-100 bg-electric-50 p-5">
          <PartyPopper className="mt-0.5 size-5 text-electric-600" />
          <div>
            <p className="font-semibold text-night-900">Bienvenue sur ProspectIQ !</p>
            <p className="mt-1 text-sm text-night-800">Indiquez ci-dessous les services que vous vendez : le score et les messages seront personnalisés pour vous. Ensuite, lancez votre première recherche.</p>
          </div>
        </Card>
      )}

      <Card>
        <CardHeader icon={<Briefcase className="size-4" />} title="Votre offre" subtitle="Ce que vous vendez et à qui : utilisé pour le critère « pertinence » et pour les messages." />
        <div className="grid gap-6 p-5 lg:grid-cols-3">
          <fieldset className="space-y-2">
            <legend className="mb-2 text-[13px] font-semibold">Services que vous proposez</legend>
            {SERVICES.map((s) => (
              <Checkbox key={s.id} label={s.label} checked={offer.services.includes(s.id)} onChange={() => toggle('services', s.id)} data-testid={`service-${s.id}`} />
            ))}
          </fieldset>
          <fieldset className="space-y-2">
            <legend className="mb-2 text-[13px] font-semibold">Secteurs ciblés</legend>
            <p className="text-xs text-slate-500">Aucun coché = tous les secteurs.</p>
            {SECTORS.filter((s) => s.id !== 'autres').map((s) => (
              <Checkbox key={s.id} label={s.label} checked={offer.sectors.includes(s.id)} onChange={() => toggle('sectors', s.id)} />
            ))}
          </fieldset>
          <div className="space-y-4">
            <fieldset className="space-y-2">
              <legend className="mb-2 text-[13px] font-semibold">Tailles ciblées</legend>
              {SIZES.map((s) => (
                <Checkbox key={s.id} label={s.label} checked={offer.sizes.includes(s.id)} onChange={() => toggle('sizes', s.id)} />
              ))}
            </fieldset>
            <Field label="Signature des messages" htmlFor="sender">
              <Input id="sender" value={offer.senderName || ''} onChange={(e) => setOffer({ ...offer, senderName: e.target.value })} placeholder="Votre nom" />
            </Field>
            <Input aria-label="Société" value={offer.senderCompany || ''} onChange={(e) => setOffer({ ...offer, senderCompany: e.target.value })} placeholder="Votre société" />
            <Field label="Présentation courte (facultatif)" htmlFor="pitch" hint="Une phrase reprise dans les e-mails.">
              <Textarea id="pitch" rows={3} maxLength={600} value={offer.description || ''} onChange={(e) => setOffer({ ...offer, description: e.target.value })} />
            </Field>
          </div>
        </div>
        <div className="flex justify-end border-t border-line px-5 py-3">
          <Button disabled={!owner} loading={saving === 'offer'} onClick={() => save('offer', { offer })} data-testid="save-offer">
            Enregistrer mon offre
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader icon={<Gauge className="size-4" />} title="Pondération du score" subtitle="Ajustez l’importance de chaque critère. Le total est ramené automatiquement à 100." />
        <div className="grid gap-4 p-5 md:grid-cols-5">
          {(Object.keys(DEFAULT_WEIGHTS) as (keyof Weights)[]).map((k) => (
            <Field key={k} label={CRITERIA_LABELS[k]} htmlFor={`w-${k}`} hint={sum ? `${Math.round((Number(weights[k]) * 100) / sum)} % du score` : undefined}>
              <Input id={`w-${k}`} type="number" min={0} max={100} value={weights[k]} onChange={(e) => setWeights({ ...weights, [k]: Number(e.target.value) })} />
            </Field>
          ))}
        </div>
        <div className="flex justify-between gap-2 border-t border-line px-5 py-3">
          <Button variant="ghost" onClick={() => setWeights(DEFAULT_WEIGHTS)}>
            Valeurs par défaut
          </Button>
          <Button disabled={!owner || !sum} loading={saving === 'weights'} onClick={() => save('weights', { weights })}>
            Enregistrer la pondération
          </Button>
        </div>
        <p className="px-5 pb-4 text-xs text-slate-500">Les nouvelles pondérations s’appliquent aux prochaines analyses. Actualisez l’analyse d’une fiche pour la recalculer.</p>
      </Card>

      <Card>
        <CardHeader icon={<User className="size-4" />} title="Profil" />
        <div className="grid gap-4 p-5 md:grid-cols-2">
          <Field label="Nom" htmlFor="pname">
            <Input id="pname" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
          </Field>
          <Field label="E-mail" htmlFor="pemail">
            <Input id="pemail" type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
          </Field>
          <Field label="Nouveau mot de passe" htmlFor="pnew" hint="Laisser vide pour ne pas le changer.">
            <Input id="pnew" type="password" autoComplete="new-password" value={profile.newPassword} onChange={(e) => setProfile({ ...profile, newPassword: e.target.value })} />
          </Field>
          <Field label="Mot de passe actuel" htmlFor="pcur" hint="Requis pour changer l’e-mail ou le mot de passe.">
            <Input id="pcur" type="password" autoComplete="current-password" value={profile.currentPassword} onChange={(e) => setProfile({ ...profile, currentPassword: e.target.value })} />
          </Field>
          {owner && (
            <Field label="Nom de l’organisation" htmlFor="org">
              <Input id="org" value={orgName} onChange={(e) => setOrgName(e.target.value)} />
            </Field>
          )}
        </div>
        <div className="flex justify-end border-t border-line px-5 py-3">
          <Button
            loading={saving === 'profile'}
            onClick={async () => {
              await save('profile', { name: profile.name, email: profile.email, ...(profile.newPassword ? { newPassword: profile.newPassword } : {}), ...(profile.currentPassword ? { currentPassword: profile.currentPassword } : {}) }, '/api/me', 'PATCH');
              if (owner && orgName) await api('/api/settings', { method: 'PUT', body: { orgName } }).catch(() => {});
              setProfile((p) => ({ ...p, currentPassword: '', newPassword: '' }));
            }}
          >
            Enregistrer le profil
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader icon={<Users className="size-4" />} title="Équipe" subtitle={me.plan.features.team ? `${me.plan.seats} utilisateurs inclus dans votre offre` : 'Le travail en équipe est inclus dans l’offre Business.'} />
        <div className="space-y-4 p-5">
          <ul className="divide-y divide-line">
            {team?.members.map((m) => (
              <li key={m.id} className="flex items-center justify-between py-2 text-sm">
                <span>
                  {m.name} <span className="text-slate-500">· {m.email}</span>
                </span>
                <span className="flex items-center gap-2">
                  <Badge>{m.role === 'owner' ? 'Propriétaire' : 'Membre'}</Badge>
                  {owner && m.role !== 'owner' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        await api(`/api/team/${m.id}`, { method: 'DELETE' }).catch((e) => toastError(toast, e));
                        setTeam(await api('/api/team'));
                      }}
                    >
                      Retirer
                    </Button>
                  )}
                </span>
              </li>
            ))}
            {team?.invitations.map((i) => (
              <li key={i.email} className="flex items-center justify-between py-2 text-sm text-slate-500">
                {i.email}
                <Badge tone="warning">Invitation envoyée</Badge>
              </li>
            ))}
          </ul>
          {owner && (
            <form
              className="flex flex-wrap gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const r = await api<{ delivered: boolean; link?: string }>('/api/team', { body: { email: invite } });
                  setInvite('');
                  setInviteLink(r.link || null);
                  toast(r.delivered ? 'Invitation envoyée par e-mail.' : 'Invitation créée : transmettez le lien ci-dessous.', 'success');
                  setTeam(await api('/api/team'));
                } catch (err) {
                  toastError(toast, err);
                }
              }}
            >
              <Input type="email" value={invite} onChange={(e) => setInvite(e.target.value)} placeholder="email@collegue.fr" className="max-w-xs" aria-label="E-mail à inviter" />
              <Button type="submit" variant="secondary" disabled={!invite}>
                Inviter
              </Button>
            </form>
          )}
          {inviteLink && (
            <p className="break-all rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
              Lien d’invitation (valable 7 jours) : <span className="font-mono">{inviteLink}</span>
            </p>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader icon={<Database className="size-4" />} title="Vos données" subtitle="Accès, portabilité et effacement (RGPD)." />
        <div className="flex flex-wrap gap-3 p-5">
          <a href="/api/me/export" className="inline-flex h-10 items-center rounded-lg border border-line bg-white px-4 text-sm font-semibold shadow-sm hover:bg-slate-50">
            Télécharger mes données (JSON)
          </a>
          <Button variant="danger" onClick={() => setDeleteOpen(true)}>
            Supprimer mon compte
          </Button>
        </div>
      </Card>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Supprimer le compte"
        footer={
          <Button
            variant="danger"
            disabled={!deletePw}
            onClick={async () => {
              try {
                await api('/api/me', { method: 'DELETE', body: { password: deletePw } });
                location.href = '/';
              } catch (e) {
                toastError(toast, e);
              }
            }}
          >
            Supprimer définitivement
          </Button>
        }
      >
        <p className="text-sm text-slate-600">{owner ? 'Toutes les données de votre organisation (CRM, listes, recherches, messages) seront effacées.' : 'Votre accès sera supprimé ; les données de l’équipe sont conservées.'} Cette action est irréversible.</p>
        <Field label="Confirmez avec votre mot de passe" htmlFor="delpw" className="mt-4">
          <Input id="delpw" type="password" value={deletePw} onChange={(e) => setDeletePw(e.target.value)} />
        </Field>
      </Modal>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <SettingsPage />
    </Suspense>
  );
}
