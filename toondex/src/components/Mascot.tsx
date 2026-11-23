import { archetypeFor, hash, type Archetype, type Work, type WorkType } from "@/lib/catalogue";

/**
 * Personnages 2D originaux, style « kawaii plat » : grosse tête, yeux noirs, joues roses.
 * Un personnage par genre (astronaute pour la science-fiction, détective pour le policier…),
 * avec des variations calculées à partir de l'identifiant de l'œuvre. Aucun personnage existant.
 */

const INK = "#15161C";
const CHEEK = "#FF8FA3";
const SKIN = ["#FFDCC2", "#F6C39C", "#E2A57C", "#BE7F55", "#8D5838", "#FFE8D6"];
const HAIR = ["#2B2118", "#5A3A22", "#A8652F", "#E7C15C", "#B5392C", "#3A3F8F", "#F28DB2", "#1E1E24"];
const OUTFIT = ["#3B4CFF", "#FF3D71", "#FF9F43", "#2FB574", "#8B6CF6", "#15161C", "#19B5C8", "#F9C80E"];
const AVOID: Record<WorkType, string[]> = {
  serie: ["#3B4CFF", "#19B5C8"],
  "serie-animee": ["#F9C80E", "#FF9F43"],
  anime: ["#FF3D71"],
  film: ["#FF3D71", "#FF9F43"],
  "film-animation": ["#8B6CF6", "#3B4CFF"],
};

type Look = {
  skin: string;
  hair: string;
  outfit: string;
  accent: string;
  hairStyle: "bangs" | "bob" | "spiky" | "bun" | "twin";
  eyes: "round" | "happy" | "wink";
  mouth: "smile" | "open";
  variant: number;
  gold: boolean;
};

function lookFor(work: Work, gold: boolean): Look {
  const h = hash(work.id + ":look");
  const outfits = OUTFIT.filter((c) => !AVOID[work.type].includes(c));
  const outfit = outfits[h % outfits.length];
  const accents = outfits.filter((c) => c !== outfit && c !== INK);
  const look: Look = {
    skin: SKIN[(h >>> 3) % SKIN.length],
    hair: HAIR[(h >>> 6) % HAIR.length],
    outfit,
    accent: accents[(h >>> 9) % accents.length],
    hairStyle: (["bangs", "bob", "spiky", "bun", "twin"] as const)[(h >>> 12) % 5],
    eyes: (["round", "round", "happy", "wink"] as const)[(h >>> 15) % 4],
    mouth: (["smile", "open"] as const)[(h >>> 18) % 2],
    variant: (h >>> 20) % 3,
    gold,
  };
  if (gold) {
    look.outfit = "#E5B53A";
    look.accent = "#FFF1B8";
  }
  return look;
}

function starPath(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? r : r * 0.45;
    pts.push(`${(cx + rad * Math.cos(a)).toFixed(1)} ${(cy + rad * Math.sin(a)).toFixed(1)}`);
  }
  return `M${pts.join(" L")}Z`;
}

function heartPath(cx: number, cy: number, s: number): string {
  return `M${cx} ${cy + s * 0.9} C${cx - s * 1.4} ${cy} ${cx - s * 0.8} ${cy - s} ${cx} ${cy - s * 0.35} C${cx + s * 0.8} ${cy - s} ${cx + s * 1.4} ${cy} ${cx} ${cy + s * 0.9}Z`;
}

/* ---------- Pièces communes ---------- */

function Body({ look, hands, outfit = look.outfit, raisedArm = false }: { look: Look; hands?: string; outfit?: string; raisedArm?: boolean }) {
  const hand = hands ?? look.skin;
  return (
    <>
      <rect x="44" y="109" width="14" height="7" rx="3.5" fill="#2A2B33" />
      <rect x="62" y="109" width="14" height="7" rx="3.5" fill="#2A2B33" />
      <rect x="34" y="88" width="10" height="20" rx="5" fill={outfit} />
      <circle cx="39" cy="108" r="5" fill={hand} />
      {raisedArm ? (
        <>
          <path d="M80 92 L92 70" stroke={outfit} strokeWidth="10" strokeLinecap="round" />
          <circle cx="93" cy="67" r="6.5" fill={hand} />
        </>
      ) : (
        <>
          <rect x="76" y="88" width="10" height="20" rx="5" fill={outfit} />
          <circle cx="81" cy="108" r="5" fill={hand} />
        </>
      )}
      <rect x="40" y="84" width="40" height="29" rx="11" fill={outfit} />
    </>
  );
}

