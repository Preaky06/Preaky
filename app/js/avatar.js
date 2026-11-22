// Avatars : une petite créature « bonbon » en volume (dégradés), personnalisable.
// Tout est dessiné en SVG : aucune image à charger.

const INK = '#1E1A16';
let seq = 0;

export const COLORS = {
  mandarine: ['#FFC29A', '#FF6B2C', '#C9400C'],
  framboise: ['#FFB0D2', '#FF4F9A', '#B81A60'],
  ciel: ['#B5E6FF', '#3DB4FF', '#1270B8'],
  menthe: ['#B4F5DF', '#2FD3A0', '#0F8A63'],
  lavande: ['#D6C9FF', '#8E6CFF', '#5232C9'],
  citron: ['#FFF4AE', '#FFD23F', '#C99A00'],
  pomme: ['#DBFFAA', '#7ED957', '#3A8F1C'],
  corail: ['#FFC0B5', '#FF7062', '#C8352A'],
  chocolat: ['#E2B08B', '#9A5B34', '#552C12'],
  nuit: ['#9AA2CC', '#3A4170', '#181C3F'],
  or: ['#FFF0B5', '#FFC21A', '#B97F00'],
};

export const SLOTS = [
  ['color', 'Couleurs'],
  ['hat', 'Chapeaux'],
  ['glasses', 'Lunettes'],
  ['eyes', 'Yeux'],
  ['mouth', 'Bouches'],
];

const item = (slot, v, name, price) => ({ id: `${slot}:${v}`, slot, v, name, price });

export const ITEMS = [
  item('color', 'mandarine', 'Mandarine', 0), item('color', 'framboise', 'Framboise', 0),
  item('color', 'ciel', 'Ciel', 0), item('color', 'menthe', 'Menthe', 0),
  item('color', 'lavande', 'Lavande', 60), item('color', 'citron', 'Citron', 60),
  item('color', 'pomme', 'Pomme', 60), item('color', 'corail', 'Corail', 80),
  item('color', 'chocolat', 'Chocolat', 80), item('color', 'nuit', 'Nuit', 120),
  item('color', 'or', 'Or massif', 400),
  item('hat', 'none', 'Rien', 0), item('hat', 'casquette', 'Casquette', 120),
  item('hat', 'bonnet', 'Bonnet', 120), item('hat', 'fete', 'Chapeau de fête', 150),
  item('hat', 'oreilles', 'Oreilles de chat', 180), item('hat', 'chef', 'Toque', 200),
  item('hat', 'casque', 'Casque audio', 220), item('hat', 'fleurs', 'Couronne de fleurs', 220),
  item('hat', 'sorcier', 'Chapeau de sorcier', 300), item('hat', 'couronne', 'Couronne', 500),
  item('glasses', 'none', 'Rien', 0), item('glasses', 'rondes', 'Lunettes rondes', 90),
  item('glasses', 'soleil', 'Lunettes de soleil', 150), item('glasses', 'coeur', 'Lunettes cœur', 180),
  item('glasses', 'etoile', 'Lunettes étoiles', 200),
  item('eyes', 'rond', 'Grands yeux', 0), item('eyes', 'joyeux', 'Yeux rieurs', 0),
  item('eyes', 'clin', 'Clin d’œil', 60), item('eyes', 'endormi', 'Yeux endormis', 60),
  item('eyes', 'etoiles', 'Yeux étoilés', 150), item('eyes', 'coeurs', 'Yeux amoureux', 150),
  item('mouth', 'sourire', 'Sourire', 0), item('mouth', 'o', 'Surpris', 0),
  item('mouth', 'grand', 'Éclat de rire', 50), item('mouth', 'langue', 'Langue tirée', 80),
  item('mouth', 'chat', 'Bouche de chat', 80), item('mouth', 'dents', 'Grand sourire', 100),
];

export const FREE_ITEMS = ITEMS.filter(i => i.price === 0).map(i => i.id);
export const DEFAULT_AVATAR = { color: 'mandarine', eyes: 'rond', mouth: 'sourire', hat: 'none', glasses: 'none' };

