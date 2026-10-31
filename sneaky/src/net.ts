import { io, type Socket } from 'socket.io-client';
import { useSyncExternalStore } from 'react';
import type { Ack, ClientState, ClientToServer, JoinAck, ServerToClient } from '../shared/types.ts';

export interface Session {
  code: string;
  playerId: string;
  token: string;
}

export interface Toast {
  id: number;
  text: string;
  tone: 'info' | 'good' | 'bad' | 'alert';
}

export interface FloatingReaction {
  id: number;
  playerId: string;
  emoji: string;
  x: number;
}

interface Store {
  connection: 'connecting' | 'online' | 'offline';
  state: ClientState | null;
  session: Session | null;
  boardCode: string | null;
  offset: number;
  toasts: Toast[];
  reactions: FloatingReaction[];
  kicked: boolean;
  resuming: boolean;
}

const SESSION_KEY = 'taupe:session';

function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

function saveSession(s: Session | null) {
  try {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* stockage indisponible (navigation privée) */
  }
}

const params = new URLSearchParams(location.search);
const boardParam = params.get('board')?.toUpperCase() ?? null;

let store: Store = {
  connection: 'connecting',
  state: null,
  session: boardParam ? null : loadSession(),
  boardCode: boardParam,
  offset: 0,
  toasts: [],
  reactions: [],
  kicked: false,
  resuming: !boardParam && !!loadSession(),
};

const listeners = new Set<() => void>();
function set(patch: Partial<Store>) {
  store = { ...store, ...patch };
  listeners.forEach((l) => l());
}

export function useStore<T>(selector: (s: Store) => T): T {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => selector(store),
  );
}

export function getStore() {
  return store;
}

/** Heure serveur estimée (ms). */
export function serverNow(): number {
  return Date.now() + store.offset;
}

export const socket: Socket<ServerToClient, ClientToServer> = io({
  transports: ['websocket', 'polling'],
  reconnectionDelay: 500,
  reconnectionDelayMax: 3000,
});

let toastSeq = 0;
export function toast(text: string, tone: Toast['tone'] = 'info') {
  const t = { id: ++toastSeq, text, tone };
  set({ toasts: [...store.toasts, t].slice(-3) });
  setTimeout(() => set({ toasts: store.toasts.filter((x) => x.id !== t.id) }), 3200);
}

function resume() {
  if (store.boardCode) {
    socket.emit('room:spectate', { code: store.boardCode }, (r) => {
      if (!r.ok) {
        toast(r.error ?? 'Plateau introuvable.', 'bad');
        set({ boardCode: null });
        history.replaceState(null, '', '/');
      }
    });
    return;
  }
  const s = store.session;
  if (!s) {
    set({ resuming: false });
    return;
  }
  set({ resuming: true });
  socket.emit('room:resume', s, (r) => {
    if (!r.ok) {
      saveSession(null);
      set({ session: null, state: null, resuming: false });
    } else {
      set({ resuming: false });
    }
  });
}

socket.on('connect', () => {
  set({ connection: 'online' });
  resume();
});
socket.on('disconnect', () => set({ connection: 'offline' }));
socket.io.on('reconnect_attempt', () => set({ connection: 'connecting' }));

socket.on('state', (s) => {
  set({ state: s, offset: s.serverNow - Date.now() });
});

let reactionSeq = 0;
socket.on('reaction', (r) => {
  const item = { id: ++reactionSeq, playerId: r.playerId, emoji: r.emoji, x: 8 + Math.random() * 84 };
  set({ reactions: [...store.reactions, item].slice(-24) });
  setTimeout(() => set({ reactions: store.reactions.filter((x) => x.id !== item.id) }), 2600);
});

socket.on('kicked', () => {
  saveSession(null);
  set({ session: null, state: null, kicked: true });
});

function onJoin(r: JoinAck): JoinAck {
  if (r.ok && r.code && r.playerId && r.token) {
    const s = { code: r.code, playerId: r.playerId, token: r.token };
    saveSession(s);
    set({ session: s, kicked: false });
    history.replaceState(null, '', '/');
  }
  return r;
}

function emitAck<T>(fn: (cb: (r: T) => void) => void, timeout = 6000): Promise<T | { ok: false; error: string }> {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve({ ok: false, error: 'Le QG ne répond pas. Vérifie ta connexion.' }), timeout);
    fn((r) => {
      clearTimeout(t);
      resolve(r);
    });
  });
}

export const api = {
  create: (name: string, avatar: number) =>
    emitAck<JoinAck>((cb) => socket.emit('room:create', { name, avatar }, cb)).then(onJoin),
  join: (code: string, name: string, avatar: number) =>
    emitAck<JoinAck>((cb) => socket.emit('room:join', { code, name, avatar }, cb)).then(onJoin),
  spectate: (code: string) => {
    set({ boardCode: code.toUpperCase() });
    history.replaceState(null, '', `/?board=${code.toUpperCase()}`);
    resume();
  },
  leave: () => {
    socket.emit('room:leave');
    saveSession(null);
    set({ session: null, state: null, boardCode: null });
    history.replaceState(null, '', '/');
  },
  dismissKick: () => set({ kicked: false }),
  profile: (name: string, avatar: number) => socket.emit('player:profile', { name, avatar }),
  settings: (patch: Parameters<ClientToServer['host:settings']>[0]) => socket.emit('host:settings', patch),
  custom: (list: Parameters<ClientToServer['host:custom']>[0]) =>
    emitAck<Ack & { count?: number }>((cb) => socket.emit('host:custom', list, cb)),
  kick: (playerId: string) => socket.emit('host:kick', { playerId }),
  transfer: (playerId: string) => socket.emit('host:transfer', { playerId }),
  start: () => emitAck<Ack>((cb) => socket.emit('host:start', cb)),
  next: () => socket.emit('host:next'),
  pause: () => socket.emit('host:pause'),
  lobby: () => socket.emit('host:lobby'),
  ready: () => socket.emit('role:ready'),
  select: (index: number, option: number) => socket.emit('answer:select', { index, option }),
  lock: (index: number) => socket.emit('answer:lock', { index }),
  sabotage: (kind: Parameters<ClientToServer['mole:sabotage']>[0]['kind']) =>
    emitAck<Ack>((cb) => socket.emit('mole:sabotage', { kind }, cb)),
  emergency: () => emitAck<Ack>((cb) => socket.emit('meeting:emergency', cb)),
  accuse: (targetId: string) => socket.emit('meeting:accuse', { targetId }),
  defend: (targetId: string) => socket.emit('meeting:defend', { targetId }),
  react: (emoji: string) => socket.emit('meeting:react', { emoji }),
  skip: () => socket.emit('meeting:skip'),
  pass: () => socket.emit('meeting:pass'),
  vote: (targetId: string) => socket.emit('vote:cast', { targetId }),
};
