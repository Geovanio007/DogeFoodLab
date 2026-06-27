/**
 * ShibaCosmetics.jsx
 * Real SVG game icons + overlay layers that sit precisely on the Shiba body.
 * Every icon is drawn to match the viewBox="0 0 140 150" coordinate space.
 * Body reference points:
 *   Head centre:       cx=70  cy=58
 *   Ear tips:          left~51,13  right~89,13
 *   Eye left:          cx=56  cy=58
 *   Eye right:         cx=84  cy=58
 *   Nose:              cx=70  cy=76
 *   Neck / chest top:  cy≈88-96
 *   Body centre:       cx=70  cy=114
 *   Back (top body):   cy≈88
 *   Tail root:         translate(104,96)
 */
import React from 'react';

// ─── RARITY PALETTE ──────────────────────────────────────────────────────────
const R = {
  Common:    '#94a3b8',
  Uncommon:  '#34d399',
  Rare:      '#60a5fa',
  Epic:      '#c084fc',
  Legendary: '#f59e0b',
  Mythic:    '#f97316',
};

// ─── HEAD COSMETICS ───────────────────────────────────────────────────────────

export const HeadIcon_LabCap = ({ color = R.Common }) => (
  <g data-cosmetic="cap_basic">
    {/* Cap brim */}
    <ellipse cx="70" cy="34" rx="26" ry="5" fill="#1e293b" />
    {/* Cap dome */}
    <path d="M44 34 Q44 10 70 10 Q96 10 96 34 Z" fill="#334155" />
    {/* Cap panel lines */}
    <path d="M70 10 Q70 22 70 34" stroke="#475569" strokeWidth="1" fill="none" />
    <path d="M57 12 Q57 23 57 34" stroke="#475569" strokeWidth="0.8" fill="none" opacity="0.6" />
    <path d="M83 12 Q83 23 83 34" stroke="#475569" strokeWidth="0.8" fill="none" opacity="0.6" />
    {/* Logo badge */}
    <circle cx="70" cy="22" r="5" fill={color} opacity="0.9" />
    <text x="70" y="25.5" textAnchor="middle" fontSize="5" fontWeight="900" fill="#000">LAB</text>
    {/* Brim underside */}
    <path d="M44 34 Q55 40 70 40 Q85 40 96 34" stroke={color} strokeWidth="1.5" fill="none" opacity="0.5" />
  </g>
);

export const HeadIcon_LabGoggles = ({ color = R.Rare }) => (
  <g data-cosmetic="goggles_lab">
    {/* Strap across forehead */}
    <path d="M38 52 Q70 46 102 52" stroke="#1e293b" strokeWidth="4" fill="none" />
    {/* Left lens frame */}
    <rect x="41" y="50" width="22" height="16" rx="7" fill="#0f172a" stroke={color} strokeWidth="2" />
    {/* Right lens frame */}
    <rect x="77" y="50" width="22" height="16" rx="7" fill="#0f172a" stroke={color} strokeWidth="2" />
    {/* Bridge */}
    <rect x="63" y="55" width="14" height="5" rx="2" fill="#1e293b" stroke={color} strokeWidth="1" />
    {/* Left lens tint */}
    <rect x="43" y="52" width="18" height="12" rx="6" fill={color} opacity="0.22" />
    {/* Right lens tint */}
    <rect x="79" y="52" width="18" height="12" rx="6" fill={color} opacity="0.22" />
    {/* Lens glint left */}
    <ellipse cx="47" cy="55" rx="3" ry="2" fill="white" opacity="0.4" />
    {/* Lens glint right */}
    <ellipse cx="83" cy="55" rx="3" ry="2" fill="white" opacity="0.4" />
    {/* Side clips */}
    <rect x="36" y="52" width="6" height="12" rx="3" fill="#334155" stroke={color} strokeWidth="1" />
    <rect x="98" y="52" width="6" height="12" rx="3" fill="#334155" stroke={color} strokeWidth="1" />
  </g>
);

export const HeadIcon_GoldCrown = ({ color = R.Epic, animated = false }) => (
  <g data-cosmetic="crown_gold">
    {/* Crown base band */}
    <rect x="48" y="22" width="44" height="9" rx="3" fill={color} />
    {/* Crown points */}
    <polygon points="50,22 56,6 62,22" fill={color} />
    <polygon points="64,22 70,3 76,22" fill={color} />
    <polygon points="78,22 84,6 90,22" fill={color} />
    {/* Point gems */}
    <circle cx="56" cy="10" r="3.5" fill="#ef4444" />
    <circle cx="70" cy="7"  r="4"   fill="#a78bfa" />
    <circle cx="84" cy="10" r="3.5" fill="#34d399" />
    {/* Band detail */}
    <rect x="48" y="25" width="44" height="3" rx="1" fill="#92400e" opacity="0.4" />
    <circle cx="60" cy="26.5" r="2" fill="#fbbf24" />
    <circle cx="70" cy="26.5" r="2" fill="#fbbf24" />
    <circle cx="80" cy="26.5" r="2" fill="#fbbf24" />
    {/* Glow */}
    {animated && <ellipse cx="70" cy="14" rx="26" ry="12" fill={color} opacity="0.12">
      <animate attributeName="opacity" values="0.08;0.2;0.08" dur="2s" repeatCount="indefinite" />
    </ellipse>}
  </g>
);

