import { useEffect, useState } from 'react';
import { TopBar } from '../components/Chrome.tsx';
import { MoleLogo } from '../components/Logo.tsx';
import { Avatar, Countdown, Stamp } from '../components/ui.tsx';
import { useGame, useOnce, usePlayers } from '../lib/hooks.ts';
import { sfx } from '../lib/sound.ts';
import { vibrate } from '../lib/device.ts';

export function VoteResult() {
  const g = useGame();
  const vr = g.voteResult!;
  const players = usePlayers();
  const [step, setStep] = useState(0);

  useEffect(() => {
    setStep(0);
    const t1 = setTimeout(() => setStep(1), 2200);
    const t2 = setTimeout(() => setStep(2), 4000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [vr.accusedId, vr.kind]);

  useOnce(step === 2 ? `${g.round}-${g.questionIndex}-${vr.kind}` : null, () => {
    if (vr.accusedWasMole) {
      sfx.mole();
      vibrate([100, 50, 100, 50, 300]);
    } else if (vr.accusedId) {
      sfx.fail();
      vibrate([60, 40, 60]);
    }
  });

  const rows = Object.entries(vr.tally).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, vr.skipCount, ...rows.map(([, n]) => n));
  const accused = vr.accusedId ? players[vr.accusedId] : null;
  const isMe = vr.accusedId && vr.accusedId === g.me?.id;

  return (
    <div className="screen vresult">
      <TopBar />
      <div className="reveal-head">
        <div className="mono small muted">DÉPOUILLEMENT</div>
        <h2 className="display">Le verdict</h2>
      </div>

      <div className="tally">
        {rows.map(([id, n], i) => (
          <div key={id} className={`tally-row ${id === vr.accusedId && step >= 1 ? 'tally-top' : ''}`} style={{ animationDelay: `${i * 0.2}s` }}>
            <Avatar player={players[id]} size={36} />
            <span className="tally-name">{players[id]?.name ?? '???'}</span>
            <span className="tally-bar">
              <span style={{ width: `${(n / max) * 100}%`, transitionDelay: `${0.3 + i * 0.2}s` }} />
            </span>
            <span className="tally-voters">
              {vr.votes
                .filter((v) => v.target === id)
                .map((v) => (
                  <Avatar key={v.voter} player={players[v.voter]} size={20} />
                ))}
            </span>
          </div>
        ))}
        <div className="tally-row tally-skip">
          <span className="tally-skip-icon">🤷</span>
          <span className="tally-name">Abstention</span>
          <span className="tally-bar">
            <span style={{ width: `${(vr.skipCount / max) * 100}%` }} />
          </span>
          <span className="tally-voters mono">{vr.skipCount}</span>
        </div>
      </div>

      <div className="verdict">
        {step >= 1 &&
          (accused ? (
            <div className={`verdict-card ${step >= 2 ? (vr.accusedWasMole ? 'verdict-mole' : 'verdict-innocent') : ''}`}>
              <Avatar player={accused} size={92} />
              <div className="verdict-name">{isMe ? 'Toi' : accused.name}</div>
              <div className="verdict-sub">{step < 2 ? 'est démasqué·e… et était…' : ''}</div>
              {step >= 2 &&
                (vr.accusedWasMole ? (
                  <>
                    <Stamp tone="red" big>
                      La taupe !
                    </Stamp>
                    <MoleLogo size={70} animated={false} evil />
                  </>
                ) : (
                  <Stamp tone="blue" big>
                    Innocent·e
                  </Stamp>
                ))}
              {step >= 2 && !vr.accusedWasMole && <p className="muted small">Écarté·e pour le reste de la série. La taupe court toujours…</p>}
            </div>
          ) : (
            <div className="verdict-card verdict-none">
              <div className="verdict-icon">
                <MoleLogo size={90} animated={false} />
              </div>
              <div className="verdict-name">Personne n’est démasqué</div>
              <p className="muted small">{vr.kind === 'final' ? 'La taupe va pouvoir se dévoiler…' : 'La taupe court toujours. Les questions reprennent.'}</p>
            </div>
          ))}
      </div>

      <div className="bottom-bar">
        <Countdown
          endsAt={g.phaseEndsAt}
          prefix={vr.accusedWasMole || vr.kind === 'final' ? 'Fin de série dans' : 'Reprise des questions dans'}
        />
      </div>
    </div>
  );
}
