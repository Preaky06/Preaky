import { TopBar } from '../components/Chrome.tsx';
import { MissionTrack } from '../components/Mission.tsx';
import { Avatar, ConfirmButton, Countdown, ProgressBar, Stamp } from '../components/ui.tsx';
import { useGame, useOnce, usePlayers } from '../lib/hooks.ts';
import { sfx } from '../lib/sound.ts';
import { vibrate } from '../lib/device.ts';
import { api, toast } from '../net.ts';

const LETTERS = 'ABCD';

export function QuestionResult() {
  const g = useGame();
  const res = g.questionResult!;
  const q = g.question!;
  const players = usePlayers();
  const total = res.distribution.reduce((a, b) => a + b, 0) || 1;
  const me = g.me;
  const canCall = me && !me.benched && me.emergencyLeft > 0 && !res.isLast;

  useOnce(`${g.round}-${res.index}`, () => {
    if (res.success) sfx.success();
    else sfx.fail();
    vibrate(res.success ? 30 : [50, 30, 50]);
    if (res.intelUnlocked) setTimeout(() => sfx.pop(), 700);
  });

  const call = async () => {
    const r = await api.emergency();
    if (!r.ok) toast(r.error ?? 'Impossible', 'bad');
  };

  return (
    <div className="screen result">
      <TopBar />
      <ProgressBar endsAt={g.phaseEndsAt} duration={g.phaseDuration} tone={res.success ? 'green' : 'red'} />
      <MissionTrack />
      <div className="result-stamp">
        <Stamp tone={res.success ? 'green' : 'red'} big>
          {res.success ? 'Mission réussie' : 'Mission échouée'}
        </Stamp>
        {res.majority === null && <p className="muted small">Pas de majorité claire : la mission échoue.</p>}
      </div>

      <div className="q-card q-card-sm">
        <div className="q-num mono">QUESTION {res.index + 1}</div>
        <h3 className="q-text q-text-sm">{q.text}</h3>
      </div>

      <div className="options">
        {q.options.map((o, i) => {
          const count = res.distribution[i];
          const isCorrect = i === res.correct;
          const mine = res.myAnswer === i;
          return (
            <div
              key={i}
              className={`option option-result ${isCorrect ? 'option-correct' : mine ? 'option-wrong' : ''} ${res.majority === i ? 'option-majority' : ''}`}
            >
              <span className="option-bar" style={{ transform: `scaleX(${count / total})` }} />
              <span className="option-letter">{LETTERS[i]}</span>
              <span className="option-text">
                {o}
                {mine && <em className="option-me"> · toi</em>}
              </span>
              <span className="option-count mono">{count}</span>
            </div>
          );
        })}
      </div>

      {me && (
        <p className={`result-mine ${res.myCorrect ? 'green' : 'red'}`}>
          {res.myAnswer === null ? '⌛ Tu n’as pas répondu.' : res.myCorrect ? '✓ Ta réponse était juste.' : '✕ Ta réponse était fausse.'}
        </p>
      )}

      {res.intelUnlocked && (
        <div className="intel-unlock">
          <span>🗂️</span>
          <div>
            <strong>Indice débloqué !</strong>
            <small>Il sera révélé à la prochaine réunion.</small>
          </div>
        </div>
      )}

      {res.lockOrder.length > 0 && (
        <div className="lock-order">
          <span className="label mono">Ordre de verrouillage</span>
          <div className="lock-order-list">
            {res.lockOrder.map((id, i) => (
              <span key={id} className="lock-order-item">
                <span className="mono small muted">{i + 1}</span>
                <Avatar player={players[id]} size={26} />
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="bottom-bar">
        {canCall && (
          <ConfirmButton className="btn btn-emergency btn-xl" confirmText="🚨 Confirmer la réunion d’urgence" onConfirm={call}>
            🚨 Réunion d’urgence <small>({me!.emergencyLeft})</small>
          </ConfirmButton>
        )}
        <Countdown endsAt={g.phaseEndsAt} prefix={res.isLast ? 'Briefing de fin de série dans' : 'Question suivante dans'} />
      </div>
    </div>
  );
}