export const HeadIcon_AstroHelmet = ({ color = R.Epic }) => (
  <g data-cosmetic="helmet_astro">
    {/* Outer shell */}
    <path d="M40 62 Q40 16 70 14 Q100 16 100 62 Q100 74 90 80 L50 80 Q40 74 40 62 Z"
      fill="#0f172a" stroke={color} strokeWidth="2" opacity="0.92" />
    {/* Visor cutout */}
    <path d="M50 50 Q50 30 70 29 Q90 30 90 50 Q90 64 70 66 Q50 64 50 50 Z"
      fill={color} opacity="0.28" />
    {/* Visor glint */}
    <path d="M54 36 Q62 32 74 34" stroke="white" strokeWidth="2.5" fill="none" opacity="0.5" strokeLinecap="round" />
    {/* Visor frame */}
    <path d="M50 50 Q50 30 70 29 Q90 30 90 50 Q90 64 70 66 Q50 64 50 50 Z"
      fill="none" stroke={color} strokeWidth="2.5" />
    {/* Antenna */}
    <line x1="70" y1="14" x2="70" y2="4" stroke={color} strokeWidth="2" />
    <circle cx="70" cy="3" r="3" fill={color} />
    <circle cx="70" cy="3" r="1.5" fill="white" opacity="0.7" />
    {/* Side vents */}
    <rect x="38" y="56" width="5" height="12" rx="2" fill="#1e293b" stroke={color} strokeWidth="1" />
    <rect x="97" y="56" width="5" height="12" rx="2" fill="#1e293b" stroke={color} strokeWidth="1" />
    <line x1="39" y1="59" x2="42" y2="59" stroke={color} strokeWidth="0.8" opacity="0.7" />
    <line x1="39" y1="62" x2="42" y2="62" stroke={color} strokeWidth="0.8" opacity="0.7" />
    <line x1="39" y1="65" x2="42" y2="65" stroke={color} strokeWidth="0.8" opacity="0.7" />
    <line x1="98" y1="59" x2="101" y2="59" stroke={color} strokeWidth="0.8" opacity="0.7" />
    <line x1="98" y1="62" x2="101" y2="62" stroke={color} strokeWidth="0.8" opacity="0.7" />
    <line x1="98" y1="65" x2="101" y2="65" stroke={color} strokeWidth="0.8" opacity="0.7" />
  </g>
);

export const HeadIcon_MythicCrown = ({ color = R.Mythic }) => (
  <g data-cosmetic="crown_mythic">
    {/* Outer glow ring */}
    <ellipse cx="70" cy="16" rx="32" ry="18" fill={color} opacity="0.1">
      <animate attributeName="opacity" values="0.06;0.18;0.06" dur="1.8s" repeatCount="indefinite" />
    </ellipse>
    {/* Base */}
    <rect x="44" y="22" width="52" height="10" rx="4" fill="#18181b" stroke={color} strokeWidth="1.5" />
    {/* Tall centre spike */}
    <polygon points="67,22 70,-2 73,22" fill={color} />
    {/* Side spikes */}
    <polygon points="49,22 53,8 57,22"  fill={color} opacity="0.8" />
    <polygon points="83,22 87,8 91,22"  fill={color} opacity="0.8" />
    {/* Outer spikes */}
    <polygon points="44,22 46,14 50,22" fill={color} opacity="0.5" />
    <polygon points="90,22 94,14 96,22" fill={color} opacity="0.5" />
    {/* Centre gem — diamond */}
    <polygon points="70,0 75,8 70,16 65,8" fill="#e0f2fe" stroke={color} strokeWidth="1" />
    <polygon points="70,0 75,8 70,6"  fill="white" opacity="0.6" />
    {/* Side gems */}
    <circle cx="53" cy="12" r="3" fill="#ef4444" />
    <circle cx="87" cy="12" r="3" fill="#34d399" />
    {/* Band gems */}
    <circle cx="57" cy="27" r="2.2" fill={color} />
    <circle cx="70" cy="27" r="2.2" fill={color} />
    <circle cx="83" cy="27" r="2.2" fill={color} />
    {/* Floating particles */}
    <circle cx="44" cy="18" r="1.5" fill={color} opacity="0.6">
      <animate attributeName="cy" values="18;12;18" dur="2.2s" repeatCount="indefinite" />
    </circle>
    <circle cx="96" cy="18" r="1.5" fill={color} opacity="0.6">
      <animate attributeName="cy" values="18;12;18" dur="2.6s" repeatCount="indefinite" />
    </circle>
  </g>
);

// ─── FACE COSMETICS ───────────────────────────────────────────────────────────

export const FaceIcon_NerdGlasses = ({ color = R.Common }) => (
  <g data-cosmetic="glasses_nerd">
    {/* Left frame */}
    <rect x="44" y="54" width="18" height="12" rx="5" fill="none" stroke="#1c1917" strokeWidth="2.5" />
    {/* Right frame */}
    <rect x="78" y="54" width="18" height="12" rx="5" fill="none" stroke="#1c1917" strokeWidth="2.5" />
    {/* Bridge */}
    <path d="M62 59 Q70 56 78 59" stroke="#1c1917" strokeWidth="2" fill="none" />
    {/* Arms */}
    <line x1="44" y1="60" x2="36" y2="62" stroke="#1c1917" strokeWidth="2" strokeLinecap="round" />
    <line x1="96" y1="60" x2="104" y2="62" stroke="#1c1917" strokeWidth="2" strokeLinecap="round" />
    {/* Tint */}
    <rect x="46" y="56" width="14" height="8" rx="4" fill={color} opacity="0.2" />
    <rect x="80" y="56" width="14" height="8" rx="4" fill={color} opacity="0.2" />
    {/* Glints */}
    <ellipse cx="48" cy="57.5" rx="2.5" ry="1.5" fill="white" opacity="0.5" />
    <ellipse cx="82" cy="57.5" rx="2.5" ry="1.5" fill="white" opacity="0.5" />
  </g>
);

