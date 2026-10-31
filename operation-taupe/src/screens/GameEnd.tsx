import { TopBar } from '../components/Chrome.tsx';
import { Avatar, ConfirmButton, Stamp } from '../components/ui.tsx';
import { useGame, useOnce, usePlayers } from '../lib/hooks.ts';
import { sfx } from '../lib/sound.ts';
import { api } from '../net.ts';
import { Leaderboard } from './RoundEnd.tsx';

export function GameEnd() {
  const g = useGame();
  const end = g.gameEnd!;
  const players = usePlayers();
  const isHost = g.me?.id === g.hostId;
  const podium = end.ranking.slice(0, 3);
  const order = [podium[1], podium[0], podium[2]].filter(Boolean);
  const winner = podium[0] ? players[podium[0].id] : null;

  useOnce('game-end', () => sfx.success());

  return (
    <div className="screen gameend">
      <TopBar />
      <div className="confetti" aria-hidden>
        {Array.from({ length: 24 }).map((_, i) => (
          <span key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 8) * 0.25}s`, background: ['#FFB547', '#FF3B5C', '#3DFFA8', '#5AA9FF'][i % 4] }} />
        ))}
      </div>
      <div className="reveal-head">
        <div className="mono small muted">OPÉRATION {g.code} · TERMINÉE</div>
        <h2 className="display">Débriefing final</h2>
        {winner && (
          <Stamp tone="amber" big delay={0.3}>
            {winner.id === g.me?.id ? 'Tu gagnes !' : `${winner.name} gagne`}
          </Stamp>
        )}
      </div>

      <div className="podium">
        {order.map((r) => {
          const rank = podium.indexOf(r) + 1;
          const p = players[r.id];
          return (
            <div key={r.id} className={`podium-col podium-${rank}`}>
              <Avatar player={p} size={rank === 1 ? 74 : 56} badge={rank === 1 ? '👑' : undefined} />
              <span className="podium-name">{p?.name}</span>
              <span className="podium-score mono">{r.score}</span>
              <div className="podium-block">{rank}</div>
            </div>
          );
        })}
      </div>

      {end.awards.length > 0 && (
        <>
          <div className="section-title">
            <span>Distinctions</span>
          </div>
          <div className="awards">
            {end.awards.map((a, i) => (
              <div key={a.id} className="award" style={{ animationDelay: `${0.2 + i * 0.1}s` }}>
                <span className="award-emoji">{a.emoji}</span>
                <div className="award-body">
                  <strong>{a.title}</strong>
                  <small>{a.description}</small>
                </div>
                <div className="award-who">
                  <Avatar player={players[a.playerId]} size={30} />
                  <span>{players[a.playerId]?.name}</span>
                  <small className="mono">{a.value}</small>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="section-title">
        <span>Les taupes de la partie</span>
      </div>
      <div className="moles-history">
        {end.rounds.map((r) => (
          <div key={r.round} className="mh-item">
            <span className="mono small">S{r.round}</span>
            <Avatar player={r.moleId ? players[r.moleId] : null} size={30} />
            <span>{r.moleId ? (players[r.moleId]?.name ?? '???') : '???'}</span>
            <span className={`mh-out ${r.outcome === 'escaped' ? 'red' : 'green'}`}>
              {r.outcome === 'escaped' ? '🐀 infiltrée' : r.outcome === 'caught' ? '🎯 démasquée' : '🏃 en fuite'}
            </span>
          </div>
        ))}
      </div>

      <div className="section-title">
        <span>Classement final</span>
      </div>
      <Leaderboard />

      <div className="bottom-bar">
        {isHost ? (
          <button className="btn btn-primary btn-xl" onClick={() => api.lobby()}>
            🔁 Nouvelle opération (mêmes agents)
          </button>
        ) : (
          g.me && <div className="waiting">Le chef d’opération peut relancer une partie.</div>
        )}
        {g.me && (
          <ConfirmButton className="btn btn-link btn-sm" confirmText="Confirmer : quitter" onConfirm={() => api.leave()}>
            Quitter
          </ConfirmButton>
        )}
      </div>
    </div>
  );
}
