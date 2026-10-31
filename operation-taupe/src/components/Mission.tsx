import { useGame } from '../lib/hooks.ts';

export function MissionTrack() {
  const g = useGame();
  const m = g.mission;
  if (!m) return null;
  const dots = Array.from({ length: m.total }, (_, i) => {
    const h = g.history.find((e) => e.index === i);
    if (h) return h.success ? 'ok' : 'ko';
    if (i === g.questionIndex && g.phase === 'question') return 'now';
    return 'todo';
  });
  return (
    <div className="mission">
      <div className="mission-dots" aria-label={`${m.correct} missions réussies sur ${m.played}`}>
        {dots.map((d, i) => (
          <span key={i} className={`mdot mdot-${d}`}>
            {d === 'ok' ? '✓' : d === 'ko' ? '✕' : i + 1}
          </span>
        ))}
      </div>
      <div
        className="mission-intel"
        title={`Indices débloqués : ${m.intelUnlocked}/${m.intelMax} (un indice toutes les ${m.intelEvery} missions réussies)`}
      >
        <span className="mission-label">INDICES</span>
        {Array.from({ length: m.intelMax }, (_, i) => (
          <span key={i} className={`ipip ${i < m.intelUnlocked ? 'ipip-on' : ''}`} />
        ))}
      </div>
    </div>
  );
}
