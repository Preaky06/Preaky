import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/inter';
import '@fontsource/instrument-serif/latin-400-italic.css';
import '@fontsource/poppins/latin-300.css';
import '@fontsource/poppins/latin-500.css';
import '@fontsource/poppins/latin-600.css';
import '@fontsource/poppins/latin-700.css';
import '@fontsource/poppins/latin-800.css';
import './globals.css';
import { ToastProvider } from '@/components/toast';
import { env } from '@/lib/env';

export const metadata: Metadata = {
  metadataBase: new URL(env.appUrl),
  openGraph: { type: 'website', locale: 'fr_FR', siteName: 'Pro Spectre' },
  title: { default: 'Pro Spectre — Les bons prospects. Au bon moment.', template: '%s — Pro Spectre' },
  description: 'Identifiez les entreprises à fort potentiel commercial grâce à l’analyse de leurs activités et de leur présence digitale. Données officielles, score explicable, CRM intégré.',
  applicationName: 'Pro Spectre',
  icons: { icon: [{ url: '/icon.svg', type: 'image/svg+xml' }, { url: '/icon-192.png', sizes: '192x192', type: 'image/png' }], apple: '/apple-touch-icon.png' },
};

export const viewport: Viewport = { themeColor: '#0b1230', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
