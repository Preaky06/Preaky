import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/inter';
import '@fontsource/instrument-serif/latin-400-italic.css';
import './globals.css';
import { ToastProvider } from '@/components/toast';

export const metadata: Metadata = {
  title: { default: 'Pro Spectre — Les bons prospects. Au bon moment.', template: '%s — Pro Spectre' },
  description: 'Identifiez les entreprises à fort potentiel commercial grâce à l’analyse de leurs activités et de leur présence digitale. Données officielles, score explicable, CRM intégré.',
  applicationName: 'Pro Spectre',
  icons: { icon: '/icon.svg' },
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
