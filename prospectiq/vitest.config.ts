import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      'server-only': path.resolve(__dirname, 'tests/stubs/server-only.ts'),
    },
  },
  test: {
    environment: 'node',
    include: process.env.LIVE ? ['tests/live/**/*.test.ts'] : ['tests/unit/**/*.test.ts'],
    env: {
      PGLITE_DIR: ':memory:',
      // Valeurs factices : aucun appel réseau n'est fait vers Stripe dans les tests unitaires.
      STRIPE_SECRET_KEY: 'sk_test_unit',
      STRIPE_WEBHOOK_SECRET: 'whsec_unit',
      STRIPE_PRICE_STARTER: 'price_starter',
      STRIPE_PRICE_PRO: 'price_pro',
      STRIPE_PRICE_BUSINESS: 'price_business',
    },
    testTimeout: 30000,
    hookTimeout: 60000,
    fileParallelism: false,
  },
});
