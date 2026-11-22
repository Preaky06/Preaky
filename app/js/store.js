// Données locales : tout reste sur l'appareil (pas de compte, pas de serveur).
import { clamp, dayKey } from './util.js';

const KEY = 'preaky-mind:v1';
const MAX_HISTORY = 600;

function defaults() {
  return {
    v: 1,
    profile: { name: '', style: '', onboarded: false },
    settings: { text: 'm', zen: false, sound: true, haptics: true },
    levels: {},
    plays: {},
    records: {},
    history: [],
    days: {},
    sessions: 0,
    flags: {},
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
      data = { ...d, ...p, profile: { ...d.profile, ...p.profile }, settings: { ...d.settings, ...p.settings }, flags: { ...d.flags, ...p.flags } };
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
export const isPersistent = () => persistent;

export function levelOf(id) {
  return data.levels[id] ?? (data.profile.style === 'dynamique' ? 3 : 1);
}
export const playsOf = id => data.plays[id] || 0;
export const recordOf = id => data.records[id];

export function touchDay() {
  const k = dayKey();
  const d = data.days[k] || (data.days[k] = { games: 0, sessions: 0 });
  d.games++;
}

export function recordGame(id, res, mode = 'free') {
  const prevLevel = levelOf(id);
  const past = data.history.filter(e => e.g === id);
  const prevBest = data.records[id];
  const recent = past.slice(-5).map(e => e.s);
  const avg = recent.length ? Math.round(recent.reduce((a, b) => a + b, 0) / recent.length) : null;
  const firstTime = past.length === 0;
  const isRecord = !firstTime && res.score > (prevBest ?? -Infinity);

  data.levels[id] = clamp(Math.round(res.nextLevel), 1, 20);
  data.plays[id] = playsOf(id) + 1;
  data.records[id] = Math.max(prevBest ?? res.score, res.score);
  data.history.push({ t: Date.now(), g: id, s: res.score, a: Math.round(res.accuracy * 100) / 100, l: prevLevel, m: mode === 'session' ? 's' : 'f' });
  if (data.history.length > MAX_HISTORY) data.history.splice(0, data.history.length - MAX_HISTORY);
  touchDay();
  save();
  return { firstTime, isRecord, prevBest, best: data.records[id], avg, prevLevel, newLevel: data.levels[id] };
}

export function recordSession() {
  const k = dayKey();
  const d = data.days[k] || (data.days[k] = { games: 0, sessions: 0 });
  d.sessions++;
  data.sessions++;
  save();
}

export const activeOn = k => !!data.days[k];
export const doneToday = () => (data.days[dayKey()]?.sessions || 0) > 0;
export const historyOf = (id, n = 12) => data.history.filter(e => e.g === id).slice(-n);
