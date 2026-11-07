// Image d'aperçu des liens partagés (LinkedIn, messageries) : logo, nom, promesse.
import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const alt = 'Pro Spectre — Les bons prospects. Au bon moment.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const RAYS: [number, string][] = [
  [10.5, '#a78bfa'],
  [15.25, '#818cf8'],
  [20, '#22d3ee'],
  [24.75, '#34d399'],
  [29.5, '#fbbf24'],
];

export default async function Image() {
  const font = await readFile(path.join(process.cwd(), 'node_modules/@fontsource/unbounded/files/unbounded-latin-600-normal.woff'));
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '72px 80px', background: 'radial-gradient(circle at 75% 20%, #2b2f7a 0%, #0b1230 45%, #050817 100%)', color: '#fff', fontFamily: 'Unbounded' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <svg width="96" height="96" viewBox="0 0 40 40">
            <rect width="40" height="40" rx="11" fill="#0b1230" stroke="#ffffff" strokeOpacity="0.2" />
            {RAYS.map(([y, c]) => (
              <path key={y} d={`M8 ${y} 21.5 20`} stroke={c} strokeWidth="2.2" strokeLinecap="round" />
            ))}
            <path d="M21.5 20H27" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
            <circle cx="30.6" cy="20" r="3.3" fill="#fff" />
          </svg>
          <div style={{ display: 'flex', fontSize: 64, letterSpacing: -2 }}>
            <span>Pro&nbsp;</span>
            <span style={{ backgroundImage: 'linear-gradient(95deg, #c4b5fd, #a5b4fc 30%, #67e8f9 60%, #6ee7b7 85%, #fcd34d)', backgroundClip: 'text', color: 'transparent' }}>Spectre</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ fontSize: 58, letterSpacing: -2.5, lineHeight: 1.1 }}>Les bons prospects. Au bon moment.</div>
          <div style={{ fontSize: 24, color: '#a5b4fc', letterSpacing: -0.5 }}>Prospection B2B · registres officiels SIRENE, RNE et BODACC · score explicable</div>
        </div>
        <div style={{ display: 'flex', height: 8, borderRadius: 8, overflow: 'hidden' }}>
          {['#8b5cf6', '#6366f1', '#06b6d4', '#10b981', '#f59e0b'].map((c, i) => (
            <div key={c} style={{ width: `${[30, 25, 20, 15, 10][i]}%`, background: c, marginRight: i < 4 ? 4 : 0 }} />
          ))}
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: 'Unbounded', data: font, weight: 600, style: 'normal' }] },
  );
}
