import { randomUUID } from 'node:crypto';
import type { Intel, IntelKind, RevealMode } from '../shared/types.ts';
import { pick, shuffle } from './util.ts';

export interface IntelLogEntry {
  index: number;
  options: string[];
  correct: number;
  answers: Record<string, number | null>;
  lockOrder: string[];
}

export interface IntelContext {
  moleId: string;
  /** Joueurs encore suspects : ni écartés, ni déjà blanchis par un indice. */
  suspects: string[];
  names: Record<string, string>;
  log: IntelLogEntry[];
  intercepted: Set<number>;
  usedKinds: IntelKind[];
  /** Les résultats de chaque joueur sont publics : un indice ne doit jamais isoler la taupe à lui seul. */
  reveal: RevealMode;
}

/** Un indice doit laisser au moins ce nombre de suspects compatibles (taupe comprise). */
const MIN_GROUP = 3;

/** Ce que tout le monde a vu d'une réponse à l'écran de résultat. */
function footprint(ctx: IntelContext, e: IntelLogEntry, answer: number | null | undefined): string {
  if (answer === null || answer === undefined) return 'none';
  if (ctx.reveal === 'full') return `pick-${answer}`;
  return answer === e.correct ? 'ok' : 'ko';
}

/** Suspects dont la réponse visible à la question e est compatible avec « a répondu answer ». */
function compatible(ctx: IntelContext, e: IntelLogEntry, answer: number | null): string[] {
  const f = footprint(ctx, e, answer);
  return ctx.suspects.filter((id) => footprint(ctx, e, e.answers[id]) === f);
}

function goodCounts(ctx: IntelContext): Record<string, number> {
  const out: Record<string, number> = {};
  for (const id of ctx.suspects) out[id] = ctx.log.filter((e) => e.answers[id] === e.correct).length;
  return out;
}

function intel(kind: IntelKind, title: string, text: string, playerIds: string[]): Intel {
  return { id: randomUUID().slice(0, 8), kind, title, text, playerIds };
}

function nameList(ids: string[], names: Record<string, string>): string {
  const n = ids.map((id) => names[id] ?? '???');
  if (n.length <= 1) return n.join('');
  return `${n.slice(0, -1).join(', ')} et ${n[n.length - 1]}`;
}

function circleSize(k: number): number {
  return Math.min(k - 1, Math.max(3, Math.ceil(k * 0.6)));
}

type Generator = (ctx: IntelContext) => Intel | null;

const TRUE_GENERATORS: Record<IntelKind, Generator> = {
  innocent(ctx) {
    if (ctx.suspects.length < 4) return null;
    const pool = ctx.suspects.filter((id) => id !== ctx.moleId);
    if (!pool.length) return null;
    const id = pick(pool);
    return intel('innocent', 'Agent blanchi', `Les écoutes sont formelles : ${ctx.names[id]} n'est PAS la taupe.`, [id]);
  },
  circle(ctx) {
    const k = ctx.suspects.length;
    if (k < 4) return null;
    const size = circleSize(k);
    const others = shuffle(ctx.suspects.filter((id) => id !== ctx.moleId)).slice(0, size - 1);
    const ids = shuffle([ctx.moleId, ...others]);
    return intel('circle', 'Périmètre resserré', `La taupe se cache parmi : ${nameList(ids, ctx.names)}.`, ids);
  },
  intercept(ctx) {
    const candidates = ctx.log.filter(
      (e) => !ctx.intercepted.has(e.index) && compatible(ctx, e, e.answers[ctx.moleId] ?? null).length >= MIN_GROUP,
    );
    if (!candidates.length) return null;
    const e = pick(candidates);
    ctx.intercepted.add(e.index);
    const a = e.answers[ctx.moleId];
    const text =
      a === null || a === undefined
        ? `Question ${e.index + 1} : la taupe n'a donné aucune réponse.`
        : `Question ${e.index + 1} : la taupe a répondu « ${e.options[a]} ».`;
    return intel('intercept', 'Message intercepté', text, []);
  },
  accuracy(ctx) {
    if (ctx.log.length < 2 || ctx.usedKinds.includes('accuracy')) return null;
    const counts = goodCounts(ctx);
    const good = counts[ctx.moleId];
    if (ctx.suspects.filter((id) => counts[id] === good).length < MIN_GROUP) return null;
    return intel(
      'accuracy',
      'Profil comportemental',
      `Cette série, la taupe a donné ${good} bonne${good > 1 ? 's' : ''} réponse${good > 1 ? 's' : ''} sur ${ctx.log.length}.`,
      [],
    );
  },
  tempo(ctx) {
    const candidates = ctx.log.filter((e) => e.lockOrder.length >= 6 && e.lockOrder.includes(ctx.moleId));
    if (!candidates.length) return null;
    const e = pick(candidates);
    const half = Math.ceil(e.lockOrder.length / 2);
    const rank = e.lockOrder.indexOf(ctx.moleId);
    const first = rank < half;
    const groupSize = first ? half : e.lockOrder.length - half;
    if (groupSize < 3) return null;
    return intel(
      'tempo',
      'Chronométrage',
      `Question ${e.index + 1} : la taupe fait partie des ${groupSize} ${first ? 'premiers' : 'derniers'} à avoir verrouillé sa réponse.`,
      [],
    );
  },
};

