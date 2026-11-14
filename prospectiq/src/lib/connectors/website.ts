// Découverte et audit du site web d'une entreprise, à partir de sources publiques uniquement.
// Un site n'est dit « vérifié » que si le SIREN de l'entreprise y figure (mentions légales obligatoires).
import 'server-only';
import { parse, type HTMLElement } from 'node-html-parser';
import { safeGet, robotsAllows, networkHealthy, type FetchedPage } from './web';
import { logApi } from '../apilog';
import type { Company, Finding, WebsiteAudit } from './types';

const LEGAL_WORDS = new Set(['sarl', 'sas', 'sasu', 'eurl', 'sa', 'sci', 'snc', 'selarl', 'selas', 'ets', 'etablissements', 'societe', 'ste', 'et', 'de', 'des', 'du', 'la', 'le', 'les', 'l', 'd', 'en', 'au', 'aux', 'groupe', 'holding', 'france']);
const B2C_SECTORS = new Set(['restauration', 'hotellerie', 'bijouterie', 'sante', 'commerce', 'tourisme', 'immobilier', 'automobile']);
const BOOKING_SECTORS = new Set(['restauration', 'hotellerie', 'sante', 'tourisme']);
const GENERIC_MAILBOXES = /^(contact|info|infos|hello|bonjour|accueil|commercial|sales|admin|administration|reservation|reservations|booking|support|service|secretariat|cabinet|agence|boutique|shop|direction|compta|comptabilite|rh|recrutement|jobs|presse|communication|marketing|devis|sav|office|mail)$/i;

const strip = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' et ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** Domaines candidats à partir de la dénomination et des enseignes. */
export function candidateDomains(company: Pick<Company, 'name' | 'tradeNames'>): string[] {
  const names = [...company.tradeNames, company.name].filter(Boolean).slice(0, 3);
  const out: string[] = [];
  for (const n of names) {
    const words = strip(n)
      .split(' ')
      .filter((w) => w && !LEGAL_WORDS.has(w));
    if (!words.length) continue;
    const joined = words.join('');
    const hyphen = words.join('-');
    for (const base of [joined, hyphen]) {
      if (base.length < 3 || base.length > 40) continue;
      for (const tld of ['.fr', '.com']) out.push(`${base}${tld}`);
    }
  }
  return [...new Set(out)].slice(0, 6);
}

const sirenPattern = (siren: string) => new RegExp(siren.replace(/(\d{3})(\d{3})(\d{3})/, '$1[\\s.\\u00a0]?$2[\\s.\\u00a0]?$3'));

function textOf(root: HTMLElement) {
  return root.text.replace(/\s+/g, ' ');
}

function nameMatches(company: Pick<Company, 'name' | 'tradeNames'>, root: HTMLElement): boolean {
  const hay = strip(`${root.querySelector('title')?.text || ''} ${textOf(root).slice(0, 20000)}`);
  return [...company.tradeNames, company.name].some((n) => {
    const words = strip(n)
      .split(' ')
      .filter((w) => w.length > 2 && !LEGAL_WORDS.has(w));
    return words.length > 0 && words.every((w) => hay.includes(w));
  });
}

async function fetchHome(domain: string): Promise<FetchedPage | null> {
  for (const url of [`https://www.${domain}/`, `https://${domain}/`, `http://www.${domain}/`]) {
    const page = await safeGet(url).catch(() => null);
    if (page && page.status < 400 && /html/i.test(page.contentType || 'text/html')) return page;
  }
  return null;
}

function legalLinks(root: HTMLElement, base: string): string[] {
  const host = new URL(base).host;
  const urls = root
    .querySelectorAll('a[href]')
    .filter((a) => /mention|legal|l[ée]gal|cgv|cgu|conditions|a-propos|qui-sommes|contact/i.test(`${a.getAttribute('href')} ${a.text}`))
    .map((a) => {
      try {
        return new URL(a.getAttribute('href') || '', base).toString();
      } catch {
        return null;
      }
    })
    .filter((u): u is string => !!u && new URL(u).host === host);
  return [...new Set(urls)].slice(0, 3);
}

