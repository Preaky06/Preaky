'use client';
import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button, Field, Input, Select, Textarea } from '@/components/ui';
import { api, ApiError } from '@/lib/client';

export function OppositionForm() {
  const [form, setForm] = useState({ kind: 'opposition', siren: '', email: '', message: '' });
  const [error, setError] = useState<{ msg: string; field?: string } | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  if (sent)
    return (
      <div className="flex items-start gap-3 rounded-[22px] border border-emerald-200 bg-emerald-50 p-5 text-emerald-900" role="status" data-testid="opposition-sent">
        <CheckCircle2 className="mt-0.5 size-5" />
        <p>Demande enregistrée. Elle sera traitée dans un délai maximal d’un mois{form.email ? ', et une réponse vous sera adressée par e-mail' : ''}.</p>
      </div>
    );

  return (
    <form
      className="not-prose mt-6 space-y-4 rounded-[22px] border border-dashed border-violet-300/80 bg-paper/60 p-5 sm:p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        const siren = form.siren.replace(/\s/g, '');
        if (!siren && !form.email.trim()) return setError({ msg: 'Indiquez au moins un SIREN ou une adresse e-mail.', field: 'siren' });
        setLoading(true);
        try {
          await api('/api/reports', { body: { ...form, siren } });
          setSent(true);
        } catch (err) {
          const x = err as ApiError;
          setError({ msg: x.message, field: x.field });
        } finally {
          setLoading(false);
        }
      }}
    >
      <Field label="Type de demande" htmlFor="kind">
        <Select id="kind" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
          <option value="opposition">Opposition / suppression de mes données</option>
          <option value="data_error">Signaler une information erronée</option>
          <option value="abuse">Signaler un usage abusif (démarchage trompeur…)</option>
        </Select>
      </Field>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
        <Field label="SIREN de l’entreprise" htmlFor="siren" hint="9 chiffres, figurant sur l’avis de situation ou un Kbis." error={error?.field === 'siren' ? error.msg : null}>
          <Input id="siren" inputMode="numeric" value={form.siren} onChange={(e) => setForm({ ...form, siren: e.target.value.replace(/[^\d ]/g, '').slice(0, 11) })} data-testid="opp-siren" />
        </Field>
        <Field label="Adresse e-mail" htmlFor="email" hint="Pour vous répondre, et l’exclure si elle est concernée." error={error?.field === 'email' ? error.msg : null}>
          <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
      </div>
      <Field label="Votre demande" htmlFor="message" error={error?.field === 'message' ? error.msg : null}>
        <Textarea id="message" rows={4} maxLength={3000} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Ex. : je suis le gérant de cette société et je m’oppose à son référencement." data-testid="opp-message" />
      </Field>
      {error && !['siren', 'email', 'message'].includes(error.field || '') && (
        <p className="text-sm font-medium text-rose-600" role="alert">
          {error.msg}
        </p>
      )}
      <Button type="submit" loading={loading} data-testid="opp-submit">
        Envoyer la demande
      </Button>
    </form>
  );
}
