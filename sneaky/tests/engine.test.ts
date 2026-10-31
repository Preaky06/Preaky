import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Room } from '../server/game.ts';
import { BANK } from '../server/questions/bank.ts';
import { buildRounds } from '../server/questions/select.ts';
import { DEFAULT_SETTINGS } from '../shared/constants.ts';
import type { ClientState } from '../shared/types.ts';

function makeRoom(n = 5) {
  const reactions: string[] = [];
  const room = new Room('TEST', {
    onChange: () => {},
    onReaction: (_r, _p, e) => reactions.push(e),
    onKick: () => {},
  });
  const ids: string[] = [];
  for (let i = 0; i < n; i++) {
    const p = room.addPlayer(`Agent${i}`, i);
    if (typeof p === 'string') throw new Error(p);
    room.attach(p, `sock-${i}`);
    ids.push(p.id);
  }
  return { room, ids, reactions };
}

const tick = (ms: number) => vi.advanceTimersByTime(ms);

describe('banque de questions', () => {
  it('contient des questions valides et uniques', () => {
    expect(BANK.length).toBeGreaterThanOrEqual(360);
    const texts = new Set<string>();
    for (const q of BANK) {
      expect(q.text.length).toBeGreaterThan(8);
      expect(new Set(q.answers.map((a) => a.toLowerCase())).size).toBe(4);
      expect(texts.has(q.text)).toBe(false);
      texts.add(q.text);
    }
  });

  it('construit des séries sans doublon et mélange les réponses', () => {
    const used = new Set<string>();
    const rounds = buildRounds({ ...DEFAULT_SETTINGS, rounds: 8, questionsPerRound: 10 }, [], used)!;
    expect(rounds).toHaveLength(8);
    const ids = rounds.flat().map((q) => q.id);
    expect(new Set(ids).size).toBe(80);
    for (const q of rounds.flat()) {
      const src = BANK.find((b) => b.id === q.id)!;
      expect(q.options[q.correct]).toBe(src.answers[0]);
    }
  });

  it('intègre les questions maison', () => {
    const custom = [{ q: 'Quel est le plat préféré de Léa ?', answers: ['Les lasagnes', 'Les sushis', 'Le couscous', 'La raclette'] as [string, string, string, string] }];
    const rounds = buildRounds({ ...DEFAULT_SETTINGS, rounds: 1, questionsPerRound: 3 }, custom, new Set())!;
    expect(rounds.flat().some((q) => q.category === 'perso')).toBe(true);
  });

  it('refuse des réglages impossibles', () => {
    const r = buildRounds({ ...DEFAULT_SETTINGS, categories: ['sport'], rounds: 8, questionsPerRound: 10 }, [], new Set());
    expect(r).toBeNull();
  });
});

