// Construit la version « claude.ai » de Limpide : une seule page HTML autonome
// (CSS et JS intégrés) qui appelle Claude avec le compte de la personne qui
// l'utilise. Aucun serveur ni clé API. Sortie : dist/limpide.html
//
// Usage : npm run build:artifact
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const rel = (p) => path.join(root, p);
const read = (p) => fs.readFileSync(rel(p), "utf8");

// Modules dans l'ordre des dépendances. transport.claude.js remplace transport.js.
const MODULES = [
  "lib/prompts.js",
  "lib/mock.js",
  "public/i18n.js",
  "public/samples.js",
  "public/transport.claude.js",
  "public/app.js",
];
const ALIASES = { "public/transport.js": "public/transport.claude.js" };

// Mini-bundler : chaque module s'exécute dans sa propre portée ; ses exports
// sont rangés dans M[chemin] et ses imports y sont relus.
function bundle() {
  const parts = ["const M = {};"];
  for (const file of MODULES) {
    let src = read(file);
    const exported = [];
    src = src.replace(/^import\s*\{([^}]+)\}\s*from\s*"([^"]+)";\s*$/gm, (_, names, spec) => {
      let target = path.posix.normalize(path.posix.join(path.posix.dirname(file), spec));
      target = ALIASES[target] || target;
      if (!MODULES.includes(target)) throw new Error(`${file} importe ${spec}, absent du paquet`);
      const bindings = names.split(",").map((n) => n.trim()).filter(Boolean).map((n) => n.replace(/\s+as\s+/, ": "));
      return `const { ${bindings.join(", ")} } = M[${JSON.stringify(target)}];`;
    });
    if (/^import\s/m.test(src)) throw new Error(`${file} : forme d'import non gérée`);
    src = src.replace(/^export\s+(async\s+function|function|const|let|class)\s+([A-Za-z_$][\w$]*)/gm, (_, kind, name) => {
      exported.push(name);
      return `${kind} ${name}`;
    });
    if (/^export\s/m.test(src)) throw new Error(`${file} : forme d'export non gérée`);
    parts.push(`// ---- ${file}\nM[${JSON.stringify(file)}] = (() => {\n${src}\nreturn { ${exported.join(", ")} };\n})();`);
  }
  return parts.join("\n\n");
}

const index = read("public/index.html");
const title = index.match(/<title>[\s\S]*?<\/title>/)[0].replace("Limpide — la paperasse, en clair", "Limpide");
let body = index.match(/<body>([\s\S]*)<\/body>/)[1];
// Liens de pied de page vers les pages du serveur : sans objet ici.
body = body.replace(/<nav class="footer-links"[\s\S]*?<\/nav>/, "");
body = body.replace("Propulsé par Claude", "Propulsé par Claude · vos documents sont analysés avec votre compte claude.ai");

const css = read("public/styles.css");
const js = bundle().replace(/<\/script/gi, "<\\/script");

const html = `${title}
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,300..800&family=Fraunces:ital,opsz,wght,SOFT,WONK@0,9..144,300..900,0..100,0..1;1,9..144,300..900,0..100,0..1&family=JetBrains+Mono:wght@400;600&display=swap" />
<style>
${css}
</style>
${body.trim()}
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"></script>
<script>
${js}
</script>
`;

fs.mkdirSync(rel("dist"), { recursive: true });
fs.writeFileSync(rel("dist/limpide.html"), html);
console.log(`dist/limpide.html — ${(html.length / 1024).toFixed(0)} Kio`);
