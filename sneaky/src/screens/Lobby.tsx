import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { AVATARS, CATEGORIES, BANK_CATEGORIES, LIMITS, MAX_PLAYERS, MIN_PLAYERS, NAME_MAX } from '../../shared/constants.ts';
import type { CategoryId, CustomQuestion, Difficulty, PublicPlayer, Settings } from '../../shared/types.ts';
import { TopBar, Ticker } from '../components/Chrome.tsx';
import { Avatar, ConfirmButton, Sheet, Stepper, Toggle } from '../components/ui.tsx';
import { saveProfile } from '../lib/device.ts';
import { useGame } from '../lib/hooks.ts';
import { sfx } from '../lib/sound.ts';
import { api, toast } from '../net.ts';

type Counts = Record<string, Record<string, number>>;

function useJoinUrl(code: string) {
  const [base, setBase] = useState(location.origin);
  useEffect(() => {
    if (!['localhost', '127.0.0.1'].includes(location.hostname)) return;
    fetch('/api/info')
      .then((r) => r.json())
      .then((info: { lan: string[] }) => {
        if (info.lan?.[0]) setBase(`${location.protocol}//${info.lan[0]}${location.port ? `:${location.port}` : ''}`);
      })
      .catch(() => {});
  }, []);
  return `${base}/?code=${code}`;
}

function useCategoryCounts() {
  const [counts, setCounts] = useState<Counts | null>(null);
  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then(setCounts)
      .catch(() => {});
  }, []);
  return counts;
}

function availableQuestions(counts: Counts | null, s: Settings, custom: number) {
  if (!counts) return null;
  let n = 0;
  for (const c of s.categories) {
    const d = counts[c];
    if (!d) continue;
    if (s.difficulty === 'easy') n += (d['1'] ?? 0) + (d['2'] ?? 0);
    else if (s.difficulty === 'hard') n += (d['2'] ?? 0) + (d['3'] ?? 0);
    else n += (d['1'] ?? 0) + (d['2'] ?? 0) + (d['3'] ?? 0);
  }
  return n + (s.useCustom ? custom : 0);
}

