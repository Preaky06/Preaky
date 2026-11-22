// Données locales : réglages, statistiques, parties en cours. Tout reste sur l'appareil.
import { dayKey } from './util.js';

const KEY = 'preaky-casse-tetes:v1';

function defaults() {
  return {
    v: 1,
    settings: { text: 'm', theme: 'auto', errors: true, timer: true, sound: false, haptics: true },
    stats: {},   // stats[puzzleId][levelId] = { solved, best, total, hints }
    games: {},   // parties en cours : games[clé] = { id, level, daily, seed, puzzle, state, elapsed, updated }
    daily: {},   // daily[jour] = { id, level, time }
    seen: {},    // règles déjà vues
  };
}

let data = defaults();
let persistent = true;

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw);
      const d = defaults();
      data = { ...d, ...p, settings: { ...d.settings, ...p.settings } };
    }
  } catch {
    persistent = false;
  }
  return data;
}

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    persistent = true;
  } catch {
    persistent = false;
  }
}

export function reset() {
  data = defaults();
  try { localStorage.removeItem(KEY); } catch { /* stockage indisponible */ }
}

export const db = () => data;
export const settings = () => data.settings;
export const isPersistent = () => persistent;

export const gameKey = (id, daily) => (daily ? `jour-${dayKey()}` : id);
export const getGame = key => data.games[key] || null;

export function putGame(key, game) {
  data.games[key] = { ...game, updated: Date.now() };
  save();
}

export function dropGame(key) {
  delete data.games[key];
  save();
}

// Partie en cours la plus récente (hors casse-tête du jour), pour « Reprendre ».
export function lastGame() {
  return Object.entries(data.games)
    .filter(([k]) => !k.startsWith('jour-'))
    .sort((a, b) => b[1].updated - a[1].updated)
    .map(([k, g]) => ({ key: k, ...g }))[0] || null;
}

export function statsOf(id, level) {
  return data.stats[id]?.[level] || { solved: 0, best: null, total: 0, hints: 0 };
}

export function solvedCount(id) {
  return Object.values(data.stats[id] || {}).reduce((a, s) => a + s.solved, 0);
}

export const totalSolved = () => Object.keys(data.stats).reduce((a, id) => a + solvedCount(id), 0);

export function recordSolve(id, level, ms, hints, daily) {
  const byId = data.stats[id] || (data.stats[id] = {});
  const s = byId[level] || (byId[level] = { solved: 0, best: null, total: 0, hints: 0 });
  const prevBest = s.best;
  s.solved++;
  s.total += ms;
  s.hints += hints;
  // Un record ne compte que sans indice, pour rester honnête.
  const record = hints === 0 && (prevBest == null || ms < prevBest);
  if (record) s.best = ms;
  if (daily) data.daily[dayKey()] = { id, level, time: ms };
  save();
  return { record, prevBest, solved: s.solved };
}

export const dailyDone = (k = dayKey()) => data.daily[k] || null;

// Jours consécutifs avec le casse-tête du jour résolu (aujourd'hui compris s'il est fait).
export function dailyStreak() {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  if (!data.daily[dayKey(d)]) d.setDate(d.getDate() - 1);
  let n = 0;
  while (data.daily[dayKey(d)]) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