export const FaceIcon_LaserMonocle = ({ color = R.Rare }) => (
  <g data-cosmetic="monocle_laser">
    {/* Monocle frame around right eye */}
    <circle cx="84" cy="58" r="13" fill="none" stroke={color} strokeWidth="2.5" />
    <circle cx="84" cy="58" r="11" fill={color} opacity="0.15" />
    {/* Chain from monocle to ear */}
    <path d="M96 58 Q102 60 104 68 Q106 76 100 80" stroke="#a16207" strokeWidth="1.2" fill="none"
      strokeDasharray="2 2" />
    {/* Laser dot emitter on frame */}
    <circle cx="84" cy="45" r="3" fill={color} />
    {/* Laser beam going forward */}
    <line x1="84" y1="45" x2="84" y2="38" stroke={color} strokeWidth="1.5" opacity="0.9">
      <animate attributeName="opacity" values="0.4;1;0.4" dur="0.8s" repeatCount="indefinite" />
    </line>
    <circle cx="84" cy="37" r="2.5" fill={color} opacity="0.8">
      <animate attributeName="r" values="1.5;3;1.5" dur="0.8s" repeatCount="indefinite" />
    </circle>
    {/* Glint */}
    <ellipse cx="78" cy="52" rx="3" ry="2" fill="white" opacity="0.4" />
  </g>
);

export const FaceIcon_CyberMask = ({ color = R.Epic }) => (
  <g data-cosmetic="mask_cyber">
    {/* Lower face mask (covers nose + mouth area) */}
    <path d="M48 70 Q48 60 70 58 Q92 60 92 70 L90 88 Q70 94 50 88 Z"
      fill="#0f172a" stroke={color} strokeWidth="1.8" opacity="0.92" />
    {/* Horizontal scan line */}
    <path d="M50 74 Q70 71 90 74" stroke={color} strokeWidth="1" fill="none" opacity="0.6" />
    {/* Circuit traces */}
    <path d="M54 80 L60 80 L60 76 L66 76" stroke={color} strokeWidth="0.8" fill="none" opacity="0.5" />
    <path d="M74 76 L80 76 L80 80 L86 80" stroke={color} strokeWidth="0.8" fill="none" opacity="0.5" />
    {/* Filter vents left */}
    <rect x="52" y="82" width="14" height="4" rx="2" fill="#1e293b" stroke={color} strokeWidth="0.8" />
    <line x1="54" y1="84" x2="64" y2="84" stroke={color} strokeWidth="0.6" opacity="0.6" />
    {/* Filter vents right */}
    <rect x="74" y="82" width="14" height="4" rx="2" fill="#1e293b" stroke={color} strokeWidth="0.8" />
    <line x1="76" y1="84" x2="86" y2="84" stroke={color} strokeWidth="0.6" opacity="0.6" />
    {/* Pulsing LED */}
    <circle cx="70" cy="64" r="2.5" fill={color}>
      <animate attributeName="opacity" values="0.3;1;0.3" dur="1.2s" repeatCount="indefinite" />
    </circle>
  </g>
);

export const FaceIcon_EliteVisor = ({ color = R.Legendary }) => (
  <g data-cosmetic="visor_elite">
    {/* Full visor bar across eyes */}
    <path d="M36 50 Q36 46 70 44 Q104 46 104 50 L102 66 Q70 70 38 66 Z"
      fill="#0c0a09" opacity="0.88" />
    {/* Visor glass */}
    <path d="M38 50 Q70 46 102 50 L100 65 Q70 68 40 65 Z"
      fill={color} opacity="0.2" />
    {/* HUD grid lines */}
    <line x1="42" y1="57" x2="98" y2="57" stroke={color} strokeWidth="0.7" opacity="0.4" />
    <line x1="56" y1="49" x2="56" y2="66" stroke={color} strokeWidth="0.5" opacity="0.25" />
    <line x1="70" y1="46" x2="70" y2="68" stroke={color} strokeWidth="0.5" opacity="0.25" />
    <line x1="84" y1="49" x2="84" y2="66" stroke={color} strokeWidth="0.5" opacity="0.25" />
    {/* Target reticle left eye area */}
    <circle cx="56" cy="57" r="5" fill="none" stroke={color} strokeWidth="0.8" opacity="0.5" />
    <line x1="51" y1="57" x2="53" y2="57" stroke={color} strokeWidth="0.8" />
    <line x1="59" y1="57" x2="61" y2="57" stroke={color} strokeWidth="0.8" />
    {/* Target reticle right eye area */}
    <circle cx="84" cy="57" r="5" fill="none" stroke={color} strokeWidth="0.8" opacity="0.5" />
    <line x1="79" y1="57" x2="81" y2="57" stroke={color} strokeWidth="0.8" />
    <line x1="87" y1="57" x2="89" y2="57" stroke={color} strokeWidth="0.8" />
    {/* Glint across top */}
    <path d="M40 50 Q70 47 100 50" stroke="white" strokeWidth="1.5" fill="none" opacity="0.3" />
    {/* Side mounts */}
    <rect x="34" y="51" width="6" height="14" rx="3" fill="#1e293b" stroke={color} strokeWidth="1" />
    <rect x="100" y="51" width="6" height="14" rx="3" fill="#1e293b" stroke={color} strokeWidth="1" />
    {/* Status blink */}
    <circle cx="38" cy="55" r="2" fill={color}>
      <animate attributeName="opacity" values="1;0.2;1" dur="1.5s" repeatCount="indefinite" />
    </circle>
  </g>
);

// ─── BODY COSMETICS ───────────────────────────────────────────────────────────

