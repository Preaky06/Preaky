// Données locales, multi-joueurs : chaque membre de la famille a son avatar, sa progression,
// ses gemmes. Tout reste sur l'appareil.
import { clamp, dayKey, weekKey, uid } from './util.js';
import { DEFAULT_AVATAR, FREE_ITEMS, randomAvatar } from './avatar.js';

const KEY = 'preaky-mind:v1';
const MAX_HISTORY = 600;

function newPlayer(name, avatar, extra = {}) {
  return {
    id: uid(),
    name,
    avatar: { ...(avatar || DEFAULT_AVATAR) },
    owned: [...FREE_ITEMS],
    xp: 0,
    coins: 60,
    style: '',
    levels: {},
    plays: {},
    records: {},
    history: [],
    days: {},
    sessions: 0,
    claims: {},
    weekly: {},
    wins: 0,
    created: Date.now(),
    ...extra,
  };
}

function defaults() {
  return {
    v: 2,
    onboarded: false,
    current: null,
    players: [],
    settings: { text: 'm', zen: false, sound: true, haptics: true },
    flags: {},
  };
}

// Version 1 (un seul profil) → version 2 (joueurs).
function migrate(p) {
  if (p.v === 2) return p;
  const d = defaults();
  const map = g => (g === 'sequence' ? 'constellation' : g);
  const remap = obj => Object.fromEntries(Object.entries(obj || {}).map(([k, v]) => [map(k), v]));
  const history = (p.history || []).map(e => ({ ...e, g: map(e.g) }));
  const pl = newPlayer(p.profile?.name || 'Moi', null, {
    style: p.profile?.style || '',
    levels: remap(p.levels),
    plays: remap(p.plays),
    records: remap(p.records),
    history,
    days: p.days || {},
    sessions: p.sessions || 0,
    xp: history.length * 30 + (p.sessions || 0) * 50,
    coins: 60 + history.length * 8,
  });
  return { ...d, onboarded: !!p.profile?.onboarded, current: pl.id, players: [pl], settings: { ...d.settings, ...p.settings } };
}

let data = defaults();
let persistent = true;

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const p = migrate(parsed);
      const d = defaults();
      data = { ...d, ...p, settings: { ...d.settings, ...p.settings }, flags: { ...d.flags, ...p.flags } };
      data.players = (data.players || []).map(pl => ({ ...newPlayer(pl.name), ...pl }));
      if (parsed.v !== 2) save();
    }
  } catch {
    persistent = false;
  }
  if (data.onboarded && !data.players.length) data.onboarded = false;
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
export const settings = () => data.settings;
export const players = () => data.players;
export const me = () => data.players.find(p => p.id === data.current) || data.players[0];
export const playerById = id => data.players.find(p => p.id === id);

export function createPlayer(name, avatar, { makeCurrent = false } = {}) {
  const pl = newPlayer(name.trim().slice(0, 18) || `Joueur ${data.players.length + 1}`, avatar || randomAvatar());
  data.players.push(pl);
  if (makeCurrent || !data.current) data.current = pl.id;
  save();
  return pl;
}

export function setCurrent(id) {
  if (playerById(id)) { data.current = id; save(); }
}

export function removePlayer(id) {
  if (data.players.length <= 1) return;
  data.players = data.players.filter(p => p.id !== id);
  if (data.current === id) data.current = data.players[0].id;
  save();
}

// ---------- Niveaux d'expérience ----------
// Niveau n atteint à 50·n·(n−1) XP : 100, 300, 600, 1000, 1500…
export function levelInfo(xp) {
  let level = 1;
  while (50 * (level + 1) * level <= xp) level++;
  const cur = 50 * level * (level - 1);
  const next = 50 * (level + 1) * level;
  return { level, cur, next, frac: (xp - cur) / (next - cur) };
}

export function award(pl, xp, coins) {
  const before = levelInfo(pl.xp).level;
  pl.xp += xp;
  pl.coins += coins;
  const wk = weekKey();
  pl.weekly[wk] = (pl.weekly[wk] || 0) + xp;
  const after = levelInfo(pl.xp).level;
  let bonus = 0;
  if (after > before) { bonus = 25 * (after - before); pl.coins += bonus; }
  return { xp, coins, levelBefore: before, levelAfter: after, levelBonus: bonus };
}

// ---------- Progression par jeu ----------
export function levelOf(id, pl = me()) {
  return pl?.levels[id] ?? (pl?.style === 'dynamique' ? 3 : 1);
}
export const playsOf = (id, pl = me()) => pl?.plays[id] || 0;
export const recordOf = (id, pl = me()) => pl?.records[id];
export const historyOf = (id, n = 12, pl = me()) => pl.history.filter(e => e.g === id).slice(-n);

