import { useState } from 'react';
import { TopBar } from '../components/Chrome.tsx';
import { MoleLogo, OwlLogo } from '../components/Logo.tsx';
import { Scanner } from '../components/Scanner.tsx';
import { Avatar, ProgressBar } from '../components/ui.tsx';
import { useGame } from '../lib/hooks.ts';
import { sfx } from '../lib/sound.ts';
import { api } from '../net.ts';

function RoundLevel({ level, round, total }: { level: number; round: number; total: number }) {
  const label =
    total === 1 ? 'Série unique' : round === 1 ? 'Échauffement' : round === total ? 'Série finale : la plus corsée' : 'Ça se corse…';
  const pips = Math.max(1, Math.min(3, Math.round(level)));
  return (
    <div className="round-level" aria-label={`Difficulté de la série : ${label}`}>
      <span className="q-diff">
        <span>NIV.</span>
        {[1, 2, 3].map((n) => (
          <i key={n} className={n <= pips ? 'on' : ''} />
        ))}
      </span>
      <span className="round-level-label">{label}</span>
    </div>
  );
}

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
        {g.mission && <RoundLevel level={g.mission.level} round={g.round} total={g.totalRounds} />}
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
              Tu connais <strong>toutes les réponses</strong> : la bonne réponse s’affiche en vert à chaque question. Fais échouer les missions sans te faire démasquer
              {g.settings.sabotages ? ' — un gadget au choix par série t’y aidera.' : '.'}
            </p>
          </div>
        ) : g.me?.role === 'owl' ? (
          <div className="role role-owl">
            <OwlLogo size={60} animated={false} />
            <div className="role-kicker mono">TON RÔLE · AGENTE SPÉCIALE</div>
            <div className="role-title">LA CHOUETTE</div>
            <p>
              Tu vois dans le noir : une fois par série, observe un joueur dans ton <strong>dossier</strong> et découvre s’il est la taupe. Si la
              taupe est démasquée, elle tentera de te trouver : reste discrète.
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
              {g.mission?.owl ? ' Une Chouette veille parmi vous… mais qui ?' : ''}
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