export const BodyIcon_LabCoat = ({ color = R.Common }) => (
  <g data-cosmetic="coat_lab">
    {/* Coat body */}
    <path d="M36 100 Q36 86 50 86 L90 86 Q104 86 104 100 L104 142 Q90 148 70 148 Q50 148 36 142 Z"
      fill="white" stroke="#e2e8f0" strokeWidth="1.5" opacity="0.88" />
    {/* Left lapel */}
    <path d="M70 86 L56 100 L62 100 L70 92 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" />
    {/* Right lapel */}
    <path d="M70 86 L84 100 L78 100 L70 92 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" />
    {/* Centre opening seam */}
    <line x1="70" y1="92" x2="70" y2="148" stroke="#e2e8f0" strokeWidth="1.5" />
    {/* Buttons */}
    <circle cx="70" cy="106" r="2" fill={color} />
    <circle cx="70" cy="116" r="2" fill={color} />
    <circle cx="70" cy="126" r="2" fill={color} />
    {/* Left breast pocket */}
    <rect x="52" y="96" width="12" height="9" rx="2" fill="none" stroke="#cbd5e1" strokeWidth="1" />
    <line x1="53" y1="96" x2="63" y2="96" stroke={color} strokeWidth="1.5" />
    {/* Cuff lines */}
    <path d="M36 128 Q38 132 45 134" stroke="#cbd5e1" strokeWidth="1.5" fill="none" />
    <path d="M104 128 Q102 132 95 134" stroke="#cbd5e1" strokeWidth="1.5" fill="none" />
  </g>
);

export const BodyIcon_DogeHoodie = ({ color = R.Uncommon }) => (
  <g data-cosmetic="hoodie_doge">
    {/* Hoodie body */}
    <path d="M36 100 Q36 86 50 86 L90 86 Q104 86 104 100 L104 142 Q90 148 70 148 Q50 148 36 142 Z"
      fill={color} opacity="0.85" />
    {/* Hood around neck/head base */}
    <path d="M50 86 Q50 76 70 74 Q90 76 90 86" fill={color} opacity="0.7" stroke={color} strokeWidth="1" />
    {/* Kangaroo pocket */}
    <path d="M54 118 Q54 108 70 108 Q86 108 86 118 L84 132 Q70 136 56 132 Z"
      fill="none" stroke="rgba(0,0,0,0.2)" strokeWidth="1.5" />
    {/* DOGE text on front */}
    <text x="70" y="104" textAnchor="middle" fontSize="7" fontWeight="900"
      fill="rgba(0,0,0,0.35)" letterSpacing="1">DOGE</text>
    {/* Drawstrings */}
    <line x1="64" y1="86" x2="62" y2="96" stroke="rgba(0,0,0,0.25)" strokeWidth="1.2" />
    <line x1="76" y1="86" x2="78" y2="96" stroke="rgba(0,0,0,0.25)" strokeWidth="1.2" />
    {/* Cuffs */}
    <path d="M36 130 Q40 136 46 138" stroke="rgba(0,0,0,0.2)" strokeWidth="3" fill="none" strokeLinecap="round" />
    <path d="M104 130 Q100 136 94 138" stroke="rgba(0,0,0,0.2)" strokeWidth="3" fill="none" strokeLinecap="round" />
  </g>
);

export const BodyIcon_CyberJacket = ({ color = R.Rare }) => (
  <g data-cosmetic="jacket_cyber">
    {/* Main jacket */}
    <path d="M36 100 Q36 86 50 86 L90 86 Q104 86 104 100 L104 142 Q90 148 70 148 Q50 148 36 142 Z"
      fill="#0f172a" opacity="0.9" />
    {/* Colour stripe left shoulder */}
    <path d="M36 100 L36 114 Q42 110 50 108 L50 94 Q42 96 36 100 Z" fill={color} opacity="0.7" />
    {/* Colour stripe right shoulder */}
    <path d="M104 100 L104 114 Q98 110 90 108 L90 94 Q98 96 104 100 Z" fill={color} opacity="0.7" />
    {/* Centre panel with circuit detail */}
    <path d="M58 86 L58 148" stroke={color} strokeWidth="0.8" opacity="0.3" />
    <path d="M82 86 L82 148" stroke={color} strokeWidth="0.8" opacity="0.3" />
    {/* Chest LED strips */}
    <rect x="54" y="96" width="10" height="3" rx="1.5" fill={color} opacity="0.6" />
    <rect x="76" y="96" width="10" height="3" rx="1.5" fill={color} opacity="0.6" />
    {/* Zipper */}
    <line x1="70" y1="88" x2="70" y2="148" stroke="#334155" strokeWidth="2" />
    <rect x="67.5" y="94" width="5" height="4" rx="1" fill="#475569" />
    {/* Collar */}
    <path d="M50 86 L58 96 L70 90 L82 96 L90 86" fill="#1e293b" stroke={color} strokeWidth="1" />
  </g>
);

