// Faisceaux du spectre qui convergent vers la fiche (rappel du logo). Décoratif, masqué sur mobile.
const BEAMS = [
  { c: '#a78bfa', y: 150 },
  { c: '#818cf8', y: 300 },
  { c: '#22d3ee', y: 470 },
  { c: '#34d399', y: 640 },
  { c: '#fbbf24', y: 800 },
];

export function HeroBeams() {
  const fx = 1030;
  const fy = 470;
  return (
    <svg className="pointer-events-none absolute inset-0 -z-10 hidden h-full w-full lg:block" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        {BEAMS.map((b, i) => (
          <linearGradient key={b.c} id={`ps-beam-${i}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={b.c} stopOpacity="0" />
            <stop offset="0.55" stopColor={b.c} stopOpacity="0.05" />
            <stop offset="1" stopColor={b.c} stopOpacity="0.6" />
          </linearGradient>
        ))}
        {BEAMS.map((b, i) => (
          <linearGradient key={`p${b.c}`} id={`ps-pulse-${i}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={b.c} stopOpacity="0" />
            <stop offset="0.5" stopColor={b.c} stopOpacity="0" />
            <stop offset="0.72" stopColor={b.c} stopOpacity="0.9" />
            <stop offset="1" stopColor={b.c} stopOpacity="1" />
          </linearGradient>
        ))}
      </defs>
      {BEAMS.map((b, i) => {
        const d = `M-60 ${b.y} C 420 ${b.y}, 720 ${fy + (b.y - fy) * 0.18}, ${fx} ${fy}`;
        return (
          <g key={b.c}>
            <path d={d} stroke={`url(#ps-beam-${i})`} strokeWidth="1.4" fill="none" />
            <path d={d} stroke={`url(#ps-pulse-${i})`} strokeWidth="2.4" strokeLinecap="round" fill="none" className="beam-pulse" style={{ animationDelay: `${i * 0.9}s` }} />
          </g>
        );
      })}
    </svg>
  );
}
