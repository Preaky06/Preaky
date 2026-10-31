import type { Intel, RoundLogEntry } from '../../shared/types.ts';
import { usePlayers } from '../lib/hooks.ts';
import { AnswersRow } from './Answers.tsx';
import { Avatar, CategoryChip, Empty } from './ui.tsx';

const ICON: Record<Intel['kind'], string> = {
  innocent: '✅',
  intercept: '📻',
  circle: '🎯',
  accuracy: '📊',
  tempo: '⏱️',
};

export function IntelCard({ intel, index }: { intel: Intel; index: number }) {
  const players = usePlayers();
  return (
    <div className="intel-card" style={{ animationDelay: `${0.15 + index * 0.25}s` }}>
      <div className="intel-card-head">
        <span className="intel-icon">{ICON[intel.kind]}</span>
        <span className="intel-title">{intel.title}</span>
        <span className="intel-ref mono">PIÈCE {String(index + 1).padStart(2, '0')}</span>
      </div>
      <p className="intel-text">{intel.text}</p>
      {intel.playerIds.length > 0 && (
        <div className="intel-players">
          {intel.playerIds.map((id) => (
            <Avatar key={id} player={players[id]} size={30} />
          ))}
        </div>
      )}
    </div>
  );
}

export function IntelList({ intel, falsified, archive }: { intel: Intel[]; falsified: boolean; archive: { intel: Intel[]; falsified: boolean }[] }) {
  return (
    <div className="intel-list">
      {falsified && (
        <div className="falsified">
          <span>🖋️</span>
          <div>
            <strong>Une pièce de ce dossier est fausse.</strong>
            <small>La taupe a falsifié l’un des indices ci-dessous. À vous de trouver lequel.</small>
          </div>
        </div>
      )}
      {intel.length === 0 ? (
        <Empty icon="🗃️">
          Aucun nouvel indice. Réussissez plus de missions pour en débloquer… ou fiez-vous à votre flair.
        </Empty>
      ) : (
        intel.map((it, i) => <IntelCard key={it.id} intel={it} index={i} />)
      )}
      {archive.length > 0 && (
        <>
          <div className="section-title">
            <span>Indices des réunions précédentes</span>
          </div>
          {archive.map((a, k) => (
            <div key={k} className="archive">
              {a.falsified && <p className="small red">🖋️ Ce lot contenait une pièce falsifiée.</p>}
              {a.intel.map((it, i) => (
                <IntelCard key={it.id} intel={it} index={i} />
              ))}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

const LETTERS = 'ABCD';

export function Journal({ history, moleAnswers }: { history: RoundLogEntry[]; moleAnswers?: (number | null)[] }) {
  const players = usePlayers();
  if (!history.length) return <Empty icon="📒">Aucune question jouée pour l’instant.</Empty>;
  return (
    <div className="journal">
      {history.map((h, idx) => {
        const total = h.distribution.reduce((a, b) => a + b, 0) || 1;
        const ma = moleAnswers?.[idx];
        return (
          <div key={h.index} className={`journal-item ${h.success ? 'j-ok' : 'j-ko'}`}>
            <div className="journal-head">
              <span className="mono small">Q{h.index + 1}</span>
              <CategoryChip id={h.category} />
              {h.jammed && <span title="Brouillage">📡</span>}
              {h.rushed && <span title="Coupe-chrono">⏱️</span>}
              <span className={`journal-res ${h.success ? 'green' : 'red'}`}>{h.success ? 'RÉUSSIE' : 'ÉCHOUÉE'}</span>
            </div>
            <p className="journal-q">{h.text}</p>
            <div className="journal-dist">
              {h.options.map((o, i) => (
                <div key={i} className={`jd-row ${i === h.correct ? 'jd-correct' : ''}`}>
                  <span className="jd-letter mono">{LETTERS[i]}</span>
                  <span className="jd-text">{o}</span>
                  <span className="jd-bar">
                    <span style={{ width: `${(h.distribution[i] / total) * 100}%` }} />
                  </span>
                  <span className="jd-count mono">{h.distribution[i]}</span>
                  {moleAnswers && ma === i && <span className="jd-mole">🐀</span>}
                </div>
              ))}
            </div>
            {moleAnswers && ma === null && <p className="small muted">🐀 La taupe n’a pas répondu.</p>}
            <AnswersRow entry={h} />
            {h.lockOrder.length > 0 && (
              <div className="journal-locks">
                <span className="mono small muted">Verrouillage :</span>
                {h.lockOrder.map((id) => (
                  <Avatar key={id} player={players[id]} size={22} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
