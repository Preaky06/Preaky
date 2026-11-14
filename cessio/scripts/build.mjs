// Générateur de site statique, sans dépendance : src/ → dist/
// Usage : node scripts/build.mjs [--config chemin/vers/config.mjs] [--out dossier]
import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};
const configPath = resolve(arg('--config', join(ROOT, 'site.config.mjs')));
const OUT = resolve(arg('--out', join(ROOT, 'dist')));
const SRC = join(ROOT, 'src');

const config = (await import(pathToFileURL(configPath).href)).default;
const { billingStatus } = await import(pathToFileURL(join(ROOT, 'server/license.mjs')).href);

const siteUrl = String(process.env.SITE_URL || config.siteUrl || '').replace(/\/+$/, '');
const brand = config.brand.name;
const year = new Date().getFullYear();

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const get = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
const walk = (dir) => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));
const euro = (n) => `${Number.isInteger(n) ? n : n.toFixed(2).replace('.', ',')} €`;

const hash = createHash('sha1');
for (const f of [...walk(SRC), join(ROOT, 'server/license.mjs'), configPath].sort()) hash.update(readFileSync(f));
const VERSION = hash.digest('hex').slice(0, 10);

// ── Fragments ──
const logo = (size = 28) =>
  `<svg class="logo-mark" width="${size}" height="${size}" viewBox="0 0 32 32" aria-hidden="true"><rect x="2" y="2" width="28" height="28" rx="8" fill="var(--accent)"/><path d="M20.6 11.2a6.6 6.6 0 1 0 0 9.6" fill="none" stroke="var(--logo-ink)" stroke-width="3" stroke-linecap="round"/><circle cx="22.4" cy="16" r="1.9" fill="var(--logo-ink)"/></svg>`;

const check = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';

const header = () => `<header class="site-header">
  <div class="container header-inner">
    <a class="logo" href="/" aria-label="${esc(brand)} — accueil">${logo()}<span>${esc(brand)}</span></a>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav"><span class="sr-only">Menu</span><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
    <nav id="site-nav" class="site-nav" aria-label="Navigation principale">
      <a class="nav-link" href="/calculateur-prix-cession-droits-auteur">Calculateur</a>
      <a class="nav-link" href="/guide-cession-droits-auteur">Guide</a>
      <a class="nav-link" href="/tarifs">Tarifs</a>
      <a class="nav-link" href="/compte">Compte <span class="plan-badge" data-plan-badge>Gratuit</span></a>
      <a class="btn btn-primary btn-sm" href="/app">Ouvrir l’application</a>
    </nav>
  </div>
</header>`;

const footer = () => `<footer class="site-footer">
  <div class="container footer-grid">
    <div class="footer-brand">
      <a class="logo" href="/">${logo(24)}<span>${esc(brand)}</span></a>
      <p>${esc(config.brand.tagline)}</p>
      <p class="footer-privacy"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg> Vos contrats restent sur votre appareil.</p>
    </div>
    <div><h2>Produit</h2><ul><li><a href="/app">Application</a></li><li><a href="/calculateur-prix-cession-droits-auteur">Calculateur gratuit</a></li><li><a href="/tarifs">Tarifs</a></li><li><a href="/compte">Mon compte</a></li></ul></div>
    <div><h2>Ressources</h2><ul><li><a href="/guide-cession-droits-auteur">Guide de la cession</a></li><li><a href="mailto:${esc(config.contactEmail)}">Contact</a></li></ul></div>
    <div><h2>Légal</h2><ul><li><a href="/mentions-legales">Mentions légales</a></li><li><a href="/cgv">Conditions de vente</a></li><li><a href="/confidentialite">Confidentialité</a></li></ul></div>
  </div>
  <div class="container footer-bottom"><span>© ${year} ${esc(brand)}</span><span>Conçu en France pour les créatifs</span></div>
</footer>`;

