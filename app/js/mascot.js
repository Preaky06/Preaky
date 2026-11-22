// « Goutte » : une goutte d'encre qui réagit à tes parties.
const INK = '#141414';

export function mascot(mood = 'idle', { size = 112, color = 'var(--cyan)', cls = '' } = {}) {
  const openEyes = (dy = 0, r = 4.2) => `<g class="m-eyes"><ellipse cx="38" cy="58" rx="7.5" ry="9" fill="#fff"/><ellipse cx="62" cy="58" rx="7.5" ry="9" fill="#fff"/><circle cx="39" cy="${59 + dy}" r="${r}" fill="${INK}"/><circle cx="63" cy="${59 + dy}" r="${r}" fill="${INK}"/></g>`;
  const eyes = {
    idle: openEyes(1),
    calm: openEyes(2, 3.8),
    wow: openEyes(-1, 4.8),
    happy: `<path d="M31 60q7-8.5 14 0M55 60q7-8.5 14 0" fill="none" stroke="${INK}" stroke-width="4.5" stroke-linecap="round"/>`,
  }[mood] || openEyes(1);
  const mouth = {
    idle: `<path d="M44 74q6 5 12 0" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`,
    calm: `<path d="M45 75q5 3 10 0" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`,
    happy: `<path d="M40.5 71q9.5 11 19 0z" fill="${INK}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`,
    wow: `<ellipse cx="50" cy="76" rx="5.5" ry="6.5" fill="${INK}"/>`,
  }[mood];
  return `<svg class="mascot m-${mood} ${cls}" viewBox="0 0 100 104" width="${size}" height="${Math.round(size * 1.04)}" aria-hidden="true" focusable="false">
    <ellipse cx="50" cy="100" rx="25" ry="3.2" fill="currentColor" opacity=".12"/>
    <path d="M50 5C58 19 84 41 84 63c0 19-15 32-34 32S16 82 16 63C16 41 42 19 50 5z" style="fill:${color}"/>
    <ellipse cx="34" cy="38" rx="4.5" ry="9" fill="#fff" opacity=".55" transform="rotate(28 34 38)"/>
    ${eyes}
    <circle cx="26" cy="71" r="4.5" fill="#fff" opacity=".35"/><circle cx="74" cy="71" r="4.5" fill="#fff" opacity=".35"/>
    ${mouth}
  </svg>`;
}
