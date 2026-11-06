'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { Copy, Wand2, Scissors, RefreshCw, MessageSquareText } from 'lucide-react';
import { PageTitle } from '@/components/app-shell';
import { Badge, Button, Card, CardHeader, EmptyState, Field, Select, Skeleton, Textarea, buttonClass, cx } from '@/components/ui';
import { useToast } from '@/components/toast';
import { api, toastError } from '@/lib/client';
import { CHANNELS, TONES, LIMITS, type Channel, type Tone } from '@/lib/messages';
import { SERVICES } from '@/lib/sectors';
import { displayName } from '@/lib/insights';

interface ProspectOption {
  siren: string;
  name: string;
  score: number | null;
}

function Variant({ text, index, channel, onChange, onShorten, onRetone, busy }: { text: string; index: number; channel: Channel; onChange: (t: string) => void; onShorten: () => void; onRetone: (t: Tone) => void; busy: boolean }) {
  const toast = useToast();
  const limit = LIMITS[channel];
  const over = text.length > limit;
  return (
    <Card className="p-4" data-testid="variant">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Variante {index + 1}</span>
        <span className={cx('text-xs tabular-nums', over ? 'font-semibold text-rose-600' : 'text-slate-500')}>
          {text.length} / {limit} caractères
        </span>
      </div>
      <Textarea rows={channel === 'email' ? 12 : 6} value={text} onChange={(e) => onChange(e.target.value)} aria-label={`Variante ${index + 1}`} className="font-[inherit] leading-relaxed" />
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          size="sm"
          onClick={async () => {
            await navigator.clipboard.writeText(text).catch(() => {});
            toast('Message copié.', 'success');
          }}
          data-testid="copy"
        >
          <Copy className="size-3.5" />
          Copier
        </Button>
        <Button size="sm" variant="secondary" onClick={onShorten} loading={busy}>
          <Scissors className="size-3.5" />
          Raccourcir
        </Button>
        <Select aria-label="Changer de ton" className="h-8 w-auto text-[13px]" value="" onChange={(e) => e.target.value && onRetone(e.target.value as Tone)}>
          <option value="">Changer de ton…</option>
          {Object.entries(TONES).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
      </div>
    </Card>
  );
}

function MessagesPage() {
  const toast = useToast();
  const router = useRouter();
  const params = useSearchParams();
  const [options, setOptions] = useState<ProspectOption[] | null>(null);
  const [siren, setSiren] = useState(params.get('siren') || '');
  const [service, setService] = useState<string>('');
  const [channel, setChannel] = useState<Channel>('email');
  const [tone, setTone] = useState<Tone>('professionnel');
  const [variants, setVariants] = useState<string[]>([]);
  const [aiUsed, setAiUsed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyIndex, setBusyIndex] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([api<{ prospects: { siren: string; company: Parameters<typeof displayName>[0]; score: number | null }[] }>('/api/prospects'), api<{ offer: { services: string[] } }>('/api/settings')])
      .then(([p, s]) => {
        const analyzed = p.prospects.filter((x) => x.score !== null).map((x) => ({ siren: x.siren, name: displayName(x.company), score: x.score }));
        setOptions(analyzed);
        if (!service) setService(s.offer.services[0] || 'site_web');
      })
      .catch(() => setOptions([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generate = async (mode: 'new' | 'shorten' | 'retone' = 'new', baseText?: string, newTone?: Tone, index?: number) => {
    if (!siren) return toast('Choisissez d’abord un prospect.', 'error');
    if (mode === 'new') setLoading(true);
    else setBusyIndex(index ?? null);
    try {
      const r = await api<{ variants: string[]; aiUsed: boolean }>('/api/messages/generate', { body: { siren, service, channel, tone: newTone || tone, variants: 3, mode, baseText } });
      setAiUsed(r.aiUsed);
      if (mode === 'new') setVariants(r.variants);
      else setVariants((v) => v.map((t, i) => (i === index ? r.variants[0] : t)));
      router.refresh();
    } catch (e) {
      toastError(toast, e);
    } finally {
      setLoading(false);
      setBusyIndex(null);
    }
  };

  return (
    <div className="animate-fade-in">
      <PageTitle title="Générateur de messages" subtitle="Des messages personnalisés à partir des faits vérifiés sur chaque entreprise. Aucune relation préalable n’est inventée." />
      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <Card className="h-fit">
          <CardHeader icon={<Wand2 className="size-4" />} title="Paramètres" />
          <div className="space-y-4 p-5">
            {options === null ? (
              <Skeleton className="h-10" />
            ) : options.length === 0 && !siren ? (
              <EmptyState title="Aucun prospect analysé dans votre CRM" action={<Link href="/app/recherche" className={buttonClass('primary', 'sm')}>Trouver des prospects</Link>}>
                Analysez une entreprise et ajoutez-la au CRM pour lui écrire.
              </EmptyState>
            ) : (
              <Field label="Prospect" htmlFor="prospect">
                <Select id="prospect" value={siren} onChange={(e) => setSiren(e.target.value)} data-testid="prospect">
                  <option value="">Choisir…</option>
                  {siren && !options.some((o) => o.siren === siren) && <option value={siren}>SIREN {siren}</option>}
                  {options.map((o) => (
                    <option key={o.siren} value={o.siren}>
                      {o.name} {o.score !== null ? `(${o.score}/100)` : ''}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
            <Field label="Service proposé" htmlFor="service">
              <Select id="service" value={service} onChange={(e) => setService(e.target.value)}>
                {SERVICES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Canal" htmlFor="channel">
              <div className="grid grid-cols-2 gap-1.5" id="channel">
                {(Object.entries(CHANNELS) as [Channel, string][]).map(([k, v]) => (
                  <button key={k} type="button" onClick={() => setChannel(k)} aria-pressed={channel === k} className={cx('rounded-lg border px-2 py-2 text-xs font-semibold transition-colors', channel === k ? 'border-electric-500 bg-electric-50 text-electric-700' : 'border-line text-slate-600 hover:bg-slate-50')}>
                    {v}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Ton" htmlFor="tone">
              <Select id="tone" value={tone} onChange={(e) => setTone(e.target.value as Tone)}>
                {Object.entries(TONES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            </Field>
            <Button variant="accent" className="w-full" loading={loading} onClick={() => generate('new')} disabled={!siren} data-testid="generate">
              <RefreshCw className="size-4" />
              {variants.length ? 'Régénérer 3 variantes' : 'Générer 3 variantes'}
            </Button>
            <p className="text-xs text-slate-500">Chaque variante compte pour 1 message dans votre quota mensuel.</p>
          </div>
        </Card>
        <div className="space-y-4">
          {aiUsed !== null && (
            <div className="flex items-center gap-2">
              <Badge tone={aiUsed ? 'accent' : 'neutral'}>{aiUsed ? 'Rédigé par IA' : 'Rédigé par modèles (IA non configurée)'}</Badge>
              <span className="text-xs text-slate-500">Relisez toujours avant d’envoyer.</span>
            </div>
          )}
          {!variants.length && !loading && (
            <EmptyState icon={<MessageSquareText className="size-5" />} title="Vos messages apparaîtront ici">
              Choisissez un prospect, un canal et un ton. L’accroche s’appuie sur une observation réelle (site, annonce officielle…).
            </EmptyState>
          )}
          {loading && [0, 1, 2].map((i) => <Skeleton key={i} className="h-48" />)}
          {!loading &&
            variants.map((t, i) => (
              <Variant
                key={i}
                index={i}
                text={t}
                channel={channel}
                busy={busyIndex === i}
                onChange={(nt) => setVariants((v) => v.map((x, j) => (j === i ? nt : x)))}
                onShorten={() => generate('shorten', t, undefined, i)}
                onRetone={(nt) => {
                  setTone(nt);
                  generate('retone', t, nt, i);
                }}
              />
            ))}
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <MessagesPage />
    </Suspense>
  );
}
