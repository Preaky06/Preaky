import { useEffect, useRef, useState, type ReactNode } from 'react';
import { sfx } from '../lib/sound.ts';
import { vibrate } from '../lib/device.ts';

const HOLD_MS = 700;

/**
 * Scanner d'empreinte : il faut maintenir le doigt pour révéler le contenu,
 * qui se cache dès qu'on relâche. Identique pour tous les joueurs.
 */
export function Scanner({ children, onFirstReveal, label = 'Maintiens ton doigt pour ouvrir ton dossier' }: { children: ReactNode; onFirstReveal?: () => void; label?: string }) {
  const [holding, setHolding] = useState(false);
  const [open, setOpen] = useState(false);
  const timer = useRef<number | null>(null);
  const revealedOnce = useRef(false);

  const start = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setHolding(true);
    sfx.scan();
    timer.current = window.setTimeout(() => {
      setOpen(true);
      vibrate([30, 40, 60]);
      sfx.reveal();
      if (!revealedOnce.current) {
        revealedOnce.current = true;
        onFirstReveal?.();
      }
    }, HOLD_MS);
  };
  const stop = () => {
    setHolding(false);
    setOpen(false);
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => () => stop(), []);

  return (
    <div className="scanner-wrap">
      <div className={`scanner-card ${open ? 'scanner-open' : ''}`}>
        <div className="scanner-content" aria-hidden={!open}>
          {children}
        </div>
        <div className="scanner-cover">
          <div className="cover-stamp">CONFIDENTIEL</div>
          <div className="cover-lines">
            <span />
            <span />
            <span />
          </div>
        </div>
      </div>
      <button
        className={`scanner ${holding ? 'scanner-holding' : ''} ${open ? 'scanner-done' : ''}`}
        onPointerDown={start}
        onPointerUp={stop}
        onPointerCancel={stop}
        onPointerLeave={stop}
        onContextMenu={(e) => e.preventDefault()}
        aria-label={label}
      >
        <svg viewBox="0 0 100 100" className="fingerprint">
          {[10, 16, 22, 28, 34, 40].map((r, i) => (
            <path
              key={r}
              d={`M ${50 - r} ${56 + (i % 2) * 2} A ${r} ${r + 4} 0 0 1 ${50 + r} ${56 - (i % 2) * 2}`}
              fill="none"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={i % 2 ? '18 6' : '30 5'}
            />
          ))}
          <path d="M50 52 L50 72" strokeWidth="3" strokeLinecap="round" fill="none" />
        </svg>
        <span className="scanner-beam" />
        <span className="scanner-ring" />
      </button>
      <p className="scanner-label">{open ? 'Relâche pour cacher' : label}</p>
    </div>
  );
}
