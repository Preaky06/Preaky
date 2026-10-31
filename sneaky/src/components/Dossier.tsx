import { useEffect, useState } from 'react';
import { SABOTAGES } from '../../shared/constants.ts';
import type { SabotageKind } from '../../shared/types.ts';
import { api, toast } from '../net.ts';
import { useGame, useNotes } from '../lib/hooks.ts';
import { sfx } from '../lib/sound.ts';
import { vibrate, type Note } from '../lib/device.ts';
import { Avatar, Sheet } from './ui.tsx';

const NOTE_LABEL: Record<Note, string> = { trust: 'Confiance', doubt: 'Doute', suspect: 'Suspect' };
const NOTE_ICON: Record<Note, string> = { trust: '🟢', doubt: '🟡', suspect: '🔴' };
export { NOTE_ICON, NOTE_LABEL };

export function NotePicker({ playerId }: { playerId: string }) {
  const g = useGame();
  const [notes, setNote] = useNotes(g.code, g.round);
  const cur = notes[playerId];
  return (
    <div className="note-picker">
      {(Object.keys(NOTE_LABEL) as Note[]).map((n) => (
        <button
          key={n}
          className={`note-btn ${cur === n ? `note-on note-${n}` : ''}`}
          onClick={() => {
            sfx.tap();
            setNote(playerId, cur === n ? null : n);
          }}
        >
          {NOTE_ICON[n]} {NOTE_LABEL[n]}
        </button>
      ))}
    </div>
  );
}

function Carnet() {
  const g = useGame();
  const [notes, setNote] = useNotes(g.code, g.round);
  const others = g.players.filter((p) => p.id !== g.me?.id);
  const cycle: (Note | null)[] = [null, 'trust', 'doubt', 'suspect'];
  return (
    <div className="carnet">
      {others.map((p) => {
        const n = notes[p.id] ?? null;
        return (
          <button
            key={p.id}
            className={`carnet-item ${n ? `note-${n}` : ''}`}
            onClick={() => {
              sfx.tap();
              setNote(p.id, cycle[(cycle.indexOf(n) + 1) % cycle.length]);
            }}
          >
            <Avatar player={p} size={30} />
            <span className="carnet-name">{p.name}</span>
            <span className="carnet-note">{n ? NOTE_ICON[n] : '⚪'}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Bouton « Dossier » : même apparence pour tout le monde, contenu différent pour la taupe. */
export function Dossier() {
  const g = useGame();
  const [open, setOpen] = useState(false);
  const mole = g.me?.role === 'mole';
  const q = g.question;

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => setOpen(false), 12000);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [g.phase, g.questionIndex]);

  if (!g.me) return null;

  const fire = async (kind: SabotageKind) => {
    const r = await api.sabotage(kind);
    if (r.ok) {
      sfx.sabotage();
      vibrate(40);
      toast(`${SABOTAGES[kind].emoji} ${SABOTAGES[kind].label} programmé.`, 'alert');
    } else toast(r.error ?? 'Impossible.', 'bad');
  };

  return (
    <>
      <button
        className="dossier-fab"
        onClick={() => {
          sfx.tap();
          setOpen(true);
        }}
      >
        <span className="dossier-fab-icon">🗂️</span>
        <span>Dossier</span>
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={<span className="mono">DOSSIER N° {g.code}-{g.round}</span>}>
        <div className="paper">
          <div className="paper-head">
            <span>Information classifiée</span>
            <span className="paper-clip" />
          </div>
          {/* Même encadré pour tout le monde : de loin, impossible de distinguer la taupe. */}
          {mole && q && q.correct !== null && g.phase === 'question' ? (
            <div className="intel-answer">
              <span className="intel-answer-letter">{'ABCD'[q.correct]}</span>
              <span className="intel-answer-text">{q.options[q.correct]}</span>
            </div>
          ) : (
            <div className="intel-answer intel-answer-empty">
              <span className="intel-answer-letter">?</span>
              <span className="intel-answer-text">
                {mole ? 'La réponse s’affichera ici pendant chaque question.' : 'Aucune réponse transmise. Fie-toi à ta culture… et à ton flair.'}
              </span>
            </div>
          )}

          <div className="paper-head">
            <span>Gadgets</span>
          </div>
          {mole && g.mole && g.settings.sabotages ? (
            <div className="gadgets">
              {(Object.keys(SABOTAGES) as SabotageKind[]).map((k) => {
                const s = SABOTAGES[k];
                const used = !g.mole!.sabotagesLeft.includes(k);
                const queued = g.mole!.queued.includes(k);
                const available = g.mole!.available.includes(k);
                return (
                  <button key={k} className={`gadget ${queued ? 'gadget-queued' : ''}`} disabled={!available} onClick={() => fire(k)}>
                    <span className="gadget-emoji">{s.emoji}</span>
                    <span className="gadget-body">
                      <strong>{s.label}</strong>
                      <small>{queued ? 'Programmé ✓' : used ? 'Déjà utilisé' : s.description}</small>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            // Agents (ou partie sans gadgets) : des emplacements verrouillés, pour que le dossier ait la même allure que celui de la taupe.
            <div className="gadgets">
              {(Object.keys(SABOTAGES) as SabotageKind[]).map((k) => (
                <div key={k} className="gadget gadget-locked" aria-hidden>
                  <span className="gadget-emoji">🔒</span>
                  <span className="gadget-body">
                    <strong>{SABOTAGES[k].label}</strong>
                    <small>{mole ? 'Gadgets désactivés pour cette partie.' : 'Accès refusé : réservé aux agents doubles. Si quelqu’un s’en sert, c’est la taupe.'}</small>
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="paper-head">
            <span>Carnet de suspicion</span>
            <small>privé</small>
          </div>
          <Carnet />
        </div>
      </Sheet>
    </>
  );
}
