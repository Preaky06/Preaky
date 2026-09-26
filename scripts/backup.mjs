// Sauvegarde cohérente de la base, même pendant que le site tourne.
// Usage : node scripts/backup.mjs [dossier]   (défaut : DATA_DIR/backups)
//   avec Docker : docker compose exec app node scripts/backup.mjs
// Gardez aussi une copie de encryption.key (ou de ENCRYPTION_KEY) : sans
// elle, une sauvegarde est illisible.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

try { process.loadEnvFile(); } catch { /* pas de .env */ }
const dataDir = process.env.DATA_DIR || path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "data");
const outDir = process.argv[2] || path.join(dataDir, "backups");
fs.mkdirSync(outDir, { recursive: true });
const file = path.join(outDir, `explisite-${new Date().toISOString().replace(/[:.]/g, "-")}.db`);
const dbFile = path.join(dataDir, "explisite.db");
if (!fs.existsSync(dbFile)) { console.error(`Base introuvable : ${dbFile} (vérifiez DATA_DIR).`); process.exit(1); }
const db = new DatabaseSync(dbFile);
db.exec(`VACUUM INTO '${file.replace(/'/g, "''")}'`);
db.close();
console.log(`Sauvegarde : ${file}`);
