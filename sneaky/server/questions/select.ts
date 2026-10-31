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

/**
 * Construit les séries de questions. Les questions maison sont toujours incluses en priorité,
 * le reste vient de la banque en évitant les questions déjà posées dans ce salon.
 */
export function buildRounds(
  settings: Settings,
  custom: CustomQuestion[],
  used: Set<string>,
): PreparedQuestion[][] | null {
  const need = settings.rounds * settings.questionsPerRound;
  const customPool = settings.useCustom ? shuffle(customToBank(custom)) : [];
  const bank = bankPool(settings);
  if (bank.length + customPool.length < need) return null;

  let fresh = bank.filter((q) => !used.has(q.id));
  const fromBank = Math.max(0, need - customPool.length);
  if (fresh.length < fromBank) {
    for (const q of bank) used.delete(q.id);
    fresh = bank;
  }

  const picked = [...customPool.slice(0, need), ...shuffle(fresh).slice(0, fromBank)];
  for (const q of picked) used.add(q.id);

  // Répartition : on évite deux questions de la même catégorie dans une série quand c'est possible.
  const remaining = shuffle(picked);
  const rounds: BankQuestion[][] = [];
  for (let r = 0; r < settings.rounds; r++) {
    const round: BankQuestion[] = [];
    while (round.length < settings.questionsPerRound) {
      const cats = new Set(round.map((q) => q.category));
      let idx = remaining.findIndex((q) => !cats.has(q.category));
      if (idx === -1) idx = 0;
      round.push(remaining.splice(idx, 1)[0]);
    }
    round.sort((a, b) => a.difficulty - b.difficulty);
    rounds.push(round);
  }
  return rounds.map((round) => round.map(prepare));
}
