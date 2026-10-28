"use client"

import { useId } from "react"

export type SkillIconKind = "vocabulary" | "conversation" | "essay"
export type SkillIconColor = "gray" | "green" | "blue" | "purple" | "orange"

const palettes: Record<SkillIconColor, { top: string; bottom: string; border: string; shadow: string; detail: string }> = {
  gray: { top: "#f4f4f6", bottom: "#a9aab2", border: "#d9d9e0", shadow: "#777880", detail: "#77777f" },
  green: { top: "#9cfa4e", bottom: "#36cc00", border: "#baff72", shadow: "#228d00", detail: "#ffffff" },
  blue: { top: "#6dd6ff", bottom: "#078ce9", border: "#b0ecff", shadow: "#0876bd", detail: "#ffffff" },
  purple: { top: "#d1a8ff", bottom: "#8153e9", border: "#e2c4ff", shadow: "#6241b1", detail: "#ffffff" },
  orange: { top: "#ffe59a", bottom: "#ff9d00", border: "#fff0c0", shadow: "#d97000", detail: "#ffffff" },
}

/** Transparent layered game icons; no black square or baked-in background. */
export default function SkillIcon({ kind, color, size = 90 }: { kind: SkillIconKind; color: SkillIconColor; size?: number }) {
  const id = useId().replace(/:/g, "")
  const p = palettes[color]
  const fill = "url(#" + id + "-fill)"
  const gloss = "url(#" + id + "-gloss)"
  return <svg width={size} height={size} viewBox="0 0 160 160" fill="none" role="img" aria-label={kind === "vocabulary" ? "Szókártyák" : kind === "conversation" ? "Beszélgetés" : "Fogalmazás"}>
    <defs>
      <linearGradient id={id + "-fill"} x1="45" y1="16" x2="122" y2="150" gradientUnits="userSpaceOnUse">
        <stop stopColor={p.top}/><stop offset="1" stopColor={p.bottom}/>
      </linearGradient>
      <linearGradient id={id + "-gloss"} x1="80" y1="12" x2="80" y2="88" gradientUnits="userSpaceOnUse">
        <stop stopColor="#fff" stopOpacity=".78"/><stop offset="1" stopColor="#fff" stopOpacity=".06"/>
      </linearGradient>
    </defs>
    {kind === "vocabulary" && <>
      <g transform="rotate(-18 72 85)">
        <rect x="21" y="20" width="99" height="124" rx="24" fill={p.shadow}/>
        <rect x="24" y="18" width="99" height="121" rx="23" fill={fill} stroke={p.border} strokeWidth="5"/>
        <path d="M34 46 Q34 27 53 27 H94" stroke="#fff" strokeOpacity=".5" strokeWidth="7" strokeLinecap="round"/>
      </g>
      <g transform="rotate(-7 80 82)">
        <rect x="31" y="12" width="103" height="130" rx="24" fill={p.shadow}/>
        <rect x="33" y="9" width="102" height="126" rx="24" fill={fill} stroke={p.border} strokeWidth="6"/>
        <path d="M44 40 Q44 22 63 22 H112" stroke="#fff" strokeOpacity=".48" strokeWidth="7" strokeLinecap="round"/>
      </g>
      <rect x="44" y="33" width="103" height="120" rx="24" fill={p.shadow}/>
      <rect x="43" y="28" width="103" height="120" rx="24" fill={fill} stroke={p.border} strokeWidth="7"/>
      <path d="M54 61 Q54 39 76 39 H120" stroke={gloss} strokeWidth="9" strokeLinecap="round"/>
      <path d="M74 115 L94 62 L114 115 M81 99 H107" stroke={p.detail} strokeWidth="11" strokeLinecap="round" strokeLinejoin="round"/>
    </>}
    {kind === "conversation" && <>
      <path d="M31 19 C15 31 11 56 22 76 L15 100 L41 92 C62 106 91 98 106 80 C120 62 116 39 101 25 C82 6 49 6 31 19Z" fill={p.shadow} transform="translate(0 6)"/>
      <path d="M31 19 C15 31 11 56 22 76 L15 100 L41 92 C62 106 91 98 106 80 C120 62 116 39 101 25 C82 6 49 6 31 19Z" fill={fill} stroke={p.border} strokeWidth="6"/>
      <path d="M28 40 Q36 19 66 19" stroke={gloss} strokeWidth="8" strokeLinecap="round"/>
      <circle cx="43" cy="54" r="9" fill={p.detail}/><circle cx="66" cy="54" r="9" fill={p.detail}/><circle cx="89" cy="54" r="9" fill={p.detail}/>
      <path d="M88 73 C69 85 65 112 80 129 C92 144 116 146 134 136 L150 143 L147 124 C160 108 151 84 133 75 C119 67 101 67 88 73Z" fill={p.shadow} transform="translate(0 5)"/>
      <path d="M88 73 C69 85 65 112 80 129 C92 144 116 146 134 136 L150 143 L147 124 C160 108 151 84 133 75 C119 67 101 67 88 73Z" fill={fill} stroke={p.border} strokeWidth="6"/>
      <path d="M90 88 Q106 76 127 84" stroke={gloss} strokeWidth="6" strokeLinecap="round"/>
      <circle cx="98" cy="108" r="7" fill={p.detail}/><circle cx="116" cy="108" r="7" fill={p.detail}/><circle cx="134" cy="108" r="7" fill={p.detail}/>
    </>}
    {kind === "essay" && <>
      <rect x="13" y="15" width="134" height="132" rx="27" fill={p.shadow} transform="translate(0 6)"/>
      <rect x="13" y="12" width="134" height="132" rx="27" fill={fill} stroke={p.border} strokeWidth="7"/>
      <path d="M23 42 Q23 24 43 24 H118 Q138 24 138 42 V51 L89 92 Q80 100 71 92 L23 51 Z" fill={gloss}/>
      <path d="M22 47 L70 87 Q80 96 90 87 L138 47" stroke={p.shadow} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M24 118 L62 83 M136 118 L98 83" stroke={p.border} strokeWidth="8" strokeLinecap="round"/>
      <path d="M29 29 Q41 19 59 20 H116" stroke="#fff" strokeOpacity=".7" strokeWidth="7" strokeLinecap="round"/>
    </>}
  </svg>
}