describe('déroulé de partie', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('refuse de lancer avec moins de 3 agents', () => {
    const { room } = makeRoom(2);
    expect(room.start()).toMatch(/au moins 3/);
  });

  it('ne révèle la bonne réponse qu’à la taupe pendant la question', () => {
    const { room, ids } = makeRoom(5);
    room.updateSettings({ rounds: 1, questionsPerRound: 3 });
    expect(room.start()).toBeNull();
    expect(room.phase).toBe('roleReveal');
    const moleId = room.round!.moleId!;
    ids.forEach((id) => room.setReady(id));
    tick(2000);
    expect(room.phase).toBe('question');
    for (const id of ids) {
      const v: ClientState = room.viewFor(id);
      expect(v.me!.role).toBe(id === moleId ? 'mole' : 'agent');
      if (id === moleId) {
        expect(v.question!.correct).not.toBeNull();
        expect(v.mole).not.toBeNull();
      } else {
        expect(v.question!.correct).toBeNull();
        expect(v.mole).toBeNull();
        expect(JSON.stringify(v)).not.toContain(moleId === id ? '' : `"role":"mole"`);
      }
    }
    const spectator = room.viewFor(null);
    expect(spectator.question!.correct).toBeNull();
    expect(spectator.me).toBeNull();
  });

  it('joue une partie complète et les scores restent cohérents', () => {
    const { room, ids } = makeRoom(6);
    room.updateSettings({ rounds: 3, questionsPerRound: 4 });
    expect(room.start()).toBeNull();
    let guard = 0;
    while (room.phase !== 'gameEnd' && guard++ < 500) {
      const r = room.round!;
      switch (room.phase) {
        case 'roleReveal':
          ids.forEach((id) => room.setReady(id));
          tick(1500);
          break;
        case 'question': {
          const q = r.questions[r.qIndex];
          ids.forEach((id, i) => {
            const opt = id === r.moleId ? (q.correct + 1) % 4 : i % 3 === 0 ? (q.correct + 2) % 4 : q.correct;
            room.select(id, r.qIndex, opt);
            room.lock(id, r.qIndex);
          });
          tick(1500);
          break;
        }
        case 'questionResult':
          tick(8000);
          break;
        case 'meeting':
          ids.forEach((id) => room.skipMeeting(id));
          tick(1500);
          break;
        case 'vote':
          ids.forEach((id) => {
            const target = id === r.moleId ? ids.find((x) => x !== id)! : r.moleId!;
            room.castVote(id, target);
          });
          tick(1500);
          break;
        case 'voteResult':
          tick(11000);
          break;
        case 'roundEnd': {
          const v = room.viewFor(ids[0]);
          expect(v.roundEnd!.outcome).toBe('caught');
          ids.forEach((id) => room.setReady(id));
          tick(1500);
          break;
        }
        default:
          throw new Error(`phase inattendue ${room.phase}`);
      }
    }
    expect(room.phase).toBe('gameEnd');
    const end = room.viewFor(ids[0]).gameEnd!;
    expect(end.ranking).toHaveLength(6);
    expect(end.rounds).toHaveLength(3);
    expect(end.awards.length).toBeGreaterThan(0);
    // Chaque agent a voté contre la taupe à chaque série → +200 et +100 d'équipe par série au minimum.
    for (const p of room.players.values()) {
      expect(p.score).toBe(p.shownScore);
    }
    room.backToLobby();
    expect(room.phase).toBe('lobby');
  });

  it('résout les votes : égalité, majorité et innocent écarté', () => {
    const { room, ids } = makeRoom(5);
    room.updateSettings({ rounds: 1, questionsPerRound: 4 });
    room.start();
    const r = room.round!;
    const mole = r.moleId!;
    const agents = ids.filter((id) => id !== mole);
    ids.forEach((id) => room.setReady(id));
    tick(1500);
    // Q1 : tout le monde répond, puis réunion d'urgence.
    ids.forEach((id) => {
      room.select(id, 0, r.questions[0].correct);
      room.lock(id, 0);
    });
    tick(1500);
    expect(room.phase).toBe('questionResult');
    expect(room.emergency(agents[0])).toBeNull();
    expect(room.phase).toBe('meeting');
    expect(room.emergency(agents[1])).not.toBeNull();
    ids.forEach((id) => room.skipMeeting(id));
    tick(1500);
    expect(room.phase).toBe('vote');
    // 3 votes contre un innocent → il est écarté.
    const innocent = agents[3];
    for (const id of ids.filter((x) => x !== innocent).slice(0, 3)) room.castVote(id, innocent);
    room.castVote(innocent, 'skip');
    const last = ids.filter((x) => x !== innocent)[3];
    room.castVote(last, 'skip');
    tick(1500);
    expect(room.phase).toBe('voteResult');
    const vr = room.viewFor(ids[0]).voteResult!;
    expect(vr.accusedId).toBe(innocent);
    expect(vr.accusedWasMole).toBe(false);
    tick(11000);
    expect(room.phase).toBe('question');
    expect(room.round!.qIndex).toBe(1);
    expect(room.viewFor(innocent).me!.benched).toBe(true);
    // Un joueur écarté ne peut plus voter : il n'est pas éligible au vote final.
    ids.forEach((id) => {
      room.select(id, 1, 0);
      room.lock(id, 1);
    });
    tick(1500);
    tick(8000);
    ids.forEach((id) => {
      room.select(id, 2, 0);
      room.lock(id, 2);
    });
    tick(1500);
    tick(8000);
    ids.forEach((id) => {
      room.select(id, 3, 0);
      room.lock(id, 3);
    });
    tick(1500);
    tick(8000);
    expect(room.phase).toBe('meeting');
    expect(room.viewFor(ids[0]).meeting!.kind).toBe('final');
    ids.forEach((id) => room.skipMeeting(id));
    tick(1500);
    expect(room.vote!.eligible).not.toContain(innocent);
    // Égalité 2-2 → personne n'est éjecté.
    const voters = room.vote!.eligible;
    const [a, b] = voters.filter((x) => x !== mole).slice(0, 2);
    const [c, d] = voters.filter((x) => x !== a && x !== b);
    room.castVote(a, b);
    room.castVote(b, a);
    room.castVote(c, a);
    room.castVote(d, b);
    tick(1500);
    const final = room.viewFor(ids[0]).voteResult!;
    expect(final.accusedId).toBeNull();
    tick(11000);
    expect(room.phase).toBe('roundEnd');
    const end = room.viewFor(mole).roundEnd!;
    expect(end.outcome).toBe('escaped');
    expect(end.myLines.some((l) => l.label.startsWith('Taupe non démasquée'))).toBe(true);
  });

  it('débloque des indices et applique la falsification', () => {
    const { room, ids } = makeRoom(8);
    room.updateSettings({ rounds: 1, questionsPerRound: 6 });
    room.start();
    const r = room.round!;
    const mole = r.moleId!;
    expect(room.sabotage(ids.find((x) => x !== mole)!, 'falsify')).not.toBeNull();
    expect(room.sabotage(mole, 'falsify')).toBeNull();
    expect(room.sabotage(mole, 'falsify')).not.toBeNull();
    expect(room.sabotage(mole, 'jam')).toBeNull();
    expect(room.sabotage(mole, 'rush')).not.toBeNull(); // un seul sabotage de question à la fois
    ids.forEach((id) => room.setReady(id));
    tick(1500);
    expect(room.viewFor(ids[0]).question!.jammed).toBe(true);
    for (let q = 0; q < 6; q++) {
      expect(room.phase).toBe('question');
      ids.forEach((id) => {
        room.select(id, q, r.questions[q].correct);
        room.lock(id, q);
      });
      tick(1500);
      expect(room.phase).toBe('questionResult');
      tick(8000);
    }
    expect(room.phase).toBe('meeting');
    const m = room.viewFor(ids[0]).meeting!;
    expect(room.round!.intelUnlocked).toBe(3);
    expect(m.falsified).toBe(true);
    expect(m.intel.length).toBe(4);
    for (const it of m.intel) expect(it.text.length).toBeGreaterThan(10);
  });

  it('termine la série si la taupe quitte la partie', () => {
    const { room, ids } = makeRoom(4);
    room.updateSettings({ rounds: 2, questionsPerRound: 3 });
    room.start();
    const mole = room.round!.moleId!;
    ids.forEach((id) => room.setReady(id));
    tick(1500);
    room.removePlayer(mole, 'left');
    expect(room.phase).toBe('roundEnd');
    expect(room.viewFor(ids.find((x) => x !== mole)!).roundEnd!.outcome).toBe('left');
  });

  it('met en pause et reprend le chrono', () => {
    const { room, ids } = makeRoom(3);
    room.updateSettings({ rounds: 1, questionsPerRound: 3, questionTime: 20 });
    room.start();
    ids.forEach((id) => room.setReady(id));
    tick(1500);
    expect(room.phase).toBe('question');
    tick(5000);
    room.togglePause();
    expect(room.paused).toBe(true);
    tick(60_000);
    expect(room.phase).toBe('question');
    room.togglePause();
    tick(14_000);
    expect(room.phase).toBe('question');
    tick(2_000);
    expect(room.phase).toBe('questionResult');
  });

  it('gère le tour de parole', () => {
    const { room, ids } = makeRoom(4);
    room.updateSettings({ rounds: 1, questionsPerRound: 3, speakingTurns: true, speakingTime: 10 });
    room.start();
    const r = room.round!;
    ids.forEach((id) => room.setReady(id));
    tick(1500);
    for (let q = 0; q < 3; q++) {
      ids.forEach((id) => {
        room.select(id, q, 0);
        room.lock(id, q);
      });
      tick(1500);
      tick(8000);
    }
    expect(room.phase).toBe('meeting');
    const first = room.viewFor(ids[0]).meeting!.speakerId!;
    expect(first).toBeTruthy();
    room.passTurn(first);
    const second = room.viewFor(ids[0]).meeting!.speakerId!;
    expect(second).not.toBe(first);
    tick(10_500);
    expect(room.viewFor(ids[0]).meeting!.speakerId).not.toBe(second);
    expect(r).toBeTruthy();
  });
});
