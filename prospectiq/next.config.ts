import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
];

const nextConfig: NextConfig = {
  // PGlite (Postgres embarqué, utilisé en local sans DATABASE_URL) ne doit pas être empaqueté.
  serverExternalPackages: ['@electric-sql/pglite'],
  // Fichiers binaires de PGlite, chargés à l'exécution : à inclure dans les fonctions serveur (Vercel sans base externe).
  outputFileTracingIncludes: { '/**/*': ['./node_modules/@electric-sql/pglite/dist/pglite.wasm', './node_modules/@electric-sql/pglite/dist/pglite.data'] },
  // Sortie autonome uniquement pour les tests locaux de déploiement (NEXT_STANDALONE=1).
  output: process.env.NEXT_STANDALONE ? 'standalone' : undefined,
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
