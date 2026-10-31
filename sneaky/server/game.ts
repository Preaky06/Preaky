import { randomUUID } from 'node:crypto';
import {
  AVATARS,
  DEFAULT_SETTINGS,
  BANK_CATEGORIES,
  INTEL_MAX_PER_ROUND,
  JAM_SECONDS,
  LIMITS,
  MAX_PLAYERS,
  MIN_PLAYERS,
  NAME_MAX,
  POINTS,
  REACTIONS,
  SABOTAGES,
  intelEvery,
} from '../shared/constants.ts';
import type {
  Award,
  CategoryId,
  ClientState,
  CustomQuestion,
  FeedItem,
  Intel,
  IntelKind,
  Phase,
  PublicPlayer,
  QuestionResultView,
  Role,
  AnswerStatus,
  RoundEndView,
  RoundLogEntry,
  SabotageKind,
  ScoreLine,
  Settings,
} from '../shared/types.ts';
import { fakeIntel, trueIntel, type IntelContext } from './intel.ts';
import { availableCount, buildRounds, type PreparedQuestion } from './questions/select.ts';
import { clamp, cleanText, pick, shuffle } from './util.ts';

// Durées fixes (secondes)
const ROLE_REVEAL_TIME = 30;
const RESULT_TIME = 10;
const VOTE_RESULT_TIME = 10;
const ROUND_END_TIME = 30;
const ALL_DONE_DELAY = 1.2;

interface PlayerStats {
  correct: number;
  answered: number;
  moleRounds: number;
  moleEscapes: number;
  moleCaught: number;
  molePoints: number;
  votesOnMole: number;
  votesOnInnocent: number;
  votesReceivedInnocent: number;
  emergencies: number;
  sabotages: number;
  fastestLocks: number;
}

export interface Player {
  id: string;
  token: string;
  name: string;
  avatar: number;
  sockets: Set<string>;
  connected: boolean;
  disconnectedAt: number | null;
  score: number;
  shownScore: number;
  emergencyLeft: number;
  joinedAt: number;
  joinedMidGame: boolean;
  lastReactionAt: number;
  stats: PlayerStats;
}

interface AnswerRec {
  option: number | null;
  lockedAt: number | null;
}

interface LogEntry extends RoundLogEntry {
  answers: Record<string, number | null>;
}

interface RoundState {
  number: number;
  moleId: string | null;
  questions: PreparedQuestion[];
  qIndex: number;
  answers: Map<string, AnswerRec>;
  questionStartedAt: number;
  log: LogEntry[];
  teamCorrect: number;
  intelUnlocked: number;
  intelRevealed: number;
  intelArchive: { intel: Intel[]; falsified: boolean }[];
  confirmedInnocents: Set<string>;
  intercepted: Set<number>;
  usedIntelKinds: IntelKind[];
  sabotagesLeft: Set<SabotageKind>;
  sabotagesUsed: { kind: SabotageKind; question: number }[];
  queued: Set<SabotageKind>;
  jammed: boolean;
  rushed: boolean;
  benched: Set<string>;
  caughtIn: 'emergency' | 'final' | null;
  moleLeft: boolean;
  ready: Set<string>;
  lines: Map<string, Map<string, { points: number; count: number }>>;
  rewardedVoters: Set<string>;
  lastResult: Omit<QuestionResultView, 'myAnswer' | 'myCorrect'> | null;
}

interface MeetingState {
  kind: 'emergency' | 'final';
  calledBy: string | null;
  intel: Intel[];
  falsified: boolean;
  accusations: Map<string, Set<string>>;
  defenses: Map<string, Set<string>>;
  speakerQueue: string[];
  speakerId: string | null;
  speakerEndsAt: number | null;
  skipVotes: Set<string>;
}

interface VoteState {
  kind: 'emergency' | 'final';
  eligible: string[];
  votes: Map<string, string>;
}

interface VoteResultState {
  kind: 'emergency' | 'final';
  votes: { voter: string; target: string }[];
  tally: Record<string, number>;
  skipCount: number;
  accusedId: string | null;
  accusedWasMole: boolean | null;
}

interface RoundSummary {
  round: number;
  moleId: string | null;
  outcome: RoundEndView['outcome'];
}

export interface RoomHooks {
  onChange: (room: Room) => void;
  onReaction: (room: Room, playerId: string, emoji: string) => void;
  onKick: (room: Room, player: Player) => void;
}

const SKIP = 'skip';

function emptyStats(): PlayerStats {
  return {
    correct: 0,
    answered: 0,
    moleRounds: 0,
    moleEscapes: 0,
    moleCaught: 0,
    molePoints: 0,
    votesOnMole: 0,
    votesOnInnocent: 0,
    votesReceivedInnocent: 0,
    emergencies: 0,
    sabotages: 0,
    fastestLocks: 0,
  };
}

export class Room {
  readonly code: string;
  hostId = '';
  players = new Map<string, Player>();
  spectators = new Set<string>();
  settings: Settings = { ...DEFAULT_SETTINGS, categories: [...DEFAULT_SETTINGS.categories] };
  custom: CustomQuestion[] = [];
  phase: Phase = 'lobby';
  paused = false;
  phaseEndsAt: number | null = null;
  phaseDuration: number | null = null;
  rounds: PreparedQuestion[][] = [];
  round: RoundState | null = null;
  meeting: MeetingState | null = null;
  vote: VoteState | null = null;
  voteResult: VoteResultState | null = null;
  roundEnd: RoundEndView | null = null;
  summaries: RoundSummary[] = [];
  feed: FeedItem[] = [];
  usedQuestions = new Set<string>();
  createdAt = Date.now();
  lastActivity = Date.now();

  private feedSeq = 0;
  private timer: NodeJS.Timeout | null = null;
  private timerFn: (() => void) | null = null;
  private pausedRemaining = 0;
  private speakerTimer: NodeJS.Timeout | null = null;
  private speakerRemaining = 0;
  private changeQueued = false;
  private gameAwards: Award[] = [];

  constructor(
    code: string,
    private hooks: RoomHooks,
    private timeScale = 1,
  ) {
    this.code = code;
  }

  // ───────────────────────────── Utilitaires ─────────────────────────────

  private changed() {
    this.lastActivity = Date.now();
    if (this.changeQueued) return;
    this.changeQueued = true;
    queueMicrotask(() => {
      this.changeQueued = false;
      this.hooks.onChange(this);
    });
  }

  private log(text: string, tone: FeedItem['tone'] = 'info') {
    this.feed.push({ id: ++this.feedSeq, at: Date.now(), text, tone });
    if (this.feed.length > 30) this.feed.shift();
  }

