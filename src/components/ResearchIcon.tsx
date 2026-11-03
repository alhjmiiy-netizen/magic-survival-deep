import React from 'react';

interface ResearchIconProps {
  id: string;
  className?: string;
  color?: string;
}

export const ResearchIcon: React.FC<ResearchIconProps> = ({
  id,
  className = 'w-10 h-10',
  color = '#fef08a',
}) => {
  switch (id) {
    case 'growth':
      // Wisdom tree / brain with textured canopy
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          <path
            d="M32 60V38M32 38C28 34 22 36 20 40M32 38C36 34 42 36 44 40M32 32C24 32 16 26 18 16C20 6 30 8 32 14C34 8 44 6 46 16C48 26 40 32 32 32Z"
            stroke={color}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="24" cy="18" r="2.5" fill={color} />
          <circle cx="40" cy="18" r="2.5" fill={color} />
          <circle cx="32" cy="22" r="3" fill={color} />
          <circle cx="28" cy="12" r="2" fill={color} />
          <circle cx="36" cy="12" r="2" fill={color} />
          <circle cx="20" cy="24" r="2" fill={color} />
          <circle cx="44" cy="24" r="2" fill={color} />
        </svg>
      );

    case 'vitality':
      // Solid chalk heart with rough texture
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          <path
            d="M32 54C28 50 12 36 12 24C12 16 18 10 26 10C29 10 31 12 32 14C33 12 35 10 38 10C46 10 52 16 52 24C52 36 36 50 32 54Z"
            fill={color}
            stroke={color}
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'bloodthirst':
      // Exploding cell / cracked blood orb with porous texture
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          <circle cx="32" cy="32" r="18" stroke={color} strokeWidth="3" strokeDasharray="3 3" />
          <circle cx="32" cy="32" r="10" fill={color} />
          <circle cx="22" cy="20" r="2.5" fill={color} />
          <circle cx="42" cy="20" r="3" fill={color} />
          <circle cx="44" cy="38" r="2" fill={color} />
          <circle cx="20" cy="36" r="3" fill={color} />
          <circle cx="32" cy="48" r="2.5" fill={color} />
          <circle cx="32" cy="14" r="2" fill={color} />
        </svg>
      );

    case 'might':
      // Claw / spirit in rough circular ring
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          <circle cx="32" cy="32" r="22" stroke={color} strokeWidth="3.5" strokeDasharray="18 4" />
          <path
            d="M32 46V30M24 44V26M40 44V26M28 20L32 14L36 20"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'snipe':
      // Sharp 4-point crosshair target
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          <circle cx="32" cy="32" r="16" stroke={color} strokeWidth="3.5" />
          <line x1="32" y1="6" x2="32" y2="20" stroke={color} strokeWidth="3.5" strokeLinecap="round" />
          <line x1="32" y1="44" x2="32" y2="58" stroke={color} strokeWidth="3.5" strokeLinecap="round" />
          <line x1="6" y1="32" x2="20" y2="32" stroke={color} strokeWidth="3.5" strokeLinecap="round" />
          <line x1="44" y1="32" x2="58" y2="32" stroke={color} strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="32" cy="32" r="3.5" fill={color} />
        </svg>
      );

    case 'resistance':
      // Textured heater shield
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          <path
            d="M16 12H48L44 38C42 46 32 54 32 54C32 54 22 46 20 38L16 12Z"
            fill={color}
            stroke={color}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M32 18V48M22 26H42" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );

    case 'agility':
      // Glowing rough ring / halo
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          <circle cx="32" cy="32" r="18" stroke={color} strokeWidth="6" strokeDasharray="6 3" strokeLinecap="round" />
        </svg>
      );

    case 'haste':
      // Slanted swirling vortex spiral
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          <path
            d="M32 32C32 26 28 22 22 22C14 22 10 30 14 38C18 46 30 50 40 44C50 38 52 22 42 12C32 2 16 6 8 18"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'recovery':
      // Chunky chalk plus / cross
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          <path
            d="M26 12H38V26H52V38H38V52H26V38H12V26H26V12Z"
            fill={color}
            stroke={color}
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'explorer':
      // Magnifying glass with dashed trail
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          <circle cx="28" cy="28" r="14" stroke={color} strokeWidth="4" />
          <line x1="38" y1="38" x2="52" y2="52" stroke={color} strokeWidth="5" strokeLinecap="round" />
          <path d="M28 20V24M24 28H28" stroke={color} strokeWidth="3" strokeLinecap="round" />
          <path d="M42 16C46 14 50 18 52 22C54 26 52 30 50 34" stroke={color} strokeWidth="2.5" strokeDasharray="3 3" />
        </svg>
      );

    case 'saturation':
      // Radiating wheel / sliced citrus / sunburst
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          <circle cx="32" cy="32" r="20" stroke={color} strokeWidth="3" />
          <circle cx="32" cy="32" r="6" stroke={color} strokeWidth="2" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((ang) => (
            <line
              key={ang}
              x1={32 + Math.cos((ang * Math.PI) / 180) * 6}
              y1={32 + Math.sin((ang * Math.PI) / 180) * 6}
              x2={32 + Math.cos((ang * Math.PI) / 180) * 20}
              y2={32 + Math.sin((ang * Math.PI) / 180) * 20}
              stroke={color}
              strokeWidth="2"
            />
          ))}
        </svg>
      );

    case 'expansion':
      // Concentric ripple rings / sonar shockwave
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          <circle cx="32" cy="32" r="6" fill={color} />
          <circle cx="32" cy="32" r="12" stroke={color} strokeWidth="2" strokeDasharray="4 2" />
          <circle cx="32" cy="32" r="18" stroke={color} strokeWidth="2.5" strokeDasharray="6 3" />
          <circle cx="32" cy="32" r="24" stroke={color} strokeWidth="3" strokeDasharray="8 4" />
        </svg>
      );

    case 'transmutation':
      // Triangular recycling loop arrows
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          <path
            d="M32 12L38 22H26L32 12ZM44 42L48 30L38 34L44 42ZM18 42L24 34L14 30L18 42Z"
            fill={color}
          />
          <path
            d="M32 16H46V28M46 38L38 48H22M18 36L18 24H26"
            stroke={color}
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'arcana':
      // Bundle of ancient rolled scrolls
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          <rect x="20" y="14" width="8" height="38" rx="4" fill={color} />
          <rect x="30" y="10" width="8" height="42" rx="4" fill={color} />
          <rect x="40" y="16" width="8" height="36" rx="4" fill={color} />
          <line x1="16" y1="34" x2="50" y2="34" stroke="#000000" strokeWidth="2.5" />
        </svg>
      );

    case 'evasion':
      // Vertical jagged soundwaves / vibrational blur
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          {[-16, -10, -4, 2, 8, 14].map((offset, i) => (
            <line
              key={i}
              x1={32 + offset}
              y1={20 + (i % 3) * 6}
              x2={32 + offset}
              y2={44 - (i % 2) * 8}
              stroke={color}
              strokeWidth="3"
              strokeLinecap="round"
            />
          ))}
        </svg>
      );

    case 'penetration':
      // 8-point explosive burst star
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          <path
            d="M32 8L36 24L52 20L40 32L52 44L36 40L32 56L28 40L12 44L24 32L12 20L28 24L32 8Z"
            fill={color}
          />
        </svg>
      );

    case 'origin':
      // World tree with branching roots and canopy
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          <path
            d="M32 44V26M32 44L22 56M32 44L42 56M32 26C24 20 18 24 16 16C20 10 28 12 32 18C36 12 44 10 48 16C46 24 40 20 32 26Z"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="24" cy="18" r="2" fill={color} />
          <circle cx="40" cy="18" r="2" fill={color} />
          <circle cx="32" cy="12" r="2" fill={color} />
        </svg>
      );

    case 'bounty':
      // Parchment wanted / bounty poster
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          <rect x="18" y="14" width="28" height="36" rx="2" stroke={color} strokeWidth="3" />
          <circle cx="32" cy="28" r="6" fill={color} />
          <line x1="24" y1="40" x2="40" y2="40" stroke={color} strokeWidth="2.5" />
          <line x1="26" y1="44" x2="38" y2="44" stroke={color} strokeWidth="2" />
        </svg>
      );

    case 'fortune':
      // Pair of dotted rolling dice
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          <rect x="14" y="24" width="22" height="22" rx="3" stroke={color} strokeWidth="3" />
          <circle cx="20" cy="30" r="2" fill={color} />
          <circle cx="25" cy="35" r="2" fill={color} />
          <circle cx="30" cy="40" r="2" fill={color} />

          <rect x="28" y="12" width="22" height="22" rx="3" stroke={color} strokeWidth="3" />
          <circle cx="34" cy="18" r="1.8" fill={color} />
          <circle cx="44" cy="18" r="1.8" fill={color} />
          <circle cx="39" cy="23" r="1.8" fill={color} />
          <circle cx="34" cy="28" r="1.8" fill={color} />
          <circle cx="44" cy="28" r="1.8" fill={color} />
        </svg>
      );

    case 'rebirth':
      // Ancient cracked holy chalice / grail
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          <path
            d="M20 16H44V26C44 34 36 38 32 38C28 38 20 34 20 26V16Z"
            fill={color}
            stroke={color}
            strokeWidth="2"
          />
          <path d="M32 38V48M22 48H42" stroke={color} strokeWidth="4" strokeLinecap="round" />
        </svg>
      );

    case 'curse_ward':
      // Balanced scales of justice
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          <line x1="32" y1="12" x2="32" y2="52" stroke={color} strokeWidth="3" />
          <line x1="16" y1="20" x2="48" y2="20" stroke={color} strokeWidth="3.5" />
          <path d="M16 20L10 32H22L16 20Z" fill={color} />
          <path d="M48 20L42 32H54L48 20Z" fill={color} />
          <line x1="24" y1="52" x2="40" y2="52" stroke={color} strokeWidth="4" />
        </svg>
      );

    case 'fusion_mastery':
      // Concentric gear clockwork pentagram
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          <circle cx="32" cy="32" r="18" stroke={color} strokeWidth="2.5" />
          <circle cx="32" cy="32" r="10" stroke={color} strokeWidth="2" strokeDasharray="3 2" />
          <circle cx="32" cy="32" r="4" fill={color} />
          <circle cx="20" cy="20" r="2" fill={color} />
          <circle cx="44" cy="20" r="2" fill={color} />
          <circle cx="20" cy="44" r="2" fill={color} />
          <circle cx="44" cy="44" r="2" fill={color} />
        </svg>
      );

    default:
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          <circle cx="32" cy="32" r="16" stroke={color} strokeWidth="3" />
          <circle cx="32" cy="32" r="6" fill={color} />
        </svg>
      );
  }
};
