#!/usr/bin/env node
/* Récupère une photo sous licence libre par plat sur Wikimedia Commons.
   Usage (Node 18+, depuis ladalle/) :  node tools/fetch-images.mjs [idDuPlat ...]
   - n'accepte que CC0, domaine public, CC BY et CC BY-SA ;
   - enregistre img/<id>.jpg (900 px de large) et régénère images.js avec auteur, licence et source ;
   - ne remplace jamais une photo déjà présente dans images.js : supprime l'entrée pour la refaire.
   Vérifie visuellement chaque photo avant de publier : la recherche est automatique. */
import { writeFile, readFile, mkdir } from 'node:fs/promises';

const Q = {
  aglio: 'spaghetti aglio e olio', carbo: 'spaghetti carbonara', thon_tomate: 'pasta tuna tomato', onepot: 'pasta spinach tomato',
  citron_parm: 'spaghetti lemon', mac: 'macaroni and cheese', bolo: 'spaghetti bolognese', bolo_lentilles: 'lentil bolognese',
  dahl: 'dal lentil curry', chili: 'chili sin carne', curry_pc: 'chana masala', fried_rice: 'egg fried rice', tortilla: 'tortilla de patatas',
  shakshuka: 'shakshuka', croque: 'croque-monsieur', wrap_poulet: 'chicken wrap', ramen: 'instant ramen egg', mug_omelette: 'omelette',
  patate_farcie: 'baked sweet potato', taboule: 'couscous salad chickpeas', salade_lentilles: 'lentil salad feta', bowl_thon: 'poke bowl tuna',
  gnocchi: 'gnocchi mushrooms', poulet_curry: 'chicken curry rice', quiche: 'quiche lorraine', tarte_chevre: 'tomato tart goat cheese',
  risotto: 'mushroom risotto', saumon: 'teriyaki salmon rice', poulet_roti: 'roast chicken legs potatoes', nouilles_cacahuete: 'peanut noodles',
  tofu: 'fried tofu rice vegetables', soupe: 'carrot soup', saucisses_lentilles: 'saucisses aux lentilles', poelee_chorizo: 'potatoes chorizo egg',
  burger: 'homemade hamburger', salade_grecque: 'greek salad', burrito_froid: 'bean burrito', tartine_avocat: 'avocado toast egg',
  porridge: 'porridge banana', overnight: 'overnight oats', crepes: 'crêpes', mugcake: 'chocolate mug cake',
};
const OK = /^(cc0|public domain|pd|cc by(-sa)? [\d.]+)/i;
const strip = (h = '') => h.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const UA = { 'User-Agent': 'recipe-site-image-fetcher/1.0' };

let out = {};
try { out = JSON.parse((await readFile('images.js', 'utf8')).match(/window\.IMAGES = (\{[\s\S]*\});/)[1]); } catch { /* premier lancement */ }
await mkdir('img', { recursive: true });
const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(Q);

for (const id of ids) {
  if (out[id]) { console.log(`= ${id} (déjà présent)`); continue; }
  if (!Q[id]) { console.log(`? ${id} : pas de requête définie`); continue; }
  const u = new URL('https://commons.wikimedia.org/w/api.php');
  u.search = new URLSearchParams({ action: 'query', format: 'json', generator: 'search', gsrsearch: `${Q[id]} filetype:bitmap`, gsrnamespace: '6', gsrlimit: '12', prop: 'imageinfo', iiprop: 'url|extmetadata|mime|size', iiurlwidth: '900' });
  try {
    const pages = Object.values((await (await fetch(u, { headers: UA })).json()).query?.pages || {}).sort((a, b) => a.index - b.index);
    const hit = pages.map((p) => p.imageinfo?.[0]).find((i) => i && i.mime === 'image/jpeg' && i.width >= 800 && i.width >= i.height && OK.test(i.extmetadata?.LicenseShortName?.value || ''));
    if (!hit) { console.log(`- ${id} : aucune photo sous licence acceptée`); continue; }
    await writeFile(`img/${id}.jpg`, Buffer.from(await (await fetch(hit.thumburl, { headers: UA })).arrayBuffer()));
    out[id] = { file: `${id}.jpg`, author: strip(hit.extmetadata.Artist?.value) || 'Auteur inconnu', license: hit.extmetadata.LicenseShortName.value, licenseUrl: hit.extmetadata.LicenseUrl?.value || '', source: hit.descriptionurl };
    console.log(`+ ${id} : ${out[id].license} — ${out[id].author}`);
  } catch (e) { console.log(`! ${id} : ${e.message}`); }
  await new Promise((r) => setTimeout(r, 400));
}
await writeFile('images.js', `/* Photos des plats. Fichier généré par tools/fetch-images.mjs — ne pas éditer à la main.\n   Format : { idDuPlat: { file, author, license, licenseUrl, source } } */\nwindow.IMAGES = ${JSON.stringify(out, null, 2)};\n`);
console.log(`\n${Object.keys(out).length} photo(s) référencée(s) dans images.js. Crédits visibles sur #/credits.`);
