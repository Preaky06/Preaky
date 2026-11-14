// Analyse rédigée à partir des seuls faits collectés (sans IA). Sert aussi de base et de garde-fou à l'IA.
import type { Company, PlaceInfo, Signal, WebsiteAudit } from './connectors/types';
import type { ScoreResult, Offer } from './scoring';
import { serviceEvidence } from './scoring';
import { serviceLabel, sectorById } from './sectors';

export interface Insights {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  opportunities: { service: string; reason: string }[];
  services: string[];
  rationale: string;
  caveats: string[];
}

const year = (iso: string | null) => (iso ? new Date(iso).getFullYear() : null);
const fmtDate = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString('fr-FR') : '');

export function displayName(c: Pick<Company, 'name' | 'tradeNames'>) {
  const raw = c.tradeNames[0] || c.name;
  if (raw !== raw.toUpperCase()) return raw;
  const keep = new Set(['SAS', 'SARL', 'SA', 'EURL', 'SASU', 'SCI', 'SNC', 'SELARL', 'BTP', 'IT', 'RH', 'TV', 'PME']);
  return raw
    .toLowerCase()
    .split(/(\s+|-|')/)
    .map((w) => {
      // Sigles conservés : SAS, S.A.A.M.P, (S.A.R.L.)…
      if (keep.has(w.toUpperCase()) || /^\(?([a-z]\.){2,}[a-z]?\.?\)?$/i.test(w)) return w.toUpperCase();
      const i = w.search(/\p{L}/u);
      return i < 0 ? w : w.slice(0, i) + w.charAt(i).toUpperCase() + w.slice(i + 1);
    })
    .join('');
}

export function buildInsights(company: Company, website: WebsiteAudit | null, signals: Signal[], places: PlaceInfo | null, score: ScoreResult, offer?: Partial<Offer> | null): Insights {
  const name = displayName(company);
  const sector = company.nafLabel || sectorById(company.sectorId || '')?.label || 'secteur non renseigné';
  const created = year(company.createdOn);
  const parts = [
    `${name} est ${company.legalForm ? `une ${company.legalForm.toLowerCase().startsWith('entrepreneur') ? 'entreprise individuelle' : company.legalForm}` : 'une entreprise'} du secteur « ${sector} »`,
    created ? `créée en ${created}` : null,
    company.city ? `implantée à ${company.city.charAt(0) + company.city.slice(1).toLowerCase()}` : null,
  ].filter(Boolean);
  let summary = `${parts.join(', ')}.`;
  if (company.employeesLabel) summary += ` Effectif déclaré : ${company.employeesLabel.toLowerCase()}.`;
  if ((company.establishments || 0) > 1) summary += ` ${company.establishments} établissements ouverts.`;
  if (website?.status === 'verified' || website?.status === 'probable') summary += ` Site web ${website.status === 'verified' ? 'vérifié' : 'probable'} : ${website.url}.`;
  else if (website?.status === 'not_found') summary += ' Aucun site web trouvé automatiquement.';

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  if (created && new Date().getFullYear() - created >= 10) strengths.push(`Entreprise établie depuis ${new Date().getFullYear() - created} ans.`);
  if ((company.establishments || 0) > 1) strengths.push(`Plusieurs établissements (${company.establishments}).`);
  if (company.labels.length) strengths.push(`Labels ou certifications : ${company.labels.join(', ')}.`);
  if ((company.finances?.revenue ?? 0) > 0) strengths.push(`Chiffre d’affaires publié de ${Math.round(company.finances!.revenue! / 1000).toLocaleString('fr-FR')} k€ en ${company.finances!.year}.`);
  if (website?.findings) {
    if (website.https && website.mobileViewport) strengths.push('Site sécurisé (HTTPS) et adapté au mobile.');
    const socials = Object.keys(website.socials || {});
    if (socials.length) strengths.push(`Réseaux sociaux reliés au site : ${socials.map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(', ')}.`);
    if (website.lastContentDate && Date.now() - new Date(website.lastContentDate).getTime() < 180 * 86400000) strengths.push(`Contenu récent publié (${fmtDate(website.lastContentDate)}).`);
    if (website.booking) strengths.push('Réservation ou prise de rendez-vous en ligne.');
    for (const f of website.findings.filter((x) => x.severity !== 'info')) weaknesses.push(f.label);
  } else if (website?.status === 'not_found') {
    weaknesses.push('Aucune présence web trouvée automatiquement (à vérifier avant de l’affirmer au prospect).');
  }
  if (places?.matched && places.rating != null) {
    const r = String(places.rating).replace('.', ',');
    if (places.rating >= 4.5 && (places.reviews || 0) >= 20) strengths.push(`Bonne réputation en ligne : ${r}/5 sur ${places.reviews} avis Google.`);
    else if (places.rating < 4 && (places.reviews || 0) >= 10) weaknesses.push(`Note Google de ${r}/5 sur ${places.reviews} avis.`);
  }
  for (const s of signals.filter((x) => x.kind === 'risk')) weaknesses.push(`${s.label}${s.date ? ` (${fmtDate(s.date)})` : ''}.`);

  // Chaque opportunité cite les faits qui la justifient : jamais de lacune supposée.
  const evidence = serviceEvidence(website, signals, places);
  const offered = new Set(offer?.services || []);
  const ordered = [...score.neededServices].filter((s) => evidence[s]?.length).sort((a, b) => Number(offered.has(b)) - Number(offered.has(a)));
  const opportunities = ordered.slice(0, 5).map((s) => ({ service: serviceLabel(s), reason: evidence[s].slice(0, 2).join(' ') }));

  const top = score.criteria.slice().sort((a, b) => b.points - a.points)[0];
  const rationale =
    score.flags.includes('risk')
      ? 'Prospection déconseillée pour le moment : une procédure ou une cessation a été publiée récemment.'
      : `${score.category.label} (${score.total}/100, confiance ${score.confidence}). Point le plus contributif : ${top.label.toLowerCase()}. ${top.reasons[0] || ''}`.trim();

  const caveats: string[] = [];
  if (website?.status === 'unreachable' || website?.status === 'blocked') caveats.push(`Site web non analysé : ${website.verification}`);
  else if (score.preliminary) caveats.push('Score préliminaire : le site web n’a pas encore été analysé.');
  if (website?.status === 'probable') caveats.push('Le site web n’a pas pu être rattaché formellement à l’entreprise (SIREN absent du site).');
  if (!places) caveats.push('Avis clients non consultés (connecteur Google Places non configuré).');
  caveats.push('L’activité réelle sur Instagram et les autres réseaux n’est pas mesurée sans connecteur dédié.');

  return { summary, strengths, weaknesses, opportunities, services: score.neededServices, rationale, caveats };
}
