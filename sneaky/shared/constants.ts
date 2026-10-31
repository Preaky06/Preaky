import type { CategoryId, SabotageKind, Settings } from './types.ts';

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 12;
export const CODE_LENGTH = 4;
export const NAME_MAX = 14;

export const CATEGORIES: { id: CategoryId; label: string; emoji: string; color: string }[] = [
  { id: 'histoire', label: 'Histoire', emoji: '🏛️', color: '#E8A65D' },
  { id: 'geo', label: 'Géographie', emoji: '🌍', color: '#4FC3A1' },
  { id: 'sciences', label: 'Sciences', emoji: '🔬', color: '#6FA8FF' },
  { id: 'nature', label: 'Nature & Animaux', emoji: '🐾', color: '#8BD46E' },
  { id: 'arts', label: 'Arts & Littérature', emoji: '🎨', color: '#D98BFF' },
  { id: 'cinema', label: 'Cinéma & Séries', emoji: '🎬', color: '#FF8A65' },
  { id: 'musique', label: 'Musique', emoji: '🎵', color: '#FF6FB1' },
  { id: 'sport', label: 'Sport', emoji: '⚽', color: '#5ED6E8' },
  { id: 'gastro', label: 'Gastronomie', emoji: '🍽️', color: '#F2C94C' },
  { id: 'tech', label: 'Tech & Jeux vidéo', emoji: '💻', color: '#9D9DFF' },
  { id: 'langue', label: 'Langue française', emoji: '📚', color: '#C9B28F' },
  { id: 'insolite', label: 'Insolite', emoji: '🤯', color: '#FF5C7A' },
  { id: 'perso', label: 'Questions maison', emoji: '🏠', color: '#FFB547' },
];

export const BANK_CATEGORIES = CATEGORIES.filter((c) => c.id !== 'perso').map((c) => c.id);

export const AVATARS = [
  '🦊', '🐺', '🦉', '🐻', '🐼', '🐯', '🦁', '🐸', '🐙', '🦄', '🐵', '🐧',
  '🐨', '🦝', '🦔', '🐰', '🐲', '🦈', '🦩', '🐝', '🦎', '🐢', '🦇', '🐳',
];

export const AVATAR_COLORS = [
  '#FFB547', '#4FC3A1', '#6FA8FF', '#FF6FB1', '#8BD46E', '#D98BFF',
  '#5ED6E8', '#FF8A65', '#F2C94C', '#9D9DFF', '#C9B28F', '#FF5C7A',
];

export const REACTIONS = ['🤔', '😱', '🤥', '😂', '👀', '🔥', '🙏', '🐀'];

export const SABOTAGES: Record<SabotageKind, { label: string; emoji: string; description: string }> = {
  jam: {
    label: 'Brouillage',
    emoji: '📡',
    description: 'À la prochaine question, les réponses sont illisibles pendant 6 secondes sur tous les écrans. Toi, tu as ton dossier.',
  },
  rush: {
    label: 'Coupe-chrono',
    emoji: '⏱️',
    description: 'Le temps de la prochaine question est divisé par deux.',
  },
  falsify: {
    label: 'Falsification',
    emoji: '🖋️',
    description: 'Un indice de la prochaine réunion sera faux. Tout le monde saura qu’une pièce est truquée… mais pas laquelle.',
  },
};

export const JAM_SECONDS = 6;

export const POINTS = {
  agentCorrect: 100,
  agentVotedMole: 200,
  agentTeamCatch: 100,
  agentVotedInnocent: -50,
  moleFail: 150,
  moleEscape: 300,
  moleCaught: -200,
  moleMisdirect: 50,
};

export const LIMITS = {
  rounds: [1, 8],
  questionsPerRound: [3, 10],
  questionTime: [10, 60],
  meetingTime: [30, 300],
  voteTime: [15, 90],
  speakingTime: [10, 60],
  emergencyPerPlayer: [0, 3],
} as const;

export const DEFAULT_SETTINGS: Settings = {
  rounds: 4,
  questionsPerRound: 5,
  questionTime: 25,
  meetingTime: 120,
  voteTime: 30,
  categories: [...BANK_CATEGORIES],
  difficulty: 'mixed',
  sabotages: true,
  speakingTurns: false,
  speakingTime: 20,
  emergencyPerPlayer: 1,
  useCustom: true,
};

/** Un indice est débloqué toutes les N bonnes réponses collectives, au plus 3 par série. */
export function intelEvery(questionsPerRound: number): number {
  return questionsPerRound <= 4 ? 1 : 2;
}
export const INTEL_MAX_PER_ROUND = 3;

export function categoryOf(id: CategoryId) {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0];
}
