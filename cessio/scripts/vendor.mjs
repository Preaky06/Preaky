// Copie les bibliothèques open source dans src/assets/vendor (fichiers versionnés : aucun npm requis au déploiement).
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
const copy = (from, to) => {
  cpSync(join(nm, from), join(out, to), { recursive: true });
  console.log('  ✓', to);
};
copy('pdf-lib/dist/pdf-lib.esm.min.js', 'pdf-lib/pdf-lib.esm.min.js');
copy('pdf-lib/LICENSE.md', 'pdf-lib/LICENSE.md');
copy('fflate/esm/browser.js', 'fflate/fflate.mjs');
copy('fflate/LICENSE', 'fflate/LICENSE');
copy('@fontsource-variable/inter/files/inter-latin-wght-normal.woff2', 'fonts/inter-latin.woff2');
copy('@fontsource-variable/inter/files/inter-latin-ext-wght-normal.woff2', 'fonts/inter-latin-ext.woff2');
copy('@fontsource-variable/inter/LICENSE', 'fonts/LICENSE-Inter.txt');