  private name(id: string | null): string {
    if (!id) return '???';
    return this.players.get(id)?.name ?? 'Un agent disparu';
  }

  private schedule(seconds: number, fn: () => void) {
    this.clearTimer();
    const ms = Math.max(50, seconds * 1000 * this.timeScale);
    this.timerFn = fn;
    this.phaseDuration = ms;
    if (this.paused) {
      this.pausedRemaining = ms;
      this.phaseEndsAt = null;
      return;
    }
    this.phaseEndsAt = Date.now() + ms;
    this.timer = setTimeout(() => this.fireTimer(), ms);
  }

  private fireTimer() {
    this.timer = null;
    const fn = this.timerFn;
    this.timerFn = null;
    this.phaseEndsAt = null;
    fn?.();
    this.changed();
  }

  private clearTimer() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.timerFn = null;
    this.phaseEndsAt = null;
  }

  private clearSpeakerTimer() {
    if (this.speakerTimer) clearTimeout(this.speakerTimer);
    this.speakerTimer = null;
  }

  private setPhase(phase: Phase) {
    this.phase = phase;
  }

  dispose() {
    this.clearTimer();
    this.clearSpeakerTimer();
  }

  connectedPlayers(): Player[] {
    return [...this.players.values()].filter((p) => p.connected);
  }

  private inRound(): boolean {
    return ['roleReveal', 'question', 'questionResult', 'meeting', 'vote', 'voteResult', 'roundEnd'].includes(this.phase);
  }

  private roleOf(id: string): Role | null {
    if (!this.round || !this.inRound()) return null;
    return this.round.moleId === id ? 'mole' : 'agent';
  }

  private addLine(playerId: string, label: string, points: number) {
    if (!this.round) return;
    let m = this.round.lines.get(playerId);
    if (!m) {
      m = new Map();
      this.round.lines.set(playerId, m);
    }
    const cur = m.get(label) ?? { points: 0, count: 0 };
    cur.points += points;
    cur.count += 1;
    m.set(label, cur);
    const p = this.players.get(playerId);
    if (p) p.score += points;
    if (p && this.round.moleId === playerId) p.stats.molePoints += points;
  }

  // ───────────────────────────── Joueurs ─────────────────────────────

  addPlayer(rawName: string, avatar: number): Player | string {
    if (this.players.size >= MAX_PLAYERS) return 'Le salon est complet (12 agents maximum).';
    if (this.phase === 'gameEnd') return 'La partie se termine, attends le retour au salon.';
    let name = cleanText(rawName, NAME_MAX) || 'Agent';
    const taken = new Set([...this.players.values()].map((p) => p.name.toLowerCase()));
    if (taken.has(name.toLowerCase())) {
      let i = 2;
      while (taken.has(`${name} ${i}`.toLowerCase())) i++;
      name = `${name.slice(0, NAME_MAX - 2)} ${i}`;
    }
    const p: Player = {
      id: randomUUID(),
      token: randomUUID(),
      name,
      avatar: this.freeAvatar(Number.isInteger(avatar) && avatar >= 0 && avatar < AVATARS.length ? avatar : 0),
      sockets: new Set(),
      connected: false,
      disconnectedAt: null,
      score: 0,
      shownScore: 0,
      emergencyLeft: this.settings.emergencyPerPlayer,
      joinedAt: Date.now(),
      joinedMidGame: this.phase !== 'lobby',
      lastReactionAt: 0,
      stats: emptyStats(),
    };
    this.players.set(p.id, p);
    if (!this.hostId || !this.players.has(this.hostId)) this.hostId = p.id;
    this.log(`${p.name} a rejoint l'opération.`, 'good');
    this.changed();
    return p;
  }

  /** Les avatars servent à reconnaître les joueurs d'un coup d'œil : on évite les doublons. */
  private freeAvatar(wanted: number, exceptId?: string): number {
    const used = new Set([...this.players.values()].filter((p) => p.id !== exceptId).map((p) => p.avatar));
    for (let i = 0; i < AVATARS.length; i++) {
      const a = (wanted + i) % AVATARS.length;
      if (!used.has(a)) return a;
    }
    return wanted;
  }

  attach(player: Player, socketId: string) {
    player.sockets.add(socketId);
    if (!player.connected) {
      player.connected = true;
      player.disconnectedAt = null;
    }
    this.changed();
  }

  detach(socketId: string): Player | null {
    this.spectators.delete(socketId);
    for (const p of this.players.values()) {
      if (p.sockets.delete(socketId)) {
        if (p.sockets.size === 0) {
          p.connected = false;
          p.disconnectedAt = Date.now();
          this.onPlayerAway(p.id);
        }
        this.changed();
        return p;
      }
    }
    return null;
  }

  updateProfile(playerId: string, rawName: string, avatar: number) {
    const p = this.players.get(playerId);
    if (!p || this.phase !== 'lobby') return;
    const name = cleanText(rawName, NAME_MAX);
    if (name && ![...this.players.values()].some((o) => o.id !== p.id && o.name.toLowerCase() === name.toLowerCase())) {
      p.name = name;
    }
    if (Number.isInteger(avatar) && avatar >= 0 && avatar < AVATARS.length) p.avatar = this.freeAvatar(avatar, p.id);
    this.changed();
  }

  removePlayer(playerId: string, reason: 'left' | 'kicked' | 'timeout') {
    const p = this.players.get(playerId);
    if (!p) return;
    this.players.delete(playerId);
    if (reason === 'kicked') this.hooks.onKick(this, p);
    this.log(
      reason === 'kicked' ? `${p.name} a été exclu(e) du salon.` : `${p.name} a quitté l'opération.`,
      'bad',
    );
    if (this.hostId === playerId) this.transferHost();
    if (this.round) {
      this.round.answers.delete(playerId);
      this.round.ready.delete(playerId);
      this.round.benched.delete(playerId);
      this.round.confirmedInnocents.delete(playerId);
      if (this.round.moleId === playerId && this.inRound() && this.phase !== 'roundEnd') {
        this.round.moleLeft = true;
        this.log('La taupe a pris la fuite ! La série est interrompue.', 'alert');
        this.endRound();
        return;
      }
    }
    if (this.meeting) {
      this.meeting.accusations.delete(playerId);
      this.meeting.defenses.delete(playerId);
      for (const s of this.meeting.accusations.values()) s.delete(playerId);
      for (const s of this.meeting.defenses.values()) s.delete(playerId);
      this.meeting.skipVotes.delete(playerId);
      this.meeting.speakerQueue = this.meeting.speakerQueue.filter((id) => id !== playerId);
    }
    if (this.vote) {
      this.vote.eligible = this.vote.eligible.filter((id) => id !== playerId);
      this.vote.votes.delete(playerId);
      for (const [voter, target] of this.vote.votes) if (target === playerId) this.vote.votes.delete(voter);
    }
    this.onPlayerAway(playerId);
    this.changed();
  }

  /** Appelé quand un joueur se déconnecte ou part : on débloque les phases qui l'attendaient. */
  private onPlayerAway(playerId: string) {
    if (this.meeting?.speakerId === playerId) this.nextSpeaker();
    this.checkEarlyEnd();
  }

  transferHost(to?: string) {
    if (to && this.players.has(to)) {
      this.hostId = to;
    } else {
      const candidates = [...this.players.values()].sort((a, b) => a.joinedAt - b.joinedAt);
      const next = candidates.find((p) => p.connected) ?? candidates[0];
      this.hostId = next?.id ?? '';
    }
    if (this.hostId) this.log(`${this.name(this.hostId)} est maintenant chef d'opération.`);
    this.changed();
  }

  /** Maintenance périodique : transfert d'hôte et nettoyage des fantômes du salon. */
  tick(now: number) {
    const host = this.players.get(this.hostId);
    if (host && !host.connected && host.disconnectedAt && now - host.disconnectedAt > 30_000) {
      const other = this.connectedPlayers()[0];
      if (other) this.transferHost(other.id);
    }
    if (this.phase === 'lobby') {
      for (const p of this.players.values()) {
        if (!p.connected && p.disconnectedAt && now - p.disconnectedAt > 5 * 60_000) this.removePlayer(p.id, 'timeout');
      }
    }
  }

  // ───────────────────────────── Réglages ─────────────────────────────

  updateSettings(patch: Partial<Settings>) {
    if (this.phase !== 'lobby') return;
    const s = this.settings;
    const next: Settings = {
      rounds: clamp(patch.rounds ?? s.rounds, LIMITS.rounds, s.rounds),
      questionsPerRound: clamp(patch.questionsPerRound ?? s.questionsPerRound, LIMITS.questionsPerRound, s.questionsPerRound),
      questionTime: clamp(patch.questionTime ?? s.questionTime, LIMITS.questionTime, s.questionTime),
      meetingTime: clamp(patch.meetingTime ?? s.meetingTime, LIMITS.meetingTime, s.meetingTime),
      voteTime: clamp(patch.voteTime ?? s.voteTime, LIMITS.voteTime, s.voteTime),
      speakingTime: clamp(patch.speakingTime ?? s.speakingTime, LIMITS.speakingTime, s.speakingTime),
      emergencyPerPlayer: clamp(patch.emergencyPerPlayer ?? s.emergencyPerPlayer, LIMITS.emergencyPerPlayer, s.emergencyPerPlayer),
      categories: Array.isArray(patch.categories)
        ? [...new Set(patch.categories.filter((c): c is CategoryId => (BANK_CATEGORIES as string[]).includes(c)))]
        : s.categories,
      difficulty: patch.difficulty && ['mixed', 'easy', 'hard'].includes(patch.difficulty) ? patch.difficulty : s.difficulty,
      sabotages: typeof patch.sabotages === 'boolean' ? patch.sabotages : s.sabotages,
      speakingTurns: typeof patch.speakingTurns === 'boolean' ? patch.speakingTurns : s.speakingTurns,
      useCustom: typeof patch.useCustom === 'boolean' ? patch.useCustom : s.useCustom,
      revealAnswers: patch.revealAnswers === 'full' || patch.revealAnswers === 'correctness' ? patch.revealAnswers : s.revealAnswers,
    };
    this.settings = next;
    for (const p of this.players.values()) p.emergencyLeft = next.emergencyPerPlayer;
    this.changed();
  }

  setCustom(list: unknown): number | string {
    if (this.phase !== 'lobby') return 'Impossible pendant une partie.';
    if (!Array.isArray(list)) return 'Format invalide.';
    const clean: CustomQuestion[] = [];
    for (const item of list.slice(0, 60)) {
      const q = cleanText(item?.q, 160);
      const answers = Array.isArray(item?.answers) ? item.answers.map((a: unknown) => cleanText(a, 70)) : [];
      if (!q || answers.length !== 4 || answers.some((a: string) => !a)) continue;
      if (new Set(answers.map((a: string) => a.toLowerCase())).size !== 4) continue;
      clean.push({ q, answers: answers as CustomQuestion['answers'] });
    }
    this.custom = clean;
    this.changed();
    return clean.length;
  }

  // ───────────────────────────── Déroulé de la partie ─────────────────────────────

  start(): string | null {
    if (this.phase !== 'lobby') return 'La partie a déjà commencé.';
    const active = this.connectedPlayers();
    if (active.length < MIN_PLAYERS) return `Il faut au moins ${MIN_PLAYERS} agents connectés pour lancer l'opération.`;
    const rounds = buildRounds(this.settings, this.custom, this.usedQuestions);
    if (!rounds) {
      const have = availableCount(this.settings, this.custom);
      return `Pas assez de questions (${have} disponibles pour ${this.settings.rounds * this.settings.questionsPerRound} nécessaires). Ajoute des catégories ou réduis le nombre de questions.`;
    }
    this.rounds = rounds;
    this.summaries = [];
    this.gameAwards = [];
    for (const p of this.players.values()) {
      p.score = 0;
      p.shownScore = 0;
      p.emergencyLeft = this.settings.emergencyPerPlayer;
      p.joinedMidGame = false;
      p.stats = emptyStats();
    }
    this.feed = [];
    this.log('Opération lancée. Une taupe s’est infiltrée parmi vous…', 'alert');
    this.startRound(1);
    return null;
  }

  private startRound(n: number) {
    this.meeting = null;
    this.vote = null;
    this.voteResult = null;
    this.roundEnd = null;
    const candidates = this.connectedPlayers();
    const pool = candidates.length ? candidates : [...this.players.values()];
    const mole = pick(pool);
    mole.stats.moleRounds++;
    for (const p of this.players.values()) p.joinedMidGame = false;
    this.round = {
      number: n,
      moleId: mole.id,
      questions: this.rounds[n - 1],
      qIndex: -1,
      answers: new Map(),
      questionStartedAt: 0,
      log: [],
      teamCorrect: 0,
      intelUnlocked: 0,
      intelRevealed: 0,
      intelArchive: [],
      confirmedInnocents: new Set(),
      intercepted: new Set(),
      usedIntelKinds: [],
      sabotagesLeft: new Set(this.settings.sabotages ? (Object.keys(SABOTAGES) as SabotageKind[]) : []),
      sabotagesUsed: [],
      queued: new Set(),
      jammed: false,
      rushed: false,
      benched: new Set(),
      caughtIn: null,
      moleLeft: false,
      ready: new Set(),
      lines: new Map(),
      rewardedVoters: new Set(),
      lastResult: null,
    };
    this.setPhase('roleReveal');
    this.log(`Série ${n} : les rôles sont distribués. Vérifiez votre dossier en secret.`);
    this.schedule(ROLE_REVEAL_TIME, () => this.startQuestion(0));
    this.changed();
  }

  setReady(playerId: string) {
    if (!this.round || !this.players.has(playerId)) return;
    if (this.phase !== 'roleReveal' && this.phase !== 'roundEnd') return;
    this.round.ready.add(playerId);
    this.checkEarlyEnd();
    this.changed();
  }

  private startQuestion(index: number) {
    const r = this.round;
    if (!r) return;
    r.qIndex = index;
    r.answers = new Map();
    r.jammed = r.queued.delete('jam');
    r.rushed = r.queued.delete('rush');
    for (const kind of ['jam', 'rush'] as const) {
      if ((kind === 'jam' && r.jammed) || (kind === 'rush' && r.rushed)) {
        r.sabotagesUsed.push({ kind, question: index + 1 });
      }
    }
    if (r.jammed) this.log('📡 Brouillage détecté sur les transmissions !', 'alert');
    if (r.rushed) this.log('⏱️ Le chrono a été saboté : temps divisé par deux !', 'alert');
    this.meeting = null;
    this.vote = null;
    this.voteResult = null;
    r.lastResult = null;
    this.setPhase('question');
    r.questionStartedAt = Date.now();
    const time = r.rushed ? Math.max(8, Math.ceil(this.settings.questionTime / 2)) : this.settings.questionTime;
    this.schedule(time + (r.jammed ? JAM_SECONDS / 2 : 0), () => this.endQuestion());
    this.changed();
  }

  select(playerId: string, index: number, option: number) {
    const r = this.round;
    if (!r || this.phase !== 'question' || r.qIndex !== index) return;
    if (!this.players.has(playerId) || !Number.isInteger(option) || option < 0 || option > 3) return;
    const cur = r.answers.get(playerId);
    if (cur?.lockedAt) return;
    r.answers.set(playerId, { option, lockedAt: null });
    this.changed();
  }

  lock(playerId: string, index: number) {
    const r = this.round;
    if (!r || this.phase !== 'question' || r.qIndex !== index) return;
    const cur = r.answers.get(playerId);
    if (!cur || cur.option === null || cur.lockedAt) return;
    cur.lockedAt = Date.now();
    this.checkEarlyEnd();
    this.changed();
  }

  private endQuestion() {
    const r = this.round;
    if (!r) return;
    const q = r.questions[r.qIndex];
    const distribution = [0, 0, 0, 0];
    const answers: Record<string, number | null> = {};
    const results: Record<string, AnswerStatus> = {};
    for (const p of this.players.values()) {
      const a = r.answers.get(p.id);
      answers[p.id] = a?.option ?? null;
      results[p.id] = answers[p.id] === null ? 'none' : answers[p.id] === q.correct ? 'ok' : 'ko';
      if (a?.option !== null && a?.option !== undefined) distribution[a.option]++;
    }
    const picks = this.settings.revealAnswers === 'full' ? { ...answers } : null;
    const max = Math.max(...distribution);
    const tops = distribution.map((c, i) => (c === max ? i : -1)).filter((i) => i >= 0);
    const majority = max > 0 && tops.length === 1 ? tops[0] : null;
    const success = majority === q.correct;
    const lockOrder = [...r.answers.entries()]
      .filter(([, a]) => a.lockedAt)
      .sort((a, b) => (a[1].lockedAt ?? 0) - (b[1].lockedAt ?? 0))
      .map(([id]) => id);

    if (lockOrder[0]) {
      const first = this.players.get(lockOrder[0]);
      if (first) first.stats.fastestLocks++;
    }

    for (const p of this.players.values()) {
      const a = answers[p.id];
      if (p.id === r.moleId) continue;
      if (a !== null) p.stats.answered++;
      if (a === q.correct) {
        p.stats.correct++;
        this.addLine(p.id, 'Bonnes réponses', POINTS.agentCorrect);
      }
    }

    let intelUnlocked = false;
    if (success) {
      r.teamCorrect++;
      const every = intelEvery(this.settings.questionsPerRound);
      if (r.teamCorrect % every === 0 && r.intelUnlocked < INTEL_MAX_PER_ROUND) {
        r.intelUnlocked++;
        intelUnlocked = true;
      }
    } else if (r.moleId && this.players.has(r.moleId)) {
      this.addLine(r.moleId, 'Missions sabotées', POINTS.moleFail);
    }

    r.log.push({
      index: r.qIndex,
      category: q.category,
      text: q.text,
      options: q.options,
      correct: q.correct,
      distribution,
      majority,
      success,
      lockOrder,
      jammed: r.jammed,
      rushed: r.rushed,
      results,
      picks,
      answers,
    });

    const isLast = r.qIndex >= r.questions.length - 1;
    r.lastResult = {
      index: r.qIndex,
      correct: q.correct,
      distribution,
      majority,
      success,
      lockOrder,
      intelUnlocked,
      isLast,
      results,
      picks,
    };
    this.log(
      success ? `Question ${r.qIndex + 1} : mission réussie.` : `Question ${r.qIndex + 1} : mission échouée.`,
      success ? 'good' : 'bad',
    );
    if (intelUnlocked) this.log('🗂️ Nouvel indice débloqué pour la prochaine réunion.', 'good');
    this.setPhase('questionResult');
    this.schedule(RESULT_TIME, () => this.afterResult());
    this.changed();
  }

  private afterResult() {
    const r = this.round;
    if (!r) return;
    if (r.qIndex >= r.questions.length - 1) this.startMeeting('final', null);
    else this.startQuestion(r.qIndex + 1);
  }

  // ───────────────────────────── Sabotages ─────────────────────────────

  private sabotageBlock(kind: SabotageKind): string | null {
    const r = this.round;
    if (!r) return 'Aucune série en cours.';
    if (!SABOTAGES[kind]) return 'Sabotage inconnu.';
    if (!['roleReveal', 'question', 'questionResult'].includes(this.phase)) return 'Impossible maintenant.';
    if (!r.sabotagesLeft.has(kind)) return 'Sabotage déjà utilisé cette série.';
    if (kind === 'jam' || kind === 'rush') {
      const hasNext = this.phase === 'roleReveal' || r.qIndex < r.questions.length - 1;
      if (!hasNext) return 'Plus aucune question à saboter.';
      if (r.queued.has('jam') || r.queued.has('rush')) return 'Un sabotage est déjà programmé pour la prochaine question.';
    }
    return null;
  }

  sabotage(playerId: string, kind: SabotageKind): string | null {
    const r = this.round;
    if (!r || r.moleId !== playerId) return 'Seule la taupe peut saboter.';
    const block = this.sabotageBlock(kind);
    if (block) return block;
    r.sabotagesLeft.delete(kind);
    r.queued.add(kind);
    this.players.get(playerId)!.stats.sabotages++;
    this.changed();
    return null;
  }

  // ───────────────────────────── Réunions ─────────────────────────────

  emergency(playerId: string): string | null {
    const r = this.round;
    const p = this.players.get(playerId);
    if (!r || !p) return 'Aucune série en cours.';
    if (this.phase !== 'questionResult') return 'Une réunion ne peut être convoquée qu’entre deux questions.';
    if (r.lastResult?.isLast) return 'Le briefing de fin de série arrive de toute façon.';
    if (r.benched.has(playerId)) return 'Tu as été écarté(e), tu ne peux plus convoquer de réunion.';
    if (p.emergencyLeft <= 0) return 'Tu as déjà utilisé ta réunion d’urgence.';
    p.emergencyLeft--;
    p.stats.emergencies++;
    this.startMeeting('emergency', playerId);
    return null;
  }

  private intelContext(): IntelContext | null {
    const r = this.round;
    if (!r || !r.moleId) return null;
    const names: Record<string, string> = {};
    for (const p of this.players.values()) names[p.id] = p.name;
    const suspects = [...this.players.keys()].filter((id) => !r.benched.has(id) && !r.confirmedInnocents.has(id));
    return {
      moleId: r.moleId,
      suspects,
      names,
      log: r.log.map((e) => ({
        index: e.index,
        options: e.options,
        correct: e.correct,
        answers: e.answers,
        lockOrder: e.lockOrder,
      })),
      intercepted: r.intercepted,
      usedKinds: r.usedIntelKinds,
      reveal: this.settings.revealAnswers,
    };
  }

  private startMeeting(kind: 'emergency' | 'final', calledBy: string | null) {
    const r = this.round;
    if (!r) return;
    const intel: Intel[] = [];
    const ctx = this.intelContext();
    if (ctx) {
      while (r.intelRevealed < r.intelUnlocked) {
        r.intelRevealed++;
        const it = trueIntel(ctx);
        if (!it) continue;
        intel.push(it);
        if (it.kind === 'innocent') r.confirmedInnocents.add(it.playerIds[0]);
      }
    }
    let falsified = false;
    if (r.queued.has('falsify') && intel.length > 0 && ctx) {
      const fake = fakeIntel(ctx);
      if (fake) {
        r.queued.delete('falsify');
        falsified = true;
        r.sabotagesUsed.push({ kind: 'falsify', question: r.qIndex + 1 });
        intel.splice(Math.floor(Math.random() * (intel.length + 1)), 0, fake);
      }
    }

    const speakers = shuffle(this.connectedPlayers().map((p) => p.id));
    if (calledBy && speakers.includes(calledBy)) {
      speakers.splice(speakers.indexOf(calledBy), 1);
      speakers.unshift(calledBy);
    }
    this.meeting = {
      kind,
      calledBy,
      intel,
      falsified,
      accusations: new Map(),
      defenses: new Map(),
      speakerQueue: this.settings.speakingTurns ? speakers : [],
      speakerId: null,
      speakerEndsAt: null,
      skipVotes: new Set(),
    };
    this.setPhase('meeting');
    if (kind === 'emergency') this.log(`🚨 ${this.name(calledBy)} convoque une réunion d'urgence !`, 'alert');
    else this.log(`Briefing de fin de série ${r.number} : débattez, puis votez.`, 'alert');
    if (falsified) this.log('⚠️ Une pièce du dossier a été falsifiée par la taupe.', 'alert');

    let duration = this.settings.meetingTime;
    if (this.settings.speakingTurns) {
      duration = Math.max(duration, speakers.length * this.settings.speakingTime + 20);
      this.nextSpeaker();
    }
    this.schedule(duration, () => this.startVote());
    this.changed();
  }

  private nextSpeaker() {
    const m = this.meeting;
    this.clearSpeakerTimer();
    if (!m || this.phase !== 'meeting') return;
    let next = m.speakerQueue.shift();
    while (next && !this.players.get(next)?.connected) next = m.speakerQueue.shift();
    if (!next) {
      m.speakerId = null;
      m.speakerEndsAt = null;
      this.changed();
      return;
    }
    m.speakerId = next;
    const ms = this.settings.speakingTime * 1000 * this.timeScale;
    if (this.paused) {
      this.speakerRemaining = ms;
      m.speakerEndsAt = null;
    } else {
      m.speakerEndsAt = Date.now() + ms;
      this.speakerTimer = setTimeout(() => this.nextSpeaker(), ms);
    }
    this.changed();
  }

  passTurn(playerId: string) {
    const m = this.meeting;
    if (!m || this.phase !== 'meeting') return;
    if (m.speakerId !== playerId && playerId !== this.hostId) return;
    this.nextSpeaker();
  }

  private toggle(map: Map<string, Set<string>>, target: string, from: string) {
    let s = map.get(target);
    if (!s) {
      s = new Set();
      map.set(target, s);
    }
    if (s.has(from)) s.delete(from);
    else s.add(from);
  }

  accuse(playerId: string, targetId: string) {
    const m = this.meeting;
    if (!m || this.phase !== 'meeting' || playerId === targetId) return;
    if (!this.players.has(playerId) || !this.players.has(targetId)) return;
    m.defenses.get(targetId)?.delete(playerId);
    const had = m.accusations.get(targetId)?.has(playerId);
    this.toggle(m.accusations, targetId, playerId);
    if (!had) this.log(`👉 ${this.name(playerId)} soupçonne ${this.name(targetId)}.`, 'bad');
    this.changed();
  }

  defend(playerId: string, targetId: string) {
    const m = this.meeting;
    if (!m || this.phase !== 'meeting' || playerId === targetId) return;
    if (!this.players.has(playerId) || !this.players.has(targetId)) return;
    m.accusations.get(targetId)?.delete(playerId);
    const had = m.defenses.get(targetId)?.has(playerId);
    this.toggle(m.defenses, targetId, playerId);
    if (!had) this.log(`🛡️ ${this.name(playerId)} se porte garant(e) de ${this.name(targetId)}.`, 'good');
    this.changed();
  }

  react(playerId: string, emoji: string) {
    const p = this.players.get(playerId);
    if (!p || !REACTIONS.includes(emoji)) return;
    const now = Date.now();
    if (now - p.lastReactionAt < 500) return;
    p.lastReactionAt = now;
    this.hooks.onReaction(this, playerId, emoji);
  }

  private voters(): string[] {
    const r = this.round;
    return [...this.players.keys()].filter((id) => !r?.benched.has(id));
  }

  private skipNeeded(): number {
    const active = this.voters().filter((id) => this.players.get(id)?.connected).length;
    return Math.floor(active / 2) + 1;
  }

  skipMeeting(playerId: string) {
    const m = this.meeting;
    if (!m || this.phase !== 'meeting' || !this.voters().includes(playerId)) return;
    if (m.skipVotes.has(playerId)) m.skipVotes.delete(playerId);
    else m.skipVotes.add(playerId);
    this.checkEarlyEnd();
    this.changed();
  }

  // ───────────────────────────── Votes ─────────────────────────────

  private startVote() {
    this.clearSpeakerTimer();
    const m = this.meeting;
    if (!m) return;
    if (m.intel.length) this.round?.intelArchive.push({ intel: m.intel, falsified: m.falsified });
    this.vote = { kind: m.kind, eligible: this.voters(), votes: new Map() };
    this.setPhase('vote');
    this.schedule(this.settings.voteTime, () => this.endVote());
    this.changed();
  }

  castVote(playerId: string, targetId: string) {
    const v = this.vote;
    if (!v || this.phase !== 'vote' || !v.eligible.includes(playerId)) return;
    if (targetId !== SKIP && (!v.eligible.includes(targetId) || targetId === playerId)) return;
    v.votes.set(playerId, targetId);
    this.checkEarlyEnd();
    this.changed();
  }

  private endVote() {
    const v = this.vote;
    const r = this.round;
    if (!v || !r) return;
    const tally: Record<string, number> = {};
    const votes: { voter: string; target: string }[] = [];
    let skipCount = 0;
    for (const voter of v.eligible) {
      if (!this.players.has(voter)) continue;
      const target = v.votes.get(voter);
      if (!target && !this.players.get(voter)?.connected) continue;
      if (!target || target === SKIP || !this.players.has(target)) {
        skipCount++;
        votes.push({ voter, target: SKIP });
        continue;
      }
      tally[target] = (tally[target] ?? 0) + 1;
      votes.push({ voter, target });
    }
    const entries = Object.entries(tally).sort((a, b) => b[1] - a[1]);
    let accusedId: string | null = null;
    if (entries.length && entries[0][1] > skipCount && (entries.length === 1 || entries[0][1] > entries[1][1])) {
      accusedId = entries[0][0];
    }
    const moleId = r.moleId;
    const accusedWasMole = accusedId ? accusedId === moleId : null;

    // Points et statistiques
    let misdirected = 0;
    for (const { voter, target } of votes) {
      if (target === SKIP || voter === moleId) continue;
      const p = this.players.get(voter);
      if (!p) continue;
      if (target === moleId) {
        p.stats.votesOnMole++;
        if (!r.rewardedVoters.has(voter)) {
          r.rewardedVoters.add(voter);
          this.addLine(voter, 'Vote contre la taupe', POINTS.agentVotedMole);
        }
      } else {
        p.stats.votesOnInnocent++;
        misdirected++;
        if (target === accusedId) this.addLine(voter, 'Innocent accusé à tort', POINTS.agentVotedInnocent);
      }
    }
    for (const id of Object.keys(tally)) {
      if (id !== moleId) {
        const p = this.players.get(id);
        if (p) p.stats.votesReceivedInnocent += tally[id];
      }
    }
    if (moleId && misdirected > 0) {
      for (let i = 0; i < misdirected; i++) this.addLine(moleId, 'Votes détournés', POINTS.moleMisdirect);
    }

    if (accusedId && accusedWasMole) {
      r.caughtIn = v.kind;
      for (const p of this.players.values()) {
        if (p.id !== moleId && !p.joinedMidGame) this.addLine(p.id, 'Taupe démasquée (équipe)', POINTS.agentTeamCatch);
      }
      this.log(`🎯 ${this.name(accusedId)} était bien la taupe !`, 'good');
    } else if (accusedId) {
      r.benched.add(accusedId);
      this.log(`❌ ${this.name(accusedId)} était innocent(e)… et se retrouve écarté(e) pour la série.`, 'bad');
    } else {
      this.log('Personne n’a été démasqué.', 'info');
    }

    this.voteResult = { kind: v.kind, votes, tally, skipCount, accusedId, accusedWasMole };
    this.setPhase('voteResult');
    this.schedule(VOTE_RESULT_TIME, () => this.afterVoteResult());
    this.changed();
  }

  private afterVoteResult() {
    const r = this.round;
    const vr = this.voteResult;
    if (!r || !vr) return;
    if (vr.accusedWasMole || vr.kind === 'final') this.endRound();
    else this.startQuestion(r.qIndex + 1);
  }

  // ───────────────────────────── Fin de série / partie ─────────────────────────────

  private endRound() {
    const r = this.round;
    if (!r) return;
    this.clearSpeakerTimer();
    const mole = r.moleId ? this.players.get(r.moleId) : undefined;
    let outcome: RoundEndView['outcome'];
    if (r.moleLeft) outcome = 'left';
    else if (r.caughtIn) outcome = 'caught';
    else outcome = 'escaped';
    if (mole) {
      if (outcome === 'escaped') {
        mole.stats.moleEscapes++;
        this.addLine(mole.id, 'Taupe non démasquée', POINTS.moleEscape);
      } else if (outcome === 'caught') {
        mole.stats.moleCaught++;
        this.addLine(mole.id, 'Taupe démasquée', POINTS.moleCaught);
      }
    }
    const deltas: Record<string, number> = {};
    for (const p of this.players.values()) {
      deltas[p.id] = p.score - p.shownScore;
      p.shownScore = p.score;
    }
    this.roundEnd = {
      round: r.number,
      moleId: mole?.id ?? null,
      moleName: mole?.name ?? 'La taupe (partie)',
      outcome,
      caughtIn: r.caughtIn,
      sabotagesUsed: r.sabotagesUsed,
      teamCorrect: r.teamCorrect,
      played: r.log.length,
      moleAnswers: r.log.map((e) => (r.moleId ? e.answers[r.moleId] ?? null : null)),
      log: r.log.map(({ answers: _a, ...rest }) => rest),
      deltas,
      myLines: [],
    };
    this.summaries.push({ round: r.number, moleId: mole?.id ?? null, outcome });
    if (outcome === 'escaped') this.log(`🐀 ${this.name(r.moleId)} était la taupe et s'en est sorti(e) !`, 'bad');
    r.ready = new Set();
    this.meeting = null;
    this.vote = null;
    this.setPhase('roundEnd');
    this.schedule(ROUND_END_TIME, () => this.afterRoundEnd());
    this.changed();
  }

  private afterRoundEnd() {
    const r = this.round;
    if (!r) return;
    if (r.number < this.rounds.length) this.startRound(r.number + 1);
    else this.endGame();
  }

  private endGame() {
    this.clearTimer();
    this.gameAwards = this.computeAwards();
    this.log('Fin de l’opération. Place au débriefing.', 'alert');
    this.setPhase('gameEnd');
    this.changed();
  }

  private computeAwards(): Award[] {
    const ps = [...this.players.values()];
    const awards: Award[] = [];
    const best = (score: (p: Player) => number, min = 1) => {
      let top: Player | null = null;
      let v = min - 1;
      for (const p of ps) {
        const s = score(p);
        if (s > v) {
          v = s;
          top = p;
        }
      }
      return top ? { p: top as Player, v } : null;
    };
    const add = (id: string, emoji: string, title: string, description: string, r: { p: Player; v: number } | null, fmt: (v: number) => string) => {
      if (r) awards.push({ id, emoji, title, description, playerId: r.p.id, value: fmt(r.v) });
    };
    add('brain', '🧠', 'Cerveau de l’opération', 'Le plus de bonnes réponses en tant qu’agent', best((p) => p.stats.correct), (v) => `${v} bonne${v > 1 ? 's' : ''} réponse${v > 1 ? 's' : ''}`);
    add('sleuth', '🔎', 'Fin limier', 'Le plus de votes contre la vraie taupe', best((p) => p.stats.votesOnMole), (v) => `${v} vote${v > 1 ? 's' : ''} juste${v > 1 ? 's' : ''}`);
    add('bluff', '🎭', 'Maître du bluff', 'La taupe la plus rentable', best((p) => p.stats.molePoints, 1), (v) => `${v} pts en taupe`);
    add('ghost', '🫥', 'Insaisissable', 'Taupe jamais démasquée', best((p) => p.stats.moleEscapes), (v) => `${v} évasion${v > 1 ? 's' : ''}`);
    add('paranoid', '🌀', 'Paranoïaque', 'Le plus de votes contre des innocents', best((p) => p.stats.votesOnInnocent), (v) => `${v} fausse${v > 1 ? 's' : ''} piste${v > 1 ? 's' : ''}`);
    add('scapegoat', '🐐', 'Bouc émissaire', 'Innocent le plus suspecté', best((p) => p.stats.votesReceivedInnocent), (v) => `${v} vote${v > 1 ? 's' : ''} reçu${v > 1 ? 's' : ''}`);
    add('whistle', '🚨', 'Lanceur d’alerte', 'Le plus de réunions d’urgence', best((p) => p.stats.emergencies), (v) => `${v} alerte${v > 1 ? 's' : ''}`);
    add('flash', '⚡', 'Gâchette rapide', 'Le plus souvent premier à verrouiller', best((p) => p.stats.fastestLocks), (v) => `${v} fois premier`);
    return awards;
  }

  backToLobby() {
    this.clearTimer();
    this.clearSpeakerTimer();
    this.round = null;
    this.meeting = null;
    this.vote = null;
    this.voteResult = null;
    this.roundEnd = null;
    this.paused = false;
    this.setPhase('lobby');
    for (const p of this.players.values()) {
      p.emergencyLeft = this.settings.emergencyPerPlayer;
      p.joinedMidGame = false;
    }
    this.log('Retour au QG. Préparez la prochaine opération.');
    this.changed();
  }

  // ───────────────────────────── Contrôles de l'hôte ─────────────────────────────

  hostNext() {
    if (this.paused) return;
    if (this.phase === 'meeting' && this.meeting?.speakerId && this.meeting.speakerQueue.length) {
      // Pendant le tour de parole, « suivant » passe d'abord au prochain orateur.
      this.nextSpeaker();
      return;
    }
    const fn = this.timerFn;
    if (!fn) return;
    this.clearTimer();
    fn();
    this.changed();
  }

  togglePause() {
    if (this.phase === 'lobby' || this.phase === 'gameEnd') return;
    if (!this.paused) {
      this.paused = true;
      if (this.timer && this.phaseEndsAt) {
        clearTimeout(this.timer);
        this.timer = null;
        this.pausedRemaining = Math.max(100, this.phaseEndsAt - Date.now());
        this.phaseEndsAt = null;
      }
      if (this.speakerTimer && this.meeting?.speakerEndsAt) {
        clearTimeout(this.speakerTimer);
        this.speakerTimer = null;
        this.speakerRemaining = Math.max(100, this.meeting.speakerEndsAt - Date.now());
        this.meeting.speakerEndsAt = null;
      }
      this.log('⏸️ Opération en pause.');
    } else {
      this.paused = false;
      if (this.timerFn) {
        this.phaseEndsAt = Date.now() + this.pausedRemaining;
        this.timer = setTimeout(() => this.fireTimer(), this.pausedRemaining);
      }
      if (this.meeting?.speakerId && this.speakerRemaining > 0) {
        this.meeting.speakerEndsAt = Date.now() + this.speakerRemaining;
        this.speakerTimer = setTimeout(() => this.nextSpeaker(), this.speakerRemaining);
        this.speakerRemaining = 0;
      }
      this.log('▶️ Reprise de l’opération.');
    }
    this.changed();
  }

  /** Termine une phase en avance si tout le monde a agi. */
  private checkEarlyEnd() {
    if (this.paused) return;
    const r = this.round;
    const connected = this.connectedPlayers().map((p) => p.id);
    if (!connected.length) return;
    const soon = (fn: () => void) => {
      if (this.phaseEndsAt && this.phaseEndsAt - Date.now() <= ALL_DONE_DELAY * 1000 * this.timeScale) return;
      this.schedule(ALL_DONE_DELAY, fn);
    };
    if (this.phase === 'roleReveal' && r) {
      if (connected.every((id) => r.ready.has(id))) soon(() => this.startQuestion(0));
    } else if (this.phase === 'question' && r) {
      if (connected.every((id) => r.answers.get(id)?.lockedAt)) soon(() => this.endQuestion());
    } else if (this.phase === 'meeting' && this.meeting) {
      const m = this.meeting;
      for (const id of m.skipVotes) if (!this.players.has(id)) m.skipVotes.delete(id);
      if (m.skipVotes.size >= this.skipNeeded()) soon(() => this.startVote());
    } else if (this.phase === 'vote' && this.vote) {
      const v = this.vote;
      const needed = v.eligible.filter((id) => this.players.get(id)?.connected);
      if (needed.length && needed.every((id) => v.votes.has(id))) soon(() => this.endVote());
    } else if (this.phase === 'roundEnd' && r) {
      if (connected.every((id) => r.ready.has(id))) soon(() => this.afterRoundEnd());
    }
  }

  // ───────────────────────────── Vue client ─────────────────────────────

  private publicPlayers(): PublicPlayer[] {
    const r = this.round;
    const showLive = this.phase === 'lobby' || this.phase === 'roundEnd' || this.phase === 'gameEnd';
    return [...this.players.values()]
      .sort((a, b) => a.joinedAt - b.joinedAt)
      .map((p) => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        isHost: p.id === this.hostId,
        connected: p.connected,
        score: showLive ? p.score : p.shownScore,
        emergencyLeft: p.emergencyLeft,
        benched: !!r?.benched.has(p.id) && this.inRound(),
        locked: this.phase === 'question' && !!r?.answers.get(p.id)?.lockedAt,
        ready: (this.phase === 'roleReveal' || this.phase === 'roundEnd') && !!r?.ready.has(p.id),
        hasVoted: this.phase === 'vote' && !!this.vote?.votes.has(p.id),
        joinedMidGame: p.joinedMidGame,
      }));
  }

  viewFor(playerId: string | null): ClientState {
    const r = this.round;
    const me = playerId ? this.players.get(playerId) : undefined;
    const role = me ? this.roleOf(me.id) : null;
    const inRound = this.inRound();

    const state: ClientState = {
      serverNow: Date.now(),
      code: this.code,
      hostId: this.hostId,
      phase: this.phase,
      paused: this.paused,
      phaseEndsAt: this.phaseEndsAt,
      phaseDuration: this.phaseDuration,
      settings: this.settings,
      players: this.publicPlayers(),
      round: r?.number ?? 0,
      totalRounds: this.rounds.length || this.settings.rounds,
      questionIndex: r?.qIndex ?? -1,
      customCount: this.custom.length,
      spectator: !me,
      me: me
        ? {
            id: me.id,
            role,
            emergencyLeft: me.emergencyLeft,
            benched: !!r?.benched.has(me.id) && inRound,
          }
        : null,
      mole: null,
      mission: null,
      question: null,
      questionResult: null,
      history: [],
      meeting: null,
      vote: null,
      voteResult: null,
      roundEnd: null,
      gameEnd: null,
      feed: this.feed.slice(-12),
    };

    if (r && inRound) {
      state.mission = {
        correct: r.teamCorrect,
        played: r.log.length,
        total: r.questions.length,
        intelUnlocked: r.intelUnlocked,
        intelMax: INTEL_MAX_PER_ROUND,
        intelEvery: intelEvery(this.settings.questionsPerRound),
      };
      state.history = r.log.map(({ answers: _a, ...rest }) => rest);
    }

    if (r && role === 'mole' && this.phase !== 'roundEnd') {
      state.mole = {
        sabotagesLeft: [...r.sabotagesLeft],
        queued: [...r.queued],
        available: (Object.keys(SABOTAGES) as SabotageKind[]).filter((k) => !this.sabotageBlock(k)),
      };
    }

    if (r && this.phase === 'question') {
      const q = r.questions[r.qIndex];
      const a = me ? r.answers.get(me.id) : undefined;
      state.question = {
        index: r.qIndex,
        category: q.category,
        difficulty: q.difficulty,
        text: q.text,
        options: q.options,
        correct: role === 'mole' ? q.correct : null,
        myAnswer: a?.option ?? null,
        myLocked: !!a?.lockedAt,
        jammed: r.jammed,
        rushed: r.rushed,
      };
    }

    if (r && this.phase === 'questionResult' && r.lastResult) {
      const q = r.questions[r.lastResult.index];
      const myAnswer = me ? (r.log[r.log.length - 1]?.answers[me.id] ?? null) : null;
      state.questionResult = { ...r.lastResult, myAnswer, myCorrect: myAnswer === r.lastResult.correct };
      state.question = {
        index: r.lastResult.index,
        category: q.category,
        difficulty: q.difficulty,
        text: q.text,
        options: q.options,
        correct: q.correct,
        myAnswer,
        myLocked: true,
        jammed: false,
        rushed: false,
      };
    }

    if (this.meeting && (this.phase === 'meeting' || this.phase === 'vote')) {
      const m = this.meeting;
      const toObj = (map: Map<string, Set<string>>) =>
        Object.fromEntries([...map.entries()].filter(([, s]) => s.size).map(([k, s]) => [k, [...s]]));
      state.meeting = {
        kind: m.kind,
        calledBy: m.calledBy,
        intel: m.intel,
        falsified: m.falsified,
        archive: r ? (this.phase === 'vote' && m.intel.length ? r.intelArchive.slice(0, -1) : r.intelArchive) : [],
        accusations: toObj(m.accusations),
        defenses: toObj(m.defenses),
        speakerId: m.speakerId,
        speakerEndsAt: m.speakerEndsAt,
        speakerQueue: m.speakerQueue,
        skipVotes: [...m.skipVotes],
        skipNeeded: this.skipNeeded(),
      };
    }

    if (this.vote && this.phase === 'vote') {
      state.vote = {
        kind: this.vote.kind,
        eligible: this.vote.eligible,
        votedIds: [...this.vote.votes.keys()],
        myVote: me ? (this.vote.votes.get(me.id) ?? null) : null,
      };
    }

    if (this.voteResult && this.phase === 'voteResult') state.voteResult = this.voteResult;

    if (this.roundEnd && this.phase === 'roundEnd') {
      const lines: ScoreLine[] = [];
      const m = me && r ? r.lines.get(me.id) : undefined;
      if (m) for (const [label, v] of m) lines.push({ label: v.count > 1 ? `${label} ×${v.count}` : label, points: v.points });
      state.roundEnd = { ...this.roundEnd, myLines: lines };
    }

    if (this.phase === 'gameEnd') {
      state.gameEnd = {
        ranking: [...this.players.values()].map((p) => ({ id: p.id, score: p.score })).sort((a, b) => b.score - a.score),
        awards: this.gameAwards,
        rounds: this.summaries,
      };
    }

    return state;
  }
}
