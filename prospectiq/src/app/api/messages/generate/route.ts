import { z } from 'zod';
import { authed, body, ok, HttpError } from '@/lib/http';
import { rateLimit } from '@/lib/ratelimit';
import { consumeAiMessage, usageOf } from '@/lib/quota';
import { storedAnalysis, orgSettings } from '@/lib/analysis';
import { features } from '@/lib/env';
import { chatJson, GROUNDING_RULES } from '@/lib/ai';
import { q } from '@/lib/db';
import { CHANNELS, TONES, LIMITS, templateMessages, factsForAi, fit, type Channel, type Tone, type MessageContext } from '@/lib/messages';
import { SERVICES } from '@/lib/sectors';

const Schema = z.object({
  siren: z.string().regex(/^\d{9}$/, 'SIREN invalide.'),
  service: z.enum(SERVICES.map((s) => s.id) as [string, ...string[]]),
  channel: z.enum(Object.keys(CHANNELS) as [Channel, ...Channel[]]),
  tone: z.enum(Object.keys(TONES) as [Tone, ...Tone[]]),
  variants: z.number().int().min(1).max(3).default(3),
  mode: z.enum(['new', 'shorten', 'retone']).default('new'),
  baseText: z.string().max(3000).optional(),
});

const AiSchema = z.object({ variants: z.array(z.string().min(20).max(3000)).min(1).max(3) });

const CHANNEL_RULES: Record<Channel, string> = {
  email: 'E-mail : commence par « Objet : … » sur la première ligne, puis le corps (90 à 140 mots), une signature, et termine par : « Si vous ne souhaitez pas être recontacté(e), répondez simplement « stop ». »',
  linkedin: 'Note d’invitation LinkedIn : 300 caractères maximum, sans objet.',
  instagram: 'Message privé Instagram : 600 caractères maximum, ton direct, sans objet.',
  court: 'Message commercial court : 280 caractères maximum.',
};

export const POST = authed(async (req, { user }) => {
  await rateLimit(`messages:${user.id}`, 20, 60);
  const data = await body(req, Schema);
  const analysis = await storedAnalysis(user.orgId, data.siren);
  if (!analysis) throw new HttpError(409, 'Analysez d’abord cette entreprise : le message s’appuie sur les constats de l’analyse.', 'not_analyzed');
  const count = data.mode === 'new' ? data.variants : 1;
  await consumeAiMessage(user.orgId, user.plan, count);
  const { offer } = await orgSettings(user.orgId);
  const ctx: MessageContext = {
    company: analysis.company,
    website: analysis.enrichment.website,
    signals: analysis.enrichment.signals,
    places: analysis.enrichment.places,
    service: data.service,
    senderName: offer.senderName || user.name,
    senderCompany: offer.senderCompany || user.orgName,
    offerDescription: offer.description,
  };
  let variants: string[] | null = null;
  let aiUsed = false;
  if (features.ai()) {
    const task =
      data.mode === 'shorten' && data.baseText
        ? `Raccourcis ce message d’environ 40 % sans perdre l’accroche ni l’appel à l’action, et sans ajouter de fait nouveau :\n"""${data.baseText}"""`
        : data.mode === 'retone' && data.baseText
          ? `Réécris ce message avec un ton ${TONES[data.tone].toLowerCase()}, sans ajouter de fait nouveau :\n"""${data.baseText}"""`
          : `Rédige ${count} variante(s) différente(s) de message de prospection, ton ${TONES[data.tone].toLowerCase()}, pour proposer : ${SERVICES.find((s) => s.id === data.service)?.label}.`;
    const res = await chatJson({
      kind: 'message',
      orgId: user.orgId,
      schema: AiSchema,
      system: `Tu rédiges des messages de prospection B2B en français pour un professionnel. ${GROUNDING_RULES}
- N'invente JAMAIS de relation préalable (pas de « suite à notre échange », « comme convenu », « nous nous sommes rencontrés »).
- Appuie l'accroche sur une seule observation tirée de « accroches_verifiees » si elle existe ; sinon reste général.
- Pas de flatterie excessive, pas de promesse chiffrée.
- ${CHANNEL_RULES[data.channel]}
Réponds en JSON : {"variants": [string, ...]}.`,
      user: `${task}\n\nFaits disponibles :\n${JSON.stringify(factsForAi(ctx))}`,
    });
    if (res) {
      variants = res.data.variants.slice(0, count).map((t) => fit(t.trim(), data.channel));
      aiUsed = true;
    }
  }
  if (!variants) {
    variants = templateMessages(ctx, data.channel, data.tone, count, data.mode === 'shorten');
  }
  for (const content of variants) {
    await q('insert into messages (org_id, user_id, siren, channel, tone, service, content, ai_used) values ($1, $2, $3, $4, $5, $6, $7, $8)', [user.orgId, user.id, data.siren, data.channel, data.tone, data.service, content, aiUsed]);
  }
  return ok({ variants, aiUsed, limit: LIMITS[data.channel], usage: await usageOf(user.orgId) });
});
