import { useState } from 'react';
import { REACTIONS } from '../../shared/constants.ts';
import type { PublicPlayer } from '../../shared/types.ts';
import { TopBar, Ticker } from '../components/Chrome.tsx';
import { NOTE_ICON, NotePicker } from '../components/Dossier.tsx';
import { IntelList, Journal } from '../components/Intel.tsx';
import { useRoundScores } from '../components/Answers.tsx';
import { Avatar, Sheet, TimerRing } from '../components/ui.tsx';
import { useCountdown, useGame, useNotes, useOnce, usePlayers } from '../lib/hooks.ts';
import { sfx } from '../lib/sound.ts';
import { vibrate } from '../lib/device.ts';
import { api } from '../net.ts';

type Tab = 'intel' | 'suspects' | 'journal';

function SpeakerBanner() {
  const g = useGame();
  const m = g.meeting!;
  const players = usePlayers();
  const { seconds } = useCountdown(m.speakerEndsAt);
  if (!m.speakerId) {
    if (!g.settings.speakingTurns) return null;
    return <div className="speaker speaker-free">🗣️ Débat libre jusqu’au vote</div>;
  }
  const sp = players[m.speakerId];
  const mine = m.speakerId === g.me?.id;
  return (
    <div className={`speaker ${mine ? 'speaker-me' : ''}`}>
      <Avatar player={sp} size={42} />
      <div className="speaker-body">
        <span className="mono small">🎙️ À LA BARRE</span>
        <strong>{mine ? 'À toi de parler !' : sp?.name}</strong>
        {m.speakerQueue.length > 0 && (
          <span className="speaker-queue">
            Ensuite :{' '}
            {m.speakerQueue.slice(0, 4).map((id) => (
              <Avatar key={id} player={players[id]} size={18} />
            ))}
          </span>
        )}
      </div>
      <span className="speaker-time mono">{g.paused ? '❚❚' : `${seconds}s`}</span>
      {(mine || g.me?.id === g.hostId) && (
        <button className="btn btn-ghost btn-sm" onClick={() => api.pass()}>
          {mine ? 'J’ai fini' : 'Suivant'}
        </button>
      )}
    </div>
  );
}

function Suspects({ onPick }: { onPick: (p: PublicPlayer) => void }) {
  const g = useGame();
  const m = g.meeting!;
  const [notes] = useNotes(g.code, g.round);
  const scores = useRoundScores(g.history);
  return (
    <div className="suspects">
      {g.players.map((p) => {
        const acc = m.accusations[p.id] ?? [];
        const def = m.defenses[p.id] ?? [];
        const iAccuse = g.me && acc.includes(g.me.id);
        const iDefend = g.me && def.includes(g.me.id);
        const note = notes[p.id];
        return (
          <button
            key={p.id}
            className={`suspect ${p.benched ? 'suspect-benched' : ''} ${p.id === g.me?.id ? 'suspect-me' : ''} ${acc.length >= 2 ? 'suspect-hot' : ''}`}
            onClick={() => p.id !== g.me?.id && g.me && onPick(p)}
          >
            <Avatar player={p} size={52} />
            <span className="suspect-name">{p.name}</span>
            {scores[p.id] && (
              <span className="suspect-score mono" title="Bonnes réponses cette série">
                ✓ {scores[p.id].good}/{scores[p.id].played}
              </span>
            )}
            {p.benched ? (
              <span className="suspect-tag">innocent·e écarté·e</span>
            ) : (
              <span className="suspect-counts">
                <span className={`sc sc-acc ${iAccuse ? 'sc-mine' : ''}`}>👉 {acc.length}</span>
                <span className={`sc sc-def ${iDefend ? 'sc-mine' : ''}`}>🛡️ {def.length}</span>
              </span>
            )}
            {note && <span className="suspect-note">{NOTE_ICON[note]}</span>}
            {p.id === g.me?.id && <span className="suspect-tag">toi</span>}
          </button>
        );
      })}
    </div>
  );
}

