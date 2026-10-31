import { useEffect } from 'react';
import { Overlays } from './components/Chrome.tsx';
import { MoleLogo } from './components/Logo.tsx';
import { keepAwake } from './lib/device.ts';
import { api, useStore } from './net.ts';
import { GameEnd } from './screens/GameEnd.tsx';
import { Home } from './screens/Home.tsx';
import { Lobby } from './screens/Lobby.tsx';
import { Meeting } from './screens/Meeting.tsx';
import { Question } from './screens/Question.tsx';
import { QuestionResult } from './screens/QuestionResult.tsx';
import { RoleReveal } from './screens/RoleReveal.tsx';
import { RoundEnd } from './screens/RoundEnd.tsx';
import { Vote } from './screens/Vote.tsx';
import { VoteResult } from './screens/VoteResult.tsx';

function Loading() {
  const connection = useStore((s) => s.connection);
  return (
    <div className="screen loading">
      <MoleLogo size={120} />
      <p className="mono">{connection === 'online' ? 'Reconnexion à l’opération…' : 'Connexion au QG…'}</p>
      <button className="btn btn-link" onClick={() => api.leave()}>
        Annuler
      </button>
    </div>
  );
}

function Kicked() {
  return (
    <div className="screen loading">
      <div className="kicked-icon">🚫</div>
      <h2 className="display">Accès révoqué</h2>
      <p className="muted">Le chef d’opération t’a retiré du salon.</p>
      <button className="btn btn-primary" onClick={() => api.dismissKick()}>
        Retour à l’accueil
      </button>
    </div>
  );
}

function Screen() {
  const state = useStore((s) => s.state);
  const session = useStore((s) => s.session);
  const board = useStore((s) => s.boardCode);
  const kicked = useStore((s) => s.kicked);

  if (kicked) return <Kicked />;
  if (!state) return session || board ? <Loading /> : <Home />;

  const key = `${state.phase}-${state.round}-${state.questionIndex}`;
  let screen;
  switch (state.phase) {
    case 'lobby':
      screen = <Lobby />;
      break;
    case 'roleReveal':
      screen = <RoleReveal />;
      break;
    case 'question':
      screen = <Question />;
      break;
    case 'questionResult':
      screen = <QuestionResult />;
      break;
    case 'meeting':
      screen = <Meeting />;
      break;
    case 'vote':
      screen = <Vote />;
      break;
    case 'voteResult':
      screen = <VoteResult />;
      break;
    case 'roundEnd':
      screen = <RoundEnd />;
      break;
    case 'gameEnd':
      screen = <GameEnd />;
      break;
  }
  return (
    <div className={`phase-wrap phase-${state.phase}`} key={key}>
      {screen}
    </div>
  );
}

export function App() {
  const inGame = useStore((s) => !!s.state && s.state.phase !== 'lobby');
  const board = useStore((s) => !!s.boardCode);

  useEffect(() => {
    keepAwake(inGame || board);
  }, [inGame, board]);

  return (
    <div className={`app ${board ? 'board-mode' : ''}`}>
      <div className="bg-grid" aria-hidden />
      <div className="bg-noise" aria-hidden />
      <Screen />
      <Overlays />
    </div>
  );
}
