import { notFound } from "next/navigation";
import { one } from "./db";

export const FREE_MEMBER_LIMIT = 30;
export const PLATFORMS = ["PS5", "Xbox Series", "PS5 + Xbox"] as const;
export const RECORD_KINDS = ["Amende", "Arrestation", "Mandat", "Avertissement", "Note"] as const;
export const DEFAULT_QUESTIONS = [
  "Quel âge as-tu ?",
  "Quelle est ton expérience du roleplay ?",
  "Présente le personnage que tu veux incarner.",
  "Pourquoi veux-tu rejoindre cette communauté ?",
];

export type Role = "owner" | "staff" | "member";

export type Community = {
  id: string;
  slug: string;
  name: string;
  description: string;
  platform: string;
  owner_id: string;
  plan: string;
  questions: string;
  discord_guild_id: string | null;
  discord_role_id: string | null;
};

export async function communityBySlug(slug: string): Promise<Community> {
  const c = await one<Community>("SELECT * FROM communities WHERE slug = ?", [slug]);
  if (!c) notFound();
  return c;
}

export async function roleIn(communityId: string, userId: string | undefined): Promise<Role | null> {
  if (!userId) return null;
  const m = await one<{ role: Role }>(
    "SELECT role FROM memberships WHERE community_id = ? AND user_id = ?",
    [communityId, userId],
  );
  return m?.role ?? null;
}

export const isStaff = (role: Role | null) => role === "owner" || role === "staff";

export async function memberCount(communityId: string): Promise<number> {
  const r = await one<{ n: number }>(
    "SELECT COUNT(*) AS n FROM memberships WHERE community_id = ?",
    [communityId],
  );
  return r?.n ?? 0;
}

export function parseQuestions(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((q) => typeof q === "string") : [];
  } catch {
    return [];
  }
}
