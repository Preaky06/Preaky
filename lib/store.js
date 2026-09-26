// Base de données : comptes, sessions et documents enregistrés.
// SQLite intégré à Node (node:sqlite, aucune dépendance native à compiler).
// Le contenu des documents (analyse, fichiers, conversation) est chiffré au
// repos en AES-256-GCM ; seuls le titre, l'urgence et les dates restent en
// clair pour afficher la liste.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { DatabaseSync } from "node:sqlite";

const SESSION_DAYS = 30;

export function openStore({ dataDir, encryptionKey, log = console }) {
  fs.mkdirSync(dataDir, { recursive: true });
  const db = new DatabaseSync(path.join(dataDir, "explisite.db"));
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      pass_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      title TEXT NOT NULL,
      urgency TEXT NOT NULL,
      issuer TEXT NOT NULL,
      lang TEXT NOT NULL,
      demo INTEGER NOT NULL,
      payload BLOB NOT NULL
    );
    CREATE INDEX IF NOT EXISTS documents_user ON documents(user_id, created_at DESC);
  `);

  const key = loadKey(dataDir, encryptionKey, log);
  const seal = (obj) => {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const body = Buffer.concat([cipher.update(JSON.stringify(obj), "utf8"), cipher.final()]);
    return Buffer.concat([iv, cipher.getAuthTag(), body]);
  };
  const open = (blob) => {
    const buf = Buffer.from(blob);
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, buf.subarray(0, 12));
    decipher.setAuthTag(buf.subarray(12, 28));
    return JSON.parse(Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString("utf8"));
  };

  const q = {
    userByEmail: db.prepare("SELECT * FROM users WHERE email = ?"),
    userById: db.prepare("SELECT id, email, created_at FROM users WHERE id = ?"),
    passById: db.prepare("SELECT pass_hash FROM users WHERE id = ?"),
    insertUser: db.prepare("INSERT INTO users (id, email, pass_hash, created_at) VALUES (?, ?, ?, ?)"),
    deleteUser: db.prepare("DELETE FROM users WHERE id = ?"),
    insertSession: db.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)"),
    sessionUser: db.prepare("SELECT u.id, u.email FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?"),
    deleteSession: db.prepare("DELETE FROM sessions WHERE token_hash = ?"),
    purgeSessions: db.prepare("DELETE FROM sessions WHERE expires_at <= ?"),
    listDocs: db.prepare("SELECT id, created_at, updated_at, title, urgency, issuer, lang, demo FROM documents WHERE user_id = ? ORDER BY created_at DESC LIMIT 500"),
    getDoc: db.prepare("SELECT * FROM documents WHERE id = ? AND user_id = ?"),
    insertDoc: db.prepare("INSERT INTO documents (id, user_id, created_at, updated_at, title, urgency, issuer, lang, demo, payload) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"),
    updateDoc: db.prepare("UPDATE documents SET payload = ?, updated_at = ? WHERE id = ? AND user_id = ?"),
    deleteDoc: db.prepare("DELETE FROM documents WHERE id = ? AND user_id = ?"),
    deleteAllDocs: db.prepare("DELETE FROM documents WHERE user_id = ?"),
    countDocs: db.prepare("SELECT COUNT(*) AS n FROM documents WHERE user_id = ?"),
  };

  setInterval(() => q.purgeSessions.run(Date.now()), 3600_000).unref();

  return {
    close: () => db.close(),

    // ------------------------------------------------------------ comptes
    async createUser(email, password) {
      if (q.userByEmail.get(email)) return null;
      const id = crypto.randomUUID();
      q.insertUser.run(id, email, await hashPassword(password), Date.now());
      return { id, email };
    },
    async checkLogin(email, password) {
      const row = q.userByEmail.get(email);
      // Même coût de calcul que le compte existe ou non (pas d'énumération par le temps).
      const ok = await verifyPassword(password, row?.pass_hash || DUMMY_HASH);
      return row && ok ? { id: row.id, email: row.email } : null;
    },
    async checkPassword(userId, password) {
      const row = q.passById.get(userId);
      return !!row && verifyPassword(password, row.pass_hash);
    },
    deleteUser: (userId) => q.deleteUser.run(userId),

    // ----------------------------------------------------------- sessions
    createSession(userId) {
      const token = crypto.randomBytes(32).toString("base64url");
      q.insertSession.run(sha256(token), userId, Date.now() + SESSION_DAYS * 86400_000);
      return { token, maxAge: SESSION_DAYS * 86400 };
    },
    sessionUser: (token) => (token ? q.sessionUser.get(sha256(token), Date.now()) || null : null),
    deleteSession: (token) => token && q.deleteSession.run(sha256(token)),

    // ---------------------------------------------------------- documents
    listDocuments: (userId) => q.listDocs.all(userId).map(summary),
    countDocuments: (userId) => q.countDocs.get(userId).n,
    getDocument(userId, id) {
      const row = q.getDoc.get(id, userId);
      if (!row) return null;
      return { ...summary(row), ...open(row.payload) };
    },
    createDocument(userId, doc) {
      const id = crypto.randomUUID();
      const now = Date.now();
      const r = doc.result;
      q.insertDoc.run(id, userId, now, now, clip(r.title, 200) || "Document", ["none", "low", "medium", "high"].includes(r.urgency) ? r.urgency : "low",
        clip(r.issuer, 200), clip(doc.lang, 8) || "fr", doc.demo ? 1 : 0,
        seal({ result: r, checks: doc.checks || [], chat: doc.chat || [], files: doc.files || [], text: doc.text || "" }));
      return id;
    },
    updateDocument(userId, id, patch) {
      const row = q.getDoc.get(id, userId);
      if (!row) return false;
      const data = open(row.payload);
      if (Array.isArray(patch.checks)) data.checks = patch.checks.map(Boolean).slice(0, 100);
      if (Array.isArray(patch.chat)) data.chat = patch.chat.slice(-40);
      q.updateDoc.run(seal(data), Date.now(), id, userId);
      return true;
    },
    deleteDocument: (userId, id) => q.deleteDoc.run(id, userId).changes > 0,
    deleteAllDocuments: (userId) => q.deleteAllDocs.run(userId).changes,
  };
}

function summary(row) {
  return {
    id: row.id, at: row.created_at, updatedAt: row.updated_at, title: row.title,
    urgency: row.urgency, issuer: row.issuer, lang: row.lang, demo: !!row.demo,
  };
}

const clip = (s, n) => String(s ?? "").slice(0, n);
const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");

// Clé de chiffrement : ENCRYPTION_KEY (64 caractères hexadécimaux) si fournie,
// sinon générée une fois et gardée dans le dossier de données.
function loadKey(dataDir, provided, log) {
  if (provided) {
    const buf = Buffer.from(provided, /^[0-9a-f]{64}$/i.test(provided) ? "hex" : "base64");
    if (buf.length !== 32) throw new Error("ENCRYPTION_KEY doit faire 32 octets (64 caractères hexadécimaux).");
    return buf;
  }
  const file = path.join(dataDir, "encryption.key");
  if (fs.existsSync(file)) return Buffer.from(fs.readFileSync(file, "utf8").trim(), "hex");
  const key = crypto.randomBytes(32);
  fs.writeFileSync(file, key.toString("hex"), { mode: 0o600 });
  log.warn(`Clé de chiffrement créée dans ${file}. Sauvegardez-la : sans elle, les documents enregistrés sont illisibles.`);
  return key;
}

// Mots de passe : scrypt (N=2^15) avec sel aléatoire.
const SCRYPT = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  return new Promise((resolve, reject) => crypto.scrypt(password, salt, 64, SCRYPT, (err, hash) =>
    err ? reject(err) : resolve(`scrypt$${salt.toString("hex")}$${hash.toString("hex")}`)));
}

function verifyPassword(password, stored) {
  const [, saltHex, hashHex] = String(stored).split("$");
  if (!saltHex || !hashHex) return Promise.resolve(false);
  return new Promise((resolve) => crypto.scrypt(password, Buffer.from(saltHex, "hex"), 64, SCRYPT, (err, hash) =>
    resolve(!err && crypto.timingSafeEqual(hash, Buffer.from(hashHex, "hex")))));
}

const DUMMY_HASH = `scrypt$${"0".repeat(32)}$${"0".repeat(128)}`;
