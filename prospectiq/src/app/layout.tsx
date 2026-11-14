import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/inter';
import '@fontsource/poppins/latin-300.css';
import '@fontsource/poppins/latin-500.css';
import '@fontsource/poppins/latin-600.css';
import '@fontsource/poppins/latin-700.css';
import '@fontsource/poppins/latin-800.css';
import '@fontsource/jetbrains-mono/latin-400.css';
import '@fontsource/jetbrains-mono/latin-500.css';
import './globals.css';
import { ToastProvider } from '@/components/toast';
import { env } from '@/lib/env';

export const metadata: Metadata = {
  metadataBase: new URL(env.appUrl),
  openGraph: { type: 'website', locale: 'fr_FR', siteName: 'Pro Spectre' },
  title: { default: 'Pro Spectre · Les bons prospects. Au bon moment.', template: '%s · Pro Spectre' },
  description: 'Identifiez les entreprises à fort potentiel commercial grâce à l’analyse de leurs activités et de leur présence digitale. Données officielles, score explicable, CRM intégré.',
  applicationName: 'Pro Spectre',
  icons: { icon: [{ url: '/icon.svg', type: 'image/svg+xml' }, { url: '/icon-192.png', sizes: '192x192', type: 'image/png' }], apple: '/apple-touch-icon.png' },
};

export const viewport: Viewport = { themeColor: '#0b1230', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>
        {env.ephemeralDb && (
          <div role="status" className="pointer-events-none fixed inset-x-0 bottom-3 z-[60] flex justify-center px-4 print:hidden">
            <p className="max-w-xl rounded-full bg-amber-400 px-4 py-1.5 text-center text-xs font-semibold text-amber-950 shadow-lg">
              Version de démonstration : base de données temporaire, les comptes et données peuvent être effacés à tout moment.
            </p>
          </div>
        )}
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
