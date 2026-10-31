// Types partagés entre le serveur et le client.

export type Phase =
  | 'lobby'
  | 'roleReveal'
  | 'question'
  | 'questionResult'
  | 'meeting'
  | 'vote'
  | 'voteResult'
  | 'roundEnd'
  | 'gameEnd';

export type CategoryId =
  | 'histoire'
  | 'geo'
  | 'sciences'
  | 'nature'
  | 'arts'
  | 'cinema'
  | 'musique'
  | 'sport'
  | 'gastro'
  | 'tech'
  | 'langue'
  | 'insolite'
  | 'perso';

export type Difficulty = 'mixed' | 'easy' | 'hard';

export type Role = 'agent' | 'mole';

export type SabotageKind = 'jam' | 'rush' | 'falsify';

/** Ce que l'on montre à tous après chaque question : juste/faux seulement, ou aussi la réponse choisie. */
export type RevealMode = 'correctness' | 'full';

export type AnswerStatus = 'ok' | 'ko' | 'none';

export interface Settings {
  rounds: number;
  questionsPerRound: number;
  questionTime: number;
  meetingTime: number;
  voteTime: number;
  categories: CategoryId[];
  difficulty: Difficulty;
  sabotages: boolean;
  speakingTurns: boolean;
  speakingTime: number;
  emergencyPerPlayer: number;
  useCustom: boolean;
  revealAnswers: RevealMode;
}

export interface CustomQuestion {
  q: string;
  answers: [string, string, string, string]; // la première est la bonne
}

export interface PublicPlayer {
  id: string;
  name: string;
  avatar: number;
  isHost: boolean;
  connected: boolean;
  score: number;
  emergencyLeft: number;
  benched: boolean;
  locked: boolean;
  ready: boolean;
  hasVoted: boolean;
  joinedMidGame: boolean;
}

export type IntelKind = 'innocent' | 'intercept' | 'circle' | 'accuracy' | 'tempo';

export interface Intel {
  id: string;
  kind: IntelKind;
  title: string;
  text: string;
  playerIds: string[];
}

export interface QuestionView {
  index: number;
  category: CategoryId;
  difficulty: 1 | 2 | 3;
  text: string;
  options: string[];
  /** Visible uniquement pour la taupe pendant la question, puis pour tous au résultat. */
  correct: number | null;
  myAnswer: number | null;
  myLocked: boolean;
  jammed: boolean;
  rushed: boolean;
}

export interface QuestionResultView {
  index: number;
  correct: number;
  distribution: number[];
  majority: number | null;
  success: boolean;
  myAnswer: number | null;
  myCorrect: boolean;
  lockOrder: string[];
  intelUnlocked: boolean;
  isLast: boolean;
  /** Résultat de chaque joueur, visible par tous. */
  results: Record<string, AnswerStatus>;
  /** Réponse choisie par chaque joueur (uniquement si le réglage « réponses complètes » est actif). */
  picks: Record<string, number | null> | null;
}

export interface RoundLogEntry {
  index: number;
  category: CategoryId;
  text: string;
  options: string[];
  correct: number;
  distribution: number[];
  majority: number | null;
  success: boolean;
  lockOrder: string[];
  jammed: boolean;
  rushed: boolean;
  results: Record<string, AnswerStatus>;
  picks: Record<string, number | null> | null;
}

export interface MissionView {
  correct: number;
  played: number;
  total: number;
  intelUnlocked: number;
  intelMax: number;
  intelEvery: number;
}

export interface MeetingView {
  kind: 'emergency' | 'final';
  calledBy: string | null;
  intel: Intel[];
  falsified: boolean;
  archive: { intel: Intel[]; falsified: boolean }[];
  accusations: Record<string, string[]>;
  defenses: Record<string, string[]>;
  speakerId: string | null;
  speakerEndsAt: number | null;
  speakerQueue: string[];
  skipVotes: string[];
  skipNeeded: number;
}

export interface VoteView {
  kind: 'emergency' | 'final';
  eligible: string[];
  votedIds: string[];
  myVote: string | null;
}

