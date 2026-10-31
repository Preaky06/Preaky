import { useState } from 'react';
import { AVATARS, NAME_MAX } from '../../shared/constants.ts';
import { MoleLogo } from '../components/Logo.tsx';
import { Rules } from '../components/Rules.tsx';
import { SoundToggle } from '../components/Chrome.tsx';
import { Avatar, Sheet } from '../components/ui.tsx';
import { loadProfile, saveProfile } from '../lib/device.ts';
import { sfx, unlockAudio } from '../lib/sound.ts';
import { api, toast, useStore } from '../net.ts';

const initialCode = new URLSearchParams(location.search).get('code')?.toUpperCase().slice(0, 4) ?? '';

export function Home() {
  const [profile, setProfile] = useState(loadProfile);
  const [mode, setMode] = useState<'menu' | 'join' | 'board'>(initialCode ? 'join' : 'menu');
  const [code, setCode] = useState(initialCode);
  const [busy, setBusy] = useState(false);
  const [rules, setRules] = useState(false);
  const [pick, setPick] = useState(false);
  const online = useStore((s) => s.connection === 'online');

  const update = (p: Partial<typeof profile>) => {
    const next = { ...profile, ...p };
    setProfile(next);
    saveProfile(next);
  };

  const needName = () => {
    if (!profile.name.trim()) {
      toast('Choisis d’abord ton nom de code.', 'bad');
      document.getElementById('codename')?.focus();
      return true;
    }
    return false;
  };

  const create = async () => {
    unlockAudio();
    if (needName()) return;
    setBusy(true);
    const r = await api.create(profile.name.trim(), profile.avatar);
    setBusy(false);
    if (!r.ok) toast(r.error ?? 'Erreur', 'bad');
    else sfx.join();
  };

  const join = async () => {
    unlockAudio();
    if (needName()) return;
    if (code.length !== 4) return toast('Le code fait 4 lettres.', 'bad');
    setBusy(true);
    const r = await api.join(code, profile.name.trim(), profile.avatar);
    setBusy(false);
    if (!r.ok) toast(r.error ?? 'Erreur', 'bad');
    else sfx.join();
  };

  const codeInput = (
    <input
      className="code-input"
      value={code}
      onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4))}
      placeholder="ABCD"
      inputMode="text"
      autoCapitalize="characters"
      autoComplete="off"
      autoCorrect="off"
      spellCheck={false}
      maxLength={4}
      aria-label="Code de l’opération"
    />
  );

  return (
    <div className="screen home">
      <div className="home-top">
        <SoundToggle />
      </div>
      <div className="hero">
        <div className="hero-radar" aria-hidden>
          <span />
        </div>
        <MoleLogo size={170} />
        <div className="hero-kicker mono">OPÉRATION</div>
        <h1 className="hero-title">
          TAU<span className="red">PE</span>
        </h1>
        <p className="hero-tagline">
          Un quiz de culture générale. <br />
          L’un de vous <span className="redacted-inline">connaît toutes les réponses</span>.
        </p>
      </div>

      <div className="card profile-card">
        <button className="profile-avatar" onClick={() => setPick(true)} aria-label="Changer d’avatar">
          <Avatar avatar={profile.avatar} size={58} />
          <span className="profile-edit">✎</span>
        </button>
        <label className="profile-field">
          <span className="label mono">Nom de code</span>
          <input
            id="codename"
            className="input"
            value={profile.name}
            maxLength={NAME_MAX}
            placeholder="Ex. : Renard"
            onChange={(e) => update({ name: e.target.value })}
            autoComplete="nickname"
          />
        </label>
      </div>

      {mode === 'menu' && (
        <div className="home-actions">
          <button className="btn btn-primary btn-xl" onClick={create} disabled={busy || !online}>
            <span>🕵️</span> Créer une opération
          </button>
          <button
            className="btn btn-ghost btn-xl"
            onClick={() => {
              sfx.tap();
              setMode('join');
            }}
          >
            <span>🔑</span> Rejoindre avec un code
          </button>
        </div>
      )}

      {mode === 'join' && (
        <div className="card join-card">
          <span className="label mono">Code de l’opération</span>
          {codeInput}
          <button className="btn btn-primary btn-xl" onClick={join} disabled={busy || !online || code.length !== 4}>
            Infiltrer le salon →
          </button>
          <button className="btn btn-link" onClick={() => setMode('menu')}>
            ← Retour
          </button>
        </div>
      )}

      {mode === 'board' && (
        <div className="card join-card">
          <span className="label mono">Code à afficher sur la TV</span>
          {codeInput}
          <button className="btn btn-primary btn-xl" disabled={!online || code.length !== 4} onClick={() => api.spectate(code)}>
            📺 Ouvrir le plateau
          </button>
          <p className="hint">L’écran plateau affiche la partie en grand, sans jamais révéler de secret. Idéal sur une TV ou un ordinateur.</p>
          <button className="btn btn-link" onClick={() => setMode('menu')}>
            ← Retour
          </button>
        </div>
      )}

      <div className="home-links">
        <button className="btn btn-link" onClick={() => setRules(true)}>
          📜 Règles du jeu
        </button>
        <button className="btn btn-link" onClick={() => setMode('board')}>
          📺 Écran plateau
        </button>
      </div>
      <p className="home-foot mono">3 à 12 agents · même pièce · un téléphone chacun</p>

      <Sheet open={rules} onClose={() => setRules(false)} title="Règles de l’opération">
        <Rules />
      </Sheet>
      <Sheet open={pick} onClose={() => setPick(false)} title="Choisis ton avatar">
        <div className="avatar-grid">
          {AVATARS.map((_, i) => (
            <button
              key={i}
              className={`avatar-pick ${profile.avatar === i ? 'avatar-pick-on' : ''}`}
              onClick={() => {
                sfx.tap();
                update({ avatar: i });
                setPick(false);
              }}
            >
              <Avatar avatar={i} size={52} />
            </button>
          ))}
        </div>
      </Sheet>
    </div>
  );
}