export const BodyIcon_ReactorArmor = ({ color = R.Epic }) => (
  <g data-cosmetic="armor_reactor">
    {/* Chest plate main */}
    <path d="M40 100 Q40 86 54 84 L86 84 Q100 86 100 100 L100 138 Q86 146 70 146 Q54 146 40 138 Z"
      fill="#0f172a" stroke={color} strokeWidth="2" opacity="0.95" />
    {/* Chest plate panels */}
    <path d="M54 84 L54 124 Q62 128 70 128 Q78 128 86 124 L86 84" stroke={color} strokeWidth="0.8" fill="none" opacity="0.4" />
    <path d="M40 112 Q70 116 100 112" stroke={color} strokeWidth="0.8" fill="none" opacity="0.4" />
    {/* Arc reactor core */}
    <circle cx="70" cy="106" r="10" fill="#0c0a09" stroke={color} strokeWidth="2" />
    <circle cx="70" cy="106" r="7"  fill={color} opacity="0.2" />
    <circle cx="70" cy="106" r="4"  fill={color} opacity="0.6" />
    <circle cx="70" cy="106" r="2"  fill="white" />
    <circle cx="70" cy="106" r="2"  fill="white">
      <animate attributeName="opacity" values="0.5;1;0.5" dur="1s" repeatCount="indefinite" />
    </circle>
    {/* Reactor ring spokes */}
    {[0,60,120,180,240,300].map(a => (
      <line key={a}
        x1={70 + Math.cos(a*Math.PI/180)*4}
        y1={106 + Math.sin(a*Math.PI/180)*4}
        x2={70 + Math.cos(a*Math.PI/180)*7}
        y2={106 + Math.sin(a*Math.PI/180)*7}
        stroke={color} strokeWidth="1" opacity="0.7" />
    ))}
    {/* Shoulder guards */}
    <path d="M40 98 Q36 96 34 106 Q34 116 40 116 Z" fill={color} opacity="0.5" />
    <path d="M100 98 Q104 96 106 106 Q106 116 100 116 Z" fill={color} opacity="0.5" />
    {/* Collar guard */}
    <path d="M54 84 Q54 78 70 76 Q86 78 86 84" fill="#1e293b" stroke={color} strokeWidth="1.5" />
    {/* Glow pulse */}
    <circle cx="70" cy="106" r="12" fill="none" stroke={color} strokeWidth="1" opacity="0.3">
      <animate attributeName="r" values="9;13;9" dur="2s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="0.4;0.1;0.4" dur="2s" repeatCount="indefinite" />
    </circle>
  </g>
);

export const BodyIcon_ScientistSuit = ({ color = R.Mythic }) => (
  <g data-cosmetic="suit_scientist">
    {/* Full body suit */}
    <path d="M36 100 Q36 84 52 82 L88 82 Q104 84 104 100 L104 144 Q88 150 70 150 Q52 150 36 144 Z"
      fill="#18181b" stroke={color} strokeWidth="2" opacity="0.95" />
    {/* Suit glow trim */}
    <path d="M36 100 Q36 84 52 82 L88 82 Q104 84 104 100 L104 144 Q88 150 70 150 Q52 150 36 144 Z"
      fill="none" stroke={color} strokeWidth="3" opacity="0.25" />
    {/* Shoulder epaulettes */}
    <path d="M36 92 Q44 86 52 84 L52 96 Q44 98 36 104 Z" fill={color} opacity="0.5" />
    <path d="M104 92 Q96 86 88 84 L88 96 Q96 98 104 104 Z" fill={color} opacity="0.5" />
    {/* Centre chest panel */}
    <rect x="58" y="88" width="24" height="36" rx="4" fill="#09090b" stroke={color} strokeWidth="1.2" />
    {/* Panel display */}
    <rect x="60" y="90" width="20" height="14" rx="2" fill={color} opacity="0.15" />
    <text x="70" y="100" textAnchor="middle" fontSize="5" fill={color} fontWeight="900">$LAB</text>
    {/* Panel buttons */}
    <circle cx="62" cy="112" r="2" fill="#ef4444" />
    <circle cx="70" cy="112" r="2" fill={color} />
    <circle cx="78" cy="112" r="2" fill="#34d399" />
    {/* Vertical light strips */}
    <rect x="54" y="84" width="2" height="60" rx="1" fill={color} opacity="0.35" />
    <rect x="84" y="84" width="2" height="60" rx="1" fill={color} opacity="0.35" />
    {/* Belt */}
    <rect x="38" y="128" width="64" height="7" rx="3" fill="#27272a" stroke={color} strokeWidth="1" />
    <rect x="66" y="129" width="8" height="5" rx="2" fill={color} opacity="0.8" />
    {/* Collar rank marks */}
    <rect x="54" y="83" width="4" height="2" rx="1" fill={color} />
    <rect x="60" y="83" width="4" height="2" rx="1" fill={color} />
    <rect x="82" y="83" width="4" height="2" rx="1" fill={color} />
    <rect x="76" y="83" width="4" height="2" rx="1" fill={color} />
    {/* Mythic glow pulse */}
    <ellipse cx="70" cy="116" rx="32" ry="20" fill={color} opacity="0.04">
      <animate attributeName="opacity" values="0.02;0.1;0.02" dur="2.5s" repeatCount="indefinite" />
    </ellipse>
  </g>
);

// ─── NECK COSMETICS ───────────────────────────────────────────────────────────

export const NeckIcon_GoldChain = ({ color = R.Uncommon }) => (
  <g data-cosmetic="chain_gold">
    {/* Chain links across neck/collar */}
    {[...Array(9)].map((_, i) => (
      <ellipse key={i}
        cx={50 + i * 5} cy={90 + Math.sin(i * 0.8) * 2}
        rx="3.5" ry="2"
        fill="none" stroke={color} strokeWidth="1.8"
        transform={`rotate(${i % 2 === 0 ? 0 : 90} ${50 + i * 5} ${90 + Math.sin(i * 0.8) * 2})`}
      />
    ))}
    {/* Pendant */}
    <polygon points="70,95 74,104 70,108 66,104" fill={color} stroke="#a16207" strokeWidth="1" />
    <circle cx="70" cy="103" r="3" fill="#fbbf24" />
    <circle cx="70" cy="95" r="2" fill={color} />
  </g>
);

export const NeckIcon_LabCollar = ({ color = R.Common }) => (
  <g data-cosmetic="collar_lab">
    {/* Collar band */}
    <path d="M50 88 Q50 84 70 83 Q90 84 90 88 L88 96 Q70 99 52 96 Z"
      fill={color} opacity="0.75" />
    {/* Collar buckle */}
    <rect x="65" y="88" width="10" height="7" rx="2" fill="#1e293b" stroke={color} strokeWidth="1.2" />
    <rect x="67" y="90" width="6" height="3" rx="1" fill={color} opacity="0.6" />
    {/* Tag */}
    <rect x="68" y="95" width="4" height="6" rx="1" fill="#fbbf24" />
    <text x="70" y="100" textAnchor="middle" fontSize="3.5" fill="#000" fontWeight="900">ID</text>
  </g>
);