interface Discovery {
  status: WebsiteAudit['status'];
  page: FetchedPage | null;
  verification: string;
  tried: string[];
}

export async function discoverWebsite(company: Company, hint?: string | null): Promise<Discovery> {
  const tried: string[] = [];
  let probable: FetchedPage | null = null;
  const hinted = hint ? (() => {
    try {
      return new URL(hint).host.replace(/^www\./, '');
    } catch {
      return null;
    }
  })() : null;
  const domains = [...new Set([...(hinted ? [hinted] : []), ...candidateDomains(company)])];
  const sirenRe = sirenPattern(company.siren);
  const deadline = Date.now() + 20_000; // budget global : l'analyse doit tenir dans la durée d'une requête serverless
  let timedOut = false;
  for (const domain of domains) {
    if (Date.now() > deadline) {
      timedOut = true;
      break;
    }
    tried.push(domain);
    const home = await fetchHome(domain);
    if (!home) continue;
    const origin = new URL(home.url).origin;
    if (!(await robotsAllows(origin, '/'))) {
      return { status: 'blocked', page: null, verification: `Analyse refusée par le fichier robots.txt de ${domain}.`, tried };
    }
    const root = parse(home.text);
    if (sirenRe.test(textOf(root))) return { status: 'verified', page: home, verification: 'SIREN trouvé sur la page d’accueil du site.', tried };
    for (const link of legalLinks(root, home.url)) {
      const legal = await safeGet(link).catch(() => null);
      if (legal && legal.status < 400 && sirenRe.test(textOf(parse(legal.text)))) {
        return { status: 'verified', page: home, verification: 'SIREN trouvé dans les mentions légales du site.', tried };
      }
    }
    if (!probable && (domain === hinted || nameMatches(company, root))) probable = home;
  }
  if (probable) {
    return { status: 'probable', page: probable, verification: hinted && probable.url.includes(hinted) ? 'Site associé à l’établissement par Google, SIREN non retrouvé sur le site.' : 'Le nom de l’entreprise apparaît sur le site, mais le SIREN n’y a pas été trouvé : à confirmer.', tried };
  }
  if (timedOut) {
    return { status: 'unreachable', page: null, verification: `Délai d’analyse dépassé (sites trop lents à répondre ; domaines essayés : ${tried.join(', ')}). Aucune conclusion n’est tirée sur la présence en ligne.`, tried };
  }
  if (!(await networkHealthy())) {
    return { status: 'unreachable', page: null, verification: 'Analyse du site impossible pour le moment : le serveur n’accède pas à Internet. Aucune conclusion n’est tirée sur la présence en ligne.', tried };
  }
  return { status: 'not_found', page: null, verification: `Aucun site trouvé automatiquement (domaines essayés : ${tried.join(', ') || 'aucun'}). Cela ne prouve pas l’absence de site.`, tried };
}

const SOCIAL_PATTERNS: [keyof NonNullable<WebsiteAudit['socials']>, RegExp][] = [
  ['instagram', /https?:\/\/(?:www\.)?instagram\.com\/(?!p\/|reel\/|explore\/|accounts\/)([A-Za-z0-9_.]{2,30})/i],
  ['facebook', /https?:\/\/(?:www\.|m\.|fr-fr\.)?facebook\.com\/(?!sharer|share|dialog|plugins|tr\b)([A-Za-z0-9_.\-/]{2,80})/i],
  ['linkedin', /https?:\/\/(?:[a-z]{2,3}\.)?linkedin\.com\/(company|in|school)\/([A-Za-z0-9_\-%.]{2,80})/i],
  ['tiktok', /https?:\/\/(?:www\.)?tiktok\.com\/@([A-Za-z0-9_.]{2,30})/i],
  ['youtube', /https?:\/\/(?:www\.)?youtube\.com\/(?:@|c\/|channel\/|user\/)([A-Za-z0-9_\-.]{2,60})/i],
  ['x', /https?:\/\/(?:www\.)?(?:twitter|x)\.com\/(?!intent|share|home)([A-Za-z0-9_]{2,30})/i],
  ['pinterest', /https?:\/\/(?:[a-z]{2}\.)?pinterest\.[a-z.]+\/([A-Za-z0-9_]{2,30})/i],
];

