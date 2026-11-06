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
const { TOOLS, iconSvg } = await import(pathToFileURL(join(SRC, 'assets/js/tools.mjs')).href);
const { TOOL_PAGES } = await import(pathToFileURL(join(SRC, 'content/tool-pages.mjs')).href);
const { billingStatus } = await import(pathToFileURL(join(ROOT, 'server/license.mjs')).href);

const siteUrl = String(process.env.SITE_URL || config.siteUrl || '').replace(/\/+$/, '');
const brand = config.brand.name;
const year = new Date().getFullYear();

// ── utilitaires ──────────────────────────────────────────────────────────────
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const get = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
const walk = (dir) => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));
const euro = (n) => `${Number.isInteger(n) ? n : n.toFixed(2).replace('.', ',')} €`;

const hash = createHash('sha1');
for (const f of [...walk(SRC), join(ROOT, 'server/license.mjs'), configPath].sort()) hash.update(readFileSync(f));
const VERSION = hash.digest('hex').slice(0, 10);

// ── fragments ────────────────────────────────────────────────────────────────
const logo = (size = 28) => `<svg class="logo-mark" width="${size}" height="${size}" viewBox="0 0 32 32" aria-hidden="true"><path d="M8 2.5h11.5L28 11v15.5a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3v-21a3 3 0 0 1 3-3z" fill="var(--accent)"/><path d="M19.5 2.5V9a2 2 0 0 0 2 2H28" fill="none" stroke="var(--logo-fold)" stroke-width="2" stroke-linejoin="round"/><path d="M10.5 18.5h11M10.5 23.5h7" stroke="var(--logo-ink)" stroke-width="2.6" stroke-linecap="round"/></svg>`;

const toolLink = (t) => `<a class="mega-item" href="/${t.slug}">${iconSvg(t, 20)}<span><strong>${esc(t.name)}</strong><small>${esc(t.short)}</small></span></a>`;

const isFreeTool = (id) => {
  const tools = config.plans.free.limits.tools;
  return tools === 'all' || tools.includes(id);
};

const toolsGrid = () => `<div class="tool-grid">${TOOLS.map(
  (t) => `<a class="tool-card" href="/${t.slug}"><span class="tool-icon">${iconSvg(t, 26)}</span><span class="tool-card-body"><strong>${esc(t.name)}</strong><span>${esc(t.short)}</span></span>${isFreeTool(t.id) ? '<span class="pill pill-free">Gratuit</span>' : '<span class="pill pill-pro">Pro</span>'}</a>`,
).join('')}</div>`;

const header = () => `<header class="site-header">
  <div class="container header-inner">
    <a class="logo" href="/" aria-label="${esc(brand)} — accueil">${logo()}<span>${esc(brand)}</span></a>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav"><span class="sr-only">Menu</span><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
    <nav id="site-nav" class="site-nav" aria-label="Navigation principale">
      <div class="nav-group">
        <button class="nav-link nav-tools-btn" type="button" aria-expanded="false" aria-controls="mega">Outils <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>
        <div class="mega" id="mega">${TOOLS.map(toolLink).join('')}</div>
      </div>
      <a class="nav-link" href="/tarifs">Tarifs</a>
      <a class="nav-link" href="/compte">Compte <span class="plan-badge" data-plan-badge>Gratuit</span></a>
      <a class="btn btn-primary btn-sm" href="/tarifs" data-free-only>Passer à Pro</a>
    </nav>
  </div>
</header>`;

const footer = () => `<footer class="site-footer">
  <div class="container footer-grid">
    <div class="footer-brand">
      <a class="logo" href="/">${logo(24)}<span>${esc(brand)}</span></a>
      <p>${esc(config.brand.tagline)}</p>
      <p class="footer-privacy"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg> Traitement 100 % local, aucun fichier téléversé.</p>
    </div>
    <div><h2>Outils</h2><ul>${TOOLS.map((t) => `<li><a href="/${t.slug}">${esc(t.name)}</a></li>`).join('')}</ul></div>
    <div><h2>Produit</h2><ul><li><a href="/tarifs">Tarifs</a></li><li><a href="/compte">Mon compte</a></li><li><a href="mailto:${esc(config.contactEmail)}">Contact</a></li></ul></div>
    <div><h2>Légal</h2><ul><li><a href="/mentions-legales">Mentions légales</a></li><li><a href="/cgv">Conditions de vente</a></li><li><a href="/confidentialite">Confidentialité</a></li></ul></div>
  </div>
  <div class="container footer-bottom"><span>© ${year} ${esc(brand)}</span><span>Fait en France · Fonctionne hors ligne</span></div>
</footer>`;

const check = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';

