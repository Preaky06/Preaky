import arrows from './arrows.js';
import oddone from './oddone.js';
import sequence from './sequence.js';
import digits from './digits.js';
import patterns from './patterns.js';
import balance from './balance.js';

export const GAMES = [arrows, oddone, sequence, digits, patterns, balance];
export const gameById = id => GAMES.find(g => g.id === id);