const PREFERRED: IntelKind[] = ['intercept', 'innocent', 'circle', 'accuracy', 'tempo'];

/** Génère un indice vrai, en variant les types au fil de la série. */
export function trueIntel(ctx: IntelContext): Intel | null {
  const fresh = shuffle(PREFERRED.filter((k) => !ctx.usedKinds.includes(k)));
  const seen = shuffle(PREFERRED.filter((k) => ctx.usedKinds.includes(k)));
  for (const kind of [...fresh, ...seen]) {
    const res = TRUE_GENERATORS[kind](ctx);
    if (res) {
      ctx.usedKinds.push(kind);
      if (res.kind === 'innocent') ctx.suspects = ctx.suspects.filter((id) => id !== res.playerIds[0]);
      return res;
    }
  }
  return null;
}

/** Génère un faux indice crédible (Falsification). */
export function fakeIntel(ctx: IntelContext): Intel | null {
  const options: (() => Intel | null)[] = [
    () => {
      if (ctx.suspects.length < 4) return null;
      return intel('innocent', 'Agent blanchi', `Les écoutes sont formelles : ${ctx.names[ctx.moleId]} n'est PAS la taupe.`, [
        ctx.moleId,
      ]);
    },
    () => {
      const k = ctx.suspects.length;
      if (k < 4) return null;
      const size = circleSize(k);
      const agents = ctx.suspects.filter((id) => id !== ctx.moleId);
      if (agents.length < size) return null;
      const ids = shuffle(agents).slice(0, size);
      return intel('circle', 'Périmètre resserré', `La taupe se cache parmi : ${nameList(ids, ctx.names)}.`, ids);
    },
    () => {
      // On fait dire à la taupe une réponse qui accuse des innocents (et qui reste crédible au vu des résultats publics).
      const options = ctx.log
        .filter((e) => !ctx.intercepted.has(e.index))
        .flatMap((e) =>
          [0, 1, 2, 3]
            .filter((i) => footprint(ctx, e, i) !== footprint(ctx, e, e.answers[ctx.moleId]))
            .filter((i) => compatible(ctx, e, i).some((id) => id !== ctx.moleId))
            .map((i) => ({ e, i })),
        );
      if (!options.length) return null;
      const { e, i: fake } = pick(options);
      ctx.intercepted.add(e.index);
      return intel('intercept', 'Message intercepté', `Question ${e.index + 1} : la taupe a répondu « ${e.options[fake]} ».`, []);
    },
    () => {
      if (ctx.log.length < 2 || ctx.usedKinds.includes('accuracy')) return null;
      const counts = goodCounts(ctx);
      const good = counts[ctx.moleId];
      // Un nombre porté par au moins un innocent : le faux indice l'accuse sans être réfutable.
      const choices = [...new Set(ctx.suspects.filter((id) => id !== ctx.moleId).map((id) => counts[id]))].filter((n) => n !== good);
      if (!choices.length) return null;
      const fake = pick(choices);
      return intel(
        'accuracy',
        'Profil comportemental',
        `Cette série, la taupe a donné ${fake} bonne${fake > 1 ? 's' : ''} réponse${fake > 1 ? 's' : ''} sur ${ctx.log.length}.`,
        [],
      );
    },
  ];
  for (const gen of shuffle(options)) {
    const res = gen();
    if (res) return res;
  }
  return null;
}
