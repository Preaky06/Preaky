import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { getCurrentUser } from "@/lib/auth";
import { safeNextParam } from "@/lib/next-param";

export const metadata: Metadata = { title: "Se connecter" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNextParam((await searchParams).next);
  if (await getCurrentUser()) redirect(next);
  return (
    <section className="auth">
      <h1 className="page-title">Se connecter</h1>
      <p className="muted">Retrouve ta collection et ton paquet du jour.</p>
      <AuthForm mode="login" next={next} />
    </section>
  );
}