export function touchDay(pl = me()) {
  const k = dayKey();
  const d = pl.days[k] || (pl.days[k] = { games: 0, sessions: 0 });
  d.games++;
}

export function recordGame(id, res, mode = 'free', pl = me()) {
  const prevLevel = levelOf(id, pl);
  const past = pl.history.filter(e => e.g === id);
  const prevBest = pl.records[id];
  const recent = past.slice(-5).map(e => e.s);
  const avg = recent.length ? Math.round(recent.reduce((a, b) => a + b, 0) / recent.length) : null;
  const firstTime = past.length === 0;
  const isRecord = !firstTime && res.score > (prevBest ?? -Infinity);

  pl.levels[id] = clamp(Math.round(res.nextLevel), 1, 20);
  pl.plays[id] = playsOf(id, pl) + 1;
  pl.records[id] = Math.max(prevBest ?? res.score, res.score);
  pl.history.push({ t: Date.now(), g: id, s: res.score, a: Math.round(res.accuracy * 100) / 100, l: prevLevel, m: mode === 'session' ? 's' : 'f' });
  if (pl.history.length > MAX_HISTORY) pl.history.splice(0, pl.history.length - MAX_HISTORY);
  touchDay(pl);
  const xp = 20 + Math.round(clamp(res.accuracy, 0, 1) * 30) + (isRecord ? 15 : 0);
  const coins = 5 + Math.round(clamp(res.accuracy, 0, 1) * 10) + (isRecord ? 10 : 0);
  const reward = award(pl, xp, coins);
  save();
  return { firstTime, isRecord, prevBest, best: pl.records[id], avg, prevLevel, newLevel: pl.levels[id], reward };
}

export function recordSession(pl = me()) {
  const k = dayKey();
  const d = pl.days[k] || (pl.days[k] = { games: 0, sessions: 0 });
  d.sessions++;
  pl.sessions++;
  const reward = award(pl, 50, 20);
  save();
  return reward;
}

// Partie à plusieurs : chaque profil (pas les invités) gagne de l'XP, le gagnant davantage.
export function recordParty(results) {
  const out = {};
  for (const { id, win, draw } of results) {
    const pl = playerById(id);
    if (!pl) continue;
    touchDay(pl);
    if (win) pl.wins++;
    out[id] = award(pl, win ? 45 : draw ? 30 : 20, win ? 15 : draw ? 8 : 5);
  }
  save();
  return out;
}

export const activeOn = (k, pl = me()) => !!pl?.days[k];
export const doneToday = (pl = me()) => (pl?.days[dayKey()]?.sessions || 0) > 0;
export const playedToday = (pl = me()) => !!pl?.days[dayKey()];

// ---------- Série (avec un jour de grâce) ----------
// Un jour oublié ne casse pas la série ; deux jours d'affilée, si.
export function streak(pl = me()) {
  if (!pl) return 0;
  const day = new Date();
  day.setHours(12, 0, 0, 0);
  if (!pl.days[dayKey(day)]) day.setDate(day.getDate() - 1);
  let count = 0;
  let misses = 0;
  for (let i = 0; i < 400; i++) {
    if (pl.days[dayKey(day)]) { count++; misses = 0; }
    else if (++misses >= 2 || count === 0) break;
    day.setDate(day.getDate() - 1);
  }
  return count;
}

export const dailyReward = n => 15 + 5 * Math.min(n, 10);
export const canClaim = (pl = me()) => playedToday(pl) && !pl.claims[dayKey()];

export function claim(pl = me()) {
  if (!canClaim(pl)) return 0;
  const amount = dailyReward(streak(pl));
  pl.claims[dayKey()] = amount;
  pl.coins += amount;
  save();
  return amount;
}

// ---------- Boutique ----------
export function buy(item, pl = me()) {
  if (pl.owned.includes(item.id) || pl.coins < item.price) return false;
  pl.coins -= item.price;
  pl.owned.push(item.id);
  pl.avatar[item.slot] = item.v;
  save();
  return true;
}

export function equip(item, pl = me()) {
  if (!pl.owned.includes(item.id)) return;
  pl.avatar[item.slot] = pl.avatar[item.slot] === item.v && item.slot !== 'color' && item.slot !== 'eyes' && item.slot !== 'mouth' ? 'none' : item.v;
  save();
}

export function weeklyXp(pl, wk = weekKey()) {
  return pl.weekly[wk] || 0;
}
