import type { CategoryId, CustomQuestion, Settings } from '../../shared/types.ts';
import { BANK, type BankQuestion } from './bank.ts';
import { shuffle } from '../util.ts';

export interface PreparedQuestion {
  id: string;
  category: CategoryId;
  difficulty: 1 | 2 | 3;
  text: string;
  options: string[];
  correct: number;
}

function matchesDifficulty(q: BankQuestion, d: Settings['difficulty']): boolean {
  if (d === 'easy') return q.difficulty <= 2;
  if (d === 'hard') return q.difficulty >= 2;
  return true;
}

export function bankPool(settings: Settings): BankQuestion[] {
  const cats = new Set(settings.categories);
  return BANK.filter((q) => cats.has(q.category) && matchesDifficulty(q, settings.difficulty));
}

export function availableCount(settings: Settings, custom: CustomQuestion[]): number {
  return bankPool(settings).length + (settings.useCustom ? custom.length : 0);
}

export function customToBank(custom: CustomQuestion[]): BankQuestion[] {
  return custom.map((c, i) => ({
    id: `perso-${i}-${c.q.slice(0, 12)}`,
    category: 'perso' as CategoryId,
    difficulty: 2 as const,
    text: c.q,
    answers: c.answers,
  }));
}

function prepare(q: BankQuestion): PreparedQuestion {
  const order = shuffle([0, 1, 2, 3]);
  return {
    id: q.id,
    category: q.category,
    difficulty: q.difficulty,
    text: q.text,
    options: order.map((i) => q.answers[i]),
    correct: order.indexOf(0),
  };
}

type Level = 1 | 2 | 3;

/**
 * Courbe de difficulté : part de l'échauffement (surtout faciles) et monte doucement.
 * Même en dernière série, les questions moyennes restent majoritaires et les difficiles plafonnent à ~35 %.
 */
export function levelWeights(progress: number, difficulty: Settings['difficulty']): Record<Level, number> {
  const t = Math.min(1, Math.max(0, progress));
  const w: Record<Level, number> = { 1: 0.6 - 0.45 * t, 2: 0.35 + 0.15 * t, 3: 0.05 + 0.3 * t };
  // Les niveaux exclus par le réglage reportent leur poids sur le niveau autorisé le plus proche.
  if (difficulty === 'easy') {
    w[2] += w[3];
    w[3] = 0;
  } else if (difficulty === 'hard') {
    w[2] += w[1];
    w[1] = 0;
  }
  return w;
}

/** Nombre de questions de chaque niveau pour une série (arrondi au plus fort reste, égalités au profit du niveau moyen). */
export function levelPlan(count: number, progress: number, difficulty: Settings['difficulty']): Level[] {
  const w = levelWeights(progress, difficulty);
  const levels: Level[] = [1, 2, 3];
  const raw = levels.map((l) => w[l] * count);
  const n = raw.map(Math.floor);
  let missing = count - n.reduce((a, b) => a + b, 0);
  const order = levels
    .map((l, i) => ({ i, rest: raw[i] - n[i], medium: l === 2 ? 1 : 0 }))
    .filter((x) => w[levels[x.i]] > 0)
    .sort((a, b) => b.rest - a.rest || b.medium - a.medium);
  for (const x of order) {
    if (missing <= 0) break;
    n[x.i]++;
    missing--;
  }
  return levels.flatMap((l, i) => Array.from({ length: n[i] }, () => l));
}

const FALLBACK: Record<Level, Level[]> = { 1: [1, 2, 3], 2: [2, 1, 3], 3: [3, 2, 1] };

/**
 * Construit les séries de questions, de plus en plus corsées au fil de la partie.
 * Les questions maison sont toujours incluses en priorité ; le reste vient de la banque
 * en évitant les questions déjà posées dans ce salon et deux fois la même catégorie dans une série.
 */
export function buildRounds(
  settings: Settings,
  custom: CustomQuestion[],
  used: Set<string>,
): PreparedQuestion[][] | null {
  const need = settings.rounds * settings.questionsPerRound;
  const customPool = settings.useCustom ? shuffle(customToBank(custom)).slice(0, need) : [];
  const bank = bankPool(settings);
  if (bank.length + customPool.length < need) return null;

  let fresh = bank.filter((q) => !used.has(q.id));
  if (fresh.length < need - customPool.length) {
    for (const q of bank) used.delete(q.id);
    fresh = bank;
  }

  const pools: Record<Level, BankQuestion[]> = { 1: [], 2: [], 3: [] };
  for (const q of shuffle(fresh)) pools[q.difficulty].push(q);

  const plans = Array.from({ length: settings.rounds }, (_, r) =>
    levelPlan(settings.questionsPerRound, settings.rounds === 1 ? 0.5 : r / (settings.rounds - 1), settings.difficulty),
  );
  const rounds: BankQuestion[][] = plans.map(() => []);

  // Questions maison : réparties entre les séries, sur les places de niveau moyen en priorité.
  customPool.forEach((q, k) => {
    const r = k % settings.rounds;
    const plan = plans[r].length ? plans[r] : plans.find((p) => p.length)!;
    const target = plans.indexOf(plan);
    const idx = [plan.indexOf(2), plan.indexOf(1), plan.indexOf(3)].find((i) => i >= 0)!;
    plan.splice(idx, 1);
    rounds[target].push(q);
  });

  rounds.forEach((round, r) => {
    for (const level of plans[r]) {
      const cats = new Set(round.map((q) => q.category));
      let chosen: BankQuestion | undefined;
      for (const l of FALLBACK[level]) {
        const pool = pools[l];
        if (!pool.length) continue;
        const idx = pool.findIndex((q) => !cats.has(q.category));
        chosen = pool.splice(idx === -1 ? 0 : idx, 1)[0];
        break;
      }
      if (chosen) round.push(chosen);
    }
    round.sort((a, b) => a.difficulty - b.difficulty);
    for (const q of round) used.add(q.id);
  });

  return rounds.map((round) => round.map(prepare));
}
