import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { io as connect, type Socket } from 'socket.io-client';
import { createApp } from '../server/index.ts';
import type { ClientState, ClientToServer, JoinAck, ServerToClient } from '../shared/types.ts';

type Client = Socket<ServerToClient, ClientToServer> & { last?: ClientState };

let app: ReturnType<typeof createApp>;
let url = '';

beforeAll(async () => {
  app = createApp({ port: 0, timeScale: 0.05, serveClient: false });
  const port = await app.listen();
  url = `http://localhost:${port}`;
});

afterAll(async () => {
  await app.close();
});

function client(): Promise<Client> {
  return new Promise((resolve) => {
    const s = connect(url, { transports: ['websocket'], forceNew: true }) as Client;
    s.on('state', (st) => (s.last = st));
    s.on('connect', () => resolve(s));
  });
}

function until(c: Client, pred: (s: ClientState) => boolean, timeout = 8000): Promise<ClientState> {
  return new Promise((resolve, reject) => {
    if (c.last && pred(c.last)) return resolve(c.last);
    const t = setTimeout(() => reject(new Error(`timeout (phase ${c.last?.phase})`)), timeout);
    const on = (s: ClientState) => {
      if (pred(s)) {
        clearTimeout(t);
        c.off('state', on);
        resolve(s);
      }
    };
    c.on('state', on);
  });
}

const ack = <T,>(fn: (cb: (r: T) => void) => void) => new Promise<T>((r) => fn(r));

describe('serveur temps réel', () => {
  it('crée, rejoint, reprend une session et protège les secrets', async () => {
    const [a, b, c] = await Promise.all([client(), client(), client()]);
    const created = await ack<JoinAck>((cb) => a.emit('room:create', { name: 'Alice', avatar: 0 }, cb));
    expect(created.ok).toBe(true);
    const code = created.code!;
    const jb = await ack<JoinAck>((cb) => b.emit('room:join', { code, name: 'Bob', avatar: 1 }, cb));
    const jc = await ack<JoinAck>((cb) => c.emit('room:join', { code: code.toLowerCase(), name: 'Alice', avatar: 2 }, cb));
    expect(jb.ok && jc.ok).toBe(true);
    const bad = await ack<JoinAck>((cb) => b.emit('room:join', { code: 'ZZZZ', name: 'X', avatar: 0 }, cb));
    expect(bad.ok).toBe(false);

    const lobby = await until(a, (s) => s.players.length === 3);
    expect(lobby.players.map((p) => p.name)).toContain('Alice 2');

    // Seul l'hôte peut lancer
    const notHost = await ack<{ ok: boolean }>((cb) => b.emit('host:start', cb));
    expect(notHost.ok).toBe(false);
    a.emit('host:settings', { rounds: 1, questionsPerRound: 3 });
    await until(a, (s) => s.settings.rounds === 1);
    const started = await ack<{ ok: boolean }>((cb) => a.emit('host:start', cb));
    expect(started.ok).toBe(true);

    const clients = [a, b, c];
    await Promise.all(clients.map((x) => until(x, (s) => s.phase === 'roleReveal')));
    const moles = clients.filter((x) => x.last!.me!.role === 'mole');
    expect(moles).toHaveLength(1);
    clients.forEach((x) => x.emit('role:ready'));
    await Promise.all(clients.map((x) => until(x, (s) => s.phase === 'question')));
    for (const x of clients) {
      const isMole = x.last!.me!.role === 'mole';
      expect(x.last!.question!.correct === null).toBe(!isMole);
    }

    // Reconnexion : Bob se déconnecte puis reprend sa session
    const role = b.last!.me!.role;
    b.disconnect();
    const b2 = await client();
    const resumed = await ack<JoinAck>((cb) => b2.emit('room:resume', { code, playerId: jb.playerId!, token: jb.token! }, cb));
    expect(resumed.ok).toBe(true);
    const back = await until(b2, (s) => s.phase === 'question' || s.phase === 'questionResult');
    expect(back.me!.role).toBe(role);
    const forged = await ack<JoinAck>((cb) => b2.emit('room:resume', { code, playerId: jb.playerId!, token: 'faux' }, cb));
    expect(forged.ok).toBe(false);

    // Fin de partie accélérée par l'hôte
    const all = [a, b2, c];
    let guard = 0;
    while (a.last!.phase !== 'gameEnd' && guard++ < 60) {
      const s = a.last!;
      if (s.phase === 'question') {
        all.forEach((x) => {
          x.emit('answer:select', { index: s.questionIndex, option: 0 });
          x.emit('answer:lock', { index: s.questionIndex });
        });
      }
      a.emit('host:next');
      await new Promise((r) => setTimeout(r, 60));
    }
    expect(a.last!.phase).toBe('gameEnd');
    expect(a.last!.gameEnd!.ranking).toHaveLength(3);

    a.emit('host:lobby');
    await until(c, (s) => s.phase === 'lobby');

    // Exclusion
    let kicked = false;
    c.on('kicked', () => (kicked = true));
    a.emit('host:kick', { playerId: jc.playerId! });
    await until(a, (s) => s.players.length === 2);
    await new Promise((r) => setTimeout(r, 50));
    expect(kicked).toBe(true);

    [a, b2, c].forEach((x) => x.disconnect());
  });

  it('expose une API de santé', async () => {
    const res = await fetch(`${url}/api/health`).then((r) => r.json());
    expect(res.ok).toBe(true);
    expect(res.questions).toBeGreaterThan(300);
  });
});
