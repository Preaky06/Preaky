"use server";

import { redirect } from "next/navigation";
import { randomBytes, randomUUID } from "node:crypto";
import { one, run } from "@/lib/db";
import { createSession, destroySession, devLoginEnabled, requireUser } from "@/lib/auth";
import {
  DEFAULT_QUESTIONS,
  FREE_MEMBER_LIMIT,
  PLATFORMS,
  RECORD_KINDS,
  communityBySlug,
  isStaff,
  memberCount,
  parseQuestions,
  roleIn,
} from "@/lib/data";
import { assignRole, isSnowflake } from "@/lib/discord";

const str = (fd: FormData, key: string, max: number) =>
  String(fd.get(key) ?? "")
    .trim()
    .slice(0, max);

function back(path: string, key: "erreur" | "ok", msg: string): never {
  redirect(`${path}${path.includes("?") ? "&" : "?"}${key}=${encodeURIComponent(msg)}`);
}

/* ---------- Liste d'attente ---------- */

export async function joinWaitlist(fd: FormData) {
  const email = str(fd, "email", 200).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) back("/", "erreur", "Adresse e-mail invalide.");
  await run(
    "INSERT OR IGNORE INTO waitlist (id, email, community, platform, size) VALUES (?, ?, ?, ?, ?)",
    [randomUUID(), email, str(fd, "community", 100), str(fd, "platform", 30), str(fd, "size", 30)],
  );
  back("/", "ok", "Inscription enregistrée. On te contacte dès l'ouverture.");
}

/* ---------- Session ---------- */

export async function devLogin(fd: FormData) {
  if (!devLoginEnabled()) back("/login", "erreur", "Connexion de développement désactivée.");
  const name = str(fd, "name", 32);
  if (!/^[\w-]{2,32}$/.test(name)) back("/login", "erreur", "Pseudo : 2 à 32 lettres, chiffres, - ou _.");
  const discordId = `dev:${name.toLowerCase()}`;
  await run("INSERT OR IGNORE INTO users (id, discord_id, username) VALUES (?, ?, ?)", [
    randomUUID(),
    discordId,
    name,
  ]);
  const user = await one<{ id: string }>("SELECT id FROM users WHERE discord_id = ?", [discordId]);
  await createSession(user!.id);
  redirect("/dashboard");
}

export async function logout() {
  await destroySession();
  redirect("/");
}

/* ---------- Communautés ---------- */

function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export async function createCommunity(fd: FormData) {
  const user = await requireUser();
  const name = str(fd, "name", 60);
  const platform = str(fd, "platform", 30);
  if (name.length < 3) back("/dashboard", "erreur", "Nom de communauté : 3 caractères minimum.");
  if (!(PLATFORMS as readonly string[]).includes(platform)) back("/dashboard", "erreur", "Plateforme invalide.");

  let slug = slugify(name) || "communaute";
  if (await one("SELECT 1 FROM communities WHERE slug = ?", [slug])) {
    slug = `${slug}-${randomBytes(2).toString("hex")}`;
  }
  const id = randomUUID();
  await run(
    "INSERT INTO communities (id, slug, name, description, platform, owner_id, questions) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [id, slug, name, str(fd, "description", 1000), platform, user.id, JSON.stringify(DEFAULT_QUESTIONS)],
  );
  await run("INSERT INTO memberships (community_id, user_id, role) VALUES (?, ?, 'owner')", [id, user.id]);
  redirect(`/c/${slug}/staff`);
}

export async function updateSettings(fd: FormData) {
  const user = await requireUser();
  const community = await communityBySlug(str(fd, "slug", 60));
  const path = `/c/${community.slug}/staff`;
  if ((await roleIn(community.id, user.id)) !== "owner") back(path, "erreur", "Réservé au fondateur.");

  const questions = str(fd, "questions", 4000)
    .split("\n")
    .map((q) => q.trim().slice(0, 300))
    .filter(Boolean)
    .slice(0, 10);
  if (questions.length === 0) back(path, "erreur", "Il faut au moins une question de candidature.");

  const guild = str(fd, "discord_guild_id", 20);
  const role = str(fd, "discord_role_id", 20);
  if ((guild && !isSnowflake(guild)) || (role && !isSnowflake(role))) {
    back(path, "erreur", "Les identifiants Discord sont des nombres de 17 à 20 chiffres.");
  }
  await run(
    "UPDATE communities SET description = ?, questions = ?, discord_guild_id = ?, discord_role_id = ? WHERE id = ?",
    [str(fd, "description", 1000), JSON.stringify(questions), guild || null, role || null, community.id],
  );
  back(path, "ok", "Réglages enregistrés.");
}

export async function setMemberRole(fd: FormData) {
  const user = await requireUser();
  const community = await communityBySlug(str(fd, "slug", 60));
  const path = `/c/${community.slug}/staff`;
  if ((await roleIn(community.id, user.id)) !== "owner") back(path, "erreur", "Réservé au fondateur.");
  const target = str(fd, "user_id", 40);
  const role = str(fd, "role", 10);
  if (target === community.owner_id || (role !== "staff" && role !== "member")) {
    back(path, "erreur", "Changement de rôle invalide.");
  }
  await run("UPDATE memberships SET role = ? WHERE community_id = ? AND user_id = ?", [
    role,
    community.id,
    target,
  ]);
  back(path, "ok", "Rôle mis à jour.");
}

/* ---------- Candidatures ---------- */

