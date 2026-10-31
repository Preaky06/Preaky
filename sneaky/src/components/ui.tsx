import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AVATARS, AVATAR_COLORS, categoryOf } from '../../shared/constants.ts';
import type { CategoryId, PublicPlayer } from '../../shared/types.ts';
import { useCountdown } from '../lib/hooks.ts';
import { sfx } from '../lib/sound.ts';

export function avatarColor(i: number) {
  return AVATAR_COLORS[i % AVATAR_COLORS.length];
}

interface AvatarProps {
  player?: Pick<PublicPlayer, 'avatar' | 'name' | 'connected'> | null;
  avatar?: number;
  size?: number;
  badge?: ReactNode;
  dim?: boolean;
  ring?: string;
  className?: string;
}

export function Avatar({ player, avatar, size = 44, badge, dim, ring, className = '' }: AvatarProps) {
  const a = player?.avatar ?? avatar ?? 0;
  const color = avatarColor(a);
  const offline = player && !player.connected;
  return (
    <span
      className={`avatar ${dim || offline ? 'avatar-dim' : ''} ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.56,
        background: `radial-gradient(circle at 35% 30%, ${color}55, ${color}22 60%, #0000 100%), #141A25`,
        boxShadow: `0 0 0 2px ${ring ?? color}${ring ? '' : '99'}, 0 4px 14px ${color}33`,
      }}
      title={player?.name}
    >
      <span className="avatar-emoji">{AVATARS[a % AVATARS.length]}</span>
      {offline && <span className="avatar-off">zz</span>}
      {badge && <span className="avatar-badge">{badge}</span>}
    </span>
  );
}

export function PlayerTag({ player, size = 28, suffix }: { player?: PublicPlayer; size?: number; suffix?: ReactNode }) {
  if (!player) return <span className="ptag muted">???</span>;
  return (
    <span className="ptag">
      <Avatar player={player} size={size} />
      <span className="ptag-name">{player.name}</span>
      {suffix}
    </span>
  );
}

export function TimerRing({
  endsAt,
  duration,
  size = 64,
  paused,
  warnAt = 5,
  silent,
}: {
  endsAt: number | null;
  duration: number | null;
  size?: number;
  paused?: boolean;
  warnAt?: number;
  silent?: boolean;
}) {
  const { seconds, ratio, active } = useCountdown(endsAt, duration);
  const last = useRef(seconds);
  useEffect(() => {
    if (!silent && active && seconds !== last.current && seconds > 0 && seconds <= warnAt) sfx.tick();
    last.current = seconds;
  }, [seconds, active, warnAt, silent]);
  const r = 26;
  const c = 2 * Math.PI * r;
  const warn = active && seconds <= warnAt;
  return (
    <div className={`timer ${warn ? 'timer-warn' : ''} ${paused ? 'timer-paused' : ''}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 64 64" width={size} height={size}>
        <circle cx="32" cy="32" r={r} className="timer-bg" />
        <circle
          cx="32"
          cy="32"
          r={r}
          className="timer-fg"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - (active ? ratio : paused ? ratio : 0))}
        />
      </svg>
      <span className="timer-text">{paused ? '❚❚' : active ? seconds : '–'}</span>
    </div>
  );
}

export function Countdown({ endsAt, prefix }: { endsAt: number | null; prefix: string }) {
  const { seconds, active } = useCountdown(endsAt);
  if (!active) return null;
  return (
    <span className="countdown">
      {prefix} {seconds}s
    </span>
  );
}

export function ProgressBar({ endsAt, duration, tone = 'amber' }: { endsAt: number | null; duration: number | null; tone?: string }) {
  const { ratio, active } = useCountdown(endsAt, duration);
  return (
    <div className={`pbar pbar-${tone}`}>
      <div className="pbar-fill" style={{ transform: `scaleX(${active ? ratio : 0})` }} />
    </div>
  );
}

export function Stamp({ children, tone = 'red', delay = 0, big }: { children: ReactNode; tone?: 'red' | 'green' | 'amber' | 'blue' | 'gray'; delay?: number; big?: boolean }) {
  useEffect(() => {
    const t = setTimeout(() => sfx.stamp(), delay * 1000 + 180);
    return () => clearTimeout(t);
  }, [delay]);
  return (
    <div className={`stamp stamp-${tone} ${big ? 'stamp-big' : ''}`} style={{ animationDelay: `${delay}s` }}>
      {children}
    </div>
  );
}

export function CategoryChip({ id }: { id: CategoryId }) {
  const c = categoryOf(id);
  return (
    <span className="chip" style={{ color: c.color, borderColor: `${c.color}66`, background: `${c.color}14` }}>
      <span>{c.emoji}</span> {c.label}
    </span>
  );
}

export function Sheet({ open, onClose, children, title, tone }: { open: boolean; onClose: () => void; children: ReactNode; title?: ReactNode; tone?: 'red' | 'amber' }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  // Portail vers <body> : la feuille couvre tout l'écran quel que soit son parent.
  return createPortal(
    <div className="sheet-backdrop" onClick={onClose}>
      <div className={`sheet ${tone ? `sheet-${tone}` : ''}`} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="sheet-grip" />
        {title && <div className="sheet-title">{title}</div>}
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function Stepper({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  const set = (v: number) => {
    sfx.tap();
    onChange(Math.min(max, Math.max(min, v)));
  };
  return (
    <div className="stepper">
      <span className="stepper-label">{label}</span>
      <div className="stepper-ctrl">
        <button className="stepper-btn" disabled={disabled || value <= min} onClick={() => set(value - step)} aria-label={`Moins ${label}`}>
          −
        </button>
        <span className="stepper-value">
          {value}
          {unit && <small>{unit}</small>}
        </span>
        <button className="stepper-btn" disabled={disabled || value >= max} onClick={() => set(value + step)} aria-label={`Plus ${label}`}>
          +
        </button>
      </div>
    </div>
  );
}

export function Toggle({ label, hint, value, onChange, disabled }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      className={`toggle ${value ? 'toggle-on' : ''}`}
      disabled={disabled}
      onClick={() => {
        sfx.tap();
        onChange(!value);
      }}
      role="switch"
      aria-checked={value}
    >
      <span className="toggle-text">
        <span>{label}</span>
        {hint && <small>{hint}</small>}
      </span>
      <span className="toggle-track">
        <span className="toggle-thumb" />
      </span>
    </button>
  );
}

/** Bouton qui demande une seconde pression pour confirmer. */
export function ConfirmButton({ children, confirmText, onConfirm, className = '', disabled }: { children: ReactNode; confirmText: ReactNode; onConfirm: () => void; className?: string; disabled?: boolean }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <button
      className={`${className} ${armed ? 'armed' : ''}`}
      disabled={disabled}
      onClick={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
        } else {
          sfx.tap();
          setArmed(true);
        }
      }}
    >
      {armed ? confirmText : children}
    </button>
  );
}

export function Redacted({ children, reveal }: { children: ReactNode; reveal?: boolean }) {
  return <span className={`redacted ${reveal ? 'redacted-reveal' : ''}`}>{children}</span>;
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="section-title">
      <span>{children}</span>
      {right}
    </div>
  );
}

export function Empty({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <div>{children}</div>
    </div>
  );
}
