// Réinitialise le mot de passe d'un compte (à lancer par l'hébergeur).
// Usage : node scripts/reset-password.mjs adresse@exemple.fr
//   avec Docker : docker compose exec app node scripts/reset-password.mjs adresse@exemple.fr
// Affiche un mot de passe provisoire à transmettre à la personne ; ses
// sessions ouvertes sont fermées.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

try { process.loadEnvFile(); } catch { /* pas de .env */ }
const email = String(process.argv[2] || "").trim().toLowerCase();
if (!email) { console.error("Usage : node scripts/reset-password.mjs adresse@exemple.fr"); process.exit(1); }

const dataDir = process.env.DATA_DIR || path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "data");
const dbFile = path.join(dataDir, "explisite.db");
if (!fs.existsSync(dbFile)) { console.error(`Base introuvable : ${dbFile} (vérifiez DATA_DIR).`); process.exit(1); }
const db = new DatabaseSync(dbFile);
const user = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
if (!user) { console.error(`Aucun compte pour ${email}.`); process.exit(1); }

const temp = crypto.randomBytes(9).toString("base64url");
const salt = crypto.randomBytes(16);
const hash = crypto.scryptSync(temp, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
db.prepare("UPDATE users SET pass_hash = ? WHERE id = ?").run(`scrypt$${salt.toString("hex")}$${hash.toString("hex")}`, user.id);
db.prepare("DELETE FROM sessions WHERE user_id = ?").run(user.id);
console.log(`Mot de passe provisoire pour ${email} : ${temp}`);
