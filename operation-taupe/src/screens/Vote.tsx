import { useEffect, useState } from 'react';
import { TopBar } from '../components/Chrome.tsx';
import { NOTE_ICON } from '../components/Dossier.tsx';
import { Avatar, TimerRing } from '../components/ui.tsx';
import { useGame, useNotes, useOnce } from '../lib/hooks.ts';
import { sfx } from '../lib/sound.ts';
import { vibrate } from '../lib/device.ts';
import { api } from '../net.ts';

export function Vote() {
  const g = useGame();
  const v = g.vote!;
  const [notes] = useNotes(g.code, g.round);
  const [choice, setChoice] = useState<string | null>(v.myVote);
  const eligible = g.me ? v.eligible.includes(g.me.id) : false;
  const candidates = g.players.filter((p) => v.eligible.includes(p.id) && p.id !== g.me?.id);
  const votedCount = v.votedIds.length;

  useEffect(() => setChoice(v.myVote), [v.myVote]);
  useOnce(`${g.round}-${g.questionIndex}-vote`, () => {
    sfx.drumroll();
    vibrate(60);
  });

  const cast = (id: string) => {
    sfx.lock();
    vibrate(25);
    setChoice(id);
    api.vote(id);
  };

  return (
    <div className="screen vote">
      <TopBar />
      <div className="meeting-head">
        <div className="meeting-title">
          <span className="mono small">{v.kind === 'emergency' ? 'VOTE D’URGENCE' : `VOTE FINAL · SÉRIE ${g.round}`}</span>
          <h2 className="display">Qui est la taupe ?</h2>
          <span className="meeting-caller">
            {votedCount}/{v.eligible.length} votes · tu peux changer d’avis jusqu’à la fin
          </span>
        </div>
        <TimerRing endsAt={g.phaseEndsAt} duration={g.phaseDuration} paused={g.paused} />
      </div>

      {!g.me ? null : !eligible ? (
        <div className="card center">
          <p>Tu as été écarté·e cette série : tu ne votes pas.</p>
          <p className="muted small">Mais rien ne t’empêche de convaincre les autres à voix haute…</p>
        </div>
      ) : (
        <div className="vote-grid">
          {candidates.map((p) => {
            const note = notes[p.id];
            return (
              <button key={p.id} className={`vote-card ${choice === p.id ? 'vote-on' : ''}`} onClick={() => cast(p.id)}>
                <Avatar player={p} size={60} badge={p.hasVoted ? '✓' : undefined} />
                <span className="vote-name">{p.name}</span>
                {note && <span className="suspect-note">{NOTE_ICON[note]}</span>}
                {choice === p.id && <span className="vote-mark">VOTE</span>}
              </button>
            );
          })}
        </div>
      )}

      {g.me && eligible && (
        <div className="bottom-bar">
          <button className={`btn btn-xl ${choice === 'skip' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => cast('skip')}>
            🤷 Je passe (pas assez de preuves)
          </button>
          <p className="hint center">{choice ? '✓ Vote enregistré' : 'Touche un suspect pour voter.'}</p>
        </div>
      )}
      <div className="ready-row">
        {g.players
          .filter((p) => v.eligible.includes(p.id))
          .map((p) => (
            <Avatar key={p.id} player={p} size={26} dim={!p.hasVoted} badge={p.hasVoted ? '✓' : undefined} />
          ))}
      </div>
    </div>
  );
}