function Head({ fill }: { fill: string }) {
  return <rect x="26" y="30" width="68" height="58" rx="29" fill={fill} />;
}

function Eyes({ kind, y = 62 }: { kind: Look["eyes"]; y?: number }) {
  const round = (x: number) => (
    <g key={x}>
      <ellipse cx={x} cy={y} rx="5.2" ry="6.8" fill={INK} />
      <circle cx={x + 1.8} cy={y - 2.6} r="1.9" fill="#fff" />
    </g>
  );
  const happy = (x: number) => (
    <path key={x} d={`M${x - 5} ${y + 1} Q${x} ${y - 6} ${x + 5} ${y + 1}`} stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
  );
  if (kind === "happy") return <>{[happy(48), happy(72)]}</>;
  if (kind === "wink") return <>{[round(48), happy(72)]}</>;
  return <>{[round(48), round(72)]}</>;
}

function Cheeks() {
  return (
    <>
      <ellipse cx="37" cy="71" rx="5.5" ry="3.4" fill={CHEEK} opacity="0.85" />
      <ellipse cx="83" cy="71" rx="5.5" ry="3.4" fill={CHEEK} opacity="0.85" />
    </>
  );
}

function Mouth({ kind }: { kind: Look["mouth"] | "o" | "flat" | "smirk" }) {
  switch (kind) {
    case "open":
      return (
        <>
          <path d="M54.5 71 Q60 80 65.5 71 Z" fill={INK} />
          <path d="M57.2 75.6 Q60 77.6 62.8 75.6 Q60 74 57.2 75.6 Z" fill="#FF7A8A" />
        </>
      );
    case "o":
      return <ellipse cx="60" cy="75" rx="3.2" ry="4" fill={INK} />;
    case "flat":
      return <path d="M56 74 L64 74" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />;
    case "smirk":
      return <path d="M55 74 Q61 77 66 71" stroke={INK} strokeWidth="2.6" fill="none" strokeLinecap="round" />;
    default:
      return <path d="M55 72 Q60 77 65 72" stroke={INK} strokeWidth="2.6" fill="none" strokeLinecap="round" />;
  }
}

function Face({ look, mouth }: { look: Look; mouth?: Parameters<typeof Mouth>[0]["kind"] }) {
  return (
    <>
      <Cheeks />
      <Eyes kind={look.eyes} />
      <Mouth kind={mouth ?? look.mouth} />
    </>
  );
}

function Hair({ look, style = look.hairStyle }: { look: Look; style?: Look["hairStyle"] }) {
  const bangs = "M26 58 C26 36 40 28 60 28 C80 28 94 36 94 58 C88 46 80 42 72 44 C66 38 56 38 50 43 C42 41 32 46 26 58 Z";
  const fill = look.hair;
  switch (style) {
    case "spiky":
      return <path d="M26 56 L28 36 L36 42 L40 26 L50 36 L58 22 L66 35 L76 25 L80 40 L90 34 L94 56 C86 44 74 40 60 40 C46 40 34 44 26 56 Z" fill={fill} />;
    case "bob":
      return (
        <>
          <rect x="23" y="44" width="13" height="34" rx="6.5" fill={fill} />
          <rect x="84" y="44" width="13" height="34" rx="6.5" fill={fill} />
          <path d={bangs} fill={fill} />
        </>
      );
    case "bun":
      return (
        <>
          <circle cx="60" cy="24" r="10" fill={fill} />
          <path d={bangs} fill={fill} />
        </>
      );
    case "twin":
      return (
        <>
          <circle cx="23" cy="48" r="10" fill={fill} />
          <circle cx="97" cy="48" r="10" fill={fill} />
          <path d={bangs} fill={fill} />
        </>
      );
    default:
      return <path d={bangs} fill={fill} />;
  }
}

/* ---------- Personnages ---------- */

