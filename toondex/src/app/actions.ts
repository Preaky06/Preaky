"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  PSEUDO_RULE,
  burnPasswordCheck,
  clearLoginFailures,
  createSession,
  destroySession,
  getCurrentUser,
  hashPassword,
  isLoginBlocked,
  newUserId,
  pseudoKey,
  recordLoginFailure,
  verifyPassword,
} from "@/lib/auth";
import { AlreadyOpenedError, craftCard, getPackSets, getTodayPack, openTodayPack, type Pack } from "@/lib/collection";
import type { PackSet } from "@/lib/sets";
import { getDb } from "@/lib/db";

export type FormState = { error?: string; pseudo?: string } | undefined;

function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === "string" ? value : "/";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export async function signup(_prev: FormState, form: FormData): Promise<FormState> {
  const pseudo = String(form.get("pseudo") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!PSEUDO_RULE.test(pseudo)) {
    return { pseudo, error: "Pseudo : 3 à 20 caractères, lettres, chiffres, point, tiret ou tiret bas." };
  }
  if (password.length < 8 || password.length > 128) {
    return { pseudo, error: "Mot de passe : 8 caractères minimum." };
  }
  const db = await getDb();
  const id = newUserId();
  const rows = await db.query(
    `insert into users (id, pseudo, pseudo_key, password_hash) values ($1, $2, $3, $4)
     on conflict (pseudo_key) do nothing returning id`,
    [id, pseudo, pseudoKey(pseudo), await hashPassword(password)],
  );
  if (rows.length === 0) return { pseudo, error: "Ce pseudo est déjà pris." };
  await createSession(id);
  redirect(safeNext(form.get("next")));
}

export async function login(_prev: FormState, form: FormData): Promise<FormState> {
  const pseudo = String(form.get("pseudo") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const key = pseudoKey(pseudo);
  if (isLoginBlocked(key)) {
    return { pseudo, error: "Trop d’essais. Réessaie dans un quart d’heure." };
  }
  const db = await getDb();
  const rows = await db.query<{ id: string; password_hash: string }>(
    "select id, password_hash from users where pseudo_key = $1",
    [key],
  );
  const user = rows[0];
  const ok = user ? await verifyPassword(password, user.password_hash) : (await burnPasswordCheck(password), false);
  if (!user || !ok) {
    recordLoginFailure(key);
    return { pseudo, error: "Pseudo ou mot de passe incorrect." };
  }
  clearLoginFailures(key);
  await createSession(user.id);
  redirect(safeNext(form.get("next")));
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/");
}

export type OpenResult =
  | { ok: true; pack: Pack; shards: number; sets: PackSet[]; setBonus: number }
  | { ok: false; error: string; pack?: Pack; sets?: PackSet[] };

export async function openPack(): Promise<OpenResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Connecte-toi pour ouvrir ton paquet." };
  try {
    const { pack, shards, sets, setBonus } = await openTodayPack(user.id);
    revalidatePath("/collection");
    return { ok: true, pack, shards, sets, setBonus };
  } catch (err) {
    if (err instanceof AlreadyOpenedError) {
      const pack = (await getTodayPack(user.id)) ?? undefined;
      const sets = pack ? await getPackSets(user.id, pack) : undefined;
      return { ok: false, error: "Tu as déjà ouvert le paquet du jour.", pack, sets };
    }
    throw err;
  }
}

export type CraftState = { ok?: boolean; error?: string; setBonus?: number } | undefined;

export async function craft(_prev: CraftState, form: FormData): Promise<CraftState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Connecte-toi pour fabriquer une carte." };
  const cardId = String(form.get("cardId") ?? "");
  const result = await craftCard(user.id, cardId);
  if (!result.ok) return { error: result.error };
  revalidatePath("/", "layout");
  return { ok: true, setBonus: result.setBonus };
}