export const NeckIcon_ChampionMedal = ({ color = R.Legendary }) => (
  <g data-cosmetic="medal_champion">
    {/* Ribbon */}
    <path d="M62 86 L67 100 L70 98 L73 100 L78 86 Q70 82 62 86 Z" fill={color} opacity="0.7" />
    <path d="M62 86 L70 92 L78 86" fill="none" stroke="rgba(0,0,0,0.2)" strokeWidth="1" />
    {/* Medal body */}
    <circle cx="70" cy="108" r="13" fill="#18181b" stroke={color} strokeWidth="2.5" />
    <circle cx="70" cy="108" r="10" fill={color} opacity="0.15" />
    {/* Laurel wreath left */}
    <path d="M58 108 Q56 102 60 98 Q62 102 60 106 Z" fill={color} opacity="0.6" />
    <path d="M58 108 Q55 108 56 114 Q60 112 60 108 Z" fill={color} opacity="0.6" />
    {/* Laurel wreath right */}
    <path d="M82 108 Q84 102 80 98 Q78 102 80 106 Z" fill={color} opacity="0.6" />
    <path d="M82 108 Q85 108 84 114 Q80 112 80 108 Z" fill={color} opacity="0.6" />
    {/* Star */}
    <polygon points="70,100 71.8,105.5 77.5,105.5 72.9,108.8 74.7,114.3 70,111 65.3,114.3 67.1,108.8 62.5,105.5 68.2,105.5"
      fill={color} />
    {/* Ring link */}
    <circle cx="70" cy="95" r="3" fill="none" stroke={color} strokeWidth="2" />
    {/* Glow */}
    <circle cx="70" cy="108" r="14" fill="none" stroke={color} strokeWidth="1" opacity="0.3">
      <animate attributeName="opacity" values="0.1;0.5;0.1" dur="2s" repeatCount="indefinite" />
    </circle>
  </g>
);

// ─── BACK COSMETICS ───────────────────────────────────────────────────────────

export const BackIcon_AngelWings = ({ color = R.Epic }) => (
  <g data-cosmetic="wings_angel">
    {/* Left wing */}
    <path d="M36 96 Q10 80 8 110 Q10 130 36 120 Q28 110 36 100 Z" fill="white" opacity="0.85" />
    <path d="M36 100 Q18 94 14 116 Q20 128 36 118" fill={color} opacity="0.25" />
    {/* Left feather details */}
    <path d="M36 100 Q22 98 18 108" stroke="white" strokeWidth="1" fill="none" opacity="0.7" />
    <path d="M36 106 Q20 106 16 116" stroke="white" strokeWidth="1" fill="none" opacity="0.7" />
    <path d="M36 112 Q22 114 20 122" stroke="white" strokeWidth="1" fill="none" opacity="0.7" />
    {/* Right wing */}
    <path d="M104 96 Q130 80 132 110 Q130 130 104 120 Q112 110 104 100 Z" fill="white" opacity="0.85" />
    <path d="M104 100 Q122 94 126 116 Q120 128 104 118" fill={color} opacity="0.25" />
    {/* Right feather details */}
    <path d="M104 100 Q118 98 122 108" stroke="white" strokeWidth="1" fill="none" opacity="0.7" />
    <path d="M104 106 Q120 106 124 116" stroke="white" strokeWidth="1" fill="none" opacity="0.7" />
    <path d="M104 112 Q118 114 120 122" stroke="white" strokeWidth="1" fill="none" opacity="0.7" />
    {/* Wing glow halo */}
    <ellipse cx="70" cy="88" rx="38" ry="10" fill={color} opacity="0.08">
      <animate attributeName="opacity" values="0.04;0.14;0.04" dur="3s" repeatCount="indefinite" />
    </ellipse>
  </g>
);

export const BackIcon_RocketJetpack = ({ color = R.Legendary }) => (
  <g data-cosmetic="jetpack_rocket">
    {/* Left tank */}
    <rect x="26" y="88" width="16" height="40" rx="8" fill="#0f172a" stroke={color} strokeWidth="1.5" />
    {/* Right tank */}
    <rect x="98" y="88" width="16" height="40" rx="8" fill="#0f172a" stroke={color} strokeWidth="1.5" />
    {/* Connector bar */}
    <rect x="40" y="96" width="60" height="8" rx="4" fill="#1e293b" stroke={color} strokeWidth="1" />
    {/* Tank stripes */}
    <rect x="27" y="104" width="14" height="3" rx="1" fill={color} opacity="0.6" />
    <rect x="99" y="104" width="14" height="3" rx="1" fill={color} opacity="0.6" />
    {/* Nozzles */}
    <path d="M26 128 Q28 134 22 140 Q30 138 34 128" fill="#374151" stroke={color} strokeWidth="1" />
    <path d="M114 128 Q112 134 118 140 Q110 138 106 128" fill="#374151" stroke={color} strokeWidth="1" />
    {/* Flames from left nozzle */}
    <ellipse cx="27" cy="142" rx="5" ry="8" fill="#f97316" opacity="0.9">
      <animate attributeName="ry" values="6;10;6" dur="0.3s" repeatCount="indefinite" />
    </ellipse>
    <ellipse cx="27" cy="142" rx="3" ry="5" fill="#fbbf24">
      <animate attributeName="ry" values="4;7;4" dur="0.25s" repeatCount="indefinite" />
    </ellipse>
    {/* Flames from right nozzle */}
    <ellipse cx="113" cy="142" rx="5" ry="8" fill="#f97316" opacity="0.9">
      <animate attributeName="ry" values="6;10;6" dur="0.28s" repeatCount="indefinite" />
    </ellipse>
    <ellipse cx="113" cy="142" rx="3" ry="5" fill="#fbbf24">
      <animate attributeName="ry" values="4;7;4" dur="0.22s" repeatCount="indefinite" />
    </ellipse>
    {/* Pressure gauges */}
    <circle cx="34" cy="96" r="4" fill="#0c0a09" stroke={color} strokeWidth="1" />
    <line x1="34" y1="96" x2="36" y2="93" stroke={color} strokeWidth="1" strokeLinecap="round" />
    <circle cx="106" cy="96" r="4" fill="#0c0a09" stroke={color} strokeWidth="1" />
    <line x1="106" y1="96" x2="104" y2="93" stroke={color} strokeWidth="1" strokeLinecap="round" />
  </g>
);

