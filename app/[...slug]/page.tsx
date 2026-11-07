import type { Metadata } from "next"
import { notFound } from "next/navigation"

const titles: Record<string, string> = {
  chat: "AI beszélgetés",
  cowork: "Cowork",
  eszkozok: "Eszközök",
  konyvtar: "Könyvtár",
  utemezes: "Ütemezés",
  profil: "Profil",
  otletborze: "Ötletbörze",
  belepes: "Bejelentkezés",
  regisztracio: "Regisztráció",
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }): Promise<Metadata> {
  const { slug = [] } = await params
  const title = titles[slug[0] || ""] || "Evölingo"
  return {
    title: title + " – Evölingo",
    description: "Evölingo AI-asszisztens – " + title.toLocaleLowerCase("hu-HU") + ".",
  }
}

export default async function RoutePage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug = [] } = await params
  if (slug.length !== 1 || !(slug[0] in titles)) notFound()
  return null
}