function planFeatures(id) {
  const p = config.plans[id];
  const l = p.limits;
  const freeTools = TOOLS.filter((t) => isFreeTool(t.id)).length;
  if (id === 'free') {
    return [
      `${freeTools} outils essentiels : fusionner, organiser, diviser, images → PDF`,
      `Jusqu’à ${l.maxFiles} fichiers par fusion`,
      `Fichiers jusqu’à ${l.maxFileMB} Mo`,
      '100 % local, sans inscription',
    ];
  }
  const list = [
    id === 'pro' ? `Les ${TOOLS.length} outils, dont compresser, signer, filigrane, numéroter, PDF → images` : 'Tout le plan Pro, plus :',
    `Fichiers jusqu’à ${l.maxFileMB >= 1000 ? `${l.maxFileMB / 1000} Go` : `${l.maxFileMB} Mo`}`,
    `Jusqu’à ${l.maxFiles} fichiers par opération`,
  ];
  if (l.batch) list.push('Traitement par lots : des dizaines de PDF en un clic, résultat en ZIP');
  list.push(`${p.maxDevices} appareils${id === 'business' ? ' — idéal pour une équipe' : ''}`);
  list.push(id === 'business' ? 'Support prioritaire' : 'Support par e-mail');
  list.push('Facture conforme, TVA gérée');
  return list;
}

const pricingCards = () => {
  const ids = Object.keys(config.plans);
  return `<div class="billing-toggle" role="group" aria-label="Période de facturation">
    <button type="button" class="active" data-period="monthly" aria-pressed="true">Mensuel</button>
    <button type="button" data-period="yearly" aria-pressed="false">Annuel <span class="save">−${Math.round((1 - config.plans.pro.price.yearly / (config.plans.pro.price.monthly * 12)) * 100)} %</span></button>
  </div>
  <div class="pricing-grid">${ids
    .map((id) => {
      const p = config.plans[id];
      const featured = id === 'pro';
      const monthlyEq = p.price.yearly ? p.price.yearly / 12 : 0;
      const priceBlock =
        id === 'free'
          ? `<div class="price"><span class="amount">0 €</span><span class="per">pour toujours</span></div>`
          : `<div class="price" data-price-monthly><span class="amount">${euro(p.price.monthly)}</span><span class="per">/ mois</span></div>
             <div class="price" data-price-yearly hidden><span class="amount">${euro(Math.round(monthlyEq * 100) / 100)}</span><span class="per">/ mois</span><span class="billed">soit ${euro(p.price.yearly)} facturés par an</span></div>`;
      const cta =
        id === 'free'
          ? `<a class="btn btn-ghost btn-block" href="/#outils">Utiliser gratuitement</a>`
          : `<a class="btn ${featured ? 'btn-accent' : 'btn-primary'} btn-block" data-checkout="${id}" href="/tarifs">Choisir ${esc(p.name)}</a>`;
      return `<article class="plan-card${featured ? ' featured' : ''}" data-plan="${id}">
        ${featured ? '<span class="plan-flag">Le plus choisi</span>' : ''}
        <h3>${esc(p.name)}</h3>
        ${priceBlock}
        ${cta}
        <ul class="features">${planFeatures(id).map((f) => `<li>${check}<span>${esc(f)}</span></li>`).join('')}</ul>
      </article>`;
    })
    .join('')}</div>`;
};

const faqBlock = (faqs) =>
  `<div class="faq">${faqs.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}</div>`;

const faqJsonLd = (faqs) =>
  JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  });

const yes = '<span class="yes" aria-label="Inclus">✓</span>';
const no = '<span class="no" aria-label="Non inclus">—</span>';
const plansTable = () => {
  const ids = Object.keys(config.plans);
  const allows = (id, toolId) => config.plans[id].limits.tools === 'all' || config.plans[id].limits.tools.includes(toolId);
  const size = (mb) => (mb >= 1000 ? `${mb / 1000} Go` : `${mb} Mo`);
  const rows = [
    ...TOOLS.map((t) => [esc(t.name), ...ids.map((id) => (allows(id, t.id) ? yes : no))]),
    ['Taille maximale par fichier', ...ids.map((id) => size(config.plans[id].limits.maxFileMB))],
    ['Fichiers par opération', ...ids.map((id) => String(config.plans[id].limits.maxFiles))],
    ['Traitement par lots (ZIP)', ...ids.map((id) => (config.plans[id].limits.batch ? yes : no))],
    ['Appareils', ...ids.map((id) => (id === 'free' ? 'Illimité' : String(config.plans[id].maxDevices)))],
    ['Traitement 100 % local', ...ids.map(() => yes)],
  ];
  return `<div class="table-wrap"><table class="plans-table"><thead><tr><th scope="col">Fonctionnalité</th>${ids.map((id) => `<th scope="col">${esc(config.plans[id].name)}</th>`).join('')}</tr></thead><tbody>${rows
    .map(([label, ...cells]) => `<tr><th scope="row">${label}</th>${cells.map((c) => `<td>${c}</td>`).join('')}</tr>`)
    .join('')}</tbody></table></div>`;
};

const PARTIALS = { 'tools-grid': toolsGrid, 'pricing-cards': pricingCards, 'plans-table': plansTable };

/** Remplacement brut (sans échappement) pour le front-matter, échappé ensuite par le gabarit. */
const fillRaw = (str) => String(str).replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path) => String(get(config, path) ?? ''));

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