export const BackIcon_MythicCape = ({ color = R.Mythic }) => (
  <g data-cosmetic="cape_mythic">
    {/* Cape behind/sides of body */}
    <path d="M50 84 Q28 100 24 130 Q26 148 50 152 Q70 156 70 148"
      fill={color} opacity="0.35" />
    <path d="M90 84 Q112 100 116 130 Q114 148 90 152 Q70 156 70 148"
      fill={color} opacity="0.35" />
    {/* Cape inner lining left */}
    <path d="M50 84 Q34 100 32 128 Q36 144 50 148"
      fill="#18181b" opacity="0.7" stroke={color} strokeWidth="1" />
    {/* Cape inner lining right */}
    <path d="M90 84 Q106 100 108 128 Q104 144 90 148"
      fill="#18181b" opacity="0.7" stroke={color} strokeWidth="1" />
    {/* Star pattern on cape */}
    {[[30,108],[28,120],[34,132],[112,112],[110,124],[106,136]].map(([x,y],i) => (
      <circle key={i} cx={x} cy={y} r="1.5" fill={color} opacity="0.6" />
    ))}
    {/* Collar clasp */}
    <circle cx="70" cy="86" r="5" fill={color} stroke="#18181b" strokeWidth="1.5" />
    <circle cx="70" cy="86" r="2.5" fill="#18181b" />
    <circle cx="70" cy="86" r="1.2" fill={color}>
      <animate attributeName="opacity" values="0.4;1;0.4" dur="1.5s" repeatCount="indefinite" />
    </circle>
    {/* Flowing edge detail */}
    <path d="M24 132 Q30 140 28 148 Q36 144 38 136"
      fill={color} opacity="0.2" />
    <path d="M116 132 Q110 140 112 148 Q104 144 102 136"
      fill={color} opacity="0.2" />
  </g>
);

// ─── AURA COSMETICS ──────────────────────────────────────────────────────────

export const AuraIcon_Fire = () => (
  <g data-cosmetic="aura_fire">
    {[[-20,0],[-12,-6],[12,-6],[20,0],[0,-8]].map(([ox,oy],i) => (
      <g key={i}>
        <ellipse cx={70+ox} cy={148+oy} rx={4+i%2*2} ry={10+i*2} fill="#f97316" opacity="0.7">
          <animate attributeName="ry" values={`${8+i*2};${14+i*2};${8+i*2}`}
            dur={`${0.3+i*0.08}s`} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.5;0.9;0.5"
            dur={`${0.4+i*0.06}s`} repeatCount="indefinite" />
        </ellipse>
        <ellipse cx={70+ox} cy={146+oy} rx={2+i%2} ry={6+i} fill="#fbbf24" opacity="0.8">
          <animate attributeName="ry" values={`${5+i};${9+i};${5+i}`}
            dur={`${0.25+i*0.07}s`} repeatCount="indefinite" />
        </ellipse>
      </g>
    ))}
    <ellipse cx="70" cy="148" rx="30" ry="6" fill="#f97316" opacity="0.15">
      <animate attributeName="rx" values="26;34;26" dur="0.8s" repeatCount="indefinite" />
    </ellipse>
  </g>
);

export const AuraIcon_Rainbow = () => (
  <g data-cosmetic="aura_rainbow">
    {['#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#8b5cf6','#ec4899'].map((c,i) => (
      <ellipse key={i} cx="70" cy="148" rx={20+i*4} ry={6+i*1.5}
        fill="none" stroke={c} strokeWidth="2" opacity="0.5"
        style={{ filter: `blur(${i*0.5}px)` }} />
    ))}
    <ellipse cx="70" cy="148" rx="48" ry="12" fill="url(#rainbow)" opacity="0.1" />
  </g>
);

export const AuraIcon_Electric = ({ color = R.Legendary }) => (
  <g data-cosmetic="aura_electric">
    {/* Ground arc */}
    <ellipse cx="70" cy="148" rx="34" ry="8" fill={color} opacity="0.1">
      <animate attributeName="opacity" values="0.05;0.2;0.05" dur="0.4s" repeatCount="indefinite" />
    </ellipse>
    {/* Lightning bolts */}
    {[[-20,148],[-8,148],[8,148],[20,148]].map(([x,y],i) => (
      <g key={i}>
        <path d={`M${x+70} ${y-40} L${x+68} ${y-24} L${x+72} ${y-24} L${x+70} ${y}`}
          fill={color} opacity="0.8">
          <animate attributeName="opacity" values="0;1;0"
            dur={`${0.5+i*0.12}s`} begin={`${i*0.1}s`} repeatCount="indefinite" />
        </path>
      </g>
    ))}
    {/* Sparks */}
    {[[52,140],[60,144],[80,144],[88,140],[70,138]].map(([x,y],i) => (
      <circle key={i} cx={x} cy={y} r="2" fill={color} opacity="0.7">
        <animate attributeName="opacity" values="0;1;0"
          dur={`${0.3+i*0.08}s`} begin={`${i*0.06}s`} repeatCount="indefinite" />
      </circle>
    ))}
  </g>
);

