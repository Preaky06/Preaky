import { useEffect, useState } from 'react';
import { JAM_SECONDS } from '../../shared/constants.ts';
import { TopBar } from '../components/Chrome.tsx';
import { Dossier } from '../components/Dossier.tsx';
import { MissionTrack } from '../components/Mission.tsx';
import { Avatar, CategoryChip, TimerRing } from '../components/ui.tsx';
import { useGame, useOnce, usePhaseElapsed } from '../lib/hooks.ts';
import { sfx } from '../lib/sound.ts';
import { vibrate } from '../lib/device.ts';
import { api } from '../net.ts';

const LETTERS = 'ABCD';

export function Question() {
  const g = useGame();
  const q = g.question!;
  const [local, setLocal] = useState<number | null>(null);
  const elapsed = usePhaseElapsed();
  const jamActive = q.jammed && elapsed < JAM_SECONDS * 1000;
  const selected = local ?? q.myAnswer;
  const locked = q.myLocked;
  const lockedCount = g.players.filter((p) => p.locked).length;
  const spectator = !g.me;
  // La taupe voit la bonne réponse en permanence ; les agents ont la même case avec « ? », pour qu'un voisin ne fasse pas la différence.
  const secret = g.me?.role === 'mole' && q.correct !== null ? LETTERS[q.correct] : null;

  useEffect(() => setLocal(null), [q.index]);
  useOnce(`${g.round}-${q.index}`, () => {
    if (q.jammed || q.rushed) {
      sfx.sabotage();
      vibrate([60, 40, 60]);
    } else sfx.pop();
  });

  const choose = (i: number) => {
    if (locked || spectator) return;
    sfx.tap();
    setLocal(i);
    api.select(q.index, i);
  };

  const lock = () => {
    if (selected === null || locked) return;
    sfx.lock();
    vibrate(25);
    api.lock(q.index);
  };

  return (
    <div className={`screen question ${jamActive ? 'is-jammed' : ''}`}>
      <TopBar />
      <MissionTrack />
      <div className="q-meta">
        <div className="q-meta-left">
          <div className="q-meta-row">
            <CategoryChip id={q.category} />
            {!spectator && (
              <span className="secret" aria-label={secret ? `Bonne réponse : ${secret}` : 'Aucune réponse secrète'}>
                <span className="secret-label mono">RÉPONSE</span>
                <span className="secret-letter">{secret ?? '?'}</span>
              </span>
            )}
          </div>
          <span className="q-diff" aria-label={`Difficulté ${q.difficulty} sur 3`}>
            <span>NIV.</span>
            {[1, 2, 3].map((n) => (
              <i key={n} className={n <= q.difficulty ? 'on' : ''} />
            ))}
          </span>
        </div>
        <TimerRing endsAt={g.phaseEndsAt} duration={g.phaseDuration} paused={g.paused} />
      </div>

      {(q.jammed || q.rushed) && (
        <div className="sabotage-banner">
          {q.jammed && <span>📡 Brouillage en cours</span>}
          {q.rushed && <span>⏱️ Chrono saboté</span>}
          <small>La taupe a frappé…</small>
        </div>
      )}

      <div className="q-card" key={q.index}>
        <div className="q-num mono">QUESTION {q.index + 1}</div>
        <h2 className="q-text">{q.text}</h2>
      </div>

      <div className={`options ${jamActive ? 'options-jammed' : ''}`}>
        {q.options.map((o, i) => (
          <button
            key={i}
            className={`option ${selected === i ? 'option-on' : ''} ${locked ? 'option-locked' : ''}`}
            onClick={() => choose(i)}
            disabled={spectator || (locked && selected !== i)}
            style={{ animationDelay: `${0.08 + i * 0.06}s` }}
          >
            <span className="option-letter">{LETTERS[i]}</span>
            <span className="option-text">{jamActive ? scramble(o) : o}</span>
            {locked && selected === i && <span className="option-lock">🔒</span>}
          </button>
        ))}
        {jamActive && <div className="jam-overlay">📡 SIGNAL BROUILLÉ</div>}
      </div>

      <div className="lock-row">
        {g.players.map((p) => (
          <Avatar key={p.id} player={p} size={30} dim={!p.locked} badge={p.locked ? '🔒' : undefined} />
        ))}
        <span className="mono small muted">
          {lockedCount}/{g.players.length}
        </span>
      </div>

      {!spectator && (
        <div className="bottom-bar bottom-bar-split">
          <Dossier />
          <button className={`btn btn-xl ${locked ? 'btn-ghost' : 'btn-primary'}`} onClick={lock} disabled={selected === null || locked}>
            {locked ? '🔒 Réponse verrouillée' : selected === null ? 'Choisis une réponse' : `Verrouiller ${LETTERS[selected]}`}
          </button>
        </div>
      )}
    </div>
  );
}

function scramble(s: string) {
  const glyphs = '█▓▒░#@%&$';
  return s
    .split('')
    .map((c) => (c === ' ' ? ' ' : Math.random() < 0.65 ? glyphs[Math.floor(Math.random() * glyphs.length)] : c))
    .join('');
}
