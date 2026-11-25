"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, signup, type FormState } from "@/app/actions";

export function AuthForm({ mode, next }: { mode: "login" | "signup"; next: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(mode === "login" ? login : signup, undefined);
  const isLogin = mode === "login";
  return (
    <form action={action} className="auth-form">
      <input type="hidden" name="next" value={next} />
      <div className="field">
        <label htmlFor="pseudo">Pseudo</label>
        <input
          id="pseudo"
          name="pseudo"
          className="input"
          autoComplete="username"
          required
          minLength={3}
          maxLength={20}
          pattern="[A-Za-z0-9_.\-]{3,20}"
          defaultValue={state?.pseudo}
          aria-describedby={isLogin ? undefined : "pseudo-help"}
        />
        {!isLogin && (
          <span id="pseudo-help" className="field__help">
            3 à 20 caractères : lettres, chiffres, point, tiret, tiret bas.
          </span>
        )}
      </div>
      <div className="field">
        <label htmlFor="password">Mot de passe</label>
        <input
          id="password"
          name="password"
          type="password"
          className="input"
          autoComplete={isLogin ? "current-password" : "new-password"}
          required
          minLength={8}
          maxLength={128}
          aria-describedby={isLogin ? undefined : "password-help"}
        />
        {!isLogin && (
          <span id="password-help" className="field__help">
            8 caractères minimum.
          </span>
        )}
      </div>
      {state?.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      <button type="submit" className="btn btn--primary btn--lg" disabled={pending}>
        {pending ? "Un instant…" : isLogin ? "Se connecter" : "Créer mon compte"}
      </button>
      <p className="muted small">
        {isLogin ? (
          <>
            Pas encore de compte ?{" "}
            <Link href={`/inscription${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`} className="link">
              Créer un compte
            </Link>
          </>
        ) : (
          <>
            Déjà un compte ?{" "}
            <Link href={`/connexion${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`} className="link">
              Se connecter
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
