// Copie les bibliothèques open source nécessaires dans src/assets/vendor.
// À lancer après `npm install` uniquement si tu veux mettre à jour les versions.
// Les fichiers copiés sont versionnés dans git : aucun build npm n'est requis au déploiement.
import { cpSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const nm = join(root, 'node_modules');
const out = join(root, 'src/assets/vendor');

if (!existsSync(nm)) {
  console.error('Lance `npm install` avant `npm run vendor`.');
  process.exit(1);
}
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const copy = (from, to, opts = {}) => {
  const dest = join(out, to);
  cpSync(join(nm, from), dest, { recursive: true, ...opts });
  console.log('  ✓', to);
};

// pdf.js (Apache-2.0) — build "legacy" pour une compatibilité navigateur maximale
copy('pdfjs-dist/legacy/build/pdf.min.mjs', 'pdfjs/pdf.min.mjs');
copy('pdfjs-dist/legacy/build/pdf.worker.min.mjs', 'pdfjs/pdf.worker.min.mjs');
copy('pdfjs-dist/cmaps', 'pdfjs/cmaps');
copy('pdfjs-dist/standard_fonts', 'pdfjs/standard_fonts');
copy('pdfjs-dist/iccs', 'pdfjs/iccs');
copy('pdfjs-dist/wasm', 'pdfjs/wasm', { filter: (src) => !/quickjs/.test(src) });
copy('pdfjs-dist/LICENSE', 'pdfjs/LICENSE');

// pdf-lib (MIT)
copy('pdf-lib/dist/pdf-lib.esm.min.js', 'pdf-lib/pdf-lib.esm.min.js');
copy('pdf-lib/LICENSE.md', 'pdf-lib/LICENSE.md');

// fflate (MIT) — création des archives ZIP
copy('fflate/esm/browser.js', 'fflate/fflate.mjs');
copy('fflate/LICENSE', 'fflate/LICENSE');

// Inter (SIL OFL 1.1)
copy('@fontsource-variable/inter/files/inter-latin-wght-normal.woff2', 'fonts/inter-latin.woff2');
copy('@fontsource-variable/inter/files/inter-latin-ext-wght-normal.woff2', 'fonts/inter-latin-ext.woff2');
copy('@fontsource-variable/inter/LICENSE', 'fonts/LICENSE-Inter.txt');

console.log('Bibliothèques copiées dans src/assets/vendor');
