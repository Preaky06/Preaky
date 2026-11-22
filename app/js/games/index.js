import bubbles from './bubbles.js';
import constellation from './constellation.js';
import slicer from './slicer.js';
import golf from './golf.js';
import tug from './tug.js';
import draw from './draw.js';
import dots from './dots.js';
import arrows from './arrows.js';
import oddone from './oddone.js';
import digits from './digits.js';
import patterns from './patterns.js';
import balance from './balance.js';

// « Défi chacun son tour » : n'importe quel jeu solo, mêmes défis pour tous (même graine).
export const duel = {
  id: 'duel',
  kind: 'party',
  domain: 'concentration',
  world: 'w-duel',
  name: 'Défi chacun son tour',
  tagline: 'Même jeu, mêmes défis : passez-vous le téléphone.',
  trains: 'Au choix, selon le jeu',
  party: { min: 2, max: 4, pickGame: true, options: [['level', 'Difficulté', [[2, 'Facile'], [6, 'Moyen'], [10, 'Costaud']], 2]] },
};

export const ARCADE = [bubbles, constellation, slicer];
export const PARTY = [tug, draw, dots, golf, duel];
export const CLASSICS = [arrows, oddone, digits, patterns, balance];
export const SOLO = [...ARCADE, ...CLASSICS];
export const GAMES = [...ARCADE, ...CLASSICS, tug, draw, dots, golf];
export const gameById = id => (id === 'duel' ? duel : GAMES.find(g => g.id === id));