function layout({ title, description, path, content, page = 'page', jsonLd = [], noindex = false }) {
  const fullTitle = title.includes(brand) ? title : `${title} — ${brand}`;
  const canonical = siteUrl ? `<link rel="canonical" href="${siteUrl}${path}">` : '';
  const ogUrl = siteUrl ? `<meta property="og:url" content="${siteUrl}${path}">` : '';
  const ogImage = siteUrl ? `<meta property="og:image" content="${siteUrl}/assets/img/og.png">` : '';
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description)}">
${noindex ? '<meta name="robots" content="noindex">' : ''}
${canonical}
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(brand)}">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(description)}">
${ogUrl}
${ogImage}
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#faf8f5" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#121110" media="(prefers-color-scheme: dark)">
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

function toolPage(tool) {
  const c = TOOL_PAGES[tool.id];
  if (!c) throw new Error(`Contenu manquant pour l’outil ${tool.id}`);
  const others = TOOLS.filter((t) => t.id !== tool.id).slice(0, 8);
  const content = `
<section class="tool-hero">
  <div class="container">
    <span class="tool-hero-icon">${iconSvg(tool, 30)}</span>
    <h1>${esc(c.h1)}</h1>
    <p class="lead">${esc(c.lead)}</p>
    <p class="privacy-chip"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg> Vos fichiers restent sur votre appareil${isFreeTool(tool.id) ? ' · Gratuit' : ' · Plan Pro'}</p>
  </div>
</section>
<section class="container">
  <div class="tool-app" id="tool-app" data-tool="${tool.id}" data-accept="${esc(tool.accept)}" data-multiple="${tool.multiple}">
    <noscript><p class="notice">Cet outil fonctionne dans votre navigateur : activez JavaScript pour l’utiliser.</p></noscript>
    <div class="tool-loading" aria-hidden="true"><span class="spinner"></span></div>
  </div>
</section>
<section class="container tool-info">
  <div class="howto">
    <h2>Comment ça marche</h2>
    <ol class="steps">${c.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
  </div>
  <div>
    <h2>Questions fréquentes</h2>
    ${faqBlock(c.faqs)}
  </div>
</section>
<section class="container section">
  <h2 class="section-title">Autres outils</h2>
  <div class="tool-grid compact">${others
    .map((t) => `<a class="tool-card" href="/${t.slug}"><span class="tool-icon">${iconSvg(t, 22)}</span><span class="tool-card-body"><strong>${esc(t.name)}</strong></span></a>`)
    .join('')}</div>
</section>`;
  return layout({ title: c.title, description: c.description, path: `/${tool.slug}`, content, page: 'tool', jsonLd: [faqJsonLd(c.faqs)] });
}

function parsePage(file) {
  const raw = readFileSync(file, 'utf8');
  const m = raw.match(/^<!--meta\s*([\s\S]*?)-->\s*/);
  if (!m) throw new Error(`Front-matter manquant : ${file}`);
  return { meta: JSON.parse(m[1]), body: raw.slice(m[0].length) };
}

// ── construction ─────────────────────────────────────────────────────────────
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
    jsonLd.push(
      JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: brand,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        offers: Object.values(config.plans).map((p) => ({ '@type': 'Offer', name: p.name, price: p.price.monthly, priceCurrency: 'EUR' })),
      }),
    );
  }
  const content = fill(body.replace('{{faq}}', meta.faqs ? faqBlock(meta.faqs) : ''));
  writeFileSync(join(OUT, `${name}.html`), layout({ ...meta, path, content, jsonLd }));
  if (!meta.noindex && name !== '404') pages.push(path);
}
for (const tool of TOOLS) {
  writeFileSync(join(OUT, `${tool.slug}.html`), toolPage(tool));
  pages.push(`/${tool.slug}`);
}

// Service worker : réseau d'abord, cache en secours (fonctionne hors ligne, jamais périmé en ligne)
const precache = [
  ...pages.map((p) => (p === '/' ? '/' : p)),
  ...walk(join(OUT, 'assets'))
    .map((f) => `/${relative(OUT, f).split('\\').join('/')}`)
    .filter((p) => !/\/(cmaps|standard_fonts|iccs)\/|LICENSE|\.map$|nowasm|\/img\/og/.test(p)),
];
const sw = readFileSync(join(SRC, 'sw.template.js'), 'utf8')
  .replace('__VERSION__', VERSION)
  .replace('__PRECACHE__', JSON.stringify(precache));
writeFileSync(join(OUT, 'sw.js'), sw);

if (siteUrl) {
  writeFileSync(
    join(OUT, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map((p) => `  <url><loc>${siteUrl}${p}</loc></url>`).join('\n')}\n</urlset>\n`,
  );
  writeFileSync(join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`);
} else {
  writeFileSync(join(OUT, 'robots.txt'), 'User-agent: *\nAllow: /\n');
}

console.log(`✓ Site généré dans ${relative(process.cwd(), OUT) || '.'} (${pages.length} pages, version ${VERSION})`);
if (!status.configured) {
  console.log('ℹ Paiement pas encore configuré. Champs à remplir dans site.config.mjs :');
  for (const m of status.missing) console.log(`   - ${m}`);
}
if (!siteUrl) console.log('ℹ siteUrl vide : sitemap et balises canonical non générés.');