export async function submitApplication(fd: FormData) {
  const user = await requireUser();
  const community = await communityBySlug(str(fd, "slug", 60));
  const path = `/c/${community.slug}`;
  if (await roleIn(community.id, user.id)) back(path, "erreur", "Tu es déjà membre.");
  const pending = await one(
    "SELECT 1 FROM applications WHERE community_id = ? AND user_id = ? AND status = 'pending'",
    [community.id, user.id],
  );
  if (pending) back(path, "erreur", "Tu as déjà une candidature en cours.");

  const answers = parseQuestions(community.questions).map((question, i) => ({
    question,
    answer: str(fd, `q${i}`, 2000),
  }));
  if (answers.some((a) => !a.answer)) back(path, "erreur", "Réponds à toutes les questions.");

  await run("INSERT INTO applications (id, community_id, user_id, answers) VALUES (?, ?, ?, ?)", [
    randomUUID(),
    community.id,
    user.id,
    JSON.stringify(answers),
  ]);
  back(path, "ok", "Candidature envoyée.");
}

export async function reviewApplication(fd: FormData) {
  const user = await requireUser();
  const community = await communityBySlug(str(fd, "slug", 60));
  const path = `/c/${community.slug}/staff`;
  if (!isStaff(await roleIn(community.id, user.id))) back(path, "erreur", "Réservé au staff.");

  const decision = str(fd, "decision", 10);
  if (decision !== "accepted" && decision !== "rejected") back(path, "erreur", "Décision invalide.");
  const app = await one<{ id: string; user_id: string; discord_id: string }>(
    `SELECT a.id, a.user_id, u.discord_id FROM applications a JOIN users u ON u.id = a.user_id
     WHERE a.id = ? AND a.community_id = ? AND a.status = 'pending'`,
    [str(fd, "application_id", 40), community.id],
  );
  if (!app) back(path, "erreur", "Candidature introuvable ou déjà traitée.");

  let sync: string | null = null;
  if (decision === "accepted") {
    if (community.plan === "free" && (await memberCount(community.id)) >= FREE_MEMBER_LIMIT) {
      back(path, "erreur", `Limite de ${FREE_MEMBER_LIMIT} membres atteinte sur l'offre gratuite.`);
    }
    await run("INSERT OR IGNORE INTO memberships (community_id, user_id, role) VALUES (?, ?, 'member')", [
      community.id,
      app.user_id,
    ]);
    if (community.discord_guild_id && community.discord_role_id) {
      sync = await assignRole(community.discord_guild_id, community.discord_role_id, app.discord_id);
    }
  }
  await run(
    `UPDATE applications SET status = ?, reviewer_id = ?, review_note = ?, discord_sync = ?,
     reviewed_at = datetime('now') WHERE id = ?`,
    [decision, user.id, str(fd, "note", 500) || null, sync, app.id],
  );
  back(path, "ok", decision === "accepted" ? "Candidature acceptée." : "Candidature refusée.");
}

/* ---------- Personnages et casier ---------- */

export async function createCharacter(fd: FormData) {
  const user = await requireUser();
  const community = await communityBySlug(str(fd, "slug", 60));
  const path = `/c/${community.slug}/characters`;
  if (!(await roleIn(community.id, user.id))) back(`/c/${community.slug}`, "erreur", "Réservé aux membres.");
  const first = str(fd, "first_name", 40);
  const last = str(fd, "last_name", 40);
  if (!first || !last) back(path, "erreur", "Prénom et nom obligatoires.");
  const birthdate = str(fd, "birthdate", 10);
  if (birthdate && !/^\d{4}-\d{2}-\d{2}$/.test(birthdate)) back(path, "erreur", "Date de naissance invalide.");

  const id = randomUUID();
  await run(
    `INSERT INTO characters (id, community_id, user_id, first_name, last_name, birthdate, occupation, backstory)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, community.id, user.id, first, last, birthdate, str(fd, "occupation", 60), str(fd, "backstory", 4000)],
  );
  redirect(`${path}/${id}`);
}

export async function addRecord(fd: FormData) {
  const user = await requireUser();
  const community = await communityBySlug(str(fd, "slug", 60));
  const characterId = str(fd, "character_id", 40);
  const path = `/c/${community.slug}/characters/${characterId}`;
  if (!isStaff(await roleIn(community.id, user.id))) back(path, "erreur", "Réservé au staff.");
  const character = await one("SELECT 1 FROM characters WHERE id = ? AND community_id = ?", [
    characterId,
    community.id,
  ]);
  if (!character) back(`/c/${community.slug}/characters`, "erreur", "Personnage introuvable.");

  const kind = str(fd, "kind", 20);
  const title = str(fd, "title", 120);
  if (!(RECORD_KINDS as readonly string[]).includes(kind)) back(path, "erreur", "Type d'entrée invalide.");
  if (!title) back(path, "erreur", "Le motif est obligatoire.");
  const amountRaw = str(fd, "amount", 9);
  if (amountRaw && !/^\d+$/.test(amountRaw)) back(path, "erreur", "Montant : nombre entier positif.");

  await run(
    "INSERT INTO records (id, character_id, community_id, author_id, kind, title, details, amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [
      randomUUID(),
      characterId,
      community.id,
      user.id,
      kind,
      title,
      str(fd, "details", 2000),
      amountRaw ? Number(amountRaw) : null,
    ],
  );
  back(path, "ok", "Entrée ajoutée au casier.");
}
