import sudoku from './sudoku.js';
import logimage from './logimage.js';
import mots from './mots.js';
import code from './code.js';
import taquin from './taquin.js';
import hanoi from './hanoi.js';
import interrupteurs from './interrupteurs.js';
import { hashStr } from '../util.js';

export const PUZZLES = [sudoku, logimage, mots, code, taquin, hanoi, interrupteurs];
export const puzzleById = id => PUZZLES.find(p => p.id === id);
export const levelOf = (p, levelId) => p.levels.find(l => l.id === levelId) || p.levels[0];

// Casse-tête du jour : un type différent chaque jour de la semaine, même grille pour tout le monde.
export function dailyFor(key) {
  const [y, m, d] = key.split('-').map(Number);
  const dow = (new Date(y, m - 1, d).getDay() + 6) % 7;
  const p = PUZZLES[dow % PUZZLES.length];
  return { puzzle: p, level: levelOf(p, p.daily), seed: hashStr(`jour:${key}`) };
}
