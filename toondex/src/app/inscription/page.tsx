import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { getCurrentUser } from "@/lib/auth";
import { safeNextParam } from "@/lib/next-param";

export const metadata: Metadata = { title: "Créer un compte" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNextParam((await searchParams).next);
  if (await getCurrentUser()) redirect(next);
  return (
    <section className="auth">
      <h1 className="page-title">Créer un compte</h1>
      <p className="muted">Un pseudo et un mot de passe suffisent. Ton premier paquet t’attend juste après.</p>
      <AuthForm mode="signup" next={next} />
    </section>
  );
}
