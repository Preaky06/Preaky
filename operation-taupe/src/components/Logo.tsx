interface Props {
  size?: number;
  animated?: boolean;
  evil?: boolean;
}

/** La taupe espionne : chapeau, lunettes noires, sortie de son terrier. */
export function MoleLogo({ size = 160, animated = true, evil = false }: Props) {
  return (
    <svg
      className={`mole-logo ${animated ? 'mole-anim' : ''} ${evil ? 'mole-evil' : ''}`}
      width={size}
      height={size}
      viewBox="0 0 200 200"
      role="img"
      aria-label="Taupe espionne"
    >
      <defs>
        <radialGradient id="ml-fur" cx="45%" cy="35%" r="75%">
          <stop offset="0" stopColor="#6B5B53" />
          <stop offset="0.6" stopColor="#4A3D37" />
          <stop offset="1" stopColor="#2E2522" />
        </radialGradient>
        <linearGradient id="ml-soil" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5A4030" />
          <stop offset="1" stopColor="#24180F" />
        </linearGradient>
        <linearGradient id="ml-lens" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#232A38" />
          <stop offset="1" stopColor="#05070B" />
        </linearGradient>
        <clipPath id="ml-clip">
          <rect x="0" y="0" width="200" height="152" />
        </clipPath>
      </defs>

      {/* Monticule de terre */}
      <path d="M8 182 Q40 138 100 136 Q160 138 192 182 Z" fill="url(#ml-soil)" />
      <path d="M30 160 Q62 140 100 139 Q140 140 170 160" stroke="#7A5840" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.6" />
      <circle cx="40" cy="170" r="3" fill="#7A5840" opacity="0.7" />
      <circle cx="160" cy="166" r="4" fill="#7A5840" opacity="0.6" />
      <circle cx="132" cy="176" r="2.5" fill="#7A5840" opacity="0.6" />
      <ellipse cx="100" cy="152" rx="54" ry="13" fill="#030405" />

      <g className="mole-body" clipPath="url(#ml-clip)">
        {/* Tête */}
        <path d="M50 160 C48 104 68 70 100 70 C132 70 152 104 150 160 Z" fill="url(#ml-fur)" />
        <path d="M74 160 C74 128 86 112 100 112 C114 112 126 128 126 160 Z" fill="#5E4F48" opacity="0.55" />

        {/* Chapeau */}
        <path d="M66 76 C66 44 134 44 134 76 Z" fill="#161B26" />
        <rect x="66" y="64" width="68" height="9" fill="#FFB547" className="mole-band" />
        <ellipse cx="100" cy="77" rx="52" ry="9" fill="#1E2432" />
        <path d="M76 52 Q100 42 124 52" stroke="#2A3244" strokeWidth="3" fill="none" />

        {/* Lunettes */}
        <path d="M54 98 L66 96" stroke="#0B0D12" strokeWidth="3" />
        <path d="M146 98 L134 96" stroke="#0B0D12" strokeWidth="3" />
        <rect x="64" y="88" width="32" height="20" rx="9" fill="url(#ml-lens)" stroke="#0B0D12" strokeWidth="2" />
        <rect x="104" y="88" width="32" height="20" rx="9" fill="url(#ml-lens)" stroke="#0B0D12" strokeWidth="2" />
        <rect x="95" y="94" width="10" height="4" rx="2" fill="#0B0D12" />
        <g className="mole-glint">
          <path d="M70 104 L80 91" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" opacity="0.55" />
          <path d="M110 104 L120 91" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" opacity="0.55" />
        </g>
        {evil && (
          <g>
            <path d="M66 86 L94 92" stroke="#FF3B5C" strokeWidth="3" strokeLinecap="round" />
            <path d="M134 86 L106 92" stroke="#FF3B5C" strokeWidth="3" strokeLinecap="round" />
          </g>
        )}

        {/* Museau */}
        <ellipse cx="100" cy="124" rx="15" ry="11" fill="#FF7A93" />
        <ellipse cx="96" cy="120" rx="5" ry="3" fill="#FFB3C1" opacity="0.8" />
        <ellipse cx="95" cy="126" rx="2.4" ry="2" fill="#7A2A3A" />
        <ellipse cx="105" cy="126" rx="2.4" ry="2" fill="#7A2A3A" />
        <g stroke="#C9B7AE" strokeWidth="1.4" strokeLinecap="round" opacity="0.75">
          <path d="M84 124 L62 118" />
          <path d="M84 128 L60 130" />
          <path d="M116 124 L138 118" />
          <path d="M116 128 L140 130" />
        </g>
        <path d="M92 138 Q100 143 108 138" stroke="#2E2522" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </g>

      {/* Pattes */}
      <g className="mole-paws">
        <ellipse cx="68" cy="150" rx="16" ry="9" fill="#F2B6A0" />
        <ellipse cx="132" cy="150" rx="16" ry="9" fill="#F2B6A0" />
        <g stroke="#FFF1E8" strokeWidth="2.4" strokeLinecap="round">
          <path d="M57 152 L53 158" />
          <path d="M64 155 L62 161" />
          <path d="M71 156 L71 162" />
          <path d="M143 152 L147 158" />
          <path d="M136 155 L138 161" />
          <path d="M129 156 L129 162" />
        </g>
      </g>
    </svg>
  );
}

/** Version compacte utilisée dans les en-têtes. */
export function MoleMark({ size = 28 }: { size?: number }) {
  return <MoleLogo size={size} animated={false} />;
}