const pricingCards = () => {
  const ids = Object.keys(config.plans);
  const paid = ids.filter((id) => id !== 'free');
  const first = config.plans[paid[0]];
  const saving = first.price.monthly ? Math.round((1 - first.price.yearly / (first.price.monthly * 12)) * 100) : 0;
  return `<div class="billing-toggle" role="group" aria-label="Période de facturation">
    <button type="button" class="active" data-period="monthly" aria-pressed="true">Mensuel</button>
    <button type="button" data-period="yearly" aria-pressed="false">Annuel${saving > 0 ? ` <span class="save">−${saving} %</span>` : ''}</button>
  </div>
  <div class="pricing-grid">${ids
    .map((id, i) => {
      const p = config.plans[id];
      const featured = i === 1;
      const priceBlock =
        id === 'free'
          ? '<div class="price"><span class="amount">0 €</span><span class="per">pour toujours</span></div>'
          : `<div class="price" data-price-monthly><span class="amount">${euro(p.price.monthly)}</span><span class="per">/ mois</span></div>
             <div class="price" data-price-yearly hidden><span class="amount">${euro(Math.round((p.price.yearly / 12) * 100) / 100)}</span><span class="per">/ mois</span><span class="billed">soit ${euro(p.price.yearly)} facturés par an</span></div>`;
      const cta = id === 'free' ? '<a class="btn btn-ghost btn-block" href="/app">Commencer gratuitement</a>' : `<a class="btn ${featured ? 'btn-accent' : 'btn-primary'} btn-block" data-checkout="${id}" href="/tarifs">Choisir ${esc(p.name)}</a>`;
      return `<article class="plan-card${featured ? ' featured' : ''}" data-plan="${id}">
        ${featured ? '<span class="plan-flag">Le plus choisi</span>' : ''}
        <h3>${esc(p.name)}</h3>
        ${priceBlock}
        ${cta}
        <ul class="features">${(p.features || []).map((f) => `<li>${check}<span>${esc(f)}</span></li>`).join('')}</ul>
      </article>`;
    })
    .join('')}</div>`;
};

const yes = '<span class="yes" aria-label="Inclus">✓</span>';
const no = '<span class="no" aria-label="Non inclus">—</span>';
const plansTable = () => {
  const ids = Object.keys(config.plans);
  const L = (id) => config.plans[id].limits;
  const rows = [
    ['Calculateur de prix de cession', ...ids.map(() => yes)],
    ['Contrat conforme au CPI (PDF)', ...ids.map(() => yes)],
    ['Récapitulatif client et clause de devis', ...ids.map(() => yes)],
    ['Contrats dans le registre', ...ids.map((id) => (L(id).maxContracts >= 100000 ? 'Illimité' : String(L(id).maxContracts)))],
    ['Sans mention « Généré avec »', ...ids.map((id) => (L(id).watermark ? no : yes))],
    ['Votre logo et votre couleur', ...ids.map((id) => (L(id).branding ? yes : no))],
    ['Export Word modifiable', ...ids.map((id) => (L(id).word ? yes : no))],
    ['Rappels d’échéance (agenda)', ...ids.map((id) => (L(id).ics ? yes : no))],
    ['Profils d’auteurs', ...ids.map((id) => String(L(id).profiles))],
    ['Export CSV du registre', ...ids.map((id) => (L(id).csv ? yes : no))],
    ['Appareils', ...ids.map((id) => (id === 'free' ? '1 navigateur' : String(config.plans[id].maxDevices)))],
  ];
  return `<div class="table-wrap"><table class="plans-table"><thead><tr><th scope="col">Fonctionnalité</th>${ids.map((id) => `<th scope="col">${esc(config.plans[id].name)}</th>`).join('')}</tr></thead><tbody>${rows
    .map(([label, ...cells]) => `<tr><th scope="row">${label}</th>${cells.map((c) => `<td>${c}</td>`).join('')}</tr>`)
    .join('')}</tbody></table></div>`;
};

const faqBlock = (faqs) => `<div class="faq">${faqs.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}</div>`;
const faqJsonLd = (faqs) =>
  JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) });

const PARTIALS = { 'pricing-cards': pricingCards, 'plans-table': plansTable };

function fill(html) {
  return html
    .replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (_, name) => {
      if (!PARTIALS[name]) throw new Error(`Fragment inconnu : ${name}`);
      return PARTIALS[name]();
    })
    .replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path) => {
      if (path === 'year') return String(year);
      const v = get(config, path);
      if (v === undefined || v === null || v === '') return `<mark class="todo">[à compléter dans site.config.mjs : ${esc(path)}]</mark>`;
      return esc(v);
    });
}
const fillRaw = (str) => String(str).replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path) => String(get(config, path) ?? ''));

