'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button, Field, Input, Checkbox } from './ui';
import { Logo } from './logo';
import { api, ApiError } from '@/lib/client';

export function AuthFrame({ title, subtitle, children, footer }: { title: string; subtitle?: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.1fr]">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Logo />
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-slate-500">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-6 text-sm text-slate-600">{footer}</div>}
        </div>
      </div>
      <div className="relative hidden overflow-hidden bg-night-900 lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_70%_30%,rgba(99,102,241,0.35),transparent)]" />
        <div className="relative flex h-full flex-col justify-center px-16 text-white">
          <p className="text-3xl font-bold leading-tight tracking-tight">Les bons prospects.<br />Au bon moment.</p>
          <ul className="mt-8 space-y-3 text-[15px] text-slate-300">
            {['Données officielles SIRENE, RNE et BODACC', 'Analyse du site web et des signaux commerciaux', 'Score explicable, jamais une boîte noire', 'Messages personnalisés à partir de faits vérifiés'].map((t) => (
              <li key={t} className="flex items-center gap-3">
                <CheckCircle2 className="size-5 text-electric-400" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function useForm() {
  const [error, setError] = useState<{ message: string; field?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const run = async (fn: () => Promise<void>) => {
    setLoading(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      const err = e as ApiError;
      setError({ message: err.message, field: err.field });
    } finally {
      setLoading(false);
    }
  };
  return { error, loading, run };
}

const FormError = ({ error }: { error: { message: string } | null }) =>
  error ? (
    <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700" role="alert" data-testid="form-error">
      {error.message}
    </p>
  ) : null;

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { error, loading, run } = useForm();
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        run(async () => {
          await api('/api/auth/login', { body: { email: fd.get('email'), password: fd.get('password') } });
          const back = params.get('retour');
          router.push(back && back.startsWith('/app') ? back : '/app');
          router.refresh();
        });
      }}
    >
      <Field label="E-mail professionnel" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Mot de passe" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <div className="text-right text-sm">
        <Link href="/mot-de-passe-oublie" className="font-medium text-electric-700 hover:underline">
          Mot de passe oublié ?
        </Link>
      </div>
      <FormError error={error} />
      <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading}>
        Se connecter
      </Button>
    </form>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const { error, loading, run } = useForm();
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        run(async () => {
          await api('/api/auth/register', { body: { name: fd.get('name'), company: fd.get('company'), email: fd.get('email'), password: fd.get('password'), acceptTerms: fd.get('terms') === 'on' } });
          router.push('/app/parametres?bienvenue=1');
          router.refresh();
        });
      }}
    >
      <Field label="Nom et prénom" htmlFor="name">
        <Input id="name" name="name" autoComplete="name" required />
      </Field>
      <Field label="Entreprise ou nom commercial" htmlFor="company" hint="Facultatif">
        <Input id="company" name="company" autoComplete="organization" />
      </Field>
      <Field label="E-mail professionnel" htmlFor="email" error={error?.field === 'email' ? error.message : null}>
        <Input id="email" name="email" type="email" autoComplete="email" required aria-invalid={error?.field === 'email'} />
      </Field>
      <Field label="Mot de passe" htmlFor="password" hint="10 caractères minimum, avec des lettres et des chiffres." error={error?.field === 'password' ? error.message : null}>
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} aria-invalid={error?.field === 'password'} />
      </Field>
      <Checkbox
        name="terms"
        required
        label={
          <>
            J’accepte les{' '}
            <Link href="/cgu" className="font-medium text-electric-700 underline" target="_blank">
              conditions d’utilisation
            </Link>{' '}
            et la{' '}
            <Link href="/confidentialite" className="font-medium text-electric-700 underline" target="_blank">
              politique de confidentialité
            </Link>
            .
          </>
        }
      />
      {error && !['email', 'password'].includes(error.field || '') && <FormError error={error} />}
      <Button type="submit" variant="accent" size="lg" className="w-full" loading={loading}>
        Créer mon compte gratuit
      </Button>
    </form>
  );
}

export function ForgotForm() {
  const { error, loading, run } = useForm();
  const [sent, setSent] = useState(false);
  if (sent)
    return (
      <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">
        Si un compte existe pour cette adresse, un e-mail avec un lien de réinitialisation vient d’être envoyé. Le lien est valable une heure.
      </p>
    );
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        run(async () => {
          await api('/api/auth/forgot', { body: { email: fd.get('email') } });
          setSent(true);
        });
      }}
    >
      <Field label="E-mail du compte" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <FormError error={error} />
      <Button type="submit" size="lg" className="w-full" loading={loading}>
        Recevoir un lien
      </Button>
    </form>
  );
}

export function ResetForm({ invite = false }: { invite?: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') || '';
  const { error, loading, run } = useForm();
  if (!token) return <p className="text-sm text-rose-700">Lien incomplet : ouvrez le lien reçu par e-mail.</p>;
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        run(async () => {
          if (invite) await api('/api/auth/accept-invite', { body: { token, name: fd.get('name'), password: fd.get('password') } });
          else await api('/api/auth/reset', { body: { token, password: fd.get('password') } });
          router.push('/app');
          router.refresh();
        });
      }}
    >
      {invite && (
        <Field label="Nom et prénom" htmlFor="name">
          <Input id="name" name="name" autoComplete="name" required />
        </Field>
      )}
      <Field label={invite ? 'Choisissez un mot de passe' : 'Nouveau mot de passe'} htmlFor="password" hint="10 caractères minimum, avec des lettres et des chiffres.">
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} />
      </Field>
      <FormError error={error} />
      <Button type="submit" size="lg" className="w-full" loading={loading}>
        {invite ? 'Rejoindre l’équipe' : 'Enregistrer et me connecter'}
      </Button>
    </form>
  );
}