export function Meeting() {
  const g = useGame();
  const m = g.meeting!;
  const players = usePlayers();
  const [tab, setTab] = useState<Tab>(m.intel.length || m.falsified ? 'intel' : 'suspects');
  const [target, setTarget] = useState<PublicPlayer | null>(null);
  const emergency = m.kind === 'emergency';
  const iSkipped = g.me && m.skipVotes.includes(g.me.id);
  const canSkip = g.me && !g.me.benched;

  useOnce(`${g.round}-${g.questionIndex}-${m.kind}`, () => {
    if (emergency) {
      sfx.siren();
      vibrate([200, 100, 200, 100, 400]);
    } else {
      sfx.reveal();
      vibrate([80, 60, 80]);
    }
  });

  const live = target ? players[target.id] : null;
  const acc = live ? (m.accusations[live.id] ?? []) : [];
  const def = live ? (m.defenses[live.id] ?? []) : [];

  return (
    <div className={`screen meeting ${emergency ? 'meeting-emergency' : ''}`}>
      <TopBar />
      <div className="meeting-head">
        {emergency && <div className="siren" aria-hidden />}
        <div className="meeting-title">
          <span className="mono small">{emergency ? 'ALERTE ROUGE' : `FIN DE SÉRIE ${g.round}`}</span>
          <h2 className="display">{emergency ? 'Réunion d’urgence' : 'Briefing'}</h2>
          {emergency && m.calledBy && (
            <span className="meeting-caller">
              convoquée par <Avatar player={players[m.calledBy]} size={22} /> <strong>{players[m.calledBy]?.name}</strong>
            </span>
          )}
          {!emergency && <span className="meeting-caller">Débattez, accusez, défendez-vous. Puis votez.</span>}
        </div>
        <TimerRing endsAt={g.phaseEndsAt} duration={g.phaseDuration} paused={g.paused} warnAt={10} />
      </div>

      <SpeakerBanner />

      <div className="tabs" role="tablist">
        {(
          [
            ['intel', `🗂️ Indices${m.intel.length ? ` (${m.intel.length})` : ''}`],
            ['suspects', '🕵️ Suspects'],
            ['journal', '📒 Journal'],
          ] as [Tab, string][]
        ).map(([t, label]) => (
          <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>
            {label}
          </button>
        ))}
      </div>

      <div className="tab-body">
        {tab === 'intel' && <IntelList intel={m.intel} falsified={m.falsified} archive={m.archive} />}
        {tab === 'suspects' && <Suspects onPick={setTarget} />}
        {tab === 'journal' && <Journal history={g.history} />}
      </div>

      <Ticker />

      {g.me && (
        <div className="bottom-bar">
          <div className="reaction-bar">
            {REACTIONS.map((e) => (
              <button
                key={e}
                onClick={() => {
                  sfx.pop();
                  api.react(e);
                }}
              >
                {e}
              </button>
            ))}
          </div>
          <button className={`btn btn-xl ${iSkipped ? 'btn-ghost' : 'btn-primary'}`} disabled={!canSkip} onClick={() => api.skip()}>
            {iSkipped ? '↩︎ Annuler' : '🗳️ Passer au vote'}{' '}
            <small className="mono">
              {m.skipVotes.length}/{m.skipNeeded}
            </small>
          </button>
        </div>
      )}

      <Sheet open={!!live} onClose={() => setTarget(null)} title={live ? <span className="row">{<Avatar player={live} size={28} />} {live.name}</span> : null}>
        {live && (
          <div className="stack">
            {live.benched ? (
              <p className="muted">{live.name} a été écarté·e : son innocence est prouvée.</p>
            ) : (
              <div className="row">
                <button
                  className={`btn btn-danger grow ${g.me && acc.includes(g.me.id) ? 'armed' : ''}`}
                  onClick={() => {
                    sfx.tap();
                    api.accuse(live.id);
                  }}
                >
                  👉 {g.me && acc.includes(g.me.id) ? 'Retirer l’accusation' : 'Je le/la soupçonne'}
                </button>
                <button
                  className={`btn btn-ghost grow ${g.me && def.includes(g.me.id) ? 'armed' : ''}`}
                  onClick={() => {
                    sfx.tap();
                    api.defend(live.id);
                  }}
                >
                  🛡️ {g.me && def.includes(g.me.id) ? 'Retirer' : 'Je me porte garant'}
                </button>
              </div>
            )}
            <span className="label mono">Mon carnet (privé)</span>
            <NotePicker playerId={live.id} />
            {(acc.length > 0 || def.length > 0) && (
              <div className="who">
                {acc.length > 0 && (
                  <p>
                    👉 Soupçonné·e par :{' '}
                    {acc.map((id) => (
                      <Avatar key={id} player={players[id]} size={22} />
                    ))}
                  </p>
                )}
                {def.length > 0 && (
                  <p>
                    🛡️ Défendu·e par :{' '}
                    {def.map((id) => (
                      <Avatar key={id} player={players[id]} size={22} />
                    ))}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </Sheet>
    </div>
  );
}
