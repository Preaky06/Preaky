// Générateur de messages de prospection.
// Mode IA (si configuré) ou mode modèles, toujours à partir de faits vérifiés, sans relation préalable inventée.
import { displayName } from './insights';
import { serviceLabel } from './sectors';
import type { Company, Signal, WebsiteAudit, PlaceInfo } from './connectors/types';

export const CHANNELS = { email: 'E-mail', linkedin: 'LinkedIn', instagram: 'Instagram', court: 'Message commercial court' } as const;
export const TONES = { professionnel: 'Professionnelle', direct: 'Directe', naturel: 'Naturelle', premium: 'Premium', persuasif: 'Persuasive' } as const;
export type Channel = keyof typeof CHANNELS;
export type Tone = keyof typeof TONES;

export const LIMITS: Record<Channel, number> = { email: 1400, linkedin: 300, instagram: 600, court: 280 };

export interface MessageContext {
  company: Company;
  website: WebsiteAudit | null;
  signals: Signal[];
  places: PlaceInfo | null;
  service: string;
  senderName?: string;
  senderCompany?: string;
  offerDescription?: string;
}

/** Observations vérifiables utilisables comme accroche, de la plus forte à la plus faible. */
export function hooks(ctx: MessageContext): string[] {
  const out: string[] = [];
  const w = ctx.website;
  const recent = ctx.signals.filter((s) => s.kind === 'opportunity' && s.date && Date.now() - new Date(s.date).getTime() < 365 * 86400000);
  for (const s of recent) {
    if (/création/i.test(s.label)) out.push('j’ai vu passer l’annonce de création de votre entreprise au BODACC');
    else if (/vente|cession/i.test(s.label)) out.push('j’ai vu que votre fonds de commerce a récemment changé de mains');
    else if (/nom|enseigne/i.test(s.label)) out.push('j’ai vu que vous aviez récemment changé de nom ou d’enseigne');
    else if (/transfert/i.test(s.label)) out.push('j’ai vu que vous aviez récemment changé d’adresse');
    else if (/dirigeant/i.test(s.label)) out.push('j’ai vu qu’il y avait eu récemment un changement à la direction de votre entreprise');
  }
  if (w?.status === 'not_found') out.push('je n’ai pas trouvé de site internet à votre nom');
  for (const f of w?.findings || []) {
    if (f.id === 'no_instagram') out.push('votre site ne renvoie vers aucun compte Instagram');
    if (f.id === 'old_copyright' && w?.copyrightYear) out.push(`votre site affiche encore une mention © ${w.copyrightYear}`);
    if (f.id === 'no_viewport') out.push('votre site ne semble pas adapté à l’affichage sur mobile');
    if (f.id === 'stale_content') out.push('les dernières actualités de votre site datent de plus d’un an');
    if (f.id === 'no_https') out.push('votre site n’est pas encore en connexion sécurisée (HTTPS)');
    if (f.id === 'no_socials') out.push('votre site ne mentionne pas vos réseaux sociaux');
    if (f.id === 'no_booking') out.push('je n’ai pas trouvé de réservation en ligne sur votre site');
  }
  if (ctx.places?.matched && ctx.places.rating != null && ctx.places.rating >= 4.5 && (ctx.places.reviews || 0) >= 20) out.push(`vos clients vous attribuent ${String(ctx.places.rating).replace('.', ',')}/5 sur Google`);
  return [...new Set(out)];
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Rédaction par modèles (sans IA). Variantes déterministes, même entrée = même sortie. */
export function templateMessages(ctx: MessageContext, channel: Channel, tone: Tone, count = 3, short = false): string[] {
  const name = displayName(ctx.company);
  const svc = serviceLabel(ctx.service).toLowerCase();
  const me = ctx.senderName ? `${ctx.senderName}${ctx.senderCompany ? `, ${ctx.senderCompany}` : ''}` : ctx.senderCompany || '';
  const list = hooks(ctx);
  const hook = (i: number) => list[i % Math.max(1, list.length)] || null;
  const city = ctx.company.city ? ctx.company.city.charAt(0) + ctx.company.city.slice(1).toLowerCase() : null;
  const sector = ctx.company.nafLabel ? ctx.company.nafLabel.toLowerCase() : 'votre secteur';
  const greet = { professionnel: 'Bonjour', direct: 'Bonjour', naturel: 'Bonjour', premium: 'Madame, Monsieur', persuasif: 'Bonjour' }[tone];
  const intros = [
    (h: string | null) => (h ? `En m’intéressant à ${name}, ${h}.` : `En m’intéressant aux entreprises de ${sector}${city ? ` à ${city}` : ''}, j’ai découvert ${name}.`),
    (h: string | null) => (h ? `${cap(h)}, et je me suis permis de vous écrire.` : `Je me permets de vous contacter au sujet de ${name}.`),
    (h: string | null) => (h ? `Petite observation au sujet de ${name} : ${h}.` : `Je travaille avec des entreprises de ${sector}${city ? ` autour de ${city}` : ''}.`),
  ];
  const values: Record<Tone, string[]> = {
    professionnel: [`J’accompagne les entreprises de votre secteur en ${svc}.`, `Mon activité : ${svc}, pour des structures comme la vôtre.`, `Je propose un accompagnement en ${svc}.`],
    direct: [`Je fais de la ${svc}.`, `Mon métier : ${svc}.`, `Je m’occupe de ${svc}.`],
    naturel: [`Je travaille sur la ${svc} pour des entreprises comme la vôtre, et j’ai pensé que cela pourrait vous être utile.`, `Mon quotidien, c’est la ${svc} : j’aime aider des entreprises comme la vôtre à mieux se faire connaître.`, `J’aide des entreprises proches de la vôtre sur la ${svc}.`],
    premium: [`Nous accompagnons des maisons exigeantes dans leur ${svc}.`, `Notre studio conçoit des dispositifs de ${svc} sur mesure.`, `Nous mettons notre savoir-faire en ${svc} au service d’entreprises qui soignent leur image.`],
    persuasif: [`Une ${svc} bien pensée peut vous apporter davantage de demandes, sans effort supplémentaire de votre part.`, `C’est souvent un levier simple pour gagner en visibilité auprès de nouveaux clients.`, `Les entreprises qui investissent dans la ${svc} gagnent généralement en visibilité locale.`],
  };
  const ctas: Record<Tone, string[]> = {
    professionnel: ['Seriez-vous disponible pour un échange de 15 minutes cette semaine ?', 'Puis-je vous proposer un court échange pour en parler ?', 'Souhaitez-vous que je vous présente quelques pistes concrètes ?'],
    direct: ['Un appel de 10 minutes ?', 'On en parle ?', 'Intéressé(e) ?'],
    naturel: ['Est-ce que ça vous dirait d’en discuter quelques minutes ?', 'Si le sujet vous parle, je serais ravi(e) d’échanger.', 'Dites-moi si vous voulez qu’on en parle.'],
    premium: ['Je serais honoré(e) de vous présenter notre approche lors d’un rendez-vous.', 'Accepteriez-vous un court entretien pour en parler ?', 'Je reste à votre disposition pour un échange à votre convenance.'],
    persuasif: ['Je peux vous montrer en 15 minutes ce que cela donnerait pour vous : quand êtes-vous disponible ?', 'Voulez-vous que je vous prépare une proposition sans engagement ?', 'Un échange rapide suffit pour voir si cela vaut le coup : partant(e) ?'],
  };
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const intro = intros[i % intros.length](hook(i));
    const value = values[tone][i % 3];
    const cta = ctas[tone][i % 3];
    let text: string;
    if (channel === 'email') {
      const subject = list.length ? `${name} : une idée pour votre ${ctx.service === 'site_web' ? 'site' : 'visibilité'}` : `${cap(svc)} pour ${name}`;
      const body = short ? [`${greet},`, intro, value, cta] : [`${greet},`, intro, value, ctx.offerDescription ? ctx.offerDescription.trim() : null, cta];
      text = `Objet : ${subject}\n\n${body.filter(Boolean).join('\n\n')}\n\n${me ? `Bien cordialement,\n${me}` : 'Bien cordialement,'}\n\nSi vous ne souhaitez pas être recontacté(e), répondez simplement « stop ».`;
    } else if (channel === 'linkedin') {
      text = `${greet}, ${intro.charAt(0).toLowerCase() + intro.slice(1)} ${value} ${cta}`;
    } else if (channel === 'instagram') {
      text = `${greet} ! ${intro} ${value} ${cta}${me ? ` — ${me}` : ''}`;
    } else {
      text = `${greet}, ${hook(i) ? `${hook(i)}. ` : ''}${value} ${ctas[tone][i % 3]}`;
    }
    out.push(fit(text, channel));
  }
  return [...new Set(out)];
}

