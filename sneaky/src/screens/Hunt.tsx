import { useState } from 'react';
import { POINTS } from '../../shared/constants.ts';
import { TopBar } from '../components/Chrome.tsx';
import { OwlLogo } from '../components/Logo.tsx';
import { Avatar, Stamp, TimerRing } from '../components/ui.tsx';
import { useGame, useOnce, usePlayers } from '../lib/hooks.ts';
import { sfx } from '../lib/sound.ts';
import { vibrate } from '../lib/device.ts';
import { api } from '../net.ts';

/** « La taupe contre-attaque » : démasquée, la taupe a une dernière chance d'attraper la Chouette. */
export function Hunt() {
  const g = useGame();
  const h = g.hunt!;
  const players = usePlayers();
  const [choice, setChoice] = useState<string | null>(null);
  const mole = players[h.moleId];
  const iAmMole = g.me?.id === h.moleId;
  const target = h.targetId ? players[h.targetId] : null;

  useOnce(`${g.round}-hunt`, () => {
    sfx.siren();
    vibrate([120, 60, 120]);
  });
  useOnce(h.resolved ? `${g.round}-hunt-done` : null, () => {
    if (h.wasOwl) sfx.mole();
    else sfx.success();
  });

  return (
    <div className="screen hunt">
      <TopBar />
      <div className="meeting-head">
        <div className="meeting-title">
          <span className="mono small">DERNIÈRE CHANCE</span>
          <h2 className="display">La taupe contre-attaque</h2>
          <span className="meeting-caller">
            <Avatar player={mole} size={22} ring="#FF3B5C" />
            <span className="hunt-caller-text">
              <strong>{iAmMole ? 'Toi' : mole?.name}</strong> {iAmMole ? 'es démasqué·e' : 'est démasqué·e'}… mais une Chouette rôde.
            </span>
          </span>
        </div>
        {!h.resolved && <TimerRing endsAt={g.phaseEndsAt} duration={g.phaseDuration} paused={g.paused} warnAt={8} />}
      </div>

      {!h.resolved && iAmMole && (
        <>
          <p className="hunt-pitch">
            Qui est la Chouette ? Trouve-la et tu récupères <strong>+{POINTS.moleCatchOwl} points</strong>.
          </p>
          <div className="vote-grid">
            {h.candidates.map((id) => (
              <button
                key={id}
                className={`vote-card hunt-card ${choice === id ? 'vote-on' : ''}`}
                onClick={() => {
                  sfx.tap();
                  setChoice(id);
                }}
              >
                <Avatar player={players[id]} size={56} />
                <span className="vote-name">{players[id]?.name}</span>
              </button>
            ))}
          </div>
          <div className="bottom-bar">
            <button
              className="btn btn-xl btn-hunt"
              disabled={!choice}
              onClick={() => {
                if (!choice) return;
                sfx.stamp();
                api.huntPick(choice);
              }}
            >
              {choice ? `🦉 ${players[choice]?.name} est la Chouette !` : 'Désigne un joueur'}
            </button>
          </div>
        </>
      )}

      {!h.resolved && !iAmMole && (
        <div className="hunt-wait">
          <OwlLogo size={150} />
          <p className="display">La taupe cherche la Chouette…</p>
          <p className="muted">Restez impassibles. Un regard de trop, et elle est trouvée.</p>
        </div>
      )}

      {h.resolved && (
        <div className={`verdict-card hunt-verdict ${h.wasOwl ? 'verdict-mole' : 'hunt-missed'}`}>
          {target ? (
            <>
              <span className="muted small">{iAmMole ? 'Tu as désigné' : `${mole?.name} a désigné`}</span>
              <Avatar player={target} size={84} />
              <div className="verdict-name">{target.id === g.me?.id ? 'Toi' : target.name}</div>
              {h.wasOwl ? (
                <Stamp tone="red" big>
                  Capturée !
                </Stamp>
              ) : (
                <Stamp tone="blue" big>
                  Raté !
                </Stamp>
              )}
              <p className="muted small">
                {h.wasOwl
                  ? `C’était bien la Chouette. La taupe récupère ${POINTS.moleCatchOwl} points.`
                  : 'Ce n’était pas la Chouette : elle s’est envolée et gagne son bonus de discrétion.'}
              </p>
            </>
          ) : (
            <>
              <OwlLogo size={90} animated={false} />
              <div className="verdict-name">Personne n’a été désigné</div>
              <p className="muted small">La Chouette s’est envolée.</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