function Astronaut({ look }: { look: Look }) {
  const suit = look.gold ? "#E5B53A" : "#F3F5FA";
  return (
    <>
      <Body look={look} outfit={suit} />
      <rect x="51" y="92" width="18" height="11" rx="3" fill={look.accent} />
      <circle cx="56" cy="97.5" r="1.8" fill="#fff" />
      <circle cx="64" cy="97.5" r="1.8" fill="#fff" />
      <rect x="37" y="86" width="46" height="7" rx="3.5" fill="#D5DBE6" />
      <Head fill={look.skin} />
      <Hair look={look} style="bangs" />
      <Face look={look} />
      <circle cx="60" cy="60" r="37" fill="rgba(255,255,255,0.22)" stroke="#fff" strokeWidth="3.5" />
      <path d="M33 50 Q38 33 54 27" stroke="#fff" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.9" />
      <line x1="60" y1="23" x2="60" y2="11" stroke="#fff" strokeWidth="3" />
      <circle cx="60" cy="9" r="4.5" fill={look.accent} />
    </>
  );
}

function Alien({ look }: { look: Look }) {
  const skin = ["#9EE493", "#B9A4FF", "#7FD8F0"][look.variant];
  return (
    <>
      <Body look={look} hands={skin} />
      <path d="M46 34 L38 14" stroke={skin} strokeWidth="4" strokeLinecap="round" />
      <path d="M74 34 L82 14" stroke={skin} strokeWidth="4" strokeLinecap="round" />
      <circle cx="37" cy="12" r="5" fill={look.accent} />
      <circle cx="83" cy="12" r="5" fill={look.accent} />
      <Head fill={skin} />
      <Cheeks />
      <ellipse cx="47" cy="61" rx="7" ry="9" fill={INK} />
      <ellipse cx="73" cy="61" rx="7" ry="9" fill={INK} />
      <circle cx="49.5" cy="57.5" r="2.4" fill="#fff" />
      <circle cx="75.5" cy="57.5" r="2.4" fill="#fff" />
      <Mouth kind={look.mouth} />
    </>
  );
}

function Robot({ look }: { look: Look }) {
  const metal = look.gold ? "#E5B53A" : "#CBD3DE";
  const dark = look.gold ? "#B98A1E" : "#9AA5B5";
  return (
    <>
      <Body look={look} outfit={look.gold ? "#D9A92F" : "#B8C2CF"} hands={dark} />
      <rect x="50" y="91" width="20" height="12" rx="3" fill="#1F2636" />
      <circle cx="55" cy="97" r="2" fill={look.accent} />
      <circle cx="60" cy="97" r="2" fill="#D8F36A" />
      <circle cx="65" cy="97" r="2" fill="#FF3D71" />
      <line x1="60" y1="32" x2="60" y2="19" stroke={dark} strokeWidth="3" />
      <circle cx="60" cy="17" r="4.5" fill={look.accent} />
      <circle cx="27" cy="59" r="5.5" fill={dark} />
      <circle cx="93" cy="59" r="5.5" fill={dark} />
      <rect x="28" y="32" width="64" height="54" rx="12" fill={metal} />
      <rect x="35" y="42" width="50" height="34" rx="9" fill="#1F2636" />
      <rect x="43.5" y="51" width="9" height="11" rx="4.5" fill="#7CF0FF" />
      <rect x="67.5" y="51" width="9" height="11" rx="4.5" fill="#7CF0FF" />
      <ellipse cx="41" cy="68" rx="3" ry="2" fill={CHEEK} opacity="0.9" />
      <ellipse cx="79" cy="68" rx="3" ry="2" fill={CHEEK} opacity="0.9" />
      <path d="M54 68 Q60 72 66 68" stroke="#7CF0FF" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    </>
  );
}

