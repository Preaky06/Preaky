import { execSync } from 'node:child_process';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/** Identifiant unique de chaque build : le serveur le compare à celui des téléphones pour les recharger après une mise à jour. */
function buildVersion() {
  let commit = process.env.RENDER_GIT_COMMIT ?? '';
  if (!commit) {
    try {
      commit = execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    } catch {
      /* pas de dépôt git */
    }
  }
  const date = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  const short = commit.slice(0, 7) || 'local';
  return { id: `${short}.${Date.now().toString(36)}`, label: `${short} · ${date}` };
}

export default defineConfig(({ command }) => {
  const version = command === 'build' ? buildVersion() : { id: 'dev', label: 'dev' };
  return {
    plugins: [
      react(),
      {
        name: 'sneaky-version',
        apply: 'build',
        generateBundle() {
          this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify(version) });
        },
      },
    ],
    define: {
      __APP_VERSION__: JSON.stringify(version.id),
      __APP_LABEL__: JSON.stringify(version.label),
    },
    server: {
      port: 5173,
      proxy: {
        '/socket.io': { target: 'http://localhost:3000', ws: true },
        '/api': { target: 'http://localhost:3000' },
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      chunkSizeWarningLimit: 900,
    },
  };
});
