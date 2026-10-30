/**
 * Pure, server-owned visual capability router.
 * User and model text can request UI, but can never register new components,
 * enable database actions, or declare unverified data trustworthy.
 */
export type VisualIntent =
  | "text" | "quiz" | "flashcards" | "calculator" | "chart"
  | "comparison" | "grammar" | "timeline" | "planning"

export const VISUAL_CAPABILITIES = Object.freeze([
  "grammar_rule",
  "quiz_choice",
  "vocabulary_flashcard",
  "comparison_table",
  "tense_timeline",
  "study_plan",
  "concept_card",
  "chart_card",
  "study_calculator",
] as const)

const withoutAccents = (value: string) =>
  value.toLocaleLowerCase("hu").normalize("NFD").replace(/[\u0300-\u036f]/g, "")

export function classifyVisualIntent(query: string): VisualIntent {
  const text = withoutAccents(query.trim())
  if (!text || /csak (?:sima |rovid |egyszeru )?(?:szoveg|valasz)|ne (?:hasznalj|mutass|rajzolj) (?:ui|kartya|grafikon|diagram)|only text|no (?:visual|ui|cards)|felulet nelkul/.test(text))
    return "text"
  if (/kerdezz ki|kerj (?:tol|tőlem) valaszt|kviz|quiz|tesztelj|feleletvalaszt|tudasteszt/.test(text))
    return "quiz"
  if (/tanulokartya|szokartya|flashcard|szavakat tanul|szokincs|szotanul|tanits meg.*szot/.test(text))
    return "flashcards"
  if (/kalkulator|naponta.*perc|napi.*perc|heti.*perc|perc.*tanul|perc.*het|tanulasi ido|mennyi.*(?:tanul|ora|perc)|hany perc/.test(text) &&
      /tanul|perc|ora|nap|het/.test(text))
    return "calculator"
  if (/grafikon|diagram|oszlopdiagram|kordiagram|chart|statisztika|trend|adatvizual/.test(text))
    return "chart"
  if (/hasonlitsd|osszehasonl|kulonbseg|a2.*b1|b1.*a2/.test(text))
    return "comparison"
  if (/idovonal|timeline|idoben|kronologia/.test(text))
    return "timeline"
  if (/tervezz|terv|orarend|utemterv|study plan/.test(text))
    return "planning"
  if (/nyelvtan|igeido|present |past |future |grammar|tense|magyarazd|pelda|erasmus/.test(text))
    return "grammar"
  return "text"
}

const hints: Record<VisualIntent, string> = {
  text: "Nem kell vizuális elem. Az egyszerű szöveg a legjobb választás.",
  quiz: "Hozz létre egy helyes megoldású quiz_choice elemet. A megoldást a szerver titkosítja, a kliens nem kaphatja meg a válaszadás előtt.",
  flashcards: "A vocabulary_flashcard komponenst használd 3-8 valódi, pontos szópárral. A kártyaszöveg a tanult nyelven lehet.",
  calculator: "A study_calculator komponenst használd tanulási időhöz, 5-120 közötti napi perccel, 1-7 nappal és 1-12 héttel. A számolást maga az alkalmazás végzi; ne írj futtatható képletet.",
  chart: "Csak a felhasználó által megadott összehasonlítható adatpontokkal készíts chart_card elemet, source: example megjelöléssel. Ha nincs pontos számsor, ne találj ki személyes statisztikát.",
  comparison: "Két fogalomhoz rövid, pontos comparison_table hasznos lehet.",
  grammar: "A grammar_rule vagy concept_card hasznos, de csak ha a próza nem elég.",
  timeline: "A tense_timeline komponenst használd valódi időrendi magyarázathoz.",
  planning: "A study_plan komponenst használd rövid, reálisan megvalósítható napirendhez.",
}

export function getVisualSelectionHint(query: string) {
  return hints[classifyVisualIntent(query)]
}

export function shouldPlanVisuals(query: string) {
  return classifyVisualIntent(query) !== "text"
}
