import { useState } from 'react';
import { SABOTAGES } from '../../shared/constants.ts';
import { TopBar } from '../components/Chrome.tsx';
import { Journal } from '../components/Intel.tsx';
import { MoleLogo } from '../components/Logo.tsx';
import { Avatar, Countdown, ProgressBar, Stamp } from '../components/ui.tsx';
import { useGame, useOnce, usePlayers } from '../lib/hooks.ts';
import { sfx } from '../lib/sound.ts';
import { api } from '../net.ts';

export function Leaderboard({ deltas, limit }: { deltas?: Record<string, number>; limit?: number }) {
  const g = useGame();
  const sorted = [...g.players].sort((a, b) => b.score - a.score);
  return (
    <ol className="board">
      {sorted.slice(0, limit ?? sorted.length).map((p, i) => {
        const d = deltas?.[p.id] ?? 0;
        return (
          <li key={p.id} className={`board-row ${p.id === g.me?.id ? 'board-me' : ''}`} style={{ animationDelay: `${i * 0.06}s` }}>
            <span className="board-rank mono">{i + 1}</span>
            <Avatar player={p} size={34} />
            <span className="board-name">{p.name}</span>
            {deltas && d !== 0 && <span className={`board-delta mono ${d > 0 ? 'green' : 'red'}`}>{d > 0 ? `+${d}` : d}</span>}
            <span className="board-score mono">{p.score}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function RoundEnd() {
  const g = useGame();
  const re = g.roundEnd!;
  const players = usePlayers();
  const [showLog, setShowLog] = useState(false);
  const mole = re.moleId ? players[re.moleId] : null;
  const iWasMole = re.moleId === g.me?.id;
  const meReady = g.players.find((p) => p.id === g.me?.id)?.ready;
  const myTotal = re.myLines.reduce((a, l) => a + l.points, 0);
  const last = g.round >= g.totalRounds;

  useOnce(`${re.round}-end`, () => (re.outcome === 'escaped' ? sfx.mole() : sfx.success()));

  return (
    <div className="screen roundend">
      <TopBar />
      <ProgressBar endsAt={g.phaseEndsAt} duration={g.phaseDuration} />
      <div className="reveal-head">
        <div className="mono small muted">FIN DE LA SÉRIE {re.round}</div>
        <h2 className="display">La taupe était…</h2>
      </div>

      <div className={`mole-reveal ${re.outcome === 'escaped' ? 'mole-escaped' : 'mole-caught'}`}>
        <div className="mole-reveal-bg">
          <MoleLogo size={120} animated={false} evil={re.outcome === 'escaped'} />
        </div>
        <Avatar player={mole} size={84} ring="#FF3B5C" />
        <div className="mole-reveal-name">{iWasMole ? 'Toi !' : (mole?.name ?? re.moleName)}</div>
        <Stamp tone={re.outcome === 'escaped' ? 'red' : re.outcome === 'left' ? 'gray' : 'green'} big delay={0.4}>
          {re.outcome === 'escaped' ? 'Infiltrée' : re.outcome === 'left' ? 'En fuite' : 'Démasquée'}
        </Stamp>
        <p className="muted small">
          {re.outcome === 'caught'
            ? `Démasquée ${re.caughtIn === 'emergency' ? 'lors d’une réunion d’urgence' : 'au vote final'}.`
            : re.outcome === 'escaped'
              ? 'Elle a échappé à tous les soupçons.'
              : 'Elle a quitté la partie.'}
        </p>
      </div>

      <div className="stat-row">
        <div className="stat">
          <strong>
            {re.teamCorrect}/{re.played}
          </strong>
          <small>missions réussies</small>
        </div>
        <div className="stat">
          <strong>{re.sabotagesUsed.length ? re.sabotagesUsed.map((s) => SABOTAGES[s.kind].emoji).join(' ') : '—'}</strong>
          <small>sabotages</small>
        </div>
        <div className="stat">
          <strong>{re.moleAnswers.filter((a, i) => a !== null && a === re.log[i]?.correct).length}/{re.played}</strong>
          <small>bonnes réponses de la taupe</small>
        </div>
      </div>

      {g.me && (
        <div className="card my-lines">
          <div className="section-title">
            <span>Tes points</span>
            <span className={`mono ${myTotal >= 0 ? 'green' : 'red'}`}>{myTotal >= 0 ? `+${myTotal}` : myTotal}</span>
          </div>
          {re.myLines.length === 0 ? (
            <p className="muted small">Aucun point cette série.</p>
          ) : (
            re.myLines.map((l) => (
              <div key={l.label} className="line">
                <span>{l.label}</span>
                <span className={`mono ${l.points >= 0 ? 'green' : 'red'}`}>{l.points >= 0 ? `+${l.points}` : l.points}</span>
              </div>
            ))
          )}
        </div>
      )}

      <div className="section-title">
        <span>Classement</span>
      </div>
      <Leaderboard deltas={re.deltas} />

      <button className="btn btn-link" onClick={() => setShowLog(!showLog)}>
        {showLog ? 'Masquer' : '🔍 Voir les réponses de la taupe'}
      </button>
      {showLog && <Journal history={re.log} moleAnswers={re.moleAnswers} />}

      <div className="bottom-bar">
        {g.me && (
          <button className="btn btn-primary btn-xl" disabled={meReady} onClick={() => api.ready()}>
            {meReady ? '✓ En attente des autres' : last ? 'Voir le débriefing final' : 'Série suivante →'}
          </button>
        )}
        <Countdown endsAt={g.phaseEndsAt} prefix="Suite dans" />
      </div>
    </div>
  );
}