function Zombie({ look }: { look: Look }) {
  const skin = "#A9D98C";
  return (
    <>
      <rect x="44" y="109" width="14" height="7" rx="3.5" fill="#2A2B33" />
      <rect x="62" y="109" width="14" height="7" rx="3.5" fill="#2A2B33" />
      <rect x="34" y="88" width="10" height="20" rx="5" fill={look.outfit} />
      <rect x="76" y="88" width="10" height="20" rx="5" fill={look.outfit} />
      <circle cx="39" cy="108" r="5" fill={skin} />
      <circle cx="81" cy="108" r="5" fill={skin} />
      <path d="M40 95 Q40 84 51 84 L69 84 Q80 84 80 95 L80 108 L75 113 L70 108 L65 113 L60 108 L55 113 L50 108 L45 113 L40 108 Z" fill={look.outfit} />
      <Head fill={skin} />
      <Hair look={{ ...look, hair: "#3D5A2A" }} style="spiky" />
      <path d="M42 47 L60 45 L76 48" stroke="#4F7A3A" strokeWidth="2" fill="none" />
      <path d="M48 43 L47 50 M56 42 L56 49 M64 43 L65 50 M71 44 L72 51" stroke="#4F7A3A" strokeWidth="1.6" />
      <Cheeks />
      <ellipse cx="48" cy="62" rx="5.2" ry="6.8" fill={INK} />
      <circle cx="49.8" cy="59.4" r="1.9" fill="#fff" />
      <path d="M68 58 L76 66 M76 58 L68 66" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      <path d="M53 74 L56.5 71.5 L60 74 L63.5 71.5 L67 74" stroke={INK} strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </>
  );
}

function Ghost({ look }: { look: Look }) {
  const sheet = look.gold ? "#F5D77A" : "#FFFFFF";
  return (
    <>
      <ellipse cx="27" cy="82" rx="7" ry="5" fill={sheet} transform="rotate(-25 27 82)" />
      <ellipse cx="93" cy="82" rx="7" ry="5" fill={sheet} transform="rotate(25 93 82)" />
      <path
        d="M28 56 Q28 18 60 18 Q92 18 92 56 L92 104 Q86 114 80 106 Q74 98 68 106 Q62 114 56 106 Q50 98 44 106 Q38 114 32 106 Q28 100 28 96 Z"
        fill={sheet}
        stroke="rgba(21,22,28,0.12)"
        strokeWidth="2"
      />
      <Cheeks />
      <Eyes kind={look.eyes} y={60} />
      <Mouth kind="o" />
    </>
  );
}

function Wizard({ look }: { look: Look }) {
  const robe = look.gold ? "#E5B53A" : ["#3A3F8F", "#6B3FA0", "#1F7A72"][look.variant];
  return (
    <>
      <rect x="44" y="109" width="14" height="7" rx="3.5" fill="#2A2B33" />
      <rect x="62" y="109" width="14" height="7" rx="3.5" fill="#2A2B33" />
      <rect x="33" y="88" width="10" height="20" rx="5" fill={robe} />
      <rect x="77" y="88" width="10" height="20" rx="5" fill={robe} />
      <circle cx="38" cy="108" r="5" fill={look.skin} />
      <circle cx="82" cy="108" r="5" fill={look.skin} />
      <path d="M37 113 L43 86 Q60 80 77 86 L83 113 Z" fill={robe} />
      <path d={starPath(52, 100, 3.5)} fill="#FFD84D" />
      <path d={starPath(67, 95, 2.6)} fill="#FFD84D" />
      <Head fill={look.skin} />
      <Hair look={look} style="bob" />
      <Face look={look} />
      <path d="M28 41 L60 -1 Q66 8 70 6 L92 41 Z" fill={robe} />
      <ellipse cx="60" cy="41" rx="41" ry="7" fill={robe} />
      <path d="M33 38 Q60 30 87 38" stroke="#FFD84D" strokeWidth="3" fill="none" />
      <path d={starPath(62, 22, 6)} fill="#FFD84D" />
    </>
  );
}

function Magical({ look }: { look: Look }) {
  const dress = look.gold ? "#E5B53A" : ["#FF8DC7", "#B9A4FF", "#7FD8F0"][look.variant];
  return (
    <>
      <Body look={look} outfit={dress} />
      <path d="M52 88 L60 93 L52 98 Z M68 88 L60 93 L68 98 Z" fill="#FF3D71" />
      <path d="M84 108 L95 88" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      <path d={starPath(96, 85, 7)} fill="#FFD84D" />
      <Head fill={look.skin} />
      <Hair look={{ ...look, hair: look.gold ? "#C98A12" : "#F28DB2" }} style="twin" />
      <Face look={look} />
      <path d="M44 33 L48 22 L54 30 L60 17 L66 30 L72 22 L76 33 Z" fill="#FFD84D" />
      <circle cx="60" cy="28" r="3" fill="#FF3D71" />
    </>
  );
}

