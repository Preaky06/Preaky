import type { AnswerStatus, RoundLogEntry } from '../../shared/types.ts';
import { useGame, usePlayers } from '../lib/hooks.ts';
import { Avatar } from './ui.tsx';

const LETTERS = 'ABCD';
const VERDICT: Record<AnswerStatus, string> = { ok: '✓ JUSTE', ko: '✗ FAUX', none: '⌛ —' };

/** Tableau public « qui a eu juste ? » affiché après chaque question. */
export function AnswersBoard({
  results,
  picks,
  lockOrder,
}: {
  results: Record<string, AnswerStatus>;
  picks: Record<string, number | null> | null;
  lockOrder: string[];
}) {
  const g = useGame();
  const players = usePlayers();
  const ids = g.players.map((p) => p.id).filter((id) => id in results);
  const good = ids.filter((id) => results[id] === 'ok').length;
  return (
    <section className="answers">
      <div className="section-title">
        <span>Réponses des agents</span>
        <span className="mono">
          <span className="green">{good}</span> / {ids.length} justes
        </span>
      </div>
      <div className="answers-grid">
        {ids.map((id, i) => {
          const status = results[id];
          const pick = picks?.[id];
          const rank = lockOrder.indexOf(id);
          return (
            <div
              key={id}
              className={`ans-card ans-${status} ${id === g.me?.id ? 'ans-me' : ''}`}
              style={{ animationDelay: `${0.25 + i * 0.07}s` }}
            >
              {rank >= 0 && (
                <span className="ans-rank mono" title="Ordre de verrouillage">
                  #{rank + 1}
                </span>
              )}
              <Avatar player={players[id]} size={40} />
              <span className="ans-name">{id === g.me?.id ? 'Toi' : players[id]?.name}</span>
              <span className="ans-verdict mono">
                {pick !== undefined && pick !== null ? <b className="ans-pick">{LETTERS[pick]}</b> : null}
                {VERDICT[status]}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** Ligne compacte de résultats pour le journal. */
export function AnswersRow({ entry }: { entry: RoundLogEntry }) {
  const g = useGame();
  const players = usePlayers();
  const ids = g.players.map((p) => p.id).filter((id) => id in entry.results);
  return (
    <div className="ans-row">
      {ids.map((id) => {
        const status = entry.results[id];
        const pick = entry.picks?.[id];
        return (
          <span key={id} className={`ans-chip ans-${status}`} title={players[id]?.name}>
            <Avatar player={players[id]} size={22} />
            <b>{pick !== undefined && pick !== null ? LETTERS[pick] : status === 'ok' ? '✓' : status === 'ko' ? '✗' : '–'}</b>
          </span>
        );
      })}
    </div>
  );
}

/** Nombre de bonnes réponses de chaque joueur sur la série en cours (public). */
export function useRoundScores(history: RoundLogEntry[]): Record<string, { good: number; played: number }> {
  const out: Record<string, { good: number; played: number }> = {};
  for (const e of history) {
    for (const [id, status] of Object.entries(e.results)) {
      out[id] ??= { good: 0, played: 0 };
      out[id].played++;
      if (status === 'ok') out[id].good++;
    }
  }
  return out;
}