export function randomAvatar() {
  const free = ['mandarine', 'framboise', 'ciel', 'menthe'];
  return { ...DEFAULT_AVATAR, color: free[Math.floor(Math.random() * free.length)], eyes: Math.random() < 0.5 ? 'rond' : 'joyeux' };
}

const star = (cx, cy, r, fill) => {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * 0.45 : r;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`);
  }
  return `<polygon points="${pts.join(' ')}" fill="${fill}"/>`;
};
const heart = (cx, cy, s, fill, extra = '') => `<path d="M${cx} ${cy + s * 0.9}C${cx - s * 1.6} ${cy - s * 0.1} ${cx - s * 0.9} ${cy - s * 1.3} ${cx} ${cy - s * 0.45}C${cx + s * 0.9} ${cy - s * 1.3} ${cx + s * 1.6} ${cy - s * 0.1} ${cx} ${cy + s * 0.9}Z" fill="${fill}" ${extra}/>`;

function eyesSVG(kind) {
  const open = (x, big = 1) => `<ellipse cx="${x}" cy="72" rx="${9 * big}" ry="${10.5 * big}" fill="#fff"/><circle cx="${x + 1.5}" cy="73.5" r="${5.4 * big}" fill="${INK}"/><circle cx="${x + 3.6}" cy="70.4" r="${2 * big}" fill="#fff"/>`;
  const happy = x => `<path d="M${x - 9} 74q9-10 18 0" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
  switch (kind) {
    case 'joyeux': return happy(45) + happy(75);
    case 'clin': return open(45) + happy(75);
    case 'endormi': return `<path d="M37 72q8 6 16 0M67 72q8 6 16 0" stroke="${INK}" stroke-width="4.5" fill="none" stroke-linecap="round"/>`;
    case 'etoiles': return `<ellipse cx="45" cy="72" rx="9.5" ry="11" fill="#fff"/><ellipse cx="75" cy="72" rx="9.5" ry="11" fill="#fff"/>${star(46, 73, 7, '#FFB800')}${star(76, 73, 7, '#FFB800')}`;
    case 'coeurs': return `<ellipse cx="45" cy="72" rx="9.5" ry="11" fill="#fff"/><ellipse cx="75" cy="72" rx="9.5" ry="11" fill="#fff"/>${heart(46, 73, 5.5, '#FF3D7F')}${heart(76, 73, 5.5, '#FF3D7F')}`;
    case 'wow': return open(45, 1.12) + open(75, 1.12);
    default: return open(45) + open(75);
  }
}

