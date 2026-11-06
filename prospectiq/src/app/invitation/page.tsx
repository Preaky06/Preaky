import { Suspense } from 'react';
import { AuthFrame, ResetForm } from '@/components/auth-forms';

export const metadata = { title: 'Rejoindre l’équipe' };
export const dynamic = 'force-dynamic';

export default async function Page() {
  return (
    <AuthFrame title="Rejoindre l’équipe" subtitle="Vous avez été invité sur ProspectIQ. Créez votre accès." >
      <Suspense>
        <ResetForm invite />
      </Suspense>
    </AuthFrame>
  );
}