export const AuraIcon_Toxic = ({ color = R.Epic }) => (
  <g data-cosmetic="aura_toxic">
    <ellipse cx="70" cy="148" rx="36" ry="8" fill={color} opacity="0.15" />
    {/* Toxic bubbles rising */}
    {[[50,148],[58,144],[70,146],[82,144],[90,148],[62,140],[78,142]].map(([x,y],i) => (
      <circle key={i} cx={x} cy={y} r={2+i%3} fill={color} opacity="0.5">
        <animate attributeName="cy" values={`${y};${y-20};${y}`}
          dur={`${1+i*0.3}s`} begin={`${i*0.2}s`} repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.5;0;0.5"
          dur={`${1+i*0.3}s`} begin={`${i*0.2}s`} repeatCount="indefinite" />
      </circle>
    ))}
    {/* Drip */}
    <ellipse cx="70" cy="148" rx="28" ry="5" fill={color} opacity="0.2" />
  </g>
);

export const AuraIcon_Galaxy = ({ color = R.Mythic }) => (
  <g data-cosmetic="aura_galaxy">
    {/* Spiral galaxy disc */}
    <ellipse cx="70" cy="148" rx="40" ry="10" fill={color} opacity="0.1">
      <animate attributeName="rx" values="36;44;36" dur="3s" repeatCount="indefinite" />
    </ellipse>
    {/* Orbiting stars */}
    {[0,51,102,153,204,255,306].map((deg,i) => {
      const rad = deg * Math.PI / 180;
      const rx = 32, ry = 7;
      const x = 70 + rx * Math.cos(rad);
      const y = 148 + ry * Math.sin(rad);
      return (
        <circle key={i} cx={x} cy={y} r={1.2 + i%2 * 0.8} fill={color} opacity="0.7">
          <animateTransform attributeName="transform" type="rotate"
            from={`${deg} 70 148`} to={`${deg+360} 70 148`}
            dur={`${4+i*0.3}s`} repeatCount="indefinite" />
        </circle>
      );
    })}
    {/* Centre glow */}
    <circle cx="70" cy="148" r="8" fill={color} opacity="0.2">
      <animate attributeName="opacity" values="0.1;0.35;0.1" dur="2s" repeatCount="indefinite" />
    </circle>
    {/* Stardust particles */}
    {[[46,144],[60,152],[80,152],[94,144],[70,142]].map(([x,y],i) => (
      <circle key={i} cx={x} cy={y} r="1" fill="white" opacity="0.6">
        <animate attributeName="opacity" values="0.2;0.9;0.2"
          dur={`${1.2+i*0.4}s`} begin={`${i*0.25}s`} repeatCount="indefinite" />
      </circle>
    ))}
  </g>
);

// ─── COSMETIC LAYER MAP ───────────────────────────────────────────────────────
// Maps cosmetic ID → the SVG component to overlay on the Shiba
export const COSMETIC_LAYERS = {
  // Head — render AFTER body so they sit on top
  cap_basic:       (col) => <HeadIcon_LabCap      color={col} />,
  goggles_lab:     (col) => <HeadIcon_LabGoggles  color={col} />,
  crown_gold:      (col) => <HeadIcon_GoldCrown   color={col} animated />,
  helmet_astro:    (col) => <HeadIcon_AstroHelmet color={col} />,
  crown_mythic:    (col) => <HeadIcon_MythicCrown color={col} />,
  // Face
  glasses_nerd:    (col) => <FaceIcon_NerdGlasses   color={col} />,
  monocle_laser:   (col) => <FaceIcon_LaserMonocle  color={col} />,
  mask_cyber:      (col) => <FaceIcon_CyberMask      color={col} />,
  visor_elite:     (col) => <FaceIcon_EliteVisor     color={col} />,
  // Body — render BEFORE head so head sits on top
  coat_lab:        (col) => <BodyIcon_LabCoat       color={col} />,
  hoodie_doge:     (col) => <BodyIcon_DogeHoodie    color={col} />,
  jacket_cyber:    (col) => <BodyIcon_CyberJacket   color={col} />,
  armor_reactor:   (col) => <BodyIcon_ReactorArmor  color={col} />,
  suit_scientist:  (col) => <BodyIcon_ScientistSuit color={col} />,
  // Neck
  chain_gold:      (col) => <NeckIcon_GoldChain      color={col} />,
  collar_lab:      (col) => <NeckIcon_LabCollar       color={col} />,
  medal_champion:  (col) => <NeckIcon_ChampionMedal  color={col} />,
  // Back — render BEFORE body so body sits in front
  wings_angel:     (col) => <BackIcon_AngelWings     color={col} />,
  jetpack_rocket:  (col) => <BackIcon_RocketJetpack  color={col} />,
  cape_mythic:     (col) => <BackIcon_MythicCape     color={col} />,
  // Aura — render LAST so it floats behind everything
  aura_fire:       ()    => <AuraIcon_Fire />,
  aura_rainbow:    ()    => <AuraIcon_Rainbow />,
  aura_electric:   (col) => <AuraIcon_Electric color={col} />,
  aura_toxic:      (col) => <AuraIcon_Toxic    color={col} />,
  aura_galaxy:     (col) => <AuraIcon_Galaxy   color={col} />,
};

// Render order matters — back → body → neck → face → head → aura
export const RENDER_ORDER = ['back','body','neck','face','head','aura'];

export default COSMETIC_LAYERS;
