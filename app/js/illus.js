// Illustrations « 3D » des cartes de jeux : volumes en dégradés radiaux, ombres portées.
import { gameIconHTML } from './icons.js';

let n = 0;
const sphere = (id, light, base, dark) => `<radialGradient id="${id}" cx="35%" cy="30%" r="72%"><stop offset="0" stop-color="${light}"/><stop offset=".58" stop-color="${base}"/><stop offset="1" stop-color="${dark}"/></radialGradient>`;
const shadow = (cx, cy, rx, ry = 5) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#1E1A16" opacity=".16"/>`;
const shine = (cx, cy, rx, ry, rot = -30) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#fff" opacity=".55" transform="rotate(${rot} ${cx} ${cy})"/>`;
const T = 'font-family="Titan One, Arial Rounded MT Bold, sans-serif"';

const ART = {
  bubbles: k => `<defs>${sphere(`a${k}`, '#E4D6FF', '#8E6CFF', '#4B26C2')}${sphere(`b${k}`, '#FFD0E6', '#FF4F9A', '#B21A5C')}${sphere(`c${k}`, '#C8F1FF', '#3DB4FF', '#126DB4')}</defs>
    ${shadow(46, 108, 26)}${shadow(102, 96, 18, 4)}
    <circle cx="46" cy="72" r="30" fill="url(#a${k})"/>${shine(36, 58, 9, 5)}<text x="46" y="84" text-anchor="middle" ${T} font-size="32" fill="#fff">1</text>
    <circle cx="100" cy="72" r="21" fill="url(#b${k})"/>${shine(93, 62, 6, 3.5)}<text x="100" y="81" text-anchor="middle" ${T} font-size="23" fill="#fff">2</text>
    <circle cx="86" cy="27" r="15" fill="url(#c${k})"/>${shine(81, 20, 4.5, 2.8)}<text x="86" y="34" text-anchor="middle" ${T} font-size="17" fill="#fff">3</text>
    <path d="M18 30l3 6 6 3-6 3-3 6-3-6-6-3 6-3z" fill="#FFD23F"/><circle cx="124" cy="40" r="3" fill="#fff"/>`,
  constellation: k => `<defs>${sphere(`m${k}`, '#FFF6C2', '#FFD23F', '#D99A00')}<filter id="g${k}"><feGaussianBlur stdDeviation="2.2"/></filter></defs>
    <path d="M104 12a26 26 0 1 0 22 40 22 22 0 1 1-22-40z" fill="url(#m${k})"/>
    <path d="M18 92 44 58 72 74 96 40" stroke="#fff" stroke-width="3" stroke-dasharray="2 7" stroke-linecap="round" fill="none" opacity=".8"/>
    ${[[18, 92, 9], [44, 58, 11], [72, 74, 8], [96, 40, 7]].map(([x, y, r]) => `<g><circle cx="${x}" cy="${y}" r="${r + 5}" fill="#FFE27A" opacity=".55" filter="url(#g${k})"/><path d="M${x} ${y - r}L${x + r * 0.3} ${y - r * 0.3}L${x + r} ${y}L${x + r * 0.3} ${y + r * 0.3}L${x} ${y + r}L${x - r * 0.3} ${y + r * 0.3}L${x - r} ${y}L${x - r * 0.3} ${y - r * 0.3}Z" fill="#fff"/></g>`).join('')}
    <circle cx="30" cy="22" r="2" fill="#fff"/><circle cx="62" cy="16" r="1.5" fill="#fff"/><circle cx="122" cy="96" r="2" fill="#fff"/>`,
  slicer: k => `<defs>${sphere(`o${k}`, '#FFD7B8', '#FF7A2E', '#C2420A')}${sphere(`p${k}`, '#B9FFE8', '#2FD3A0', '#0E8A62')}</defs>
    ${shadow(66, 110, 34)}
    <g transform="rotate(-18 52 66)"><path d="M18 66a34 34 0 0 1 68 0z" fill="url(#o${k})"/><path d="M18 66h68" stroke="#FFE7CF" stroke-width="5"/><text x="52" y="58" text-anchor="middle" ${T} font-size="26" fill="#fff">1</text></g>
    <g transform="translate(14 14) rotate(-18 52 66)"><path d="M18 66a34 34 0 0 0 68 0z" fill="url(#o${k})"/><path d="M18 66h68" stroke="#FFE7CF" stroke-width="5"/><text x="56" y="92" text-anchor="middle" ${T} font-size="26" fill="#fff">2</text></g>
    <path d="M8 104C48 74 92 46 136 14" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".95"/><path d="M8 104C48 74 92 46 136 14" stroke="#B9F1FF" stroke-width="15" stroke-linecap="round" opacity=".35"/>
    <circle cx="106" cy="86" r="11" fill="url(#p${k})"/><text x="106" y="91" text-anchor="middle" ${T} font-size="13" fill="#fff">7</text>
    <circle cx="28" cy="40" r="4" fill="#FF9A4D"/><circle cx="122" cy="62" r="3" fill="#FF9A4D"/>`,
  golf: k => `<defs>${sphere(`b${k}`, '#FFFFFF', '#F4F1EC', '#BDB4A8')}<linearGradient id="gr${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9BEA62"/><stop offset="1" stop-color="#46B21F"/></linearGradient></defs>
    <path d="M10 92c0-22 30-34 64-34s58 12 58 30-26 24-60 24S10 108 10 92z" fill="#2E8A16"/>
    <path d="M10 86c0-22 30-34 64-34s58 12 58 30-26 24-60 24S10 102 10 86z" fill="url(#gr${k})"/>
    <ellipse cx="88" cy="80" rx="11" ry="4.5" fill="#1E3A10"/>
    <path d="M89 80V18" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/><path d="M90 19l26 9-26 10z" fill="#FF4F4F"/><path d="M90 19l26 9-26 2z" fill="#FF8080"/>
    ${shadow(38, 92, 12, 3.5)}<circle cx="38" cy="80" r="12" fill="url(#b${k})"/><g fill="#CFC6BA"><circle cx="34" cy="78" r="1.5"/><circle cx="40" cy="76" r="1.5"/><circle cx="38" cy="83" r="1.5"/><circle cx="44" cy="81" r="1.5"/></g>${shine(33, 74, 4, 2.5)}
    <path d="M44 70q14-30 40-34" stroke="#fff" stroke-width="2.5" stroke-dasharray="1 6" stroke-linecap="round" fill="none"/>`,
  tug: k => `<defs>${sphere(`l${k}`, '#FFC29A', '#FF6B2C', '#C9400C')}${sphere(`r${k}`, '#B5E6FF', '#3DB4FF', '#1270B8')}</defs>
    ${shadow(26, 104, 18, 4)}${shadow(114, 104, 18, 4)}
    <path d="M30 66C50 60 60 72 70 66S92 58 110 64" stroke="#C99A62" stroke-width="10" stroke-linecap="round" fill="none"/>
    <path d="M30 66C50 60 60 72 70 66S92 58 110 64" stroke="#E9C38E" stroke-width="10" stroke-dasharray="4 6" stroke-linecap="round" fill="none"/>
    <path d="M70 66V34" stroke="#1E1A16" stroke-width="3" stroke-linecap="round"/><path d="M71 35l20 7-20 8z" fill="#FF3D3D"/>
    <g transform="rotate(-14 24 82)"><path d="M24 58c14 0 22 10 22 24s-9 22-22 22-22-8-22-22 8-24 22-24z" fill="url(#l${k})"/><circle cx="20" cy="78" r="3.4" fill="#1E1A16"/><circle cx="32" cy="78" r="3.4" fill="#1E1A16"/><path d="M21 90q5-4 10 0" stroke="#1E1A16" stroke-width="2.6" fill="none" stroke-linecap="round"/></g>
    <g transform="rotate(14 116 82)"><path d="M116 58c14 0 22 10 22 24s-9 22-22 22-22-8-22-22 8-24 22-24z" fill="url(#r${k})"/><circle cx="108" cy="78" r="3.4" fill="#1E1A16"/><circle cx="120" cy="78" r="3.4" fill="#1E1A16"/><path d="M109 90q5-4 10 0" stroke="#1E1A16" stroke-width="2.6" fill="none" stroke-linecap="round"/></g>`,
  draw: k => `<defs><linearGradient id="z${k}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF19A"/><stop offset=".5" stop-color="#FFD23F"/><stop offset="1" stop-color="#F29A00"/></linearGradient></defs>
    ${shadow(70, 110, 40)}
    <g transform="rotate(-14 34 64)"><rect x="12" y="30" width="44" height="62" rx="9" fill="#fff" stroke="#EADFD2" stroke-width="2"/><path d="M34 48l4.5 9 10 1.5-7.2 7 1.7 10L34 70.8l-9 4.7 1.7-10-7.2-7 10-1.5z" fill="#8E6CFF"/></g>
    <g transform="rotate(14 106 64)"><rect x="84" y="30" width="44" height="62" rx="9" fill="#fff" stroke="#EADFD2" stroke-width="2"/><path d="M106 48l4.5 9 10 1.5-7.2 7 1.7 10L106 70.8l-9 4.7 1.7-10-7.2-7 10-1.5z" fill="#8E6CFF"/></g>
    <path d="M78 6 52 62h18l-8 50 34-64H76z" fill="#C97A00" transform="translate(3 3)"/><path d="M78 6 52 62h18l-8 50 34-64H76z" fill="url(#z${k})"/><path d="M74 16 60 50" stroke="#fff" stroke-width="3" opacity=".6" stroke-linecap="round"/>`,
  dots: k => {
    const pts = [];
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) pts.push(`<circle cx="${28 + j * 28}" cy="${18 + i * 28}" r="5" fill="#1E1A16"/>`);
    return `${shadow(70, 112, 50)}<rect x="28" y="18" width="28" height="28" rx="4" fill="#FF6B2C"/><rect x="56" y="46" width="28" height="28" rx="4" fill="#3DB4FF"/><rect x="28" y="46" width="28" height="28" rx="4" fill="#FF6B2C" opacity=".9"/>
      <path d="M28 18h28v56M56 46h56M84 46v56M28 102h28" stroke="#1E1A16" stroke-width="4.5" stroke-linecap="round"/><path d="M112 74v28" stroke="#FF6B2C" stroke-width="4.5" stroke-linecap="round" stroke-dasharray="3 7"/>${pts.join('')}`;
  },
  duel: k => `<defs>${sphere(`l${k}`, '#FFB0D2', '#FF4F9A', '#B81A60')}${sphere(`r${k}`, '#DBFFAA', '#7ED957', '#3A8F1C')}</defs>
    ${shadow(36, 106, 24)}${shadow(104, 106, 24)}
    <path d="M36 52c18 0 28 13 28 30s-11 24-28 24S8 99 8 82s10-30 28-30z" fill="url(#l${k})"/><circle cx="30" cy="78" r="4" fill="#1E1A16"/><circle cx="44" cy="78" r="4" fill="#1E1A16"/>
    <path d="M104 52c18 0 28 13 28 30s-11 24-28 24-28-7-28-24 10-30 28-30z" fill="url(#r${k})"/><circle cx="96" cy="78" r="4" fill="#1E1A16"/><circle cx="110" cy="78" r="4" fill="#1E1A16"/>
    <circle cx="70" cy="40" r="20" fill="#1E1A16"/><text x="70" y="48" text-anchor="middle" ${T} font-size="20" fill="#FFD23F">VS</text>`,
};

export function illus(id, cls = 'illus') {
  const k = ++n;
  const art = ART[id];
  if (!art) return `<span class="${cls} illus-icon">${gameIconHTML(id) || ''}</span>`;
  return `<svg class="${cls}" viewBox="0 0 140 120" aria-hidden="true" focusable="false">${art(k)}</svg>`;
}