function Hero({ look }: { look: Look }) {
  const cape = look.gold ? "#C98A12" : look.accent;
  const mask = look.gold ? "#B98A1E" : INK;
  return (
    <>
      <path d="M38 88 L28 117 L92 117 L82 88 Z" fill={cape} />
      <Body look={look} />
      <circle cx="60" cy="97" r="6.5" fill="#FFD84D" />
      <path d="M61.5 92 L57 98 L60.5 98 L58.5 102.5 L63 96.5 L59.5 96.5 Z" fill={INK} />
      <Head fill={look.skin} />
      <Hair look={look} style="spiky" />
      <Cheeks />
      <path d="M33 58 L22 53 L25 64 Z" fill={mask} />
      <rect x="32" y="53" width="56" height="17" rx="8.5" fill={mask} />
      <ellipse cx="48" cy="61.5" rx="6" ry="5" fill="#fff" />
      <ellipse cx="72" cy="61.5" rx="6" ry="5" fill="#fff" />
      <circle cx="48.5" cy="62" r="3" fill={INK} />
      <circle cx="72.5" cy="62" r="3" fill={INK} />
      <Mouth kind="smile" />
    </>
  );
}

function Detective({ look }: { look: Look }) {
  const coat = look.gold ? "#E5B53A" : ["#D8B98A", "#9AA7B8", "#8C6A55"][look.variant];
  const hat = look.gold ? "#B98A1E" : ["#5B4636", "#2E3440", "#3B2A22"][look.variant];
  return (
    <>
      <Body look={look} outfit={coat} />
      <path d="M48 84 L56 97 L60 86 Z M72 84 L64 97 L60 86 Z" fill="rgba(0,0,0,0.14)" />
      <rect x="40" y="100" width="40" height="4" fill="#8A6A3E" />
      <circle cx="93" cy="99" r="7.5" fill="rgba(255,255,255,0.6)" stroke={hat} strokeWidth="3" />
      <path d="M88 105 L82 112" stroke={hat} strokeWidth="3.5" strokeLinecap="round" />
      <Head fill={look.skin} />
      <Face look={look} mouth="smirk" />
      <path d="M36 37 Q38 15 60 17 Q82 15 84 37 Z" fill={hat} />
      <rect x="37" y="31" width="46" height="5" fill={INK} opacity="0.6" />
      <ellipse cx="60" cy="38" rx="39" ry="6.5" fill={hat} />
    </>
  );
}

function Spy({ look }: { look: Look }) {
  const suit = look.gold ? "#E5B53A" : "#23242C";
  return (
    <>
      <Body look={look} outfit={suit} />
      <path d="M52 84 L60 96 L68 84 Z" fill="#fff" />
      <path d="M58.5 86 L61.5 86 L62.5 97 L60 100 L57.5 97 Z" fill="#FF3D71" />
      <Head fill={look.skin} />
      <Hair look={look} style="bangs" />
      <Cheeks />
      <rect x="37" y="55" width="20" height="12" rx="5" fill={INK} />
      <rect x="63" y="55" width="20" height="12" rx="5" fill={INK} />
      <path d="M57 59 L63 59" stroke={INK} strokeWidth="3" />
      <path d="M41 58 L46 58" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
      <path d="M67 58 L72 58" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
      <Mouth kind="smirk" />
    </>
  );
}

function Athlete({ look }: { look: Look }) {
  return (
    <>
      <Body look={look} />
      <text x="60" y="104" textAnchor="middle" fontSize="12" fontWeight="800" fill="#fff" fontFamily="Arial, sans-serif">
        10
      </text>
      <circle cx="96" cy="104" r="9" fill="#fff" stroke={INK} strokeWidth="1.5" />
      <path d="M87.5 102 Q96 97 104.5 102 M94 95.2 Q89 104 94 112.8 M99 95.6 Q103 104 99 112.4" stroke={INK} strokeWidth="1.4" fill="none" />
      <Head fill={look.skin} />
      <Hair look={look} style={look.hairStyle === "bun" ? "spiky" : look.hairStyle} />
      <rect x="26" y="41" width="68" height="7" rx="3" fill={look.accent} />
      <Face look={look} mouth="open" />
    </>
  );
}