const CMS: [string, RegExp][] = [
  ['WordPress', /wp-content|wp-includes|<meta[^>]+generator[^>]+wordpress/i],
  ['Wix', /static\.wixstatic\.com|wix\.com\/|X-Wix/i],
  ['Shopify', /cdn\.shopify\.com|Shopify\.theme/i],
  ['Squarespace', /squarespace\.com|static1\.squarespace/i],
  ['Webflow', /webflow\.(?:com|io)|data-wf-page/i],
  ['Jimdo', /jimdo|jimstatic/i],
  ['PrestaShop', /prestashop/i],
  ['Joomla', /<meta[^>]+generator[^>]+joomla/i],
  ['Drupal', /drupal-settings-json|<meta[^>]+generator[^>]+drupal/i],
  ['Site Google', /sites\.google\.com/i],
];

const ANALYTICS: [string, RegExp][] = [
  ['Google Analytics / Tag Manager', /googletagmanager\.com|google-analytics\.com|gtag\(/i],
  ['Meta Pixel', /connect\.facebook\.net\/[^"']+fbevents|fbq\(/i],
  ['Matomo', /matomo|piwik/i],
  ['Plausible', /plausible\.io/i],
  ['Hotjar', /hotjar\.com/i],
  ['LinkedIn Insight', /snap\.licdn\.com/i],
];

async function lastContent(root: HTMLElement, base: string): Promise<{ date: string | null; source: string | null }> {
  const dates: { d: Date; source: string }[] = [];
  const feed = root.querySelector('link[rel="alternate"][type="application/rss+xml"], link[rel="alternate"][type="application/atom+xml"]')?.getAttribute('href');
  if (feed) {
    const page = await safeGet(new URL(feed, base).toString(), { maxBytes: 600_000, accept: 'application/rss+xml,application/atom+xml,application/xml' }).catch(() => null);
    if (page && page.status < 400) {
      for (const m of page.text.matchAll(/<(?:pubDate|updated|published|dc:date)>([^<]{8,40})<\//g)) {
        const d = new Date(m[1].trim());
        if (!Number.isNaN(d.getTime())) dates.push({ d, source: 'flux RSS du site' });
      }
    }
  }
  const sitemap = await safeGet(new URL('/sitemap.xml', base).toString(), { maxBytes: 1_000_000, accept: 'application/xml,text/xml' }).catch(() => null);
  if (sitemap && sitemap.status < 400) {
    for (const m of sitemap.text.matchAll(/<lastmod>([^<]{8,40})<\/lastmod>/g)) {
      const d = new Date(m[1].trim());
      if (!Number.isNaN(d.getTime())) dates.push({ d, source: 'plan du site (sitemap)' });
    }
  }
  const now = Date.now() + 86400000;
  const best = dates.filter((x) => x.d.getTime() < now).sort((a, b) => b.d.getTime() - a.d.getTime())[0];
  return best ? { date: best.d.toISOString().slice(0, 10), source: best.source } : { date: null, source: null };
}

/** Analyse technique et marketing d'une page d'accueil déjà récupérée. */
export async function auditPage(page: FetchedPage, company: Pick<Company, 'sectorId'>): Promise<Omit<WebsiteAudit, 'status' | 'verification' | 'checkedAt'>> {
  const html = page.text;
  const root = parse(html);
  const text = textOf(root);
  const url = new URL(page.url);
  const meta = (name: string) => root.querySelector(`meta[name="${name}"], meta[property="${name}"]`)?.getAttribute('content')?.trim() || null;
  const hrefs = root.querySelectorAll('a[href]').map((a) => a.getAttribute('href') || '');

  const socials: WebsiteAudit['socials'] = {};
  for (const [key, re] of SOCIAL_PATTERNS) {
    const href = hrefs.find((h) => re.test(h));
    if (href) socials[key] = href.split('?')[0];
  }
  const phones = [...new Set([...hrefs.filter((h) => h.startsWith('tel:')).map((h) => decodeURIComponent(h.slice(4)).trim()), ...(text.match(/(?:\+33\s?|0)[1-9](?:[\s.-]?\d{2}){4}/g) || [])])].slice(0, 3);
  const emailSet = new Set<string>([...hrefs.filter((h) => h.startsWith('mailto:')).map((h) => decodeURIComponent(h.slice(7).split('?')[0]).trim().toLowerCase()), ...(text.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi) || []).map((e) => e.toLowerCase())]);
  const emails = [...emailSet]
    .filter((e) => /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(e) && !/\.(png|jpe?g|gif|webp|svg)$/.test(e) && !/example|domain|sentry|wixpress/.test(e))
    .map((address) => ({ address, kind: GENERIC_MAILBOXES.test(address.split('@')[0]) ? ('generique' as const) : ('nominative' as const) }))
    // Minimisation : les adresses nominatives (prenom.nom@…) sont des données personnelles, elles ne sont pas conservées.
    .filter((e) => e.kind === 'generique')
    .slice(0, 3);

  const copyrightYears = [...text.matchAll(/(?:©|copyright)\s*(?:\d{4}\s*[-–]\s*)?((?:19|20)\d{2})/gi)].map((m) => Number(m[1]));
  const copyrightYear = copyrightYears.length ? Math.max(...copyrightYears) : null;
  const cms = CMS.find(([, re]) => re.test(html))?.[0] || meta('generator')?.split(/[\s;]/)[0] || null;
  const analytics = ANALYTICS.filter(([, re]) => re.test(html)).map(([n]) => n);
  // Réservation / vente en ligne : uniquement des liens, boutons ou widgets (une phrase « réservations au 04… » ne suffit pas)
  const actions = root
    .querySelectorAll('a, button, form, iframe')
    .map((el) => `${el.getAttribute('href') || ''} ${el.getAttribute('action') || ''} ${el.getAttribute('src') || ''} ${el.text}`)
    .join(' ');
  const BOOKING_WIDGETS = /thefork|lafourchette|doctolib|planity|calendly|booking\.com|zenchef|guestonline|resengo|sevenrooms|opentable|treatwell|maiia|kiute/i;
  const booking = BOOKING_WIDGETS.test(html) || /r[ée]server|r[ée]servation|prendre (un )?rendez-vous|booking/i.test(actions);
  const ecommerce = /woocommerce|cdn\.shopify|prestashop|add-to-cart/i.test(html) || /ajouter au panier|\/cart\b|\/panier\b|checkout/i.test(actions);
  const content = await lastContent(root, page.url);

  const year = new Date().getFullYear();
  const findings: Finding[] = [];
  const add = (id: string, label: string, severity: Finding['severity'], services: string[]) => findings.push({ id, label, severity, services });
  const https = url.protocol === 'https:';
  const viewport = !!root.querySelector('meta[name="viewport"]');
  const title = root.querySelector('title')?.text.trim() || null;
  const description = meta('description');
  const h1 = root.querySelector('h1')?.text.replace(/\s+/g, ' ').trim() || null;
  const og = !!meta('og:title') || !!meta('og:image');
  const ld = !!root.querySelector('script[type="application/ld+json"]');
  if (!https) add('no_https', 'Le site n’est pas servi en HTTPS (connexion non sécurisée).', 'important', ['site_web', 'seo']);
  if (!viewport) add('no_viewport', 'Aucune balise d’adaptation mobile (viewport) détectée.', 'important', ['site_web']);
  if (page.ms > 3000) add('slow', `Réponse lente du serveur : ${(page.ms / 1000).toFixed(1).replace('.', ',')} s pour la page d’accueil.`, 'mineur', ['site_web', 'seo']);
  if (!title || title.length < 10) add('no_title', 'Titre de page absent ou très court.', 'mineur', ['seo']);
  if (!description) add('no_description', 'Pas de description pour les moteurs de recherche (meta description).', 'mineur', ['seo']);
  if (!h1) add('no_h1', 'Pas de titre principal (H1) sur la page d’accueil.', 'mineur', ['seo']);
  if (!og) add('no_og', 'Aperçu de partage non configuré (Open Graph).', 'mineur', ['reseaux_sociaux', 'site_web']);
  if (copyrightYear && copyrightYear <= year - 2) add('old_copyright', `Mention de copyright datée de ${copyrightYear} : signe d’un site peu mis à jour.`, 'important', ['site_web', 'contenu']);
  if (content.date && Date.now() - new Date(content.date).getTime() > 365 * 86400000) add('stale_content', `Dernier contenu daté du ${new Date(content.date).toLocaleDateString('fr-FR')} (${content.source}).`, 'important', ['contenu', 'seo', 'reseaux_sociaux']);
  if (!Object.keys(socials).length) add('no_socials', 'Aucun lien vers des réseaux sociaux sur la page d’accueil.', 'mineur', ['reseaux_sociaux']);
  else if (!socials.instagram && company.sectorId && B2C_SECTORS.has(company.sectorId)) add('no_instagram', 'Pas de compte Instagram relié depuis le site.', 'mineur', ['reseaux_sociaux', 'contenu']);
  if (!analytics.length) add('no_analytics', 'Aucun outil de mesure d’audience détecté.', 'info', ['publicite', 'conseil']);
  if (!ld) add('no_structured', 'Pas de données structurées (aide Google à présenter l’entreprise).', 'info', ['seo']);
  if (cms && ['Wix', 'Jimdo', 'Site Google'].includes(cms)) add('basic_builder', `Site réalisé avec un outil grand public (${cms}).`, 'info', ['site_web']);
  if (!booking && company.sectorId && BOOKING_SECTORS.has(company.sectorId)) add('no_booking', 'Pas de réservation ou prise de rendez-vous en ligne détectée.', 'mineur', ['site_web', 'crm']);

  const penalty = findings.reduce((s, f) => s + (f.severity === 'important' ? 18 : f.severity === 'mineur' ? 8 : 3), 0);
  return {
    url: page.url,
    https,
    statusCode: page.status,
    responseMs: page.ms,
    htmlKb: Math.round(page.bytes / 1024),
    title,
    metaDescription: description,
    h1,
    mobileViewport: viewport,
    openGraph: og,
    structuredData: ld,
    cms,
    analytics,
    copyrightYear,
    lastContentDate: content.date,
    lastContentSource: content.source,
    socials,
    phones,
    emails,
    booking,
    ecommerce,
    findings,
    quality: Math.max(0, Math.min(100, 100 - penalty)),
  };
}

export async function analyzeWebsite(company: Company, hint?: string | null, orgId?: string | null): Promise<WebsiteAudit> {
  const started = Date.now();
  const checkedAt = new Date().toISOString();
  try {
    const d = await discoverWebsite(company, hint);
    await logApi('web', 'discover', { ok: true, ms: Date.now() - started }, orgId);
    if (!d.page) return { status: d.status, url: null, verification: d.verification, checkedAt, candidatesTried: d.tried };
    const audit = await auditPage(d.page, company);
    return { status: d.status, verification: d.verification, checkedAt, candidatesTried: d.tried, ...audit };
  } catch (e) {
    await logApi('web', 'discover', { ok: false, ms: Date.now() - started, error: (e as Error).message }, orgId);
    return { status: 'unreachable', url: null, verification: 'L’analyse du site a échoué.', checkedAt };
  }
}