function QR({ url }: { url: string }) {
  const [svg, setSvg] = useState('');
  useEffect(() => {
    QRCode.toString(url, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#10141C', light: '#EFE6D2' } })
      .then(setSvg)
      .catch(() => setSvg(''));
  }, [url]);
  return <div className="qr" dangerouslySetInnerHTML={{ __html: svg }} />;
}

function ProfileEditor({ me, onClose, taken }: { me: PublicPlayer; onClose: () => void; taken: Set<number> }) {
  const [name, setName] = useState(me.name);
  const [avatar, setAvatar] = useState(me.avatar);
  return (
    <div className="stack">
      <input className="input" value={name} maxLength={NAME_MAX} onChange={(e) => setName(e.target.value)} />
      <div className="avatar-grid">
        {AVATARS.map((_, i) => (
          <button key={i} className={`avatar-pick ${avatar === i ? 'avatar-pick-on' : ''}`} disabled={taken.has(i)} onClick={() => setAvatar(i)}>
            <Avatar avatar={i} size={46} dim={taken.has(i)} />
          </button>
        ))}
      </div>
      <button
        className="btn btn-primary"
        onClick={() => {
          api.profile(name, avatar);
          saveProfile({ name, avatar });
          onClose();
        }}
      >
        Enregistrer
      </button>
    </div>
  );
}

const CUSTOM_KEY = 'taupe:custom';
function loadCustom(): CustomQuestion[] {
  try {
    const v = JSON.parse(localStorage.getItem(CUSTOM_KEY) ?? '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function CustomEditor({ onClose }: { onClose: () => void }) {
  const [list, setList] = useState<CustomQuestion[]>(loadCustom);
  const [q, setQ] = useState('');
  const [a, setA] = useState(['', '', '', '']);
  const [io, setIo] = useState(false);
  const [raw, setRaw] = useState('');

  const add = () => {
    const answers = a.map((x) => x.trim()) as CustomQuestion['answers'];
    if (!q.trim() || answers.some((x) => !x)) return toast('Remplis la question et les 4 réponses.', 'bad');
    if (new Set(answers.map((x) => x.toLowerCase())).size < 4) return toast('Les 4 réponses doivent être différentes.', 'bad');
    setList([...list, { q: q.trim(), answers }]);
    setQ('');
    setA(['', '', '', '']);
    sfx.pop();
  };

  const save = async (next = list) => {
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(next));
    const r = await api.custom(next);
    if (r.ok) {
      toast(`${r.count} question${(r.count ?? 0) > 1 ? 's' : ''} maison chargée${(r.count ?? 0) > 1 ? 's' : ''}.`, 'good');
      onClose();
    } else toast(r.error ?? 'Erreur', 'bad');
  };

  return (
    <div className="stack">
      <p className="hint">
        Ajoute des questions sur votre groupe (« Qui a déjà raté son train pour Nice ? »…). Elles seront mélangées aux autres. Écris la{' '}
        <strong>bonne réponse en premier</strong> : l’ordre sera mélangé en jeu.
      </p>
      <input className="input" placeholder="Question" value={q} maxLength={160} onChange={(e) => setQ(e.target.value)} />
      {a.map((v, i) => (
        <input
          key={i}
          className={`input ${i === 0 ? 'input-good' : ''}`}
          placeholder={i === 0 ? '✅ Bonne réponse' : `❌ Mauvaise réponse ${i}`}
          value={v}
          maxLength={70}
          onChange={(e) => setA(a.map((x, j) => (j === i ? e.target.value : x)))}
        />
      ))}
      <button className="btn btn-ghost" onClick={add}>
        ＋ Ajouter la question
      </button>
      {list.length > 0 && (
        <ol className="custom-list">
          {list.map((c, i) => (
            <li key={i}>
              <span>
                <strong>{c.q}</strong>
                <small>✅ {c.answers[0]}</small>
              </span>
              <button className="icon-btn" onClick={() => setList(list.filter((_, j) => j !== i))} aria-label="Supprimer">
                ✕
              </button>
            </li>
          ))}
        </ol>
      )}
      <button className="btn btn-link" onClick={() => setIo(!io)}>
        {io ? 'Masquer' : 'Importer / exporter (JSON)'}
      </button>
      {io && (
        <div className="stack">
          <textarea className="input textarea" rows={4} value={raw} placeholder='[{"q":"…","answers":["bonne","x","y","z"]}]' onChange={(e) => setRaw(e.target.value)} />
          <div className="row">
            <button
              className="btn btn-ghost"
              onClick={() => {
                try {
                  const v = JSON.parse(raw);
                  if (!Array.isArray(v)) throw new Error();
                  setList(v.filter((x) => x && typeof x.q === 'string' && Array.isArray(x.answers) && x.answers.length === 4));
                  toast('Import réussi.', 'good');
                } catch {
                  toast('JSON invalide.', 'bad');
                }
              }}
            >
              Importer
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => {
                setRaw(JSON.stringify(list));
                void navigator.clipboard?.writeText(JSON.stringify(list)).then(() => toast('Copié !', 'good'));
              }}
            >
              Exporter
            </button>
          </div>
        </div>
      )}
      <button className="btn btn-primary" onClick={() => save()}>
        Enregistrer ({list.length})
      </button>
    </div>
  );
}

function SettingsPanel({ s, editable, customCount }: { s: Settings; editable: boolean; customCount: number }) {
  const [customOpen, setCustomOpen] = useState(false);
  const counts = useCategoryCounts();
  const set = (patch: Partial<Settings>) => api.settings(patch);
  const need = s.rounds * s.questionsPerRound;
  const have = availableQuestions(counts, s, customCount);
  const toggleCat = (id: CategoryId) => {
    sfx.tap();
    const has = s.categories.includes(id);
    set({ categories: has ? s.categories.filter((c) => c !== id) : [...s.categories, id] });
  };
  const minutes = Math.round((s.rounds * (s.questionsPerRound * (s.questionTime + 8) + s.meetingTime + s.voteTime + 45)) / 60);

  if (!editable) {
    return (
      <div className="card settings-summary">
        <div className="summary-grid">
          <div>
            <strong>{s.rounds}</strong>
            <small>séries</small>
          </div>
          <div>
            <strong>{s.questionsPerRound}</strong>
            <small>questions / série</small>
          </div>
          <div>
            <strong>{s.questionTime}s</strong>
            <small>par question</small>
          </div>
          <div>
            <strong>{Math.round(s.meetingTime / 60 * 10) / 10} min</strong>
            <small>de réunion</small>
          </div>
        </div>
        <div className="chips">
          {CATEGORIES.filter((c) => s.categories.includes(c.id)).map((c) => (
            <span key={c.id} className="chip chip-sm" style={{ color: c.color, borderColor: `${c.color}55` }}>
              {c.emoji} {c.label}
            </span>
          ))}
          {s.useCustom && customCount > 0 && <span className="chip chip-sm">🏠 {customCount} questions maison</span>}
        </div>
        <p className="hint">
          {s.sabotages ? '🕶️ Gadgets de la taupe activés' : '🕶️ Sans gadgets'} · {s.speakingTurns ? '🎙️ Tour de parole' : '🗣️ Débat libre'} ·
          🚨 {s.emergencyPerPlayer} réunion{s.emergencyPerPlayer > 1 ? 's' : ''} d’urgence · ≈ {minutes} min
        </p>
      </div>
    );
  }

  return (
    <div className="card settings">
      <Stepper label="Séries" value={s.rounds} min={LIMITS.rounds[0]} max={LIMITS.rounds[1]} onChange={(v) => set({ rounds: v })} />
      <Stepper
        label="Questions par série"
        value={s.questionsPerRound}
        min={LIMITS.questionsPerRound[0]}
        max={LIMITS.questionsPerRound[1]}
        onChange={(v) => set({ questionsPerRound: v })}
      />
      <Stepper label="Temps par question" value={s.questionTime} min={LIMITS.questionTime[0]} max={LIMITS.questionTime[1]} step={5} unit="s" onChange={(v) => set({ questionTime: v })} />
      <Stepper label="Durée des réunions" value={s.meetingTime} min={LIMITS.meetingTime[0]} max={LIMITS.meetingTime[1]} step={15} unit="s" onChange={(v) => set({ meetingTime: v })} />
      <Stepper label="Durée du vote" value={s.voteTime} min={LIMITS.voteTime[0]} max={LIMITS.voteTime[1]} step={5} unit="s" onChange={(v) => set({ voteTime: v })} />
      <Stepper
        label="Réunions d’urgence / agent"
        value={s.emergencyPerPlayer}
        min={LIMITS.emergencyPerPlayer[0]}
        max={LIMITS.emergencyPerPlayer[1]}
        onChange={(v) => set({ emergencyPerPlayer: v })}
      />
      <div className="segmented" role="radiogroup" aria-label="Difficulté">
        {(
          [
            ['easy', 'Détente'],
            ['mixed', 'Mixte'],
            ['hard', 'Expert'],
          ] as [Difficulty, string][]
        ).map(([d, label]) => (
          <button key={d} className={s.difficulty === d ? 'on' : ''} onClick={() => set({ difficulty: d })} role="radio" aria-checked={s.difficulty === d}>
            {label}
          </button>
        ))}
      </div>
      <Toggle label="Gadgets de la taupe" hint="Brouillage, coupe-chrono, faux indice" value={s.sabotages} onChange={(v) => set({ sabotages: v })} />
      <Toggle label="Tour de parole" hint="Chacun son tour pour se défendre" value={s.speakingTurns} onChange={(v) => set({ speakingTurns: v })} />
      {s.speakingTurns && (
        <Stepper label="Temps de parole" value={s.speakingTime} min={LIMITS.speakingTime[0]} max={LIMITS.speakingTime[1]} step={5} unit="s" onChange={(v) => set({ speakingTime: v })} />
      )}
      <div className="cat-head">
        <span className="label mono">Catégories</span>
        <span className="row">
          <button className="btn btn-link btn-sm" onClick={() => set({ categories: [...BANK_CATEGORIES] })}>
            Toutes
          </button>
          <button className="btn btn-link btn-sm" onClick={() => set({ categories: [] })}>
            Aucune
          </button>
        </span>
      </div>
      <div className="chips">
        {CATEGORIES.filter((c) => c.id !== 'perso').map((c) => {
          const on = s.categories.includes(c.id);
          return (
            <button
              key={c.id}
              className={`chip chip-toggle ${on ? 'chip-on' : ''}`}
              style={on ? { color: c.color, borderColor: c.color, background: `${c.color}1f` } : undefined}
              onClick={() => toggleCat(c.id)}
            >
              {c.emoji} {c.label}
            </button>
          );
        })}
      </div>
      <Toggle label={`Questions maison (${customCount})`} hint="Vos propres questions, mélangées aux autres" value={s.useCustom} onChange={(v) => set({ useCustom: v })} />
      <button className="btn btn-ghost" onClick={() => setCustomOpen(true)}>
        🏠 Écrire des questions maison
      </button>
      <p className={`hint ${have !== null && have < need ? 'red' : ''}`}>
        {have === null ? '' : `${have} questions disponibles · ${need} nécessaires · `}≈ {minutes} min de jeu
      </p>
      <Sheet open={customOpen} onClose={() => setCustomOpen(false)} title="Questions maison">
        <CustomEditor onClose={() => setCustomOpen(false)} />
      </Sheet>
    </div>
  );
}

export function Lobby() {
  const g = useGame();
  const url = useJoinUrl(g.code);
  const [qr, setQr] = useState(true);
  const [target, setTarget] = useState<PublicPlayer | null>(null);
  const [starting, setStarting] = useState(false);
  const isHost = g.me?.id === g.hostId;
  const connected = g.players.filter((p) => p.connected).length;
  const me = useMemo(() => g.players.find((p) => p.id === g.me?.id), [g.players, g.me]);
  const host = g.players.find((p) => p.id === g.hostId);

  const share = async () => {
    sfx.tap();
    const text = `Rejoins l’opération ${g.code} sur Sneaky 🕵️`;
    try {
      if (navigator.share) await navigator.share({ title: 'Sneaky', text, url });
      else {
        await navigator.clipboard.writeText(url);
        toast('Lien copié !', 'good');
      }
    } catch {
      /* partage annulé */
    }
  };

  const start = async () => {
    setStarting(true);
    const r = await api.start();
    setStarting(false);
    if (!r.ok) toast(r.error ?? 'Impossible de lancer.', 'bad');
  };

  return (
    <div className="screen lobby">
      <TopBar />
      <div className="code-card">
        <div className="code-tab mono">CODE D’ACCÈS</div>
        <div className="code-letters">
          {g.code.split('').map((c, i) => (
            <span key={i} style={{ animationDelay: `${i * 0.08}s` }}>
              {c}
            </span>
          ))}
        </div>
        <div className="row center">
          <button className="btn btn-ghost btn-sm" onClick={share}>
            📤 Inviter
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setQr(!qr)}>
            {qr ? 'Masquer le QR' : '▦ QR code'}
          </button>
        </div>
        {qr && (
          <div className="qr-wrap">
            <QR url={url} />
            <span className="mono small muted">{url.replace(/^https?:\/\//, '')}</span>
          </div>
        )}
      </div>

      <div className="section-title">
        <span>
          Agents ({g.players.length}/{MAX_PLAYERS})
        </span>
        <span className="muted small">min. {MIN_PLAYERS}</span>
      </div>
      <div className="agents-grid">
        {g.players.map((p, i) => (
          <button
            key={p.id}
            className={`agent-card ${p.id === g.me?.id ? 'agent-me' : ''}`}
            style={{ animationDelay: `${i * 0.05}s` }}
            onClick={() => {
              if (p.id === g.me?.id || (isHost && p.id !== g.me?.id)) setTarget(p);
            }}
          >
            <Avatar player={p} size={50} badge={p.isHost ? '👑' : undefined} />
            <span className="agent-name">{p.name}</span>
            <span className="agent-sub">{p.id === g.me?.id ? 'toi' : p.connected ? 'en ligne' : 'hors ligne'}</span>
          </button>
        ))}
        {Array.from({ length: Math.max(0, MIN_PLAYERS - g.players.length) }).map((_, i) => (
          <div key={`e${i}`} className="agent-card agent-empty">
            <span className="agent-slot">?</span>
            <span className="agent-sub">en attente</span>
          </div>
        ))}
      </div>

      <div className="section-title">
        <span>Paramètres de mission</span>
        {!isHost && <span className="muted small">réglés par {host?.name}</span>}
      </div>
      <SettingsPanel s={g.settings} editable={isHost} customCount={g.customCount} />

      <Ticker />

      <div className="bottom-bar">
        {isHost ? (
          <button className="btn btn-primary btn-xl" onClick={start} disabled={starting || connected < MIN_PLAYERS}>
            {connected < MIN_PLAYERS ? `Encore ${MIN_PLAYERS - connected} agent${MIN_PLAYERS - connected > 1 ? 's' : ''}…` : '🚀 Lancer l’opération'}
          </button>
        ) : (
          <div className="waiting">
            <span className="radar-mini" />
            En attente du chef d’opération…
          </div>
        )}
        <ConfirmButton className="btn btn-link btn-sm" confirmText="Confirmer : quitter" onConfirm={() => api.leave()}>
          Quitter le salon
        </ConfirmButton>
      </div>

      <Sheet open={!!target} onClose={() => setTarget(null)} title={target?.id === g.me?.id ? 'Ton profil' : target?.name}>
        {target && target.id === g.me?.id && me && (
          <ProfileEditor me={me} onClose={() => setTarget(null)} taken={new Set(g.players.filter((p) => p.id !== me.id).map((p) => p.avatar))} />
        )}
        {target && target.id !== g.me?.id && isHost && (
          <div className="host-actions">
            <button
              className="btn btn-ghost"
              onClick={() => {
                api.transfer(target.id);
                setTarget(null);
              }}
            >
              👑 Nommer chef d’opération
            </button>
            <ConfirmButton
              className="btn btn-danger"
              confirmText={`Confirmer l’exclusion de ${target.name}`}
              onConfirm={() => {
                api.kick(target.id);
                setTarget(null);
              }}
            >
              🚫 Exclure du salon
            </ConfirmButton>
          </div>
        )}
      </Sheet>
    </div>
  );
}