function Singer({ look }: { look: Look }) {
  return (
    <>
      <Body look={look} />
      <Head fill={look.skin} />
      <Hair look={look} />
      <Face look={{ ...look, eyes: "happy" }} mouth="open" />
      <path d="M28 58 Q28 22 60 22 Q92 22 92 58" stroke={look.accent} strokeWidth="6" fill="none" />
      <rect x="20" y="51" width="12" height="21" rx="6" fill={look.accent} />
      <rect x="88" y="51" width="12" height="21" rx="6" fill={look.accent} />
      <path d="M103 18 L103 38" stroke={INK} strokeWidth="3" />
      <ellipse cx="99" cy="39" rx="5" ry="4" fill={INK} />
      <path d="M103 18 Q111 22 109 30" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
    </>
  );
}

function Romance({ look }: { look: Look }) {
  return (
    <>
      <Body look={look} />
      <Head fill={look.skin} />
      <Hair look={look} style="bun" />
      <Face look={{ ...look, eyes: "happy" }} mouth="smile" />
      <path d={heartPath(98, 30, 9)} fill="#FF3D71" />
      <path d={heartPath(16, 44, 5)} fill="#FF8DC7" />
    </>
  );
}

function Laurel({ look }: { look: Look }) {
  const leaves: { x: number; y: number; a: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const left = 200 + i * 11;
    const right = 340 - i * 11;
    for (const deg of [left, right]) {
      const rad = (deg * Math.PI) / 180;
      leaves.push({ x: 60 + 36 * Math.cos(rad), y: 58 + 30 * Math.sin(rad), a: deg + 90 });
    }
  }
  return (
    <>
      <Body look={look} outfit={look.gold ? "#E5B53A" : "#F6F2E8"} />
      <path d="M44 86 L76 110" stroke={look.accent} strokeWidth="6" strokeLinecap="round" />
      <Head fill={look.skin} />
      <Hair look={look} style="bangs" />
      <Face look={look} />
      {leaves.map((l, i) => (
        <ellipse
          key={i}
          cx={l.x.toFixed(1)}
          cy={l.y.toFixed(1)}
          rx="5.5"
          ry="2.6"
          fill={look.gold ? "#C98A12" : "#5FA84A"}
          transform={`rotate(${l.a.toFixed(0)} ${l.x.toFixed(1)} ${l.y.toFixed(1)})`}
        />
      ))}
    </>
  );
}

function Soldier({ look }: { look: Look }) {
  const green = look.gold ? "#E5B53A" : "#5E7A45";
  return (
    <>
      <Body look={look} outfit={look.gold ? "#D9A92F" : "#8C9A5B"} />
      <rect x="45" y="92" width="10" height="7" rx="2" fill="rgba(0,0,0,0.15)" />
      <rect x="65" y="92" width="10" height="7" rx="2" fill="rgba(0,0,0,0.15)" />
      <Head fill={look.skin} />
      <Face look={look} mouth="flat" />
      <path d="M26 50 Q26 20 60 20 Q94 20 94 50 Z" fill={green} />
      <rect x="21" y="46" width="78" height="7" rx="3.5" fill={look.gold ? "#B98A1E" : "#4B6337"} />
    </>
  );
}

function Explorer({ look }: { look: Look }) {
  return (
    <>
      <Body look={look} />
      <rect x="45" y="84" width="4" height="27" fill="#8A5A2E" />
      <rect x="71" y="84" width="4" height="27" fill="#8A5A2E" />
      <Head fill={look.skin} />
      <path d="M46 85 Q60 92 74 85 L72 90 Q60 97 48 90 Z" fill={look.accent} />
      <Face look={look} />
      <path d="M34 39 Q36 17 60 17 Q84 17 86 39 Z" fill={look.gold ? "#E5B53A" : "#E3C48F"} />
      <rect x="35" y="32" width="50" height="5" fill="#8A5A2E" />
      <ellipse cx="60" cy="39" rx="43" ry="6" fill={look.gold ? "#D9A92F" : "#D2AE73"} />
    </>
  );
}

