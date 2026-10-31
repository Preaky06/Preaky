import express from 'express';
import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';
import type { ClientToServer, ServerToClient } from '../shared/types.ts';
import { BANK } from './questions/bank.ts';
import { RoomManager } from './rooms.ts';

export function lanAddresses(): string[] {
  const out: string[] = [];
  for (const list of Object.values(networkInterfaces())) {
    for (const i of list ?? []) {
      if (i.family === 'IPv4' && !i.internal) out.push(i.address);
    }
  }
  return out;
}

export function createApp({ port = 3000, timeScale = 1, serveClient = true } = {}) {
  const app = express();
  const http = createServer(app);
  const io = new Server<ClientToServer, ServerToClient>(http, {
    cors: { origin: true },
    pingInterval: 10_000,
    pingTimeout: 20_000,
  });
  const manager = new RoomManager(io, timeScale);

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, rooms: manager.rooms.size, questions: BANK.length });
  });

  const counts: Record<string, Record<number, number>> = {};
  for (const q of BANK) {
    counts[q.category] ??= { 1: 0, 2: 0, 3: 0 };
    counts[q.category][q.difficulty]++;
  }
  app.get('/api/categories', (_req, res) => {
    res.json(counts);
  });

  app.get('/api/info', (_req, res) => {
    res.json({ lan: lanAddresses(), port });
  });

  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const dist = join(root, 'dist');
  if (serveClient && existsSync(dist)) {
    app.use(
      express.static(dist, {
        index: false,
        setHeaders(res, path) {
          if (path.includes(`${join('dist', 'assets')}`)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          else res.setHeader('Cache-Control', 'no-cache');
        },
      }),
    );
    app.get(/^\/(?!api|socket\.io).*/, (_req, res) => res.sendFile(join(dist, 'index.html')));
  }

  io.on('connection', (socket) => manager.handle(socket));

  return {
    http,
    io,
    manager,
    listen: () =>
      new Promise<number>((resolve) => {
        http.listen(port, '0.0.0.0', () => {
          const addr = http.address();
          resolve(typeof addr === 'object' && addr ? addr.port : port);
        });
      }),
    close: () =>
      new Promise<void>((resolve) => {
        manager.close();
        io.close();
        http.close(() => resolve());
      }),
  };
}

const isMain = !!process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const port = Number(process.env.PORT) || 3000;
  const timeScale = Number(process.env.TIME_SCALE) || 1;
  const app = createApp({ port, timeScale });
  app.listen().then((p) => {
    const hasClient = existsSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'dist'));
    console.log('\n  🕵️  SNEAKY — QG en ligne\n');
    console.log(`  Sur cet ordinateur : http://localhost:${p}`);
    for (const ip of lanAddresses()) console.log(`  Sur le Wi-Fi      : http://${ip}:${p}`);
    if (!hasClient) console.log('\n  (Interface non compilée : lance « npm run build » ou utilise « npm run dev »)');
    console.log(`\n  ${BANK.length} questions chargées.\n`);
  });
}
