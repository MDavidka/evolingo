"use client"

/**
 * These are NOT SVG recreations.
 * The sprite was cut out from the user's uploaded 3 x 3 icon sheet,
 * with transparent backgrounds; columns = task types, rows = states.
 * Original artwork occupies 9 equally sized cells in one WebP sprite.
 */
export type SkillIconKind = "vocabulary" | "conversation" | "essay"
export type SkillIconColor = "gray" | "green" | "blue" | "purple" | "orange"

const columns: Record<SkillIconKind, number> = {
  vocabulary: 0,
  conversation: 50,
  essay: 100,
}
const rows: Record<SkillIconColor, number> = {
  gray: 0,
  green: 50,
  blue: 100,
  purple: 100,
  orange: 100,
}
const labels: Record<SkillIconKind, string> = {
  vocabulary: "Szókártyák",
  conversation: "Beszélgetés",
  essay: "Fogalmazás",
}

export default function SkillIcon({ kind, color, size = 90 }: { kind: SkillIconKind; color: SkillIconColor; size?: number }) {
  return <span
    className="evo-skill-cutout"
    role="img"
    aria-label={labels[kind]}
    style={{
      display: "inline-block",
      flex: "0 0 auto",
      width: size,
      height: size,
      backgroundColor: "transparent",
      backgroundImage: 'url("/images/evoskill-original-cutouts.webp")',
      backgroundSize: "300% 300%",
      backgroundPosition: columns[kind] + "% " + rows[color] + "%",
      backgroundRepeat: "no-repeat",
      imageRendering: "auto",
    }}
  />
}
