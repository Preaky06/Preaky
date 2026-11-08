// Image d'aperçu des liens partagés (LinkedIn, messageries) : logotype et promesse.
import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const alt = 'Pro Spectre — Les bons prospects. Au bon moment.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  const dir = path.join(process.cwd(), 'node_modules/@fontsource/poppins/files');
  const [heavy, medium] = await Promise.all([readFile(path.join(dir, 'poppins-latin-800-normal.woff')), readFile(path.join(dir, 'poppins-latin-500-normal.woff'))]);
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '80px 88px', background: '#050505', color: '#fff', fontFamily: 'Poppins' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', fontSize: 96, fontWeight: 800, letterSpacing: -3.5, lineHeight: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', height: 117, padding: '0 15px', marginRight: 7, borderRadius: 23, background: '#7C3AED', color: '#ffffff', fontSize: 81, transform: 'translateY(12px)' }}>Pro</div>
          <div style={{ display: 'flex' }}>Spectre</div>
          <div style={{ display: 'flex', width: 21, height: 21, borderRadius: 21, background: '#8B5CF6', marginLeft: 6, marginBottom: 4 }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ fontSize: 60, fontWeight: 800, letterSpacing: -2, lineHeight: 1.1 }}>Les bons prospects. Au bon moment.</div>
          <div style={{ fontSize: 26, fontWeight: 500, color: '#a3a3a3' }}>Prospection B2B à partir des registres officiels · Radar quotidien · score explicable</div>
        </div>
        <div style={{ display: 'flex', height: 8, borderRadius: 8, overflow: 'hidden' }}>
          {['#8b5cf6', '#6366f1', '#06b6d4', '#10b981', '#f59e0b'].map((c, i) => (
            <div key={c} style={{ width: `${[30, 25, 20, 15, 10][i]}%`, background: c, marginRight: i < 4 ? 4 : 0 }} />
          ))}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Poppins', data: heavy, weight: 800, style: 'normal' },
        { name: 'Poppins', data: medium, weight: 500, style: 'normal' },
      ],
    },
  );
}
