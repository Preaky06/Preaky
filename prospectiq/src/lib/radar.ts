// Radar : veille quotidienne.
//  1. Alertes de zone : annonces BODACC récentes dans la zone d'une recherche, filtrées par secteur (SIRENE).
//  2. Portefeuille : nouvelles annonces concernant les entreprises suivies dans le CRM (opportunité ou risque).
// Chaque événement devient une notification dédoublonnée ; un résumé e-mail est envoyé selon la préférence.
import 'server-only';
import { q, one } from './db';
import { env } from './env';
import { sendMail } from './mail';
import { bodaccInZone, bodaccSignals } from './connectors/bodacc';
import { getCompany } from './connectors/sirene';
import { storeCompany } from './analysis';
import { displayName } from './insights';
import { zoneOf, matchesCriteria, activityMatches, type RadarCriteria } from './radar-zone';
import type { Signal } from './connectors/types';

/** Nombre maximal d'entreprises vérifiées dans SIRENE par alerte et par passage (limite de débit de l'API publique). */
export const MAX_LOOKUPS = 40;

const day = (d: Date) => d.toISOString().slice(0, 10);
const fmt = (iso: string | null | undefined) => (iso ? new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString('fr-FR') : '');
const cityLabel = (city: string | null | undefined) => (city ? city.charAt(0) + city.slice(1).toLowerCase() : '');

async function notify(orgId: string, n: { kind: string; siren?: string | null; searchId?: string | null; title: string; detail?: string | null; url?: string | null; sourceUrl?: string | null; eventDate?: string | null; key: string }) {
  const rows = await q<{ id: string }>(
    `insert into notifications (org_id, kind, siren, search_id, title, detail, url, source_url, event_date, dedupe_key)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) on conflict (org_id, dedupe_key) do nothing returning id`,
    [orgId, n.kind, n.siren || null, n.searchId || null, n.title, n.detail || null, n.url || null, n.sourceUrl || null, n.eventDate || null, n.key],
  );
  return rows.length;
}

const ZONE_TITLE: Record<string, string> = {
  creation: 'Nouvelle entreprise',
  immatriculation: 'Nouvel établissement',
  vente: 'Cession de fonds de commerce',
};

/** Passage d'une alerte de zone. Retourne le nombre de nouvelles notifications. */
export async function checkSearchAlert(orgId: string, search: { id: string; name: string | null; params: RadarCriteria; alert_checked_at: Date | null }) {
  const zone = zoneOf(search.params);
  if (!zone) return { created: 0, examined: 0 };
  const since = day(new Date(Math.max(Date.now() - 14 * 86400000, (search.alert_checked_at?.getTime() ?? Date.now() - 7 * 86400000) - 2 * 86400000)));
  const items = (await bodaccInZone(zone.departments, since, orgId, { postalCode: zone.postalCode })).filter((a) => !zone.postalCode || a.cp === zone.postalCode);
  const seen = new Set<string>();
  const unique = items.filter((a) => (seen.has(a.siren) ? false : (seen.add(a.siren), true)));
  // Pré-tri par l'activité déclarée : écarte les annonces d'un autre secteur, vérifie d'abord celles qui correspondent.
  const ranked = unique
    .map((a) => ({ a, m: activityMatches(a.activity, search.params.sector) }))
    .filter((x) => x.m !== false)
    .sort((x, y) => Number(y.m === true) - Number(x.m === true));
  const latest = ranked.map((x) => x.a).slice(0, MAX_LOOKUPS);
  const suppressed = new Set((await q<{ siren: string }>('select siren from suppressions where siren = any($1::text[])', [latest.map((a) => a.siren)])).map((r) => r.siren));
  let created = 0;
  for (const a of latest) {
    if (suppressed.has(a.siren)) continue;
    const company = await getCompany(a.siren, orgId).catch(() => null);
    if (!company || !matchesCriteria(company, search.params)) continue;
    await storeCompany(company);
    const signal = a.signals[0];
    const title = `${ZONE_TITLE[a.family] || signal.label} : ${displayName(company)}`;
    created += await notify(orgId, {
      kind: 'zone',
      siren: a.siren,
      searchId: search.id,
      title,
      detail: [company.nafLabel, [cityLabel(company.city || a.city), a.cp ? `(${a.cp})` : ''].filter(Boolean).join(' '), `publié au BODACC le ${fmt(a.date)}`].filter(Boolean).join(' · '),
      url: `/app/entreprise/${a.siren}`,
      sourceUrl: a.url,
      eventDate: a.date,
      key: `zone:${a.siren}:${a.family}:${a.date}`,
    });
  }
  await q('update searches set alert_checked_at = now() where id = $1', [search.id]);
  return { created, examined: latest.length };
}

