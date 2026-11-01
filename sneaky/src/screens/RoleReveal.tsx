import { useState } from 'react';
import { TopBar } from '../components/Chrome.tsx';
import { MoleLogo } from '../components/Logo.tsx';
import { Scanner } from '../components/Scanner.tsx';
import { Avatar, ProgressBar } from '../components/ui.tsx';
import { useGame } from '../lib/hooks.ts';
import { sfx } from '../lib/sound.ts';
import { api } from '../net.ts';

export function RoleReveal() {
  const g = useGame();
  const [seen, setSeen] = useState(false);
  const meReady = g.players.find((p) => p.id === g.me?.id)?.ready;
  const readyCount = g.players.filter((p) => p.ready).length;
  const mole = g.me?.role === 'mole';
  const late = g.players.find((p) => p.id === g.me?.id)?.joinedMidGame;

  return (
    <div className="screen reveal">
      <TopBar />
      <ProgressBar endsAt={g.phaseEndsAt} duration={g.phaseDuration} />
      <div className="reveal-head">
        <div className="mono small muted">SÉRIE {g.round} SUR {g.totalRounds}</div>
        <h2 className="display">Ton dossier secret</h2>
        <p className="muted small">Cache ton écran. Une taupe vient d’être désignée… peut-être toi.</p>
      </div>

      {!g.me ? (
        <div className="board-wait">
          <MoleLogo size={180} />
          <p className="display">Les agents consultent leur dossier…</p>
        </div>
      ) : (
      <Scanner onFirstReveal={() => setSeen(true)}>
        {mole ? (
          <div className="role role-mole">
            <MoleLogo size={58} animated={false} evil />
            <div className="role-kicker mono">TON RÔLE</div>
            <div className="role-title">LA TAUPE</div>
            <p>
              Tu connais <strong>toutes les réponses</strong> : la bonne lettre s’affiche dans la case « RÉPONSE » en haut de chaque question. Fais échouer les missions sans te faire démasquer
              {g.settings.sabotages ? ' — tes gadgets t’y aideront.' : '.'}
            </p>
          </div>
        ) : (
          <div className="role role-agent">
            <div className="role-badge">🕵️</div>
            <div className="role-kicker mono">TON RÔLE</div>
            <div className="role-title">AGENT</div>
            <p>
              {late ? 'Tu arrives en cours de route : tu es agent pour cette série. ' : ''}
              Réponds juste, observe les autres et <strong>démasque la taupe</strong> avant la fin de la série.
            </p>
          </div>
        )}
      </Scanner>
      )}

      <div className="bottom-bar">
        {g.me && (
          <button
            className="btn btn-primary btn-xl"
            disabled={!seen || meReady}
            onClick={() => {
              sfx.lock();
              api.ready();
            }}
          >
            {meReady ? '✓ Prêt — en attente des autres' : seen ? 'J’ai compris, je suis prêt' : 'Scanne ton empreinte d’abord'}
          </button>
        )}
        <div className="ready-row">
          {g.players.map((p) => (
            <Avatar key={p.id} player={p} size={30} dim={!p.ready} badge={p.ready ? '✓' : undefined} />
          ))}
          <span className="mono small muted">
            {readyCount}/{g.players.length}
          </span>
        </div>
      </div>
    </div>
  );
}
