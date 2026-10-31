import { useState, type ReactNode } from 'react';
import { api, useStore } from '../net.ts';
import { useGame } from '../lib/hooks.ts';
import { isMuted, setMuted, sfx, unlockAudio } from '../lib/sound.ts';
import { MoleMark } from './Logo.tsx';
import { ConfirmButton, Sheet } from './ui.tsx';
import { Rules } from './Rules.tsx';

const PHASE_LABEL: Record<string, string> = {
  roleReveal: 'Attribution des rôles',
  question: 'Question',
  questionResult: 'Résultat',
  meeting: 'Réunion',
  vote: 'Vote',
  voteResult: 'Verdict',
  roundEnd: 'Fin de série',
  gameEnd: 'Débriefing',
};

export function SoundToggle() {
  const [m, setM] = useState(isMuted());
  return (
    <button
      className="icon-btn"
      onClick={() => {
        setMuted(!m);
        setM(!m);
        if (m) {
          unlockAudio();
          sfx.tap();
        }
      }}
      aria-label={m ? 'Activer le son' : 'Couper le son'}
    >
      {m ? '🔇' : '🔊'}
    </button>
  );
}

function HostMenu() {
  const g = useGame();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="icon-btn icon-btn-host" onClick={() => setOpen(true)} aria-label="Contrôles du chef">
        👑
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Contrôles du chef d’opération">
        <div className="host-actions">
          <button
            className="btn btn-ghost"
            onClick={() => {
              api.pause();
              setOpen(false);
            }}
          >
            {g.paused ? '▶️ Reprendre la partie' : '⏸️ Mettre en pause'}
          </button>
          <button
            className="btn btn-ghost"
            disabled={g.paused || g.phase === 'gameEnd'}
            onClick={() => {
              api.next();
              setOpen(false);
            }}
          >
            ⏭️ Passer à l’étape suivante
          </button>
          <ConfirmButton
            className="btn btn-danger"
            confirmText="Confirmer : retour au salon"
            onConfirm={() => {
              api.lobby();
              setOpen(false);
            }}
          >
            ⏹️ Arrêter la partie
          </ConfirmButton>
          <p className="hint">Les autres agents voient la partie en pause pendant que tu y es.</p>
        </div>
      </Sheet>
    </>
  );
}

export function TopBar({ right }: { right?: ReactNode }) {
  const g = useGame();
  const [rules, setRules] = useState(false);
  const isHost = g.me && g.hostId === g.me.id;
  const inGame = g.phase !== 'lobby';
  return (
    <header className="topbar">
      <div className="topbar-left">
        <MoleMark size={30} />
        <div className="topbar-meta">
          {inGame && g.round > 0 ? (
            <>
              <span className="mono small">
                SÉRIE {g.round}/{g.totalRounds}
                {g.questionIndex >= 0 && g.mission ? ` · Q${g.questionIndex + 1}/${g.mission.total}` : ''}
              </span>
              <span className="topbar-phase">{PHASE_LABEL[g.phase] ?? ''}</span>
            </>
          ) : (
            <>
              <span className="mono small">OPÉRATION {g.code}</span>
              <span className="topbar-phase">{PHASE_LABEL[g.phase] ?? 'Salon'}</span>
            </>
          )}
        </div>
      </div>
      <div className="topbar-right">
        {right}
        <button className="icon-btn" onClick={() => setRules(true)} aria-label="Règles">
          ?
        </button>
        <SoundToggle />
        {isHost && inGame && <HostMenu />}
      </div>
      <Sheet open={rules} onClose={() => setRules(false)} title="Règles de l’opération">
        <Rules />
      </Sheet>
    </header>
  );
}

export function Overlays() {
  const toasts = useStore((s) => s.toasts);
  const reactions = useStore((s) => s.reactions);
  const connection = useStore((s) => s.connection);
  const state = useStore((s) => s.state);
  const players = state?.players ?? [];
  return (
    <>
      {connection !== 'online' && (
        <div className="conn-banner">
          <span className="conn-dot" /> {connection === 'offline' ? 'Connexion perdue… reconnexion en cours' : 'Connexion au QG…'}
        </div>
      )}
      <div className="toasts">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.tone}`}>
            {t.text}
          </div>
        ))}
      </div>
      <div className="reactions" aria-hidden>
        {reactions.map((r) => {
          const p = players.find((x) => x.id === r.playerId);
          return (
            <div key={r.id} className="reaction" style={{ left: `${r.x}%` }}>
              <span className="reaction-emoji">{r.emoji}</span>
              {p && <span className="reaction-name">{p.name}</span>}
            </div>
          );
        })}
      </div>
      {state?.paused && (
        <div className="pause-overlay">
          <div className="pause-card">
            <div className="pause-icon">❚❚</div>
            <div className="display">Opération en pause</div>
            <p className="muted">Le chef d’opération reprendra la partie.</p>
            {state.me && state.hostId === state.me.id && (
              <button className="btn btn-primary" onClick={() => api.pause()}>
                ▶️ Reprendre
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export function Ticker() {
  const feed = useGame().feed;
  const last = feed.slice(-1)[0];
  if (!last) return null;
  return (
    <div className={`ticker ticker-${last.tone}`} key={last.id}>
      <span className="ticker-tag">TRANSMISSION</span>
      <span className="ticker-text">{last.text}</span>
    </div>
  );
}
