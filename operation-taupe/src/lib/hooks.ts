import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { loadNotes, saveNotes, type Note } from './device.ts';
import { serverNow, useStore } from '../net.ts';
import type { ClientState, PublicPlayer } from '../../shared/types.ts';

/** Re-render régulier pour les comptes à rebours. */
export function useNow(interval = 200): number {
  const [now, setNow] = useState(serverNow());
  useEffect(() => {
    const t = setInterval(() => setNow(serverNow()), interval);
    return () => clearInterval(t);
  }, [interval]);
  return now;
}

export function useCountdown(endsAt: number | null | undefined, duration?: number | null) {
  const now = useNow(150);
  if (!endsAt) return { left: 0, seconds: 0, ratio: 1, active: false };
  const left = Math.max(0, endsAt - now);
  const ratio = duration ? Math.min(1, left / duration) : 1;
  return { left, seconds: Math.ceil(left / 1000), ratio, active: true };
}

/** Temps écoulé depuis le début de la phase (ms). */
export function usePhaseElapsed(): number {
  const s = useStore((st) => st.state);
  const now = useNow(200);
  if (!s?.phaseEndsAt || !s.phaseDuration) return 0;
  return Math.max(0, s.phaseDuration - (s.phaseEndsAt - now));
}

export function useGame(): ClientState {
  return useStore((s) => s.state) as ClientState;
}

export function usePlayers(): Record<string, PublicPlayer> {
  const players = useStore((s) => s.state?.players);
  const ref = useRef<{ src?: PublicPlayer[]; map: Record<string, PublicPlayer> }>({ map: {} });
  if (ref.current.src !== players) {
    ref.current = { src: players, map: Object.fromEntries((players ?? []).map((p) => [p.id, p])) };
  }
  return ref.current.map;
}

// Carnet de suspicion local, partagé entre les écrans d'une même série.
const noteListeners = new Set<() => void>();
let noteCache: { key: string; notes: Record<string, Note> } = { key: '', notes: {} };

export function useNotes(code: string, round: number) {
  const key = `${code}:${round}`;
  if (noteCache.key !== key) noteCache = { key, notes: loadNotes(code, round) };
  const notes = useSyncExternalStore(
    (cb) => {
      noteListeners.add(cb);
      return () => noteListeners.delete(cb);
    },
    () => noteCache.notes,
  );
  const setNote = (playerId: string, note: Note | null) => {
    const next = { ...noteCache.notes };
    if (note) next[playerId] = note;
    else delete next[playerId];
    noteCache = { key, notes: next };
    saveNotes(code, round, next);
    noteListeners.forEach((l) => l());
  };
  return [notes, setNote] as const;
}

/** Déclenche un effet une seule fois par valeur de clé. */
export function useOnce(key: string | number | null | undefined, fn: () => void) {
  const last = useRef<string | number | null | undefined>(undefined);
  useEffect(() => {
    if (key === null || key === undefined || last.current === key) return;
    last.current = key;
    fn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
