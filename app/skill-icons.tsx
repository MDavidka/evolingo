"use client"

/**
 * Exact icon artwork cropped from the user's supplied 3×3 image.
 * Each file is an independent, transparent, LOSSLESS WebP.
 * This component never draws an approximation or slices a sprite.
 */
export type SkillIconKind = "vocabulary" | "conversation" | "essay"
export type SkillIconColor = "gray" | "green" | "blue" | "purple" | "orange"

const iconLabels: Record<SkillIconKind, string> = {
  vocabulary: "Szókártyák",
  conversation: "Beszélgetés",
  essay: "Fogalmazás",
}

export default function SkillIcon({
  kind, color, size = 84,
}: {
  kind: SkillIconKind
  color: SkillIconColor
  size?: number
}) {
  const state = color === "gray" ? "gray" : color === "green" ? "green" : "color"
  // Filenames are static mappings, not remote sources or dynamically generated images.
  const paths: Record<SkillIconKind, Record<"gray" | "green" | "color", string>> = {
    vocabulary: {
      gray: "/images/evoskill-cutouts-v3/vocabulary-gray.webp",
      green: "/images/evoskill-cutouts-v3/vocabulary-green.webp",
      color: "/images/evoskill-cutouts-v3/vocabulary-color.webp",
    },
    conversation: {
      gray: "/images/evoskill-cutouts-v3/conversation-gray.webp",
      green: "/images/evoskill-cutouts-v3/conversation-green.webp",
      color: "/images/evoskill-cutouts-v3/conversation-color.webp",
    },
    essay: {
      gray: "/images/evoskill-cutouts-v3/essay-gray.webp",
      green: "/images/evoskill-cutouts-v3/essay-green.webp",
      color: "/images/evoskill-cutouts-v3/essay-color.webp",
    },
  }
  return <img
    className="evo-skill-cutout"
    src={paths[kind][state]}
    width={size}
    height={size}
    alt=""
    title={iconLabels[kind]}
    aria-hidden="true"
    loading="lazy"
    decoding="async"
    draggable={false}
    style={{ display: "block", width: size, height: size, objectFit: "contain", background: "transparent" }}
  />
}
