import { Suspense } from 'react';
import { AuthFrame, ResetForm } from '@/components/auth-forms';

export const metadata = { title: 'Nouveau mot de passe' };
export const dynamic = 'force-dynamic';

export default async function Page() {
  return (
    <AuthFrame title="Nouveau mot de passe" subtitle="Choisissez votre nouveau mot de passe." >
      <Suspense>
        <ResetForm />
      </Suspense>
    </AuthFrame>
  );
}
