import type { Metadata } from "next"
import { notFound, permanentRedirect } from "next/navigation"

const titles: Record<string, string> = {
  chat: "AI beszélgetés",
  utvonal: "Tanulási útvonal",
  temak: "Témák",
  lecke: "Lecke",
  gyakorlas: "Gyakorlás",
  szokartyak: "Szókártyák",
  profil: "Profil",
  baratok: "Barátok",
  ranglista: "Ranglista",
  konyvtar: "Könyvtár",
  eszkozok: "Eszközök",
  otletborze: "Ötletbörze",
  belepes: "Bejelentkezés",
  regisztracio: "Regisztráció",
}
const lessonTitles: Record<string, string> = {
  "1": "Present Simple", "2": "Present Continuous", "3": "Past Simple", "4": "Past Continuous",
  "5": "Future Simple", "6": "Future Perfect", "7": "Some and Any", "8": "Much and Many",
  "9": "Comparatives and Superlatives", "10": "Conditionals", "101": "Hard mód", "102": "Időkihívás", "103": "Szóvilág",
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }): Promise<Metadata> {
  const { slug = [] } = await params
  const section = slug[0] ?? "chat"
  const customTitle = section === "lecke" || section === "gyakorlas"
    ? `${lessonTitles[slug[1] ?? ""] ?? `Lecke ${slug[1] ?? ""}`}${section === "gyakorlas" ? " – gyakorlás" : ""}`
    : section === "regisztracio" ? "Regisztráció"
    : titles[section] ?? "Evölingo"
  return {
    title: `${customTitle} – Evölingo`,
    description: `Evölingo – ${customTitle.toLocaleLowerCase("hu-HU")} angoltanulás.`,
  }
}

export default async function RoutePage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug = [] } = await params
  const section = slug[0] ?? ""
  if (section === "bejelentkezes") permanentRedirect("/belepes")
  if (section === "tudasfelmeres") notFound()

  const valid = section === "chat" && slug.length === 1
    || ["utvonal", "otletborze", "profil", "baratok", "ranglista", "konyvtar", "eszkozok", "belepes", "regisztracio", "bolt"].includes(section) && slug.length === 1
    || section === "temak" && (slug.length === 1 || slug.length === 2 && /^\d+$/.test(slug[1]))
    || section === "lecke" && (slug.length === 2 && /^\d+$/.test(slug[1]) || slug.length === 3 && /^\d+$/.test(slug[1]) && slug[2] === "tanulas")
    || section === "gyakorlas" && (slug.length === 2 && /^\d+$/.test(slug[1]) || slug.length === 3 && /^\d+$/.test(slug[1]) && slug[2] === "keszseg")
    || section === "szokartyak" && slug.length === 2 && /^\d+$/.test(slug[1])
  if (!valid) notFound()
  return null
}