/** Nouvelles annonces sur les entreprises du portefeuille (prospects et clients suivis). */
export async function checkPortfolio(orgId: string) {
  const rows = await q<{ siren: string; created_at: Date; status: string; data: { name: string; tradeNames: string[] } }>(
    `select p.siren, p.created_at, p.status, c.data from prospects p join companies c on c.siren = p.siren where p.org_id = $1 order by p.updated_at desc limit 300`,
    [orgId],
  );
  let created = 0;
  for (let i = 0; i < rows.length; i += 30) {
    const chunk = rows.slice(i, i + 30);
    let signals: Record<string, Signal[]>;
    try {
      signals = await bodaccSignals(chunk.map((r) => r.siren), orgId);
    } catch {
      continue;
    }
    for (const r of chunk) {
      // Seules les annonces publiées après l'ajout au portefeuille (et datant de moins de 60 jours) sont signalées.
      const floor = Math.max(r.created_at.getTime() - 86400000, Date.now() - 60 * 86400000);
      for (const s of signals[r.siren] || []) {
        if (!s.date || new Date(s.date).getTime() < floor) continue;
        const name = displayName({ name: r.data.name, tradeNames: r.data.tradeNames || [] });
        const risk = s.kind === 'risk';
        created += await notify(orgId, {
          kind: risk ? 'risk' : 'signal',
          siren: r.siren,
          title: `${risk ? 'Alerte risque' : 'Signal'} : ${name}`,
          detail: `${s.label} · publié au BODACC le ${fmt(s.date)}${risk ? (r.status === 'client' ? ' · vérifiez vos créances en cours' : ' · prospection déconseillée') : ' · bon moment pour (re)prendre contact'}`,
          url: `/app/entreprise/${r.siren}`,
          sourceUrl: s.url || null,
          eventDate: s.date,
          key: `sig:${r.siren}:${s.id}`,
        });
      }
    }
  }
  return { created, watched: rows.length };
}

/** Passage complet du Radar pour une organisation. */
export async function runRadar(orgId: string) {
  const searches = await q<{ id: string; name: string | null; params: RadarCriteria; alert_checked_at: Date | null }>(
    'select id, name, params, alert_checked_at from searches where org_id = $1 and alert = true order by alert_checked_at nulls first limit 30',
    [orgId],
  );
  let created = 0;
  let examined = 0;
  for (const s of searches) {
    const r = await checkSearchAlert(orgId, s).catch(() => ({ created: 0, examined: 0 }));
    created += r.created;
    examined += r.examined;
  }
  const p = await checkPortfolio(orgId).catch(() => ({ created: 0, watched: 0 }));
  await q('update orgs set radar_checked_at = now() where id = $1', [orgId]);
  return { created: created + p.created, alerts: searches.length, examined, watched: p.watched };
}

/** Résumé e-mail des nouveautés non lues, selon la fréquence choisie (quotidien, hebdomadaire, aucun). */
export async function sendDigest(orgId: string, { force = false } = {}) {
  const org = await one<{ digest: string; digest_sent_at: Date | null; name: string }>('select digest, digest_sent_at, name from orgs where id = $1', [orgId]);
  if (!org || org.digest === 'aucun') return { sent: 0 };
  const last = org.digest_sent_at?.getTime() ?? 0;
  const due = force || Date.now() - last >= (org.digest === 'quotidien' ? 20 : 6.5 * 24) * 3600000;
  if (!due) return { sent: 0 };
  const items = await q<{ title: string; detail: string | null; url: string | null }>(
    `select title, detail, url from notifications where org_id = $1 and read_at is null and created_at > coalesce($2, now() - interval '7 days') order by created_at desc limit 30`,
    [orgId, org.digest_sent_at],
  );
  if (!items.length) return { sent: 0 };
  const users = await q<{ email: string; name: string }>('select email, name from users where org_id = $1 and disabled_at is null', [orgId]);
  const base = env.appUrl.replace(/\/$/, '');
  const lines = items.map((n) => `• ${n.title}${n.detail ? `\n  ${n.detail}` : ''}${n.url ? `\n  ${base}${n.url}` : ''}`).join('\n\n');
  const subject = `Radar Pro Spectre : ${items.length} nouveauté${items.length > 1 ? 's' : ''} à traiter`;
  for (const u of users) {
    await sendMail(
      u.email,
      subject,
      `Bonjour ${u.name || ''},\n\nVotre Radar a repéré ${items.length} nouveauté${items.length > 1 ? 's' : ''} :\n\n${lines}\n\nTout voir : ${base}/app/radar\nModifier la fréquence de ce résumé : ${base}/app/radar#reglages\n\nPro Spectre`,
    );
  }
  await q('update orgs set digest_sent_at = now() where id = $1', [orgId]);
  return { sent: users.length };
}