function layout({ title, description, path, content, page = 'page', jsonLd = [], noindex = false }) {
  const fullTitle = title.includes(brand) ? title : `${title} — ${brand}`;
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description)}">
${noindex ? '<meta name="robots" content="noindex">' : ''}
${siteUrl ? `<link rel="canonical" href="${siteUrl}${path}">\n<meta property="og:url" content="${siteUrl}${path}">\n<meta property="og:image" content="${siteUrl}/assets/img/og.png">` : ''}
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(brand)}">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(description)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#f7f7fa" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#111117" media="(prefers-color-scheme: dark)">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/assets/img/icon-192.png">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="preload" href="/assets/vendor/fonts/inter-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/css/app.css">
<script type="module" src="/assets/js/app.mjs"></script>
${jsonLd.map((j) => `<script type="application/ld+json">${j.replace(/</g, '\\u003c')}</script>`).join('\n')}
</head>
<body data-page="${esc(page)}">
<a class="skip-link" href="#main">Aller au contenu</a>
${header()}
<main id="main">
${content}
</main>
${footer()}
<div class="toasts" aria-live="polite" aria-atomic="false"></div>
</body>
</html>
`;
}

function parsePage(file) {
  const raw = readFileSync(file, 'utf8');
  const m = raw.match(/^<!--meta\s*([\s\S]*?)-->\s*/);
  if (!m) throw new Error(`Front-matter manquant : ${file}`);
  return { meta: JSON.parse(m[1]), body: raw.slice(m[0].length) };
}

// ── Construction ──
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
cpSync(join(SRC, 'assets'), join(OUT, 'assets'), { recursive: true });
cpSync(join(SRC, 'static'), OUT, { recursive: true });
cpSync(join(ROOT, 'server/license.mjs'), join(OUT, 'assets/js/license-core.mjs'));

const status = billingStatus(config);
writeFileSync(
  join(OUT, 'assets/js/config.mjs'),
  `// Généré par scripts/build.mjs — ne pas modifier : édite site.config.mjs\nexport const VERSION = ${JSON.stringify(VERSION)};\nexport const BILLING_READY = ${status.configured};\nexport default ${JSON.stringify(config, null, 2)};\n`,
);

const pages = [];
for (const file of readdirSync(join(SRC, 'pages')).filter((f) => f.endsWith('.html'))) {
  const { meta, body } = parsePage(join(SRC, 'pages', file));
  meta.title = fillRaw(meta.title);
  meta.description = fillRaw(meta.description);
  if (meta.faqs) meta.faqs = meta.faqs.map((f) => ({ q: fillRaw(f.q), a: fillRaw(f.a) }));
  const name = file.replace(/\.html$/, '');
  const path = name === 'index' ? '/' : `/${name}`;
  const jsonLd = [];
  if (meta.faqs) jsonLd.push(faqJsonLd(meta.faqs));
  if (name === 'index') {
    jsonLd.push(JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebApplication', name: brand, applicationCategory: 'BusinessApplication', operatingSystem: 'Web', offers: Object.values(config.plans).map((p) => ({ '@type': 'Offer', name: p.name, price: p.price.monthly, priceCurrency: 'EUR' })) }));
  }
  const content = fill(body.replace('{{faq}}', meta.faqs ? faqBlock(meta.faqs) : ''));
  writeFileSync(join(OUT, `${name}.html`), layout({ ...meta, path, content, jsonLd }));
  if (!meta.noindex && name !== '404') pages.push(path);
}

const precache = [
  '/',
  '/app',
  '/calculateur-prix-cession-droits-auteur',
  ...walk(join(OUT, 'assets'))
    .map((f) => `/${relative(OUT, f).split('\\').join('/')}`)
    .filter((p) => !/LICENSE|\.map$|\/img\/og/.test(p)),
];
writeFileSync(join(OUT, 'sw.js'), readFileSync(join(SRC, 'sw.template.js'), 'utf8').replace('__VERSION__', VERSION).replace('__PRECACHE__', JSON.stringify(precache)));

if (siteUrl) {
  writeFileSync(join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map((p) => `  <url><loc>${siteUrl}${p}</loc></url>`).join('\n')}\n</urlset>\n`);
  writeFileSync(join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /app\n\nSitemap: ${siteUrl}/sitemap.xml\n`);
} else {
  writeFileSync(join(OUT, 'robots.txt'), 'User-agent: *\nAllow: /\nDisallow: /app\n');
}

console.log(`✓ Site généré dans ${relative(process.cwd(), OUT) || '.'} (${pages.length} pages indexables, version ${VERSION})`);
if (!status.configured) {
  console.log('ℹ Paiement pas encore configuré. Champs à remplir dans site.config.mjs :');
  for (const m of status.missing) console.log(`   - ${m}`);
}
if (!siteUrl) console.log('ℹ siteUrl vide : sitemap et balises canonical non générés.');