/** Respecte la longueur maximale du canal en coupant proprement à la phrase. */
export function fit(text: string, channel: Channel): string {
  const max = LIMITS[channel];
  if (text.length <= max) return text;
  const sentences = text.split(/(?<=[.!?])\s+/);
  let out = '';
  for (const s of sentences) {
    if ((out ? `${out} ${s}` : s).length > max) break;
    out = out ? `${out} ${s}` : s;
  }
  return out || text.slice(0, max - 1) + '…';
}

/** Faits transmis à l'IA : uniquement des données sourcées. */
export function factsForAi(ctx: MessageContext) {
  return {
    entreprise: { nom: displayName(ctx.company), secteur: ctx.company.nafLabel || 'Non renseigné', ville: ctx.company.city || 'Non renseigné', creation: ctx.company.createdOn || 'Non renseigné', effectif: ctx.company.employeesLabel || 'Non renseigné' },
    site: ctx.website
      ? { statut: ctx.website.status, url: ctx.website.url || 'Non renseigné', constats: (ctx.website.findings || []).map((f) => ({ constat: f.label, verified: true })), reseaux: Object.keys(ctx.website.socials || {}) }
      : 'Non analysé',
    signaux: ctx.signals.map((s) => ({ libelle: s.label, date: s.date || 'Non renseigné', source: s.source, verified: s.verified })),
    avis: ctx.places?.matched ? { note: ctx.places.rating ?? 'Non renseigné', nombre: ctx.places.reviews ?? 'Non renseigné' } : 'Non renseigné',
    accroches_verifiees: hooks(ctx),
    expediteur: { nom: ctx.senderName || 'Non renseigné', societe: ctx.senderCompany || 'Non renseigné', service: serviceLabel(ctx.service), presentation: ctx.offerDescription || 'Non renseigné' },
  };
}