function mouthSVG(kind) {
  switch (kind) {
    case 'o': return `<ellipse cx="60" cy="93" rx="5" ry="6" fill="${INK}"/>`;
    case 'grand': return `<path d="M48.5 88.5q11.5 16 23 0z" fill="${INK}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><path d="M54.5 96.5q5.5-4.5 11 0q-5.5 3.5-11 0z" fill="#FF7BA9"/>`;
    case 'langue': return `<path d="M51 90q9 8 18 0" stroke="${INK}" stroke-width="4.5" fill="none" stroke-linecap="round"/><path d="M56.5 93.5q3.5 10 8 0z" fill="#FF5F8F" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`;
    case 'chat': return `<path d="M50 90q5 6 10 0q5 6 10 0" stroke="${INK}" stroke-width="4.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
    case 'dents': return `<path d="M49 88h22q0 11-11 11q-11 0-11-11z" fill="#fff" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path d="M60 88.5v4.5" stroke="${INK}" stroke-width="2"/>`;
    default: return `<path d="M51 90q9 8 18 0" stroke="${INK}" stroke-width="4.5" fill="none" stroke-linecap="round"/>`;
  }
}

function glassesSVG(kind) {
  const arms = `<path d="M32 69L18 64M88 69l14-5" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>`;
  switch (kind) {
    case 'rondes': return `${arms}<g fill="rgba(255,255,255,.22)" stroke="${INK}" stroke-width="3.5"><circle cx="45" cy="72" r="13"/><circle cx="75" cy="72" r="13"/></g><path d="M58 69q2-3 4 0" stroke="${INK}" stroke-width="3.5" fill="none"/>`;
    case 'soleil': return `${arms}<rect x="30" y="62" width="28" height="19" rx="8" fill="${INK}"/><rect x="62" y="62" width="28" height="19" rx="8" fill="${INK}"/><path d="M57 68h6" stroke="${INK}" stroke-width="4"/><path d="M35 66l6 0M67 66l6 0" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".7"/>`;
    case 'coeur': return `${arms}${heart(45, 73, 9, '#FF4F9A', `stroke="${INK}" stroke-width="3" opacity=".92"`)}${heart(75, 73, 9, '#FF4F9A', `stroke="${INK}" stroke-width="3" opacity=".92"`)}<path d="M56 69h8" stroke="${INK}" stroke-width="3.5"/>`;
    case 'etoile': return `${arms}<g stroke="${INK}" stroke-width="3" stroke-linejoin="round">${star(45, 72, 15, '#FFD23F')}${star(75, 72, 15, '#FFD23F')}</g><path d="M58 70h4" stroke="${INK}" stroke-width="3.5"/>`;
    default: return '';
  }
}

function hatSVG(kind, gid) {
  switch (kind) {
    case 'casquette': return `<path d="M27 50Q28 20 60 20Q92 20 93 50Z" fill="#FF5B1F"/><path d="M60 45Q96 40 110 51Q93 58 60 53Z" fill="#C9400C"/><circle cx="60" cy="21" r="4" fill="#C9400C"/><path d="M44 26q-6 10-7 22" stroke="#fff" stroke-width="3" opacity=".35" fill="none" stroke-linecap="round"/>`;
    case 'bonnet': return `<path d="M25 52Q25 16 60 16Q95 16 95 52Z" fill="#3DB4FF"/><path d="M38 22q-8 12-9 26M52 17q-4 14-4 30M68 17q4 14 4 30M82 22q8 12 9 26" stroke="#1270B8" stroke-width="3" fill="none" opacity=".6"/><rect x="22" y="44" width="76" height="13" rx="6.5" fill="#1270B8"/><circle cx="60" cy="13" r="9" fill="#fff"/><circle cx="57" cy="10" r="3" fill="#E9F6FF"/>`;
    case 'fete': return `<path d="M42 42L60 0L78 42Z" fill="#FF4F9A"/><path d="M47 30l26 0M51 20l18 0" stroke="#FFD23F" stroke-width="4"/><circle cx="54" cy="36" r="2.5" fill="#fff"/><circle cx="66" cy="25" r="2.5" fill="#fff"/><circle cx="60" cy="-1" r="6" fill="#FFD23F"/><path d="M40 43q20 6 40 0" stroke="#B81A60" stroke-width="4" fill="none"/>`;
    case 'oreilles': return `<path d="M27 56L31 18L58 38Z" fill="url(#${gid})"/><path d="M93 56L89 18L62 38Z" fill="url(#${gid})"/><path d="M33 46L35 27L49 37Z" fill="#FF9CC6"/><path d="M87 46L85 27L71 37Z" fill="#FF9CC6"/>`;
    case 'chef': return `<path d="M37 47h46v-9q13-5 9-18q-6-13-19-7q-4-12-13-12q-9 0-13 12q-13-6-19 7q-4 13 9 18z" fill="#fff" stroke="#E2D9CE" stroke-width="2.5" stroke-linejoin="round"/><path d="M37 41h46" stroke="#E2D9CE" stroke-width="2.5"/>`;
    case 'casque': return `<path d="M20 74Q20 20 60 20Q100 20 100 74" stroke="${INK}" stroke-width="7" fill="none" stroke-linecap="round"/><rect x="10" y="60" width="18" height="28" rx="8" fill="#FF5B1F" stroke="${INK}" stroke-width="3"/><rect x="92" y="60" width="18" height="28" rx="8" fill="#FF5B1F" stroke="${INK}" stroke-width="3"/>`;
    case 'fleurs': {
      const flower = (x, y, c) => `<g transform="translate(${x} ${y})">${[0, 72, 144, 216, 288].map(a => `<circle cx="${(6 * Math.cos((a * Math.PI) / 180)).toFixed(1)}" cy="${(6 * Math.sin((a * Math.PI) / 180)).toFixed(1)}" r="5" fill="${c}"/>`).join('')}<circle r="4" fill="#FFD23F"/></g>`;
      return `<path d="M24 44Q60 18 96 44" stroke="#3A8F1C" stroke-width="4" fill="none"/>${flower(28, 40, '#FF7BA9')}${flower(43, 30, '#fff')}${flower(60, 26, '#8E6CFF')}${flower(77, 30, '#fff')}${flower(92, 40, '#FF7BA9')}`;
    }
    case 'sorcier': return `<ellipse cx="60" cy="44" rx="44" ry="9" fill="#5232C9"/><path d="M36 44Q50 32 54 4Q58-6 66 0Q72 4 70 10Q68 26 84 44Z" fill="#8E6CFF"/><path d="M38 40q22 7 44 0" stroke="#FFD23F" stroke-width="4" fill="none"/>${star(52, 24, 5, '#FFD23F')}${star(66, 32, 3.5, '#FFD23F')}`;
    case 'couronne': return `<path d="M33 47L29 18L45 32L60 12L75 32L91 18L87 47Z" fill="#FFC21A" stroke="#B97F00" stroke-width="2.5" stroke-linejoin="round"/><circle cx="60" cy="37" r="4.5" fill="#FF3D7F"/><circle cx="44" cy="40" r="3.2" fill="#3DB4FF"/><circle cx="76" cy="40" r="3.2" fill="#3DB4FF"/><path d="M36 26l3 15" stroke="#fff" stroke-width="2.5" opacity=".5" stroke-linecap="round"/>`;
    default: return '';
  }
}

// mood : 'happy' | 'wow' | 'sad' — remplace temporairement yeux/bouche (réactions en fin de partie).
export function avatarSVG(av = DEFAULT_AVATAR, { size = 64, mood = null, cls = '' } = {}) {
  const id = `av${++seq}`;
  const [light, base, dark] = COLORS[av.color] || COLORS.mandarine;
  const eyes = mood === 'happy' ? 'joyeux' : mood === 'wow' ? 'wow' : mood === 'sad' ? 'endormi' : av.eyes;
  const mouth = mood === 'happy' ? 'grand' : mood === 'wow' ? 'o' : mood === 'sad' ? 'sourire' : av.mouth;
  const behind = av.hat === 'oreilles';
  const hat = hatSVG(av.hat, id);
  const glassesHideEyes = av.glasses === 'soleil';
  return `<svg class="avatar ${cls}" viewBox="0 -8 120 136" width="${size}" height="${Math.round(size * 1.133)}" aria-hidden="true" focusable="false">
    <defs><radialGradient id="${id}" cx="36%" cy="30%" r="78%"><stop offset="0" stop-color="${light}"/><stop offset=".55" stop-color="${base}"/><stop offset="1" stop-color="${dark}"/></radialGradient></defs>
    <ellipse cx="60" cy="123" rx="31" ry="4.5" fill="#1E1A16" opacity=".14"/>
    ${behind ? hat : ''}
    <path d="M60 30c26 0 44 19 44 46s-18 44-44 44-44-17-44-44 18-46 44-46z" fill="url(#${id})"/>
    <ellipse cx="40" cy="47" rx="11" ry="6.5" fill="#fff" opacity=".5" transform="rotate(-32 40 47)"/>
    <circle cx="30" cy="58" r="2.6" fill="#fff" opacity=".55"/>
    <ellipse cx="32" cy="88" rx="7.5" ry="4.8" fill="#FF6F9F" opacity=".42"/><ellipse cx="88" cy="88" rx="7.5" ry="4.8" fill="#FF6F9F" opacity=".42"/>
    ${glassesHideEyes ? '' : `<g class="av-eyes">${eyesSVG(eyes)}</g>`}
    ${mouthSVG(mouth)}
    ${glassesSVG(av.glasses)}
    ${behind ? '' : hat}
  </svg>`;
}
