// Vibrations, maintien de l'écran allumé et préférences locales.

export function vibrate(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* non supporté (iOS) */
  }
}

type WakeLockSentinelLike = { release: () => Promise<void>; released?: boolean };
let lock: WakeLockSentinelLike | null = null;
let wanted = false;

async function acquire() {
  if (!wanted || document.visibilityState !== 'visible') return;
  try {
    const wl = (navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<WakeLockSentinelLike> } }).wakeLock;
    if (!wl || (lock && !lock.released)) return;
    lock = await wl.request('screen');
  } catch {
    /* refusé ou non supporté */
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') void acquire();
});

export function keepAwake(on: boolean) {
  wanted = on;
  if (on) void acquire();
  else if (lock) {
    void lock.release().catch(() => {});
    lock = null;
  }
}

export interface Profile {
  name: string;
  avatar: number;
}

export function loadProfile(): Profile {
  try {
    const p = JSON.parse(localStorage.getItem('taupe:profile') ?? 'null');
    if (p && typeof p.name === 'string' && Number.isInteger(p.avatar)) return p;
  } catch {
    /* ignore */
  }
  return { name: '', avatar: Math.floor(Math.random() * 24) };
}

export function saveProfile(p: Profile) {
  localStorage.setItem('taupe:profile', JSON.stringify(p));
}

export type Note = 'trust' | 'doubt' | 'suspect';

function notesKey(code: string, round: number) {
  return `taupe:notes:${code}:${round}`;
}

export function loadNotes(code: string, round: number): Record<string, Note> {
  try {
    return JSON.parse(localStorage.getItem(notesKey(code, round)) ?? '{}');
  } catch {
    return {};
  }
}

export function saveNotes(code: string, round: number, notes: Record<string, Note>) {
  try {
    localStorage.setItem(notesKey(code, round), JSON.stringify(notes));
  } catch {
    /* ignore */
  }
}