function Fighter({ look }: { look: Look }) {
  return (
    <>
      <Body look={look} raisedArm />
      <path d="M52 84 L60 96 L68 84" stroke="rgba(0,0,0,0.25)" strokeWidth="2.5" fill="none" />
      <rect x="40" y="100" width="40" height="5" fill={INK} />
      <Head fill={look.skin} />
      <Hair look={look} style="spiky" />
      <rect x="26" y="40" width="68" height="8" rx="3" fill={look.accent} />
      <path d="M91 42 L106 35 L102 46 Z M91 46 L104 53 L95 55 Z" fill={look.accent} />
      <path d="M41 52 L53 55.5 M79 52 L67 55.5" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
      <Face look={{ ...look, eyes: "round" }} mouth="open" />
    </>
  );
}

function Party({ look }: { look: Look }) {
  const confetti = [
    [16, 30, "#FF3D71"],
    [104, 22, "#D8F36A"],
    [12, 66, "#3B4CFF"],
    [108, 60, "#FFD84D"],
  ] as const;
  return (
    <>
      {confetti.map(([x, y, c], i) => (
        <rect key={i} x={x} y={y} width="6" height="3.5" rx="1" fill={c} transform={`rotate(${i * 35} ${x} ${y})`} />
      ))}
      <Body look={look} />
      <Head fill={look.skin} />
      {look.variant === 1 ? (
        <>
          <circle cx="27" cy="44" r="9" fill={look.hair} />
          <circle cx="93" cy="44" r="9" fill={look.hair} />
          <Face look={look} mouth="open" />
          <circle cx="60" cy="67" r="5" fill="#FF3D71" />
        </>
      ) : look.variant === 2 ? (
        <>
          <Hair look={look} />
          <Cheeks />
          <circle cx="47" cy="61" r="10" fill="rgba(255,255,255,0.35)" stroke={INK} strokeWidth="3" />
          <circle cx="73" cy="61" r="10" fill="rgba(255,255,255,0.35)" stroke={INK} strokeWidth="3" />
          <path d="M57 60 L63 60" stroke={INK} strokeWidth="3" />
          <Eyes kind="round" y={61} />
          <Mouth kind="open" />
        </>
      ) : (
        <>
          <Hair look={look} style="bangs" />
          <Face look={look} mouth="open" />
          <g transform="rotate(-14 60 34)">
            <path d="M46 34 L60 3 L74 34 Z" fill={look.accent} />
            <path d="M51 23 L69 23 M55 14 L65 14" stroke="#fff" strokeWidth="3" opacity="0.8" />
            <circle cx="60" cy="4" r="5" fill="#FFD84D" />
          </g>
        </>
      )}
    </>
  );
}

function Drama({ look }: { look: Look }) {
  return (
    <>
      <Body look={look} />
      <Head fill={look.skin} />
      <Hair look={look} style="bob" />
      <Cheeks />
      <Eyes kind="round" />
      <path d="M47 71 Q44 76 47 78.5 Q50 76 47 71 Z" fill="#7CC8FF" />
      <Mouth kind="flat" />
      <rect x="40" y="81" width="40" height="8" rx="4" fill={look.accent} />
      <rect x="64" y="85" width="8" height="17" rx="3" fill={look.accent} />
      <g transform="rotate(-10 54 30)">
        <ellipse cx="54" cy="32" rx="31" ry="10" fill={look.gold ? "#C98A12" : INK} />
        <circle cx="53" cy="21" r="3.2" fill={look.gold ? "#C98A12" : INK} />
      </g>
    </>
  );
}

const DRAW: Record<Archetype, (props: { look: Look }) => React.ReactElement> = {
  astronaut: Astronaut,
  alien: Alien,
  robot: Robot,
  zombie: Zombie,
  ghost: Ghost,
  wizard: Wizard,
  magical: Magical,
  hero: Hero,
  detective: Detective,
  spy: Spy,
  athlete: Athlete,
  singer: Singer,
  romance: Romance,
  laurel: Laurel,
  soldier: Soldier,
  explorer: Explorer,
  fighter: Fighter,
  party: Party,
  drama: Drama,
};

export function Mascot({ work, gold = false, className }: { work: Work; gold?: boolean; className?: string }) {
  const look = lookFor(work, gold);
  const Draw = DRAW[archetypeFor(work)];
  return (
    <svg className={className} viewBox="0 0 120 120" aria-hidden="true" focusable="false">
      <ellipse cx="60" cy="117" rx="30" ry="3" fill="rgba(21,22,28,0.18)" />
      <Draw look={look} />
    </svg>
  );
}