export interface VoteResultView {
  kind: 'emergency' | 'final';
  votes: { voter: string; target: string }[];
  tally: Record<string, number>;
  skipCount: number;
  accusedId: string | null;
  accusedWasMole: boolean | null;
}

export interface ScoreLine {
  label: string;
  points: number;
}

export interface RoundEndView {
  round: number;
  moleId: string | null;
  moleName: string;
  outcome: 'caught' | 'escaped' | 'left';
  caughtIn: 'emergency' | 'final' | null;
  sabotagesUsed: { kind: SabotageKind; question: number }[];
  teamCorrect: number;
  played: number;
  moleAnswers: (number | null)[];
  log: RoundLogEntry[];
  deltas: Record<string, number>;
  myLines: ScoreLine[];
}

export interface Award {
  id: string;
  emoji: string;
  title: string;
  description: string;
  playerId: string;
  value: string;
}

export interface GameEndView {
  ranking: { id: string; score: number }[];
  awards: Award[];
  rounds: { round: number; moleId: string | null; outcome: RoundEndView['outcome'] }[];
}

export interface MoleView {
  sabotagesLeft: SabotageKind[];
  queued: SabotageKind[];
  available: SabotageKind[];
}

export interface ClientState {
  serverNow: number;
  code: string;
  hostId: string;
  phase: Phase;
  paused: boolean;
  phaseEndsAt: number | null;
  phaseDuration: number | null;
  settings: Settings;
  players: PublicPlayer[];
  round: number;
  totalRounds: number;
  questionIndex: number;
  customCount: number;
  spectator: boolean;
  me: {
    id: string;
    role: Role | null;
    emergencyLeft: number;
    benched: boolean;
  } | null;
  mole: MoleView | null;
  mission: MissionView | null;
  question: QuestionView | null;
  questionResult: QuestionResultView | null;
  history: RoundLogEntry[];
  meeting: MeetingView | null;
  vote: VoteView | null;
  voteResult: VoteResultView | null;
  roundEnd: RoundEndView | null;
  gameEnd: GameEndView | null;
  feed: FeedItem[];
}

export interface FeedItem {
  id: number;
  at: number;
  text: string;
  tone: 'info' | 'alert' | 'good' | 'bad';
}

export interface JoinAck {
  ok: boolean;
  error?: string;
  code?: string;
  playerId?: string;
  token?: string;
}

export interface Ack {
  ok: boolean;
  error?: string;
}

export interface ClientToServer {
  'room:create': (p: { name: string; avatar: number }, ack: (r: JoinAck) => void) => void;
  'room:join': (p: { code: string; name: string; avatar: number }, ack: (r: JoinAck) => void) => void;
  'room:resume': (p: { code: string; playerId: string; token: string }, ack: (r: JoinAck) => void) => void;
  'room:spectate': (p: { code: string }, ack: (r: Ack) => void) => void;
  'room:leave': () => void;
  'player:profile': (p: { name: string; avatar: number }) => void;
  'host:settings': (p: Partial<Settings>) => void;
  'host:custom': (p: CustomQuestion[], ack: (r: Ack & { count?: number }) => void) => void;
  'host:kick': (p: { playerId: string }) => void;
  'host:transfer': (p: { playerId: string }) => void;
  'host:start': (ack: (r: Ack) => void) => void;
  'host:next': () => void;
  'host:pause': () => void;
  'host:lobby': () => void;
  'role:ready': () => void;
  'answer:select': (p: { index: number; option: number }) => void;
  'answer:lock': (p: { index: number }) => void;
  'mole:sabotage': (p: { kind: SabotageKind }, ack: (r: Ack) => void) => void;
  'meeting:emergency': (ack: (r: Ack) => void) => void;
  'meeting:accuse': (p: { targetId: string }) => void;
  'meeting:defend': (p: { targetId: string }) => void;
  'meeting:react': (p: { emoji: string }) => void;
  'meeting:skip': () => void;
  'meeting:pass': () => void;
  'vote:cast': (p: { targetId: string }) => void;
}

export interface ServerToClient {
  state: (s: ClientState) => void;
  reaction: (r: { playerId: string; emoji: string }) => void;
  kicked: () => void;
}
