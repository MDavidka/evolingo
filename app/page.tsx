"use client"

import Image from "next/image"
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type PointerEvent as ReactPointerEvent } from "react"
import {
  ArrowRight, BarChart3, Book, BookOpen, Check, CheckCircle2, Headphones, MessageCircle, CircleHelp, Puzzle,
  Flame, Heart, Lightbulb, Medal, RotateCcw, Trophy, UserRound, Dumbbell, Timer, Languages, Volume2,
  X, Zap, LockKeyhole, ClipboardCheck, Star, ShoppingBag, Gift, Palette, Pencil, Settings, ChevronRight, ChevronDown, Plus, GraduationCap, CalendarDays, Sparkles, Target, Search, UserPlus, Users, Link2, Bell, Share2, Contact2, Cloud,
} from "lucide-react"

const foxIcon = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Image-D15751D4-6Ne8AGNrryN8wlvyBepC8VDGQkHTw4.jpeg"
const lessonIllustrations: Record<number, { src: string; alt: string }> = {
  1: { src: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=85", alt: "Kávé és reggeli rutin" },
  2: { src: "https://images.unsplash.com/photo-1590649804407-daf662463c08?auto=format&fit=crop&w=1200&q=85", alt: "Két ember éppen sétál és beszélget" },
  3: { src: "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&w=1200&q=85", alt: "Naptár és jegyzetek a múltbeli eseményekhez" },
  4: { src: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1200&q=85", alt: "Éppen ételt készítő ember a konyhában" },
  5: { src: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1200&q=85", alt: "Városi látkép jövőbeli tervekről szóló leckéhez" },
  6: { src: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=85", alt: "Projekttervezés és munkadokumentumok" },
  7: { src: "https://images.unsplash.com/photo-1583258292688-d0213dc5a3a8?auto=format&fit=crop&w=1200&q=85", alt: "Alma és más gyümölcsök a boltban" },
  8: { src: "https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1200&q=85", alt: "Könyvekkel teli könyvtár" },
  9: { src: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=85", alt: "Különböző magasságú hegycsúcsok" },
  10: { src: "https://images.unsplash.com/photo-1649843787933-a4e0d5313391?auto=format&fit=crop&w=1200&q=85", alt: "Sötét esőfelhők a feltételes mondatok példáihoz" },
}
type Screen = "home" | "lessonIntro" | "task" | "shop" | "leaderboard" | "profile" | "friends"
type DailyStudyState = { streak: number; lastStudyDate: string; todayActivityCount: number; activityDate: string; dailyGoal: number }
type CloudSaveStatus = "loading" | "saving" | "saved" | "local" | "error"
type LocalProgressSnapshot = { version: 1; sessionKey: string; savedAt: number; state: Record<string, unknown> }
const LOCAL_PROGRESS_KEY = "evolingo.user-progress.v1"

function makeLocalGuestName() {
  const adjectives = ["Vidám", "Bátor", "Kíváncsi", "Csendes", "Ügyes", "Fürge", "Derűs", "Bölcs", "Kitartó", "Kreatív", "Barátságos", "Gyors"]
  const animals = ["Róka", "Vidra", "Bagoly", "Mókus", "Panda", "Farkas", "Süni", "Delfin", "Nyuszi", "Koala", "Tigris", "Hód", "Macska", "Sas", "Medve"]
  return adjectives[Math.floor(Math.random() * adjectives.length)] + " " + animals[Math.floor(Math.random() * animals.length)] + " " + (1000 + Math.floor(Math.random() * 9000))
}
function hasLearningProgress(data: Record<string, unknown>) {
  return ["readLessons", "completedLessons", "answeredTasks", "purchasedItems"].some(key => Array.isArray(data[key]) && (data[key] as unknown[]).length > 0) ||
    ["xp", "stars", "dailyStreak", "todayActivityCount"].some(key => typeof data[key] === "number" && (data[key] as number) > 0)
}

function getLocalDateKey(date = new Date()) {
  return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0")
}
function getPreviousLocalDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number)
  return getLocalDateKey(new Date(year, month - 1, day - 1))
}
type Example = { sentence: string; translation: string }
type LessonTextMark = "bold" | "italic" | "underline" | "highlight" | "code" | "muted"
type LessonTextRun = { text: string; marks?: LessonTextMark[] }
type LessonText = string | LessonTextRun[]
type LessonImageLayout = "hero" | "full" | "contained" | "split-image-left" | "split-image-right" | "inline-image-left" | "inline-image-right"
type LessonContentBlock =
  | { type: "paragraph"; text: LessonText; size?: "small" | "normal" | "large"; align?: "left" | "center" | "right" }
  | { type: "heading"; text: LessonText; level?: 3 | 4 }
  | { type: "example"; sentence: LessonText; translation?: LessonText; label?: string; note?: LessonText }
  | { type: "table"; headers?: string[]; rows: string[][]; caption?: string }
  | { type: "callout"; text: LessonText; title?: string; tone?: "neutral" | "tip" | "warning" | "success"; icon?: "lightbulb" | "info" | "check" | "book" }
  | { type: "list"; items: LessonText[]; style?: "bullet" | "numbered" | "check" }
  | { type: "image"; src: string; alt: string; layout?: LessonImageLayout; title?: string; text?: LessonText; caption?: string; aspect?: "wide" | "square" | "portrait" | "natural"; fit?: "cover" | "contain" }
  | { type: "quote"; text: LessonText; attribution?: string }
  | { type: "formula"; value: string; label?: string; explanation?: LessonText }
  | { type: "vocabulary"; items: { term: string; meaning: string; example?: string }[] }
  | { type: "comparison"; left: { title: string; items: string[] }; right: { title: string; items: string[] } }
  | { type: "divider"; label?: string }
type LessonSection = { title: string; body?: string; blocks?: LessonContentBlock[]; rows?: [string, string][]; examples?: Example[]; tip?: string }
type Question = {
  type: "choice" | "text" | "arrange"
  instruction: string
  prompt: string
  options?: string[]
  answer: string
  accepted?: string[]
  words?: string[]
  explanation: string
  tip: string
}
type LessonUnit = { id: number; title: string; summary: string; sections: LessonSection[]; questions: Question[]; level: string; specialType?: "hard" | "timed" | "words" }

type LearningPathKind = "lesson" | "task" | "words" | "hard" | "test"
type LearningPathNode = { key: string; kind: LearningPathKind; lessonId: number; specialId?: number; templateId?: number }

function seededPathValue(seed: number) {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453
  return value - Math.floor(value)
}

function createLearningPathNodes(lessonUnits: LessonUnit[]): LearningPathNode[] {
  const activityKinds: LearningPathKind[] = ["task", "words", "hard", "test"]
  const requiredFirstActivity: LearningPathKind[] = ["task", "words", "hard", "test"]
  const templateIds: Partial<Record<LearningPathKind, number>> = { hard: 101, test: 102, words: 103 }
  const nodes: LearningPathNode[] = []

  lessonUnits.forEach((lesson, lessonIndex) => {
    nodes.push({ key: "lesson-" + lesson.id, kind: "lesson", lessonId: lesson.id })

    // Each lesson gets one to three separate activity stops. Activity types can repeat,
    // so a lesson may have several Tasks or a single Hard Task, for example.
    const activityCount = 1 + Math.floor(seededPathValue(lesson.id * 911 + lessonIndex * 37 + 5) * 3)
    const activities: LearningPathKind[] = []

    // Make all four activity types appear as actual path nodes near the beginning.
    if (lessonIndex < requiredFirstActivity.length) {
      activities.push(requiredFirstActivity[lessonIndex])
    }

    while (activities.length < activityCount) {
      const pick = Math.floor(seededPathValue(lesson.id * 97 + activities.length * 131 + lessonIndex * 17 + 19) * activityKinds.length)
      activities.push(activityKinds[pick])
    }

    activities.forEach((kind, activityIndex) => {
      const uniqueId = 1000 + lesson.id * 100 + activityIndex
      nodes.push({
        key: kind + "-" + lesson.id + "-" + activityIndex,
        kind,
        lessonId: lesson.id,
        ...(templateIds[kind] ? { specialId: uniqueId, templateId: templateIds[kind] } : {}),
      })
    })
  })

  return nodes
}
const lessons: LessonUnit[] = [
  {
    id: 1, title: "Present Simple", level: "A1", summary: "Szokások, napi rutinok és általános tények leírása.",
    sections: [
      { title: "Mikor használjuk?", body: "A Present Simple-t rendszeresen ismétlődő cselekvésekhez, szokásokhoz és általános igazságokhoz használjuk.", examples: [{ sentence: "I play football every Saturday.", translation: "Minden szombaton focizom." }, { sentence: "Water boils at 100°C.", translation: "A víz 100 °C-on forr." }] },
      { title: "Állító mondatok", body: "Az I, you, we és they után az ige alapformája áll. He, she és it esetén az igéhez általában -s vagy -es végződés kerül.", rows: [["I / You / We / They", "play"], ["He / She / It", "plays"]], examples: [{ sentence: "She likes music.", translation: "Szereti a zenét." }, { sentence: "Tom watches TV after dinner.", translation: "Tom vacsora után tévét néz." }], tip: "Ha az alany he, she vagy it, ellenőrizd az ige végződését!" },
      { title: "Tagadás és kérdés", body: "Tagadásnál don't vagy doesn't segédigét használunk. Kérdésnél a Do vagy Does kerül a mondat elejére. A segédige után az ige alapformában marad.", rows: [["Tagadás", "don't / doesn't + alapige"], ["Kérdés", "Do / Does + alany + alapige?"]], examples: [{ sentence: "He doesn't eat meat.", translation: "Nem eszik húst." }, { sentence: "Do you like pizza?", translation: "Szereted a pizzát?" }], tip: "Helyesen: She doesn't like it. Nem: She doesn't likes it." },
      { title: "Gyakori időhatározók", body: "Az always, usually, often, sometimes, never és every day gyakran fordul elő Present Simple-ben.", examples: [{ sentence: "I usually get up at seven.", translation: "Általában hétkor kelek." }] },
    ],
    questions: [
      { type: "choice", instruction: "Válaszd ki a helyes alakot", prompt: "My sister _____ coffee every morning.", options: ["drink", "drinks", "is drinking", "drinking"], answer: "drinks", explanation: "A my sister jelentése she, ezért az igéhez -s végződés kell.", tip: "He / She / It → ige + s" },
      { type: "text", instruction: "Egészítsd ki a mondatot", prompt: "I _____ breakfast at 7 a.m.", answer: "eat", accepted: ["have"], explanation: "Az I után az ige alapformáját használjuk.", tip: "I / You / We / They → alapige" },
      { type: "arrange", instruction: "Rakd helyes sorrendbe a szavakat", prompt: "Ő általában gyalog jár iskolába.", words: ["school.", "usually", "walks", "He", "to"], answer: "He usually walks to school.", explanation: "A sorrend: alany + gyakoriságot jelölő szó + ige + a mondat többi része.", tip: "He usually walks… — a usually az ige előtt áll." },
      { type: "choice", instruction: "Melyik mondat helyes?", prompt: "Válaszd ki a helyes mondatot.", options: ["She like music.", "She likes music.", "She liking music.", "She is like music."], answer: "She likes music.", explanation: "A she egyes szám harmadik személy, ezért a like alakja likes.", tip: "Figyeld meg, ki végzi a cselekvést." },
    ],
  },
  {
    id: 2, title: "Present Continuous", level: "A1", summary: "Éppen most zajló cselekvések és átmeneti helyzetek.",
    sections: [
      { title: "Mikor használjuk?", body: "A Present Continuous olyan cselekvést ír le, amely éppen most történik, vagy csak átmenetileg igaz.", examples: [{ sentence: "I am reading now.", translation: "Most éppen olvasok." }, { sentence: "She is staying with her aunt this week.", translation: "Ezen a héten a nagynénjénél lakik." }] },
      { title: "A mondat szerkezete", body: "A szerkezet: alany + am / is / are + ige -ing alakja.", rows: [["I", "am working"], ["He / She / It", "is working"], ["You / We / They", "are working"]], examples: [{ sentence: "They are playing outside.", translation: "Kint játszanak." }], tip: "Ne hagyd ki a létigét: I am studying." },
      { title: "Helyesírás -ing előtt", body: "A legtöbb igéhez -ing kerül. A néma -e általában kiesik (make → making), és egyes rövid igéknél a végső mássalhangzó megkettőződik (run → running).", examples: [{ sentence: "He is making a cake.", translation: "Éppen süteményt készít." }, { sentence: "I am running.", translation: "Éppen futok." }] },
    ],
    questions: [
      { type: "choice", instruction: "Válaszd ki a megfelelő alakot", prompt: "Look! The dog _____ in the garden.", options: ["runs", "is running", "run", "running"], answer: "is running", explanation: "A Look! jelzi, hogy a cselekvés éppen most történik.", tip: "Most történik → am / is / are + -ing" },
      { type: "text", instruction: "Írd be a hiányzó segédigét", prompt: "They _____ watching a film now.", answer: "are", explanation: "A they alanyhoz az are tartozik.", tip: "They are…" },
      { type: "arrange", instruction: "Rakd össze a mondatot", prompt: "Éppen vacsorát készítünk.", words: ["dinner.", "making", "are", "We"], answer: "We are making dinner.", explanation: "A we után are áll, majd a making igealak következik.", tip: "Alany + are + ige-ing" },
      { type: "choice", instruction: "Válaszd ki a helyes mondatot", prompt: "Which sentence is correct?", options: ["He is make lunch.", "He making lunch.", "He is making lunch.", "He are making lunch."], answer: "He is making lunch.", explanation: "A he alanyhoz is kell, és a make alakja making lesz.", tip: "He / She / It → is + -ing" },
    ],
  },
  {
    id: 3, title: "Past Simple", level: "A1–A2", summary: "Lezárult múltbeli események és időpontok.",
    sections: [
      { title: "Mikor használjuk?", body: "A Past Simple olyan eseményről szól, amely a múltban történt és lezárult. Gyakori időjelölők: yesterday, last week, two days ago.", examples: [{ sentence: "We visited grandma yesterday.", translation: "Tegnap meglátogattuk a nagymamát." }] },
      { title: "Szabályos és rendhagyó igék", body: "A szabályos igék általában -ed végződést kapnak. A rendhagyó igék alakját külön meg kell tanulni.", rows: [["play → played", "játszott"], ["visit → visited", "meglátogatott"], ["go → went", "ment"], ["see → saw", "látott"]], examples: [{ sentence: "She went home early.", translation: "Korán hazament." }] },
      { title: "Tagadás és kérdés", body: "A did not / didn't után alapige áll. Kérdésben a Did kerül az alany elé, az ige szintén alapformájú.", examples: [{ sentence: "I didn't watch TV.", translation: "Nem néztem tévét." }, { sentence: "Did you call me?", translation: "Felhívtál?" }], tip: "Helyes: Did she go? Nem: Did she went?" },
    ],
    questions: [
      { type: "choice", instruction: "Válaszd ki a múlt idejű alakot", prompt: "Yesterday, we _____ football.", options: ["play", "played", "plays", "playing"], answer: "played", explanation: "A yesterday múltbeli időpontot jelöl, a szabályos play alakja played.", tip: "Szabályos ige → általában -ed" },
      { type: "text", instruction: "Egészítsd ki", prompt: "Last year, I _____ to London.", answer: "went", explanation: "A go rendhagyó múlt idejű alakja went.", tip: "go → went" },
      { type: "arrange", instruction: "Állítsd össze a kérdést", prompt: "Tegnap láttad a filmet?", words: ["the film?", "Did", "you", "see"], answer: "Did you see the film?", explanation: "A Did után az alany és az alapige következik.", tip: "Did + alany + alapige?" },
      { type: "choice", instruction: "Melyik mondat helyes?", prompt: "Válaszd ki a helyes múlt idejű tagadást.", options: ["He didn't went.", "He doesn't went.", "He didn't go.", "He not go."], answer: "He didn't go.", explanation: "A didn't után a go alapformája áll.", tip: "didn't + alapige" },
    ],
  },
  {
    id: 4, title: "Past Continuous", level: "A2", summary: "A múlt egy adott pillanatában éppen folyamatban lévő cselekvések.",
    sections: [
      { title: "Mikor használjuk?", body: "A Past Continuous azt mutatja meg, hogy valami egy múltbeli pillanatban éppen zajlott. Gyakran egy rövidebb esemény szakítja félbe.", examples: [{ sentence: "I was sleeping at ten.", translation: "Tíz órakor éppen aludtam." }, { sentence: "I was reading when he called.", translation: "Olvastam, amikor felhívott." }] },
      { title: "Szerkezet", body: "Alany + was / were + ige -ing alakja.", rows: [["I / He / She / It", "was reading"], ["You / We / They", "were reading"]], tip: "Az egyes szám első és harmadik személyhez was, a többiekhez were tartozik." },
      { title: "When és while", body: "A while gyakran a folyamatban lévő cselekvést vezeti be. A when sokszor a közben bekövetkező esemény előtt áll.", examples: [{ sentence: "While I was cooking, he arrived.", translation: "Miközben főztem, megérkezett." }] },
    ],
    questions: [
      { type: "choice", instruction: "Válaszd ki a megfelelő alakot", prompt: "At 8 p.m. yesterday, I _____ a book.", options: ["read", "was reading", "were reading", "am reading"], answer: "was reading", explanation: "Az at 8 p.m. yesterday egy múltbeli pillanatot jelöl.", tip: "was / were + ige-ing" },
      { type: "text", instruction: "Írd be a hiányzó szót", prompt: "They _____ playing when it started to rain.", answer: "were", explanation: "A they alanyhoz were tartozik.", tip: "They were…" },
      { type: "arrange", instruction: "Rakd össze a mondatot", prompt: "Éppen főztem, amikor megérkeztél.", words: ["you", "arrived.", "was", "I", "cooking", "when"], answer: "I was cooking when you arrived.", explanation: "A hosszabb folyamat: I was cooking; a rövidebb esemény: you arrived.", tip: "Folyamatban lévő múlt + when + lezárt esemény" },
      { type: "choice", instruction: "Válaszd ki a helyes mondatot", prompt: "Which is correct?", options: ["They was working.", "They were working.", "They are working yesterday.", "They were work."], answer: "They were working.", explanation: "A they alanyhoz were és -ing alak tartozik.", tip: "They / we / you → were" },
    ],
  },
  {
    id: 5, title: "Future Simple", level: "A2", summary: "Jövőbeli döntések, ígéretek és jóslatok a will segítségével.",
    sections: [
      { title: "Mikor használjuk?", body: "A will gyakori hirtelen döntéseknél, ígéreteknél, felajánlásoknál és véleményen alapuló jóslatoknál.", examples: [{ sentence: "I'll help you.", translation: "Segítek neked." }, { sentence: "I think it will rain.", translation: "Azt hiszem, esni fog." }] },
      { title: "Szerkezet", body: "Állító mondatban alany + will + alapige. A will minden alannyal ugyanaz marad.", rows: [["Állítás", "She will come."], ["Tagadás", "She won't come."], ["Kérdés", "Will she come?"]], tip: "A will után nem teszünk -s vagy -ed végződést." },
      { title: "Will vagy going to?", body: "A will gyakran azonnali döntés vagy jóslat. A going to inkább előre eltervezett szándékot vagy látható bizonyítékból levont következtetést jelöl.", examples: [{ sentence: "I'll answer the phone.", translation: "Felveszem a telefont. (Most döntöttem.)" }, { sentence: "Look at those clouds! It's going to rain.", translation: "Nézd a felhőket! Esni fog." }] },
    ],
    questions: [
      { type: "choice", instruction: "Válaszd ki a jövő idejű alakot", prompt: "I think you _____ the test.", options: ["pass", "passed", "will pass", "will passed"], answer: "will pass", explanation: "A will után az ige alapformája, a pass áll.", tip: "will + alapige" },
      { type: "text", instruction: "Egészítsd ki", prompt: "Don't worry. I _____ help you.", answer: "will", explanation: "A will segít jövőbeli ígéret kifejezésében.", tip: "I will help you." },
      { type: "arrange", instruction: "Állítsd össze a mondatot", prompt: "Holnap felhívlak.", words: ["tomorrow.", "will", "call", "I", "you"], answer: "I will call you tomorrow.", explanation: "Alany + will + alapige + tárgy + időhatározó.", tip: "A will után call áll, nem called." },
      { type: "choice", instruction: "Melyik kérdés helyes?", prompt: "Ask about the future.", options: ["Will they come?", "Do they will come?", "Will they came?", "They will come?"], answer: "Will they come?", explanation: "Kérdésben a will kerül az alany elé, utána alapige jön.", tip: "Will + alany + alapige?" },
    ],
  },
  {
    id: 6, title: "Future Perfect", level: "B1", summary: "Egy jövőbeli időpontig befejeződő cselekvések.",
    sections: [
      { title: "Jelentés", body: "A Future Perfect azt fejezi ki, hogy egy cselekvés egy megadott jövőbeli időpont előtt vagy addigra befejeződik.", examples: [{ sentence: "By Friday, I will have finished the project.", translation: "Péntekre befejezem a projektet." }] },
      { title: "Szerkezet", body: "Alany + will have + az ige harmadik alakja (past participle). Minden alannyal ugyanaz a szerkezet.", rows: [["Állítás", "will have finished"], ["Tagadás", "won't have finished"], ["Kérdés", "Will you have finished?"]], examples: [{ sentence: "She will have left by noon.", translation: "Délre már elmegy." }] },
      { title: "Időjelölők", body: "Gyakori a by, by the time, before és by next year. Ezek a határidőt vagy a jövőbeli viszonyítási pontot jelölik.", examples: [{ sentence: "By 2030, they will have built the bridge.", translation: "2030-ra megépítik a hidat." }], tip: "A will have után a befejezett melléknévi igenév alakja áll: done, seen, written." },
    ],
    questions: [
      { type: "choice", instruction: "Válaszd ki a helyes szerkezetet", prompt: "By 6 p.m., she _____ her work.", options: ["will finish", "will have finished", "has finished", "will finished"], answer: "will have finished", explanation: "A Future Perfect szerkezete will have + past participle.", tip: "will have + ige harmadik alakja" },
      { type: "text", instruction: "Írd be a hiányzó segédigét", prompt: "By Monday, we will _____ completed the task.", answer: "have", explanation: "A Future Perfect szerkezetéhez a will után have kell.", tip: "will have completed" },
      { type: "arrange", instruction: "Rakd sorrendbe", prompt: "Délre befejezem a munkát.", words: ["noon.", "have", "finished", "will", "I", "by"], answer: "I will have finished by noon.", explanation: "Alany + will have + finished + határidő.", tip: "A by noon jelzi, hogy addigra kész lesz." },
      { type: "choice", instruction: "Melyik mondat helyes?", prompt: "Choose the correct form.", options: ["He will has left.", "He will have leave.", "He will have left.", "He has will left."], answer: "He will have left.", explanation: "A will have után a leave rendhagyó harmadik alakja, left áll.", tip: "leave → left → left" },
    ],
  },
  {
    id: 7, title: "Some and Any", level: "A2", summary: "Mennyiségek és határozatlan mennyiségű dolgok kifejezése.",
    sections: [
      { title: "Some", body: "A some leginkább állító mondatokban használatos megszámlálható többes számú vagy megszámlálhatatlan főnevekkel.", examples: [{ sentence: "There are some apples.", translation: "Van néhány alma." }, { sentence: "I'd like some water.", translation: "Kérek egy kis vizet." }] },
      { title: "Any", body: "Az any gyakran kérdésekben és tagadó mondatokban fordul elő.", examples: [{ sentence: "Are there any apples?", translation: "Van alma?" }, { sentence: "We don't have any milk.", translation: "Nincs tejünk." }] },
      { title: "Ajánlatok és kérések", body: "Kérésekben és felajánlásokban a some szintén gyakori, ha pozitív választ várunk vagy udvariasan kínálunk valamit.", examples: [{ sentence: "Would you like some tea?", translation: "Kérsz teát?" }], tip: "Some = gyakran állítás / kínálás; any = gyakran kérdés / tagadás." },
    ],
    questions: [
      { type: "choice", instruction: "Válaszd ki a helyes szót", prompt: "There are _____ books on the table.", options: ["any", "some", "much", "a"], answer: "some", explanation: "Állító mondatban általában some szerepel.", tip: "Állító mondat → gyakran some" },
      { type: "text", instruction: "Írd be a hiányzó szót", prompt: "We don't have _____ bread.", answer: "any", explanation: "Tagadásban általában any-t használunk.", tip: "don't have any…" },
      { type: "arrange", instruction: "Rakd össze a kérdést", prompt: "Van egy kis teád?", words: ["tea?", "you", "Do", "have", "any"], answer: "Do you have any tea?", explanation: "Kérdésben a Do + alany + ige + any + főnév szerkezetet használjuk.", tip: "Do you have any…?" },
      { type: "choice", instruction: "Válaszd ki a természetes ajánlatot", prompt: "You are offering a drink.", options: ["Would you like any tea?", "Would you like some tea?", "Would you like many tea?", "Would like some teas you?"], answer: "Would you like some tea?", explanation: "Udvarias kínálásban természetes a some.", tip: "Ajánlat vagy kérés → gyakran some" },
    ],
  },
  {
    id: 8, title: "Much and Many", level: "A2", summary: "Megszámlálható és megszámlálhatatlan főnevek mennyisége.",
    sections: [
      { title: "Many", body: "A many megszámlálható, többes számú főnevekkel áll.", examples: [{ sentence: "How many books have you got?", translation: "Hány könyved van?" }] },
      { title: "Much", body: "A much megszámlálhatatlan főnevekkel használatos, például water, time, money vagy milk.", examples: [{ sentence: "How much water do you drink?", translation: "Mennyi vizet iszol?" }] },
      { title: "Állításokban", body: "A much és many gyakoribb kérdésben és tagadásban. Állító mondatokban a lot of mindkét főnévtípussal természetes lehet.", rows: [["many", "many cars"], ["much", "much time"], ["a lot of", "a lot of cars / water"]], tip: "Tedd fel a kérdést: meg tudom számolni darabonként? Igen → many; nem → much." },
    ],
    questions: [
      { type: "choice", instruction: "Válaszd ki a megfelelő szót", prompt: "How _____ apples do we need?", options: ["much", "many", "any", "some"], answer: "many", explanation: "Az apples megszámlálható többes szám, ezért many kell.", tip: "many + megszámlálható főnév" },
      { type: "text", instruction: "Egészítsd ki", prompt: "How _____ time do we have?", answer: "much", explanation: "A time megszámlálhatatlan főnév, ezért much használatos.", tip: "much + megszámlálhatatlan főnév" },
      { type: "arrange", instruction: "Rakd sorrendbe a kérdést", prompt: "Mennyi pénzed van?", words: ["money?", "much", "you", "How", "do", "have"], answer: "How much money do you have?", explanation: "How much + főnév + do + alany + ige.", tip: "How much money…?" },
      { type: "choice", instruction: "Válaszd ki a helyes mondatot", prompt: "Which sentence is correct?", options: ["There are much cars.", "We don't have many time.", "There isn't much milk.", "How many sugar?"], answer: "There isn't much milk.", explanation: "A milk megszámlálhatatlan, ezért much illik hozzá.", tip: "milk → much" },
    ],
  },
  {
    id: 9, title: "Comparatives and Superlatives", level: "A2", summary: "Összehasonlítás: két dolog és egy csoport kiemelkedő tagja.",
    sections: [
      { title: "Középfok", body: "Rövid mellékneveknél általában -er kerül a végére. Hosszabb mellékneveknél a more + melléknév szerkezetet használjuk.", examples: [{ sentence: "My bike is faster than yours.", translation: "A biciklim gyorsabb, mint a tiéd." }, { sentence: "This book is more interesting.", translation: "Ez a könyv érdekesebb." }] },
      { title: "Felsőfok", body: "Rövid mellékneveknél -est, hosszabbaknál the most + melléknév használatos. A felsőfok előtt általában the áll.", rows: [["fast", "faster — the fastest"], ["interesting", "more interesting — the most interesting"], ["good", "better — the best"]], tip: "A good rendhagyó alakjai: good – better – the best." },
      { title: "A than használata", body: "Két dolgot összehasonlítva a középfok után gyakran than következik.", examples: [{ sentence: "Anna is taller than Ben.", translation: "Anna magasabb Bennél." }] },
    ],
    questions: [
      { type: "choice", instruction: "Válaszd ki a helyes középfokot", prompt: "A train is _____ than a bike.", options: ["fast", "faster", "fastest", "more fast"], answer: "faster", explanation: "A fast rövid melléknév, középfoka faster.", tip: "Rövid melléknév → általában -er" },
      { type: "text", instruction: "Írd be a hiányzó szót", prompt: "This is the _____ (good) day of my life.", answer: "best", explanation: "A good felsőfoka the best.", tip: "good → better → the best" },
      { type: "arrange", instruction: "Rakd össze a mondatot", prompt: "Ez a feladat nehezebb, mint az előző.", words: ["than", "harder", "This", "the", "is", "last."], answer: "This is harder than the last.", explanation: "Alany + létige + középfok + than + összehasonlított dolog.", tip: "hard → harder" },
      { type: "choice", instruction: "Válaszd ki a helyes felsőfokot", prompt: "This is _____ building in town.", options: ["the tallest", "taller", "the most tall", "tallest"], answer: "the tallest", explanation: "A tall rövid melléknév; felsőfoka the tallest.", tip: "Rövid melléknév → the + -est" },
    ],
  },
  {
    id: 10, title: "Conditionals", level: "B1", summary: "Feltételes mondatok: valószínű jövőbeli helyzetek.",
    sections: [
      { title: "First Conditional", body: "A First Conditional reális vagy lehetséges jövőbeli feltételről és annak következményéről szól.", examples: [{ sentence: "If it rains, we'll stay home.", translation: "Ha esik, otthon maradunk." }] },
      { title: "Szerkezet", body: "If + Present Simple, will + alapige. Az if-es mellékmondatban általában nem használunk will-t.", rows: [["Feltétel", "If + Present Simple"], ["Eredmény", "will + alapige"]], examples: [{ sentence: "If you study, you will pass.", translation: "Ha tanulsz, át fogsz menni." }], tip: "Helyesen: If it rains, we will stay. Nem: If it will rain…" },
      { title: "A sorrend változhat", body: "Az if-es rész állhat a mondat elején vagy a végén. Ha az if-es rész kerül előre, általában vessző választja el a főmondattól.", examples: [{ sentence: "We'll go out if the weather is nice.", translation: "Elmegyünk, ha szép lesz az idő." }] },
    ],
    questions: [
      { type: "choice", instruction: "Válaszd ki a helyes alakot", prompt: "If it _____, we'll stay at home.", options: ["will rain", "rains", "rain", "rained"], answer: "rains", explanation: "Az if-es részben Present Simple áll, nem will.", tip: "If + Present Simple" },
      { type: "text", instruction: "Egészítsd ki", prompt: "If you study, you _____ pass the test.", answer: "will", explanation: "A következményt a főmondatban will + alapige fejezi ki.", tip: "will + alapige" },
      { type: "arrange", instruction: "Állítsd össze a mondatot", prompt: "Ha sietsz, eléred a buszt.", words: ["the bus.", "catch", "you", "will", "you", "If", "hurry,"], answer: "If you hurry, you will catch the bus.", explanation: "If + alany + Present Simple, majd will + alapige.", tip: "Az if-es részben ne használj will-t." },
      { type: "choice", instruction: "Melyik mondat helyes?", prompt: "Choose the correct First Conditional.", options: ["If she will call, I answer.", "If she calls, I'll answer.", "If she called, I'll answer.", "If she call, I will answered."], answer: "If she calls, I'll answer.", explanation: "If + Present Simple, a főmondatban will + alapige.", tip: "calls + will answer" },
    ],
  },
]

const specialTasks: LessonUnit[] = [
  { id: 101, title: "Hard mód", level: "Kihívás", summary: "Nehezebb, összetettebb kérdések.", specialType: "hard", sections: [], questions: [
    { type: "choice", instruction: "Hard mód · Nyelvtan", prompt: "If I _____ enough time, I would have helped you.", options: ["had", "have", "would have", "had had"], answer: "had had", explanation: "Harmadik feltételes szerkezet: If + past perfect, would have + past participle.", tip: "If I had had…, I would have helped…" },
    { type: "text", instruction: "Hard mód · Egészítsd ki", prompt: "Neither of the answers _____ correct.", answer: "is", explanation: "A neither of szerkezethez formális angolban gyakran egyes számú ige tartozik.", tip: "Neither of + többes számú főnév + egyes számú ige." },
    { type: "choice", instruction: "Hard mód · Válaszd ki", prompt: "By the time we arrived, the film _____.", options: ["already started", "had already started", "has already started", "was already start"], answer: "had already started", explanation: "A korábban befejeződött múltbeli eseményhez Past Perfectet használunk.", tip: "A korábbi esemény: had + ige harmadik alakja." }
  ] },
  { id: 102, title: "Időkihívás", level: "Időre", summary: "Válaszolj 30 másodperc alatt!", specialType: "timed", sections: [], questions: [
    { type: "choice", instruction: "Időkihívás", prompt: "She _____ to school every day.", options: ["go", "goes", "going", "is go"], answer: "goes", explanation: "He / she / it esetén az ige -s végződést kap.", tip: "She goes." },
    { type: "choice", instruction: "Időkihívás", prompt: "They _____ dinner right now.", options: ["have", "has", "are having", "having"], answer: "are having", explanation: "A right now jelenleg zajló cselekvést jelez.", tip: "Present Continuous: am / is / are + -ing." },
    { type: "choice", instruction: "Időkihívás", prompt: "Yesterday, he _____ his keys.", options: ["loses", "lose", "lost", "has lose"], answer: "lost", explanation: "A yesterday múlt időt jelez; a lose rendhagyó alakja lost.", tip: "lose → lost." },
    { type: "choice", instruction: "Időkihívás", prompt: "I _____ call you tomorrow.", options: ["will", "am", "did", "was"], answer: "will", explanation: "A will jövőbeli szándékot vagy előrejelzést fejezhet ki.", tip: "will + alapige." }
  ] },
  { id: 103, title: "Szóvilág", level: "Szókincs", summary: "Tanulj angol szavakat és jelentéseket.", specialType: "words", sections: [], questions: [
    { type: "choice", instruction: "Szóvilág · Szókincs", prompt: "Mit jelent magyarul: careful?", options: ["óvatos", "hangos", "éhes", "fáradt"], answer: "óvatos", explanation: "Careful = óvatos, körültekintő.", tip: "Be careful! = Légy óvatos!" },
    { type: "choice", instruction: "Szóvilág · Szókincs", prompt: "Mi az angol megfelelője: környezet?", options: ["appointment", "environment", "achievement", "development"], answer: "environment", explanation: "Environment = környezet.", tip: "environmental = környezeti." },
    { type: "choice", instruction: "Szóvilág · Szókincs", prompt: "Mit jelent: improve?", options: ["elfelejt", "javít / fejlődik", "kölcsönkér", "megérkezik"], answer: "javít / fejlődik", explanation: "Improve = javítani, fejlődni.", tip: "I want to improve my English." },
    { type: "choice", instruction: "Szóvilág · Szókincs", prompt: "Válaszd ki: usually", options: ["ritkán", "általában", "soha", "azonnal"], answer: "általában", explanation: "Usually = általában, rendszerint.", tip: "I usually get up at seven." }
  ] }
]

type CurriculumTopic = { title: string; summary: string; prompt: string; options: string[]; answer: string; explanation: string; tip: string }
const curriculumTopics: CurriculumTopic[] = [
{title:"Present Perfect Simple",summary:"Múltbeli esemény, amely kapcsolódik a jelenhez.",prompt:"I _____ finished my homework.",options:["have","has","did","am"],answer:"have",explanation:"I/you/we/they mellett have áll.",tip:"have/has + past participle"},
{title:"Present Perfect Continuous",summary:"A múltban kezdődött és mostanáig tartó cselekvés.",prompt:"She has been _____ for two hours.",options:["study","studied","studying","studies"],answer:"studying",explanation:"A szerkezet: has/have been + -ing.",tip:"has been studying"},
{title:"Past Perfect Simple",summary:"Egy másik múltbeli esemény előtt befejeződött cselekvés.",prompt:"They _____ left before I arrived.",options:["have","had","were","did"],answer:"had",explanation:"Past Perfect: had + past participle.",tip:"had left"},
{title:"Future Continuous",summary:"Egy jövőbeli időpontban éppen zajló cselekvés.",prompt:"At 8 tomorrow, I _____ be studying.",options:["will","am","have","did"],answer:"will",explanation:"Future Continuous: will be + -ing.",tip:"will be studying"},
{title:"Future Perfect Simple",summary:"Egy jövőbeli időpontig befejeződő cselekvés.",prompt:"By Friday, we will have _____ the project.",options:["finish","finished","finishing","finishes"],answer:"finished",explanation:"A will have után a past participle áll.",tip:"will have finished"},
{title:"Be going to",summary:"Előre eltervezett jövő vagy jelenlegi bizonyítékon alapuló jóslat.",prompt:"Look at those clouds! It _____ rain.",options:["is going to","will be","did","has"],answer:"is going to",explanation:"Látható bizonyíték alapján going to-t használunk.",tip:"am/is/are going to + alapige"},
{title:"Much / Many",summary:"Mennyiségek megszámlálhatatlan és megszámlálható főnevekkel.",prompt:"How _____ apples do we need?",options:["much","many","little","any"],answer:"many",explanation:"Az apples megszámlálható többes szám.",tip:"many + megszámlálható főnév"},
{title:"A few / A little",summary:"Néhány darab és egy kevés mennyiség kifejezése.",prompt:"There is _____ milk left.",options:["a few","a little","many","few"],answer:"a little",explanation:"A milk megszámlálhatatlan főnév.",tip:"a little + megszámlálhatatlan"},
{title:"Few / Little",summary:"Kevés, a vártnál kisebb mennyiség.",prompt:"We have very _____ time.",options:["few","little","many","several"],answer:"little",explanation:"A time ebben az értelemben megszámlálhatatlan.",tip:"little time"},
{title:"A lot of / Lots of",summary:"Sok – megszámlálható és megszámlálhatatlan főnevekkel.",prompt:"She has _____ friends.",options:["a lot of","much of","a little","few of"],answer:"a lot of",explanation:"Az a lot of mindkét főnévtípussal használható.",tip:"a lot of friends"},
{title:"Enough",summary:"Elegendő mennyiség vagy mérték.",prompt:"We have _____ chairs for everyone.",options:["enough","too","many of","little"],answer:"enough",explanation:"Az enough főnév előtt állhat.",tip:"enough + főnév"},
{title:"Too much / Too many",summary:"A szükségesnél nagyobb mennyiség.",prompt:"There are _____ people in this room.",options:["too much","too many","enough","a little"],answer:"too many",explanation:"A people megszámlálható többes szám.",tip:"too many people"},
{title:"Countable and Uncountable Nouns",summary:"Megszámlálható és megszámlálhatatlan főnevek.",prompt:"Which noun is uncountable?",options:["apple","chair","information","book"],answer:"information",explanation:"Az information angolul megszámlálhatatlan.",tip:"some information, not an information"},
{title:"Comparative Adjectives",summary:"Két dolog összehasonlítása.",prompt:"A train is _____ than a bike.",options:["fast","faster","fastest","more fast"],answer:"faster",explanation:"A fast rövid melléknév, középfoka faster.",tip:"short adjective + -er"},
{title:"Superlative Adjectives",summary:"Valaki vagy valami kiemelése egy csoportból.",prompt:"Mount Everest is _____ mountain in the world.",options:["higher","the highest","highest than","more high"],answer:"the highest",explanation:"Felsőfoknál rövid melléknévhez -est és általában the tartozik.",tip:"the + adjective-est"},
{title:"Adjectives and Adverbs",summary:"Melléknevek és határozószók megkülönböztetése.",prompt:"She sings very _____.",options:["beautiful","beautifully","beauty","more beautiful"],answer:"beautifully",explanation:"Az éneklés módját határozószó írja le.",tip:"verb + adverb"},
{title:"Irregular Comparatives and Superlatives",summary:"Rendhagyó fokozás: good, bad, far.",prompt:"This is _____ film I have ever seen.",options:["the goodest","better","the best","best than"],answer:"the best",explanation:"A good rendhagyó felsőfoka the best.",tip:"good – better – the best"},
{title:"Zero Conditional",summary:"Általános igazságok és természeti törvények.",prompt:"If you heat ice, it _____.",options:["melt","melts","will melted","melted"],answer:"melts",explanation:"Zero Conditional: if + Present Simple, Present Simple.",tip:"If + present, present"},
{title:"First Conditional",summary:"Valós lehetőség a jövőben.",prompt:"If it rains, we _____ at home.",options:["stayed","will stay","would stay","stays"],answer:"will stay",explanation:"First Conditional főmondata: will + alapige.",tip:"If + present, will + verb"},
{title:"Second Conditional",summary:"Képzelt vagy kevéssé valószínű helyzet a jelenben/jövőben.",prompt:"If I _____ rich, I would travel the world.",options:["am","were","will be","have been"],answer:"were",explanation:"Second Conditional: if + Past Simple, would + alapige.",tip:"If I were…, I would…"},
{title:"Third Conditional",summary:"Múltbeli, meg nem történt helyzetek és következmények.",prompt:"If she had studied, she _____ the test.",options:["would pass","will pass","would have passed","passed"],answer:"would have passed",explanation:"Third Conditional: would have + past participle.",tip:"If + past perfect, would have + V3"},
{title:"Have / Has",summary:"Birtoklás és kapcsolatok kifejezése.",prompt:"My brother _____ a new bike.",options:["have","has","having","does"],answer:"has",explanation:"He/she/it mellett has áll.",tip:"he has"},
{title:"Do / Does",summary:"Kérdés és tagadás Present Simple-ben.",prompt:"_____ your sister like music?",options:["Do","Does","Is","Has"],answer:"Does",explanation:"Egyes szám harmadik személyben Does áll a kérdés elején.",tip:"Does + subject + base verb?"},
{title:"Have got / Has got",summary:"Birtoklás kifejezése, főleg beszélt angolban.",prompt:"He _____ got two sisters.",options:["have","has","is","does"],answer:"has",explanation:"He mellett has got használatos.",tip:"He has got"},
{title:"Possessive Adjectives",summary:"Birtokos melléknevek: my, your, his, her, its, our, their.",prompt:"Anna has a cat. _____ cat is black.",options:["She","Her","Hers","She's"],answer:"Her",explanation:"A főnév előtt birtokos melléknév áll.",tip:"her cat"},
{title:"Possessive Pronouns",summary:"Birtokos névmások: mine, yours, his, hers, ours, theirs.",prompt:"This book belongs to me. It is _____.",options:["my","mine","me","I"],answer:"mine",explanation:"A birtokos névmás főnév nélkül áll.",tip:"It is mine."},
{title:"Can / Could",summary:"Képesség, lehetőség és udvarias kérés.",prompt:"When I was five, I _____ swim.",options:["can","could","may","must"],answer:"could",explanation:"A could múltbeli képességet fejez ki.",tip:"could = tudott / képes volt"},
{title:"May / Might",summary:"Lehetőség vagy engedélykérés.",prompt:"It _____ rain later, so take an umbrella.",options:["might","mustn't","has to","does"],answer:"might",explanation:"A might bizonytalan lehetőséget fejez ki.",tip:"might + base verb"},
{title:"Must",summary:"Erős kötelezettség vagy következtetés.",prompt:"You _____ wear a seat belt in a car.",options:["must","might","couldn't","would"],answer:"must",explanation:"A must kötelezettséget fejezhet ki.",tip:"must + base verb"},
{title:"Have to / Has to",summary:"Külső szabályból vagy körülményből eredő kötelezettség.",prompt:"She _____ get up early for school.",options:["have to","has to","must to","having to"],answer:"has to",explanation:"She mellett has to áll.",tip:"he/she/it has to"},
{title:"Should / Ought to",summary:"Tanács és ajánlás.",prompt:"You look tired. You _____ get some rest.",options:["should","mustn't","might to","have"],answer:"should",explanation:"A should tanácsot ad.",tip:"should + base verb"},
{title:"Mustn't / Don't have to",summary:"Tiltás és a szükségesség hiánya közti különbség.",prompt:"You _____ park here. It is forbidden.",options:["don't have to","mustn't","might","should"],answer:"mustn't",explanation:"A mustn't tiltást fejez ki.",tip:"mustn't = tilos; don't have to = nem szükséges"},
{title:"Would",summary:"Feltételes jelentés és udvarias kérés.",prompt:"_____ you like a cup of tea?",options:["Would","Must","Did","Have"],answer:"Would",explanation:"A Would you like…? udvarias felajánlás.",tip:"Would you like…?"},
{title:"Used to",summary:"Régi szokások és állapotok, amelyek már megváltoztak.",prompt:"I _____ play outside every day when I was little.",options:["use to","used to","am used","was use"],answer:"used to",explanation:"A used to múltbeli szokást jelöl.",tip:"used to + base verb"},
{title:"Passive Voice",summary:"A cselekvés elszenvedőjére helyezzük a hangsúlyt.",prompt:"The cake _____ by my sister yesterday.",options:["made","was made","is make","has make"],answer:"was made",explanation:"Past Simple passive: was/were + past participle.",tip:"be + V3"},
{title:"Reported Speech",summary:"Mások szavainak közvetett elmondása.",prompt:"He said, “I am tired.” → He said that he _____ tired.",options:["is","was","has","will"],answer:"was",explanation:"Múlt idejű bevezető ige után gyakori az igeidő-visszaléptetés.",tip:"am → was"},
{title:"Relative Clauses",summary:"Vonatkozó mellékmondatok: who, which, that, where.",prompt:"The woman _____ lives next door is a doctor.",options:["who","where","when","whose"],answer:"who",explanation:"Személyre a who használható.",tip:"who = személy"},
{title:"Gerunds and Infinitives",summary:"-ing alak vagy to + ige használata.",prompt:"I enjoy _____ books.",options:["read","to read","reading","reads"],answer:"reading",explanation:"Az enjoy után gerundium (-ing) áll.",tip:"enjoy + -ing"},
{title:"Articles",summary:"Az a, an és the névelők használata.",prompt:"She ate _____ apple.",options:["a","an","the","—"],answer:"an",explanation:"Magánhangzóhanggal kezdődő szó előtt an áll.",tip:"an apple"},
{title:"Prepositions",summary:"Helyet, időt és kapcsolatot jelölő elöljárószavak.",prompt:"The meeting starts _____ 9 o’clock.",options:["in","on","at","by"],answer:"at",explanation:"Pontos időpont előtt at áll.",tip:"at 9 o’clock"},
{title:"Question Tags",summary:"Rövid kérdésvégi megerősítések.",prompt:"You are a student, _____?",options:["are you","aren't you","do you","don't you"],answer:"aren't you",explanation:"Állító főmondat után általában tagadó kérdésvég áll.",tip:"positive statement + negative tag"},
{title:"Word Formation",summary:"Szavak képzése elő- és utótagokkal.",prompt:"Choose the correct noun: happy → _____.",options:["happily","happiness","unhappy","happier"],answer:"happiness",explanation:"A -ness utótag főnevet képez a happy melléknévből.",tip:"happy → happiness"},
{title:"Phrasal Verbs",summary:"Ige és partikula együttese, új jelentéssel.",prompt:"What does “give up” mean?",options:["continue","stop trying","wake up","arrive"],answer:"stop trying",explanation:"A give up jelentése feladni.",tip:"give up = feladni"},
{title:"Conjunctions and Linking Words",summary:"Gondolatok összekapcsolása.",prompt:"I was tired, _____ I went to bed early.",options:["so","although","because of","unless"],answer:"so",explanation:"A so következményt vezet be.",tip:"cause → so → result"},
{title:"Too / Enough",summary:"Túlzott mérték és elegendő mérték.",prompt:"This bag is _____ heavy for me to carry.",options:["enough","too","so enough","many"],answer:"too",explanation:"A too + melléknév túlzott mértéket jelent.",tip:"too heavy"},
{title:"So / Such",summary:"Fokozás: so + melléknév, such + főnévi szerkezet.",prompt:"It was _____ a beautiful day.",options:["so","such","too","enough"],answer:"such",explanation:"Such + a/an + melléknév + főnév.",tip:"such a beautiful day"},
{title:"Both / Either / Neither",summary:"Két személy vagy dolog együttes, választó vagy tagadó említése.",prompt:"_____ of my parents speak English; both do.",options:["Neither","Both","Either","None"],answer:"Both",explanation:"A both mindkettőt jelenti.",tip:"both = mindkettő"},
{title:"Reflexive Pronouns",summary:"Visszaható névmások: myself, yourself, himself és társaik.",prompt:"She made the cake by _____.",options:["herself","her","hers","she"],answer:"herself",explanation:"A she visszaható alakja herself.",tip:"she → herself"},
{title:"Question Forms",summary:"Kérdések felépítése segédigékkel és kérdőszavakkal.",prompt:"_____ you live near here?",options:["Do","Are","Have","Does"],answer:"Do",explanation:"Present Simple-ben you alannyal Do segédigét használunk.",tip:"Do + you + base verb?"},
{title:"Direct and Indirect Questions",summary:"Közvetlen és udvarias közvetett kérdések.",prompt:"Could you tell me where _____?",options:["is the station","the station is","is station","does the station"],answer:"the station is",explanation:"Közvetett kérdésben kijelentő szórend van.",tip:"where the station is"},
{title:"Present and Past Habits",summary:"Jelenlegi és múltbeli szokások kifejezése.",prompt:"She _____ drinks tea in the morning.",options:["usually","yesterday","last","ago"],answer:"usually",explanation:"A usually gyakoriságot jelölő határozószó.",tip:"usually + Present Simple"},
{title:"Inversion",summary:"Fordított szórend hangsúlyos, formális szerkezetekben.",prompt:"Never _____ I seen such a view.",options:["have","did","am","was"],answer:"have",explanation:"Never mondat elején segédige kerül az alany elé.",tip:"Never have I seen…"},
{title:"Wishes and Regrets",summary:"Kívánságok és megbánás kifejezése wish szerkezettel.",prompt:"I wish I _____ taller.",options:["am","were","will be","have been"],answer:"were",explanation:"Jelenlegi, nem valós helyzetre gyakran wish + Past Simple áll.",tip:"I wish I were…"}
]
type CurriculumTeaching = { rule: string; form: string; examples: Example[]; mistake: string }
const curriculumTeaching: Record<string, CurriculumTeaching> = {
  "Present Perfect Simple": {
    "rule": "Connect a past event with the present: life experience, a recent result, or a time period that is not finished.",
    "form": "have/has + past participle (V3). Use have with I/you/we/they and has with he/she/it.",
    "examples": [
      {
        "sentence": "I have already sent the email.",
        "translation": "Már elküldtem az e-mailt."
      },
      {
        "sentence": "She has never visited Spain.",
        "translation": "Még soha nem járt Spanyolországban."
      }
    ],
    "mistake": "Do not use a finished past-time expression such as yesterday with the Present Perfect; use Past Simple for a finished time."
  },
  "Present Perfect Continuous": {
    "rule": "Focus on an activity that started in the past and continues now, or has a visible present result. It often answers how long?",
    "form": "have/has + been + verb-ing; for gives a duration and since gives a starting point.",
    "examples": [
      {
        "sentence": "I have been learning English for three years.",
        "translation": "Három éve tanulok angolul."
      },
      {
        "sentence": "He has been working since eight o’clock.",
        "translation": "Nyolc óra óta dolgozik."
      }
    ],
    "mistake": "Use the past participle after have/has for the Simple form; the Continuous form needs been + -ing."
  },
  "Past Perfect Simple": {
    "rule": "Show that one past event happened before another past moment or event.",
    "form": "subject + had + V3; negative: had not + V3; question: Had + subject + V3?",
    "examples": [
      {
        "sentence": "The train had left before we arrived.",
        "translation": "A vonat már elment, mire megérkeztünk."
      },
      {
        "sentence": "I had finished dinner when she called.",
        "translation": "Már befejeztem a vacsorát, amikor telefonált."
      }
    ],
    "mistake": "Do not use Past Perfect for every past event; use it when the earlier-than relationship matters."
  },
  "Future Continuous": {
    "rule": "Describe what will be in progress at a particular future time, or ask politely about someone’s plans.",
    "form": "will + be + verb-ing for every subject.",
    "examples": [
      {
        "sentence": "At nine tomorrow, I will be taking my exam.",
        "translation": "Holnap kilenckor éppen vizsgázni fogok."
      },
      {
        "sentence": "This time next week, we will be flying to Italy.",
        "translation": "Jövő héten ilyenkor éppen Olaszországba repülünk majd."
      }
    ],
    "mistake": "Future Continuous is will be + -ing, not will + base verb alone."
  },
  "Future Perfect Simple": {
    "rule": "Describe an action that will be complete by a future deadline or reference point.",
    "form": "will + have + past participle (V3); often used with by, before, and by the time.",
    "examples": [
      {
        "sentence": "By Friday, we will have completed the project.",
        "translation": "Péntekre befejezzük a projektet."
      },
      {
        "sentence": "She will have arrived by noon.",
        "translation": "Délre meg fog érkezni."
      }
    ],
    "mistake": "After will have, use the past participle, not the base form or a third-person -s form."
  },
  "Be going to": {
    "rule": "Use it for prior intentions/plans and predictions based on evidence you can see now.",
    "form": "am/is/are + going to + base verb; negative: am not/isn’t/aren’t going to.",
    "examples": [
      {
        "sentence": "I am going to apply for the exchange programme.",
        "translation": "Jelentkezni fogok a csereprogramra."
      },
      {
        "sentence": "Look at those clouds; it is going to rain.",
        "translation": "Nézd azokat a felhőket; esni fog."
      }
    ],
    "mistake": "Do not omit be: say She is going to leave, not She going to leave."
  },
  "Much / Many": {
    "rule": "Use many with plural countable nouns and much with uncountable nouns, especially in questions and negatives.",
    "form": "How many + plural countable noun; how much + uncountable noun.",
    "examples": [
      {
        "sentence": "How many countries have you visited?",
        "translation": "Hány országban jártál?"
      },
      {
        "sentence": "We do not have much time.",
        "translation": "Nincs sok időnk."
      }
    ],
    "mistake": "Do not say much books or many information."
  },
  "A few / A little": {
    "rule": "A few means a small number of countable things; a little means a small amount of an uncountable thing. Both suggest that some is available.",
    "form": "a few + plural countable noun; a little + uncountable noun.",
    "examples": [
      {
        "sentence": "I have a few questions.",
        "translation": "Van néhány kérdésem."
      },
      {
        "sentence": "There is a little milk in the fridge.",
        "translation": "Van egy kevés tej a hűtőben."
      }
    ],
    "mistake": "Use a few with countable plural nouns and a little with uncountable nouns."
  },
  "Few / Little": {
    "rule": "Few and little mean not many/not much and usually emphasize that the amount is smaller than desired. The article a makes the meaning more positive.",
    "form": "few + plural countable noun; little + uncountable noun. Compare a few/a little with few/little.",
    "examples": [
      {
        "sentence": "Few students understood the difficult question.",
        "translation": "Kevés diák értette meg a nehéz kérdést."
      },
      {
        "sentence": "We have little time left.",
        "translation": "Kevés időnk maradt."
      }
    ],
    "mistake": "Few/little often sound negative; a few/a little mean that at least some are available."
  },
  "A lot of / Lots of": {
    "rule": "Both expressions mean a large quantity and work with plural countable nouns and uncountable nouns. Lots of is slightly more informal.",
    "form": "a lot of/lots of + plural countable noun or uncountable noun.",
    "examples": [
      {
        "sentence": "She has a lot of friends.",
        "translation": "Sok barátja van."
      },
      {
        "sentence": "There is lots of useful information online.",
        "translation": "Sok hasznos információ van az interneten."
      }
    ],
    "mistake": "Do not add a plural -s to an uncountable noun such as information or advice."
  },
  "Enough": {
    "rule": "Enough means as much or as many as needed. It goes before a noun but after an adjective or adverb.",
    "form": "enough + noun; adjective/adverb + enough; enough + to-infinitive is also common.",
    "examples": [
      {
        "sentence": "We have enough chairs for everyone.",
        "translation": "Van elég székünk mindenkinek."
      },
      {
        "sentence": "The room is warm enough to study in.",
        "translation": "A szoba elég meleg ahhoz, hogy tanuljunk benne."
      }
    ],
    "mistake": "Say enough money but warm enough; the position changes depending on whether a noun or adjective follows."
  },
  "Too much / Too many": {
    "rule": "Use these for more than is needed or wanted. Too much goes with uncountable nouns; too many goes with plural countable nouns.",
    "form": "too much + uncountable noun; too many + plural countable noun.",
    "examples": [
      {
        "sentence": "There is too much sugar in this tea.",
        "translation": "Túl sok cukor van ebben a teában."
      },
      {
        "sentence": "There are too many cars on this street.",
        "translation": "Túl sok autó van ezen az utcán."
      }
    ],
    "mistake": "Too much/too many normally expresses an excessive amount, unlike neutral a lot of."
  },
  "Countable and Uncountable Nouns": {
    "rule": "Countable nouns can be counted as individual items and have singular/plural forms. Uncountable nouns are treated as a mass or concept.",
    "form": "a/an + singular countable noun; numbers + plural countable noun; some/much/little + uncountable noun.",
    "examples": [
      {
        "sentence": "I bought three apples.",
        "translation": "Három almát vettem."
      },
      {
        "sentence": "We need some information and two bottles of water.",
        "translation": "Szükségünk van némi információra és két üveg vízre."
      }
    ],
    "mistake": "Information, advice, furniture, and luggage are normally uncountable in English; use a piece of/a bit of when needed."
  },
  "Comparative Adjectives": {
    "rule": "Compare two people or things with a comparative adjective, usually followed by than.",
    "form": "Short adjectives: adjective + -er; adjectives ending in consonant-vowel-consonant may double the final consonant; longer adjectives: more + adjective.",
    "examples": [
      {
        "sentence": "This route is shorter than the old one.",
        "translation": "Ez az útvonal rövidebb a réginél."
      },
      {
        "sentence": "The second task is more difficult than the first.",
        "translation": "A második feladat nehezebb az elsőnél."
      }
    ],
    "mistake": "Avoid double comparatives: use easier or more difficult, not more easier."
  },
  "Superlative Adjectives": {
    "rule": "Use a superlative to identify the top or bottom member of a group of three or more. The is normally used before it.",
    "form": "the + adjective-est for many short adjectives; the most + longer adjective; the least + adjective for the lowest degree.",
    "examples": [
      {
        "sentence": "It is the tallest building in the city.",
        "translation": "Ez a város legmagasabb épülete."
      },
      {
        "sentence": "That was the most interesting lecture of the week.",
        "translation": "Ez volt a hét legérdekesebb előadása."
      }
    ],
    "mistake": "Use the before the superlative in ordinary adjective phrases; do not add than after a superlative."
  },
  "Adjectives and Adverbs": {
    "rule": "Adjectives describe nouns or pronouns; adverbs often describe verbs, adjectives, or other adverbs and explain how, when, or how much.",
    "form": "adjective + noun (a careful driver); verb + adverb (drives carefully). Many adverbs use -ly, but not all.",
    "examples": [
      {
        "sentence": "She is a careful driver.",
        "translation": "Ő óvatos sofőr."
      },
      {
        "sentence": "She drives carefully.",
        "translation": "Óvatosan vezet."
      }
    ],
    "mistake": "Good is an adjective but well is often the adverb; friendly and fast do not follow the usual -ly pattern."
  },
  "Irregular Comparatives and Superlatives": {
    "rule": "Some common adjectives change form instead of following -er/-est or more/most.",
    "form": "good → better → the best; bad → worse → the worst; far → farther/further → the farthest/furthest; little → less → the least.",
    "examples": [
      {
        "sentence": "Your second result is better than the first.",
        "translation": "A második eredményed jobb az elsőnél."
      },
      {
        "sentence": "This is the best option for our team.",
        "translation": "Ez a legjobb lehetőség a csapatunk számára."
      }
    ],
    "mistake": "Do not say gooder or the most best."
  },
  "Zero Conditional": {
    "rule": "Use it for facts, rules, and results that are generally or always true.",
    "form": "if/when + Present Simple, Present Simple; either clause may come first.",
    "examples": [
      {
        "sentence": "If you heat ice, it melts.",
        "translation": "Ha jeget melegítesz, elolvad."
      },
      {
        "sentence": "When people do not water plants, they dry out.",
        "translation": "Ha az emberek nem öntözik a növényeket, a növények kiszáradnak."
      }
    ],
    "mistake": "The Zero Conditional states a general result; it does not normally use will in the result clause."
  },
  "First Conditional": {
    "rule": "Use it for a real possibility in the future and its likely consequence.",
    "form": "if + Present Simple, will + base verb; the if-clause can come first or second.",
    "examples": [
      {
        "sentence": "If I finish early, I will call you.",
        "translation": "Ha korán végzek, felhívlak."
      },
      {
        "sentence": "We will miss the bus if we do not hurry.",
        "translation": "Lekéssük a buszt, ha nem sietünk."
      }
    ],
    "mistake": "Do not normally use will directly after if in this conditional: If it rains, not If it will rain."
  },
  "Second Conditional": {
    "rule": "Use it for imaginary, unlikely, or unreal situations in the present or future.",
    "form": "if + Past Simple, would + base verb; were is common in formal hypothetical clauses with I/he/she/it.",
    "examples": [
      {
        "sentence": "If I had more free time, I would learn Italian.",
        "translation": "Ha több szabadidőm lenne, olaszul tanulnék."
      },
      {
        "sentence": "If she were here, she would know what to do.",
        "translation": "Ha itt lenne, tudná, mit kell tenni."
      }
    ],
    "mistake": "The past form expresses distance/unreality, not past time; do not put would in the if-clause."
  },
  "Third Conditional": {
    "rule": "Imagine a different past and its unreal consequence; the actual past cannot now be changed.",
    "form": "if + Past Perfect, would have + past participle.",
    "examples": [
      {
        "sentence": "If we had left earlier, we would have caught the train.",
        "translation": "Ha korábban indultunk volna, elértük volna a vonatot."
      },
      {
        "sentence": "She would have passed if she had studied more.",
        "translation": "Átment volna, ha többet tanult volna."
      }
    ],
    "mistake": "Use had + V3 after if and would have + V3 in the result, not would have in both clauses."
  },
  "Have / Has": {
    "rule": "Have and has express possession, relationships, experiences, or features. Has is used with he/she/it; have with I/you/we/they.",
    "form": "I/you/we/they have; he/she/it has. In Present Simple questions and negatives, use do/does + have.",
    "examples": [
      {
        "sentence": "My brother has a new bike.",
        "translation": "A bátyámnak/öcsémnek új biciklije van."
      },
      {
        "sentence": "Do you have any questions?",
        "translation": "Van kérdésed?"
      }
    ],
    "mistake": "After does, use have, not has: Does she have…?"
  },
  "Do / Does": {
    "rule": "Do and does form Present Simple questions and negatives with most main verbs. Does goes with he/she/it and the main verb stays in its base form.",
    "form": "Do + I/you/we/they + base verb? Does + he/she/it + base verb?; don't/doesn't + base verb.",
    "examples": [
      {
        "sentence": "Does your sister like music?",
        "translation": "Szereti a zenét a nővéred/húgod?"
      },
      {
        "sentence": "He does not work on Sundays.",
        "translation": "Vasárnaponként nem dolgozik."
      }
    ],
    "mistake": "Do not add -s to the main verb after does/doesn't: Does she like, not Does she likes."
  },
  "Have got / Has got": {
    "rule": "Have got/has got expresses possession, family relationships, and some features, especially in informal British English.",
    "form": "I/you/we/they have got; he/she/it has got. Questions: Have/Has + subject + got?",
    "examples": [
      {
        "sentence": "I have got two cousins.",
        "translation": "Két unokatestvérem van."
      },
      {
        "sentence": "Has she got a driving licence?",
        "translation": "Van jogosítványa?"
      }
    ],
    "mistake": "Do not combine do/does with got in the same question: say Has he got…? or Does he have…?"
  },
  "Possessive Adjectives": {
    "rule": "Possessive adjectives identify who owns or is connected to a noun and always come directly before that noun.",
    "form": "my, your, his, her, its, our, their + noun.",
    "examples": [
      {
        "sentence": "Anna has a cat. Her cat is black.",
        "translation": "Annának van egy macskája. A macskája fekete."
      },
      {
        "sentence": "We are visiting our grandparents.",
        "translation": "Meglátogatjuk a nagyszüleinket."
      }
    ],
    "mistake": "Use its for possession by a thing/animal; it's means it is or it has."
  },
  "Possessive Pronouns": {
    "rule": "Possessive pronouns replace a possessive adjective plus a noun, so the noun does not need to be repeated.",
    "form": "mine, yours, his, hers, ours, theirs; these normally stand alone.",
    "examples": [
      {
        "sentence": "This blue bag is mine.",
        "translation": "Ez a kék táska az enyém."
      },
      {
        "sentence": "Their house is larger than ours.",
        "translation": "Az ő házuk nagyobb a miénknél."
      }
    ],
    "mistake": "Say my book but the book is mine; do not put a noun directly after mine/yours/hers."
  },
  "Can / Could": {
    "rule": "Can expresses present ability, possibility, or informal permission. Could can express past ability, a less certain possibility, or a polite request.",
    "form": "can/could + base verb; questions invert can/could and the subject; no to or -s after the modal.",
    "examples": [
      {
        "sentence": "I can speak three languages.",
        "translation": "Három nyelven tudok beszélni."
      },
      {
        "sentence": "Could you help me with this form?",
        "translation": "Tudnál segíteni ennek az űrlapnak a kitöltésében?"
      }
    ],
    "mistake": "Use the base verb after can/could: can swim, not can to swim."
  },
  "May / Might": {
    "rule": "May and might express possibility; may is also used for formal permission. Might often sounds more tentative.",
    "form": "may/might + base verb; negative: may not/might not.",
    "examples": [
      {
        "sentence": "It might snow tonight.",
        "translation": "Lehet, hogy ma este havazni fog."
      },
      {
        "sentence": "May I ask you a question?",
        "translation": "Fel tehetek egy kérdést?"
      }
    ],
    "mistake": "Do not add to after the modal: might rain, not might to rain."
  },
  "Must": {
    "rule": "Must expresses strong obligation, rules, or a logical conclusion based on evidence.",
    "form": "must + base verb; must not/mustn't gives prohibition.",
    "examples": [
      {
        "sentence": "You must wear a seat belt.",
        "translation": "Be kell kötnöd a biztonsági övet."
      },
      {
        "sentence": "The lights are on, so they must be at home.",
        "translation": "Égnek a lámpák, tehát biztosan otthon vannak."
      }
    ],
    "mistake": "Mustn't means prohibited, not unnecessary; do not use must to + verb."
  },
  "Have to / Has to": {
    "rule": "Have to/has to expresses obligation, often because of a rule or outside circumstance. The form changes with the subject and tense.",
    "form": "I/you/we/they have to; he/she/it has to; questions use do/does have to.",
    "examples": [
      {
        "sentence": "She has to get up early for school.",
        "translation": "Korán kell kelnie az iskola miatt."
      },
      {
        "sentence": "Do we have to book a table?",
        "translation": "Le kell foglalnunk egy asztalt?"
      }
    ],
    "mistake": "Use has to with he/she/it in statements, but does she have to in questions."
  },
  "Should / Ought to": {
    "rule": "Should and ought to give advice, recommendations, or expectations. Should is more common in everyday speech.",
    "form": "should + base verb; ought to + base verb; negative: should not/shouldn't.",
    "examples": [
      {
        "sentence": "You should check the deadline today.",
        "translation": "Ma ellenőrizned kellene a határidőt."
      },
      {
        "sentence": "We ought to leave soon.",
        "translation": "Hamarosan indulnunk kellene."
      }
    ],
    "mistake": "Should is followed by the base verb without to; ought to includes to."
  },
  "Mustn't / Don't have to": {
    "rule": "Mustn't means an action is forbidden; don't have to means there is no obligation, so the action is optional.",
    "form": "mustn't + base verb = forbidden; don't/doesn't have to + base verb = not necessary.",
    "examples": [
      {
        "sentence": "You mustn't use your phone during the exam.",
        "translation": "A vizsga alatt tilos a telefonodat használnod."
      },
      {
        "sentence": "You don't have to bring food; lunch is provided.",
        "translation": "Nem kell ételt hoznod; biztosítanak ebédet."
      }
    ],
    "mistake": "These meanings are very different: prohibition is not the same as lack of necessity."
  },
  "Would": {
    "rule": "Would is used for hypothetical results, polite offers/requests, and repeated past actions in some contexts.",
    "form": "would + base verb; would you like + noun/to-infinitive for polite offers; if + past, would + base verb for a Second Conditional result.",
    "examples": [
      {
        "sentence": "I would travel more if I had enough money.",
        "translation": "Többet utaznék, ha lenne elég pénzem."
      },
      {
        "sentence": "Would you like to join us?",
        "translation": "Szeretnél csatlakozni hozzánk?"
      }
    ],
    "mistake": "Do not use would in a normal if-clause for the Second Conditional: If I had…, I would…"
  },
  "Used to": {
    "rule": "Used to describes past habits or situations that were true before but are no longer true now.",
    "form": "used to + base verb; questions/negatives commonly use did/didn't + use to.",
    "examples": [
      {
        "sentence": "I used to play outside every afternoon.",
        "translation": "Régebben minden délután kint játszottam."
      },
      {
        "sentence": "We didn't use to have a car.",
        "translation": "Régebben nem volt autónk."
      }
    ],
    "mistake": "After did/didn't, use use to, not used to: Did you use to…?"
  },
  "Passive Voice": {
    "rule": "The passive emphasizes the action or recipient rather than the person doing it. Use it when the agent is unknown, obvious, or unimportant.",
    "form": "a form of be + past participle (V3); keep the tense by changing be; add by + agent only when useful.",
    "examples": [
      {
        "sentence": "The bridge was built in 1998.",
        "translation": "A hidat 1998-ban építették."
      },
      {
        "sentence": "The results will be announced tomorrow.",
        "translation": "Az eredményeket holnap jelentik be."
      }
    ],
    "mistake": "Use the correct tense of be plus V3; do not confuse was built with was build."
  },
  "Reported Speech": {
    "rule": "Reported speech tells what someone said without repeating their exact words. After a past reporting verb, tenses often move back one step.",
    "form": "Present Simple → Past Simple; am/is → was; will → would; can → could. Pronouns and time/place words may also change.",
    "examples": [
      {
        "sentence": "Direct: “I am tired.” Reported: He said that he was tired.",
        "translation": "Egyenes: „Fáradt vagyok.” Függő: Azt mondta, hogy fáradt."
      },
      {
        "sentence": "“We will return tomorrow.” → They said they would return the next day.",
        "translation": "„Holnap visszatérünk.” → Azt mondták, másnap visszatérnek."
      }
    ],
    "mistake": "Backshift is common after said/told in the past, but not every statement must change if it is still true or the context permits it."
  },
  "Relative Clauses": {
    "rule": "Relative clauses add information about a person, thing, place, or time. The relative word links the information to its noun.",
    "form": "who/that for people; which/that for things; where for places; whose for possession; when for time.",
    "examples": [
      {
        "sentence": "The student who won the prize is my friend.",
        "translation": "A díjat nyerő diák a barátom."
      },
      {
        "sentence": "This is the café where we first met.",
        "translation": "Ez az a kávézó, ahol először találkoztunk."
      }
    ],
    "mistake": "Use where for a place clause, not who; use whose to show possession."
  },
  "Gerunds and Infinitives": {
    "rule": "Some verbs are followed by an -ing form, some by to + base verb, and some can take either with a meaning change.",
    "form": "enjoy/avoid/finish + -ing; want/decide/hope + to-infinitive; make/let + object + base verb.",
    "examples": [
      {
        "sentence": "I enjoy learning new words.",
        "translation": "Szeretek új szavakat tanulni."
      },
      {
        "sentence": "They decided to leave early.",
        "translation": "Úgy döntöttek, hogy korán indulnak."
      }
    ],
    "mistake": "Learn the pattern after each verb: enjoy to learn is incorrect; decide leaving is usually incorrect."
  },
  "Articles": {
    "rule": "A/an introduces a singular countable noun when it is not specific; the points to something identifiable or already known; zero article is common for general plural and uncountable nouns.",
    "form": "a before a consonant sound; an before a vowel sound; the for specific/known things; no article for many general plural and uncountable uses.",
    "examples": [
      {
        "sentence": "I saw an owl in the tree.",
        "translation": "Láttam egy baglyot a fán."
      },
      {
        "sentence": "The owl was looking at us.",
        "translation": "A bagoly minket figyelt."
      }
    ],
    "mistake": "Choose a/an by sound, not spelling: an hour but a university; do not normally use a/an with plural nouns."
  },
  "Prepositions": {
    "rule": "Prepositions express time, place, direction, and relationships. Common time patterns are at for clock times, on for days/dates, and in for months/years/long periods.",
    "form": "at 9 o'clock; on Monday/on 12 May; in October/in 2026; in a room; on a surface; at a point/place.",
    "examples": [
      {
        "sentence": "The meeting starts at nine on Monday.",
        "translation": "A találkozó hétfőn kilenckor kezdődik."
      },
      {
        "sentence": "My birthday is in December.",
        "translation": "Decemberben van a születésnapom."
      }
    ],
    "mistake": "Memorize common combinations and set phrases; translating every preposition directly from Hungarian often causes errors."
  },
  "Question Tags": {
    "rule": "Question tags are short endings used to check information or invite agreement. Positive statements usually take negative tags, and negative statements take positive tags.",
    "form": "statement + auxiliary + pronoun; match the tense and subject: You are ready, aren't you?",
    "examples": [
      {
        "sentence": "You are a student, aren't you?",
        "translation": "Diák vagy, ugye?"
      },
      {
        "sentence": "They haven't finished, have they?",
        "translation": "Még nem fejezték be, ugye?"
      }
    ],
    "mistake": "Use the matching auxiliary and subject pronoun; don't repeat the noun as the tag subject."
  },
  "Word Formation": {
    "rule": "Word formation changes a base word with prefixes and suffixes to create a noun, verb, adjective, or adverb. The sentence tells you which word class is needed.",
    "form": "happy → happiness; happy → unhappy; quick → quickly; develop → development.",
    "examples": [
      {
        "sentence": "Her kindness impressed everyone.",
        "translation": "A kedvessége mindenkit lenyűgözött."
      },
      {
        "sentence": "He answered the question carefully.",
        "translation": "Óvatosan válaszolt a kérdésre."
      }
    ],
    "mistake": "Check the grammar slot before choosing a form: after an article you may need a noun, while after a verb you may need an adverb."
  },
  "Phrasal Verbs": {
    "rule": "A phrasal verb combines a verb with a particle such as up, off, out, or on; the full meaning may differ from the verb alone.",
    "form": "learn the whole unit: give up = stop trying; find out = discover; put off = postpone; look after = take care of.",
    "examples": [
      {
        "sentence": "I will never give up learning English.",
        "translation": "Soha nem adom fel az angoltanulást."
      },
      {
        "sentence": "Can you look after my bag for a minute?",
        "translation": "Vigyáznál egy percre a táskámra?"
      }
    ],
    "mistake": "Some phrasal verbs are separable and others are not; with separable verbs, a pronoun usually goes between verb and particle (pick it up)."
  },
  "Conjunctions and Linking Words": {
    "rule": "Linking words show contrast, reason, result, addition, or condition. Choose them by the logical relationship between the clauses.",
    "form": "because + clause; because of + noun; although + clause; despite + noun/-ing; so + result; however often links contrasting sentences.",
    "examples": [
      {
        "sentence": "I was tired, so I went to bed early.",
        "translation": "Fáradt voltam, ezért korán lefeküdtem."
      },
      {
        "sentence": "Although it was raining, they continued the match.",
        "translation": "Bár esett az eső, folytatták a mérkőzést."
      }
    ],
    "mistake": "Because is followed by a clause; because of is followed by a noun or -ing form."
  },
  "Too / Enough": {
    "rule": "Too means more than is acceptable; enough means the required amount/degree. The word order depends on whether a noun or adjective follows.",
    "form": "too + adjective/adverb; adjective/adverb + enough; enough + noun; too + adjective + to-infinitive.",
    "examples": [
      {
        "sentence": "The box is too heavy to lift.",
        "translation": "A doboz túl nehéz ahhoz, hogy felemeljük."
      },
      {
        "sentence": "She is old enough to travel alone.",
        "translation": "Elég idős ahhoz, hogy egyedül utazzon."
      }
    ],
    "mistake": "Say too heavy but strong enough; enough comes before nouns and after adjectives."
  },
  "So / Such": {
    "rule": "So intensifies an adjective or adverb; such intensifies a noun phrase. They can introduce a result with that.",
    "form": "so + adjective/adverb; such + (a/an) + adjective + singular noun; so many/much/few/little + noun.",
    "examples": [
      {
        "sentence": "The exam was so difficult that many students needed more time.",
        "translation": "A vizsga olyan nehéz volt, hogy sok diáknak több időre volt szüksége."
      },
      {
        "sentence": "It was such a useful lesson that I took notes.",
        "translation": "Olyan hasznos lecke volt, hogy jegyzeteltem."
      }
    ],
    "mistake": "Use so difficult but such a difficult exam; do not say so a difficult exam."
  },
  "Both / Either / Neither": {
    "rule": "Both refers to two together; either means one or the other; neither means not one and not the other.",
    "form": "both + plural noun/verb; either/neither + singular noun in many standard uses; both…and, either…or, neither…nor.",
    "examples": [
      {
        "sentence": "Both answers are correct.",
        "translation": "Mindkét válasz helyes."
      },
      {
        "sentence": "Neither of the options is suitable.",
        "translation": "Egyik lehetőség sem megfelelő."
      }
    ],
    "mistake": "Neither is negative already, so do not add another not in the same clause."
  },
  "Reflexive Pronouns": {
    "rule": "Use reflexive pronouns when the subject and object refer to the same person/thing, or to emphasize that someone did something personally.",
    "form": "myself, yourself, himself, herself, itself, ourselves, yourselves, themselves; by + reflexive = alone/without help.",
    "examples": [
      {
        "sentence": "She taught herself to play the guitar.",
        "translation": "Önállóan tanult meg gitározni."
      },
      {
        "sentence": "We prepared the presentation ourselves.",
        "translation": "Mi magunk készítettük el a bemutatót."
      }
    ],
    "mistake": "Choose the reflexive form that matches the subject; do not use her-self or hisself."
  },
  "Question Forms": {
    "rule": "English questions often use an auxiliary before the subject. In Present Simple with most verbs, use do/does; with be, place am/is/are first.",
    "form": "Do/does + subject + base verb?; be + subject?; wh-word + auxiliary + subject + verb?",
    "examples": [
      {
        "sentence": "Where do you study?",
        "translation": "Hol tanulsz?"
      },
      {
        "sentence": "Is your brother at home?",
        "translation": "Otthon van a testvéred?"
      }
    ],
    "mistake": "Do not add do/does to questions that already use be: Is she ready, not Does she be ready."
  },
  "Direct and Indirect Questions": {
    "rule": "Direct questions use normal question inversion. Indirect questions are more polite and use statement word order after the opening phrase.",
    "form": "Direct: Where is the station? Indirect: Could you tell me where the station is?; yes/no indirect questions use if/whether.",
    "examples": [
      {
        "sentence": "Could you tell me where the station is?",
        "translation": "Meg tudnád mondani, hol van az állomás?"
      },
      {
        "sentence": "Do you know whether the office is open?",
        "translation": "Tudod, hogy nyitva van-e az iroda?"
      }
    ],
    "mistake": "Inside an indirect question, do not invert again: where the station is, not where is the station."
  },
  "Present and Past Habits": {
    "rule": "Present Simple plus frequency adverbs describes current habits. Used to and would can describe repeated past actions; used to can also describe past states.",
    "form": "usually/often/never + Present Simple; used to + base verb for past habits/states; would + base verb for repeated past actions.",
    "examples": [
      {
        "sentence": "I usually read before bed.",
        "translation": "Általában olvasok lefekvés előtt."
      },
      {
        "sentence": "When we were children, we used to visit our grandparents every Sunday.",
        "translation": "Gyerekkorunkban minden vasárnap meglátogattuk a nagyszüleinket."
      }
    ],
    "mistake": "Would does not usually describe a past state such as having a house; used to is better for past states."
  },
  "Inversion": {
    "rule": "Inversion places an auxiliary before the subject after certain negative or restrictive expressions at the start of a formal sentence.",
    "form": "Never/Rarely/Seldom + auxiliary + subject + main verb; Not only… but also; Hardly had… when…",
    "examples": [
      {
        "sentence": "Never have I seen such a beautiful view.",
        "translation": "Soha nem láttam még ilyen gyönyörű kilátást."
      },
      {
        "sentence": "Not only did she pass, but she also achieved the highest score.",
        "translation": "Nemcsak átment, hanem a legmagasabb pontszámot is elérte."
      }
    ],
    "mistake": "When a negative expression begins the sentence, use inversion; do not keep ordinary statement word order."
  },
  "Wishes and Regrets": {
    "rule": "Wish expresses a desire for reality to be different. Use Past Simple for a present situation, Past Perfect for a past regret, and would for a desired change or complaint.",
    "form": "wish + Past Simple (present unreal); wish + Past Perfect (past regret); wish + would + base verb (wanted change).",
    "examples": [
      {
        "sentence": "I wish I were more confident.",
        "translation": "Bárcsak magabiztosabb lennék."
      },
      {
        "sentence": "She wishes she had studied harder for the exam.",
        "translation": "Bárcsak többet tanult volna a vizsgára."
      }
    ],
    "mistake": "Match the tense to the time: present unreal → Past Simple; regret about the past → Past Perfect."
  }
}

const generatedLessons: LessonUnit[] = curriculumTopics.map((topic, index) => {
  const id = 11 + index
  const teaching = curriculumTeaching[topic.title]
  const question: Question = { type: "choice", instruction: topic.title + " · Válaszd ki a helyes választ", prompt: topic.prompt, options: topic.options, answer: topic.answer, explanation: topic.explanation, tip: topic.tip }
  const translationQuestion: Question = {
    type: "text",
    instruction: topic.title + " · Fordítsd le angolra",
    prompt: teaching.examples[1].translation,
    answer: teaching.examples[1].sentence,
    explanation: "A mondat a következő szerkezetet gyakorolja: " + teaching.form + " " + teaching.mistake,
    tip: topic.tip,
  }
  return {
    id,
    title: topic.title,
    level: index < 11 ? "A2" : "B1",
    summary: topic.summary,
    sections: [
      { title: "Meaning and use", body: topic.summary + " " + teaching.rule, examples: [teaching.examples[0]] },
      { title: "How to form it", body: teaching.form, examples: [teaching.examples[1]], tip: topic.tip },
      { title: "In context", body: teaching.rule, examples: teaching.examples },
      { title: "Common mistake to avoid", body: teaching.mistake, tip: topic.explanation },
    ],
    questions: [question, translationQuestion],
  }
})
const fullLessons = [...lessons, ...generatedLessons]

const learningPathNodes = createLearningPathNodes(fullLessons)
const pathActivityLessons: LessonUnit[] = learningPathNodes.flatMap((node) => {
  if (node.kind === "lesson" || node.kind === "task" || !node.specialId || !node.templateId) return []
  const sourceLesson = fullLessons.find((lesson) => lesson.id === node.lessonId)
  const template = specialTasks.find((lesson) => lesson.id === node.templateId)
  if (!sourceLesson || !template) return []

  if (node.kind === "test") {
    return [{
      ...sourceLesson,
      id: node.specialId,
      title: "Test · " + sourceLesson.title,
      summary: "Timed test for " + sourceLesson.title + ". You have three mistakes allowed.",
      sections: [],
      specialType: "timed" as const,
      questions: sourceLesson.questions,
    }]
  }

  return [{
    ...template,
    id: node.specialId,
    title: (node.kind === "hard" ? "Hard Task · " : "New Words · ") + sourceLesson.title,
    summary: node.kind === "hard"
      ? "A harder challenge linked to " + sourceLesson.title + "."
      : "Vocabulary practice alongside " + sourceLesson.title + ".",
    sections: [],
  }]
})
const placeholders = Array.from({ length: 90 }, (_, index) => ({ id: index + 11 + curriculumTopics.length, title: "Lecke " + (index + 11 + curriculumTopics.length), inDevelopment: true }))
const pathItems = [...fullLessons, ...specialTasks, ...placeholders]
const ranks = [
  { name: "Sofia K.", xp: "2,480 XP", place: 1, color: "#b0b7bf" },
  { name: "Márton D.", xp: "2,210 XP", place: 2, color: "#b0b7bf" },
  { name: "Liam R.", xp: "1,960 XP", place: 3, color: "#b0b7bf" },
  { name: "You", xp: "1,420 XP", place: 8, color: "#ff7900" },
]
const normalizeAnswer = (value: string) => value.toLowerCase().trim().replace(/[.!?]+$/g, "").replace(/\s+/g, " ")

export default function App() {
  const [screen, setScreen] = useState<Screen>("home")
  const [activeLessonId, setActiveLessonId] = useState(1)
  const [activeTaskIndex, setActiveTaskIndex] = useState(0)
  const [readLessons, setReadLessons] = useState<number[]>([])
  const [completedLessons, setCompletedLessons] = useState<number[]>([])
  const [answeredTasks, setAnsweredTasks] = useState<string[]>([])
  const [xp, setXp] = useState(0)
  const [stars, setStars] = useState(0)
  const [purchasedItems, setPurchasedItems] = useState<string[]>([])
  const [lives, setLives] = useState(5)
  const [userName, setUserName] = useState("Kíváncsi Vidra 4821")
  const [avatar, setAvatar] = useState("fox")
  const [avatarImage, setAvatarImage] = useState("")
  const [bannerImage, setBannerImage] = useState("")
  const [dailyStudy, setDailyStudy] = useState<DailyStudyState>({ streak: 0, lastStudyDate: "", todayActivityCount: 0, activityDate: getLocalDateKey(), dailyGoal: 1 })
  const [notifications, setNotifications] = useState(false)
  const [compactMode, setCompactMode] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [notice, setNotice] = useState("")
  const [remoteReady, setRemoteReady] = useState(false)
  const [localFallbackReady, setLocalFallbackReady] = useState(false)
  const [sessionKey, setSessionKey] = useState("")
  const [saveStatus, setSaveStatus] = useState<CloudSaveStatus>("loading")
  const saveVersionRef = useRef(0)

  useEffect(() => {
    let cancelled = false
    let localSnapshot: LocalProgressSnapshot | null = null
    try {
      const raw = localStorage.getItem(LOCAL_PROGRESS_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<LocalProgressSnapshot>
        if (parsed.version === 1 && typeof parsed.savedAt === "number" && parsed.state && typeof parsed.state === "object") {
          localSnapshot = {
            version: 1,
            sessionKey: typeof parsed.sessionKey === "string" ? parsed.sessionKey : "",
            savedAt: parsed.savedAt,
            state: parsed.state as Record<string, unknown>,
          }
        }
      }
    } catch {
      // The database remains the source of truth if the local recovery snapshot is unreadable.
    }

    const applyState = (data: Record<string, unknown>) => {
      if (typeof data.userName === "string" && data.userName.trim()) setUserName(data.userName.slice(0, 32))
      if (["fox", "book", "star", "spark"].includes(String(data.avatar))) setAvatar(String(data.avatar))
      if (typeof data.avatarImage === "string" && data.avatarImage.startsWith("data:image/")) setAvatarImage(data.avatarImage)
      if (typeof data.bannerImage === "string" && data.bannerImage.startsWith("data:image/")) setBannerImage(data.bannerImage)
      if (typeof data.notifications === "boolean") setNotifications(data.notifications)
      if (typeof data.compactMode === "boolean") setCompactMode(data.compactMode)
      if (Array.isArray(data.readLessons)) setReadLessons(data.readLessons.filter((v): v is number => Number.isInteger(v)))
      if (Array.isArray(data.completedLessons)) setCompletedLessons(data.completedLessons.filter((v): v is number => Number.isInteger(v)))
      if (Array.isArray(data.answeredTasks)) setAnsweredTasks(data.answeredTasks.filter((v): v is string => typeof v === "string"))
      if (Array.isArray(data.purchasedItems)) setPurchasedItems(data.purchasedItems.filter((v): v is string => typeof v === "string"))
      if (typeof data.xp === "number" && Number.isFinite(data.xp)) setXp(Math.max(0, data.xp))
      if (typeof data.stars === "number" && Number.isFinite(data.stars)) setStars(Math.max(0, data.stars))
      if (typeof data.lives === "number" && Number.isFinite(data.lives)) setLives(Math.max(0, Math.min(5, data.lives)))
      const today = getLocalDateKey()
      const storedActivityDate = typeof data.activityDate === "string" ? data.activityDate : ""
      setDailyStudy({
        streak: typeof data.dailyStreak === "number" && Number.isInteger(data.dailyStreak) ? Math.max(0, data.dailyStreak) : 0,
        lastStudyDate: typeof data.lastStudyDate === "string" ? data.lastStudyDate : "",
        todayActivityCount: storedActivityDate === today && typeof data.todayActivityCount === "number" ? Math.max(0, data.todayActivityCount) : 0,
        activityDate: today,
        dailyGoal: [1, 3, 5].includes(Number(data.dailyGoal)) ? Number(data.dailyGoal) : 1,
      })
    }

    fetch("/api/state", { credentials: "same-origin", cache: "no-store" })
      .then(async response => {
        if (!response.ok) throw new Error("state unavailable")
        const result = await response.json() as { state?: Record<string, unknown>; sessionKey?: string }
        const remoteState = result.state || {}
        if (cancelled) return
        const remoteUpdatedAt = Date.parse(String(remoteState.updatedAt || remoteState.createdAt || "")) || 0
        const sameSession = Boolean(localSnapshot?.sessionKey && result.sessionKey && localSnapshot.sessionKey === result.sessionKey)
        const localHasProgress = Boolean(localSnapshot && hasLearningProgress(localSnapshot.state))
        const remoteHasProgress = hasLearningProgress(remoteState)
        const localVersion = typeof localSnapshot?.state.clientUpdatedAt === "number" ? localSnapshot.state.clientUpdatedAt : null
        const remoteVersion = typeof remoteState.clientUpdatedAt === "number" ? remoteState.clientUpdatedAt : null
        const localIsNewer = Boolean(localSnapshot && (
          (sameSession && (localVersion !== null && remoteVersion !== null ? localVersion > remoteVersion : localSnapshot.savedAt > remoteUpdatedAt)) ||
          (!remoteHasProgress && localHasProgress && !sameSession && !localSnapshot.sessionKey)
        ))
        const data = localIsNewer && localSnapshot ? { ...remoteState, ...localSnapshot.state } : remoteState
        if (typeof data.clientUpdatedAt === "number") saveVersionRef.current = Math.max(saveVersionRef.current, data.clientUpdatedAt)
        if (result.sessionKey) setSessionKey(result.sessionKey)
        applyState(data)
        setRemoteReady(true)
        setLocalFallbackReady(false)
        setSaveStatus(localIsNewer ? "saving" : "saved")
      })
      .catch(() => {
        if (cancelled) return
        if (localSnapshot) {
          applyState(localSnapshot.state)
          setSessionKey(localSnapshot.sessionKey)
          if (typeof localSnapshot.state.clientUpdatedAt === "number") saveVersionRef.current = Math.max(saveVersionRef.current, localSnapshot.state.clientUpdatedAt)
        } else {
          setUserName(makeLocalGuestName())
        }
        setRemoteReady(false)
        setLocalFallbackReady(true)
        setSaveStatus("local")
        setNotice("A kapcsolat nem érhető el. A haladásod helyben megmarad, amíg újra nem tudjuk menteni.")
      })
    return () => { cancelled = true }
  }, [])

  const statePayload = useMemo(() => ({
    userName, avatar, avatarImage, bannerImage, notifications, compactMode, readLessons, completedLessons,
    answeredTasks, purchasedItems, xp, stars, lives,
    dailyStreak: dailyStudy.streak, lastStudyDate: dailyStudy.lastStudyDate,
    todayActivityCount: dailyStudy.todayActivityCount, activityDate: dailyStudy.activityDate, dailyGoal: dailyStudy.dailyGoal,
  }), [userName, avatar, avatarImage, bannerImage, notifications, compactMode, readLessons, completedLessons, answeredTasks, purchasedItems, xp, stars, lives, dailyStudy])

  useEffect(() => {
    if (!remoteReady && !localFallbackReady) return
    const savedAt = Date.now()
    const clientUpdatedAt = Math.max(savedAt * 1000, saveVersionRef.current + 1)
    saveVersionRef.current = clientUpdatedAt
    const snapshotState = { ...statePayload, clientUpdatedAt }
    try {
      localStorage.setItem(LOCAL_PROGRESS_KEY, JSON.stringify({
        version: 1, sessionKey, savedAt, state: snapshotState,
      } satisfies LocalProgressSnapshot))
    } catch {
      // The cloud remains authoritative; local recovery storage is best-effort.
    }
    if (!remoteReady) {
      setSaveStatus("local")
      return
    }
    setSaveStatus("saving")
    const timer = window.setTimeout(() => {
      fetch("/api/state", {
        method: "PATCH", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(snapshotState),
      }).then(async response => {
        if (!response.ok) throw new Error("cloud save failed")
        const result = await response.json() as { sessionKey?: string; userName?: string; ignored?: boolean; clientUpdatedAt?: number }
        if (result.sessionKey) setSessionKey(result.sessionKey)
        if (typeof result.clientUpdatedAt === "number") saveVersionRef.current = Math.max(saveVersionRef.current, result.clientUpdatedAt)
        if (result.ignored) {
          setSaveStatus("error")
          return
        }
        setSaveStatus("saved")
      }).catch(() => setSaveStatus("error"))
    }, 450)
    return () => window.clearTimeout(timer)
  }, [remoteReady, localFallbackReady, sessionKey, statePayload])

  const retryCloudSave = useCallback(async () => {
    setSaveStatus("saving")
    const clientUpdatedAt = Math.max(Date.now() * 1000, saveVersionRef.current + 1)
    saveVersionRef.current = clientUpdatedAt
    try {
      const response = await fetch("/api/state", {
        method: "PATCH", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...statePayload, clientUpdatedAt }),
      })
      if (!response.ok) throw new Error("cloud save failed")
      const result = await response.json() as { sessionKey?: string; userName?: string; ignored?: boolean; clientUpdatedAt?: number }
      if (result.sessionKey) setSessionKey(result.sessionKey)
      if (typeof result.clientUpdatedAt === "number") saveVersionRef.current = Math.max(saveVersionRef.current, result.clientUpdatedAt)
      if (result.ignored) {
        setSaveStatus("error")
        return
      }
      setLocalFallbackReady(false)
      setRemoteReady(true)
      setSaveStatus("saved")
      setNotice("")
    } catch {
      setSaveStatus("local")
    }
  }, [statePayload])

  const recordDailyActivity = useCallback(() => {
    const today = getLocalDateKey()
    const yesterday = getPreviousLocalDateKey(today)
    setDailyStudy(previous => {
      const streak = previous.lastStudyDate === today
        ? previous.streak
        : previous.lastStudyDate === yesterday ? previous.streak + 1 : 1
      const todayActivityCount = (previous.activityDate === today ? previous.todayActivityCount : 0) + 1
      return { ...previous, streak, lastStudyDate: today, activityDate: today, todayActivityCount }
    })
  }, [])
  const activeLesson = [...fullLessons, ...pathActivityLessons, ...specialTasks].find((lesson) => lesson.id === activeLessonId) ?? lessons[0]
  const handleReadComplete = useCallback((lessonId: number) => {
    if (readLessons.includes(lessonId)) return
    setReadLessons((previous) => previous.includes(lessonId) ? previous : [...previous, lessonId])
    setXp((current) => current + 10)
    recordDailyActivity()
  }, [readLessons, recordDailyActivity])
  const openLesson = (lessonId: number) => {
    setActiveLessonId(lessonId)
    setScreen("lessonIntro")
  }
  const openTask = (lessonId: number, taskIndex: number, sourceLessonId?: number, forceOpen = false) => {
    const special = [...pathActivityLessons, ...specialTasks].find((item) => item.id === lessonId)
    const prerequisiteLessonId = sourceLessonId ?? lessonId
    const isUnlocked = forceOpen || (sourceLessonId !== undefined
      ? prerequisiteLessonId === fullLessons[0]?.id || completedLessons.includes(prerequisiteLessonId - 1)
      : special
        ? (lessonId === 103 ? completedLessons.length >= 1 : lessonId === 102 ? completedLessons.length >= 2 : completedLessons.length >= 4)
        : lessonId === fullLessons[0]?.id || completedLessons.includes(lessonId - 1))

    if (!isUnlocked) {
      setNotice("Finish the previous lesson to unlock this activity.")
      setScreen("home")
      return
    }
    if (!forceOpen && !readLessons.includes(prerequisiteLessonId)) {
      setActiveLessonId(prerequisiteLessonId)
      setScreen("lessonIntro")
      setNotice("Read the linked lesson first, then return to this activity.")
      return
    }

    setActiveLessonId(lessonId)
    setActiveTaskIndex(taskIndex)
    setLives(special?.specialType === "timed" ? 3 : 5)
    setScreen("task")
  }
  const completeTask = (lessonId: number, taskIndex: number) => {
    const taskKey = lessonId + "-" + taskIndex
    const nextAnswered = answeredTasks.includes(taskKey) ? answeredTasks : [...answeredTasks, taskKey]
    setAnsweredTasks(nextAnswered)
    const lesson = fullLessons.find((item) => item.id === lessonId)
    if (lesson && lesson.questions.every((_, index) => nextAnswered.includes(lessonId + "-" + index))) {
      setCompletedLessons((previous) => previous.includes(lessonId) ? previous : [...previous, lessonId])
    }
    setScreen("home")
    setNotice("Feladatcsomag teljesítve! " + (answeredTasks.includes(taskKey) ? "" : "Jutalom jóváírva."))
  }
  return <main className={"app-shell " + ((screen === "lessonIntro" || screen === "task") ? "lesson-open" : "")}>
    <section className={"screen-content " + (screen === "home" ? "learn-home-content " : "") + ((screen === "lessonIntro" || screen === "task") ? "lesson-page" : "")}>
      {screen === "home" && <Home
        completedLessons={completedLessons}
        readLessons={readLessons}
        answeredTasks={answeredTasks}
        stars={stars}
        xp={xp}
        dailyStudy={dailyStudy}
        notice={notice}
        clearNotice={() => setNotice("")}
        onOpenLesson={openLesson}
        onOpenTask={openTask}
        onOpenProfile={() => setScreen("profile")}
        userName={userName}
        avatar={avatar}
        avatarImage={avatarImage}
      />}
      {screen === "lessonIntro" && <LessonIntro
        lesson={activeLesson}
        alreadyRead={readLessons.includes(activeLesson.id)}
        onExit={() => { setNotice(""); setScreen("home") }}
        onReadComplete={() => handleReadComplete(activeLesson.id)}
        onPractice={() => { setScreen("home"); setNotice("A feladatok megnyíltak — válassz egy narancssárga pontot!") }}
      />}
      {screen === "task" && <TaskExercise
        lesson={activeLesson}
        taskIndex={activeTaskIndex}
        onExit={() => setScreen("home")}
        onComplete={() => { const key = activeLesson.id + "-" + activeTaskIndex; if (!answeredTasks.includes(key)) recordDailyActivity(); setStars((current) => current + (answeredTasks.includes(key) ? 0 : 1)); setXp((current) => current + (answeredTasks.includes(key) ? 0 : 5)); completeTask(activeLesson.id, activeTaskIndex); }}
        lives={lives}
        onWrongAnswer={() => setLives((current) => Math.max(0, current - 1))}
        onNextQuestion={(nextIndex) => { const key = activeLesson.id + "-" + activeTaskIndex; if (!answeredTasks.includes(key)) { recordDailyActivity(); setAnsweredTasks((items) => items.includes(key) ? items : [...items, key]); setStars((current) => current + 1); setXp((current) => current + 5); } setActiveTaskIndex(nextIndex); }}
        onOutOfLives={() => { setNotice("Elfogytak az életeid. Pihenj egy kicsit, és próbáld újra!"); setScreen("home"); }}
      />}
      {screen === "shop" && <Shop stars={stars} purchasedItems={purchasedItems} onPurchase={(id, cost) => { if (stars >= cost && !purchasedItems.includes(id)) { setStars((value) => value - cost); setPurchasedItems((items) => [...items, id]); setNotice("Sikeres vásárlás!"); } }} />}
      {screen === "leaderboard" && <Leaderboard />}
      {screen === "friends" && <Friends userName={userName} avatar={avatar} avatarImage={avatarImage} xp={xp} dailyStudy={dailyStudy} saveStatus={saveStatus} onRetryCloudSave={retryCloudSave} />}
      {screen === "profile" && <Profile completedCount={completedLessons.length} readCount={readLessons.length} completedTaskCount={answeredTasks.length} xp={xp} stars={stars} userName={userName} setUserName={setUserName} avatar={avatar} setAvatar={setAvatar} avatarImage={avatarImage} setAvatarImage={setAvatarImage} bannerImage={bannerImage} setBannerImage={setBannerImage} dailyStudy={dailyStudy} onDailyGoalChange={(dailyGoal) => setDailyStudy(previous => ({ ...previous, dailyGoal }))} saveStatus={saveStatus} onRetryCloudSave={retryCloudSave} notifications={notifications} setNotifications={setNotifications} compactMode={compactMode} setCompactMode={setCompactMode} showSettings={showSettings} setShowSettings={setShowSettings} />}
    </section>
    {screen !== "lessonIntro" && screen !== "task" && <Nav screen={screen} setScreen={setScreen} userName={userName} avatar={avatar} avatarImage={avatarImage} />}
  </main>
}

function Brand() {
  return <div className="brand">
    <Image src={foxIcon} alt="Evölingo fox mascot" width={58} height={58} priority unoptimized />
    <div><h1>Evölingo</h1></div>
  </div>
}

function GuestSaveBanner({ userName, status, onRetry }: { userName: string; status: CloudSaveStatus; onRetry: () => void }) {
  const message = status === "saved"
    ? "A haladásod automatikusan mentve van az adatbázisba."
    : status === "saving"
      ? "Haladásod mentése folyamatban…"
      : status === "loading"
        ? "Profilod és tanulási előzményeid betöltése…"
        : status === "error"
          ? "A felhőmentés átmenetileg sikertelen. A helyi másolat megmaradt."
          : "A haladásod helyben megmarad, amíg újra nem kapcsolódunk."
  return <aside className={"guest-save-banner save-" + status} role="status" aria-live="polite">
    <span className="guest-save-banner-icon"><Cloud size={19} aria-hidden="true" /></span>
    <span className="guest-save-banner-copy">
      <strong>Vendégprofil · {userName}</strong>
      <small>{message}</small>
    </span>
    {(status === "local" || status === "error") && <button type="button" onClick={onRetry}>Újrapróbál</button>}
  </aside>
}

function UserAvatar({ userName, avatar, avatarImage, variant }: {
  userName: string
  avatar: string
  avatarImage: string
  variant: "header" | "nav"
}) {
  const FallbackIcon = avatar === "book" ? BookOpen : avatar === "star" ? Star : avatar === "spark" ? Sparkles : null
  if (avatarImage) {
    return <span className={"learn-user-avatar learn-user-avatar-" + variant}>
      <Image src={avatarImage} alt={"Profilkép: " + userName} width={variant === "header" ? 40 : 24} height={variant === "header" ? 40 : 24} unoptimized />
    </span>
  }
  if (FallbackIcon) {
    return <span className={"learn-user-avatar learn-user-avatar-" + variant} role="img" aria-label={"Profilkép: " + userName}>
      <FallbackIcon aria-hidden="true" size={variant === "header" ? 17 : 16} strokeWidth={2.2} />
    </span>
  }
  return <span className={"learn-user-avatar learn-user-avatar-" + variant}>
    <Image src={foxIcon} alt={"Evölingo alapértelmezett profilképe, " + userName} width={variant === "header" ? 40 : 24} height={variant === "header" ? 40 : 24} unoptimized />
  </span>
}


type ProjectAccent = "blue" | "sage" | "amber" | "rose" | "slate"

const projectAccents: Record<ProjectAccent, { cover: string; edge: string; line: string }> = {
  blue: { cover: "#3979A8", edge: "#275A80", line: "#DCEAF4" },
  sage: { cover: "#56836B", edge: "#3C624E", line: "#DCEAE0" },
  amber: { cover: "#C1843F", edge: "#95612A", line: "#F1E2CD" },
  rose: { cover: "#BD7074", edge: "#8E4E53", line: "#F2DEDF" },
  slate: { cover: "#687A8E", edge: "#485869", line: "#DFE5EA" },
}

function getProjectAccent(project: string): ProjectAccent {
  if (project === "Erasmus+" || project === "Erasmus") return "blue"
  const variants: ProjectAccent[] = ["sage", "amber", "rose", "slate"]
  let hash = 0
  for (let index = 0; index < project.length; index++) {
    hash = (hash * 31 + project.charCodeAt(index)) >>> 0
  }
  return variants[hash % variants.length]
}

function ProjectNotebookIcon({ accent }: { accent: ProjectAccent }) {
  const colors = projectAccents[accent]
  return <svg
    className="project-notebook-icon"
    viewBox="0 0 32 32"
    width="32"
    height="32"
    fill="none"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M9 5.5h16.7a2.3 2.3 0 0 1 2.3 2.3v17.1a2.1 2.1 0 0 1-2.1 2.1H9z" fill={colors.edge} opacity=".28" />
    <path d="M9.2 4.2H24a2 2 0 0 1 2 2v19.4a2 2 0 0 1-2 2H9.2z" fill={colors.edge} />
    <rect x="5.5" y="3.1" width="19" height="25" rx="3" fill={colors.cover} />
    <path d="M8.2 5.5h13.8v20.1H8.2z" fill="#fff" opacity=".97" />
    <path d="M10.3 10.2h9.4M10.3 13.7h9.4M10.3 17.2h9.4M10.3 20.7h6.5" stroke={colors.line} strokeWidth="1.15" strokeLinecap="round" />
    <path d="M6.4 6.2c-2.1 0-2.1 3.4 0 3.4s2.1-3.4 0-3.4Zm0 5.8c-2.1 0-2.1 3.4 0 3.4s2.1-3.4 0-3.4Zm0 5.8c-2.1 0-2.1 3.4 0 3.4s2.1-3.4 0-3.4Zm0 5.8c-2.1 0-2.1 3.4 0 3.4s2.1-3.4 0-3.4Z" fill="#F8FAFC" stroke={colors.edge} strokeWidth=".5" />
    <path d="M5.5 3.8v23.5" stroke={colors.edge} strokeWidth=".7" opacity=".65" />
  </svg>
}

function Home({ completedLessons, readLessons, answeredTasks, stars, xp, dailyStudy, notice, clearNotice, onOpenLesson, onOpenTask, onOpenProfile, userName, avatar, avatarImage }: {
  completedLessons: number[]
  readLessons: number[]
  answeredTasks: string[]
  stars: number
  xp: number
  dailyStudy: DailyStudyState
  notice: string
  clearNotice: () => void
  onOpenLesson: (id: number) => void
  onOpenTask: (lessonId: number, index: number, sourceLessonId?: number, forceOpen?: boolean) => void
  onOpenProfile: () => void
  userName: string
  avatar: string
  avatarImage: string
}) {
  const unitLessons = fullLessons
  const [projects, setProjects] = useState<string[]>(["Erasmus+"])
  const [activeProject, setActiveProject] = useState("Erasmus+")
  const [projectStorageReady, setProjectStorageReady] = useState(false)
  const [projectQuery, setProjectQuery] = useState("")
  const [createProjectOpen, setCreateProjectOpen] = useState(false)
  const [newProjectName, setNewProjectName] = useState("")
  const projectSearchRef = useRef<HTMLInputElement | null>(null)
  const pathNodes = activeProject === "Erasmus+" || activeProject === "Erasmus" ? learningPathNodes : []
  const filteredProjects = projects.filter(project => project.toLowerCase().includes(projectQuery.trim().toLowerCase()))
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("evolingo.projects.v1")
      if (saved) {
        const parsed = JSON.parse(saved) as { projects?: unknown; activeProject?: unknown }
        if (Array.isArray(parsed.projects)) {
          const safeProjects = [...new Set(parsed.projects
            .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
            .map(value => value.trim() === "Erasmus" ? "Erasmus+" : value.trim()))]
          if (!safeProjects.includes("Erasmus+")) safeProjects.unshift("Erasmus+")
          setProjects(safeProjects)
          if (typeof parsed.activeProject === "string") {
            const savedActiveProject = parsed.activeProject === "Erasmus" ? "Erasmus+" : parsed.activeProject
            if (safeProjects.includes(savedActiveProject)) setActiveProject(savedActiveProject)
          }
        }
      }
    } catch {
      // The default Erasmus project remains usable when local preferences are unavailable.
    } finally {
      setProjectStorageReady(true)
    }
  }, [])
  useEffect(() => {
    if (!projectStorageReady) return
    try {
      window.localStorage.setItem("evolingo.projects.v1", JSON.stringify({ projects, activeProject }))
    } catch {
      // Keep project management working for the current session if storage is full.
    }
  }, [projectStorageReady, projects, activeProject])
  const currentLessonId = unitLessons.find(lesson => !completedLessons.includes(lesson.id))?.id ?? null
  const completedCount = unitLessons.filter(lesson => completedLessons.includes(lesson.id)).length
  const progress = unitLessons.length ? Math.round(completedCount / unitLessons.length * 100) : 0
  const pathHeight = Math.max(150, (pathNodes.length - 1) * 132 + 150)
  const pathRef = useRef<HTMLDivElement | null>(null)
  const sheetRef = useRef<HTMLElement | null>(null)
  const nodeRefs = useRef<Map<string, HTMLButtonElement>>(new Map())
  const [pathSize, setPathSize] = useState({ width: 0, height: 0 })
  const [connectorPaths, setConnectorPaths] = useState<string[]>([])
  const [sheetHeight, setSheetHeight] = useState(22)
  const [forcedOpenNodeKeys, setForcedOpenNodeKeys] = useState<string[]>([])
  const tripleClickTracker = useRef<{ key: string; count: number; lastAt: number }>({ key: "", count: 0, lastAt: 0 })
  const dragStart = useRef<{ y: number; height: number } | null>(null)
  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragStart.current = { y: event.clientY, height: sheetHeight }
    event.currentTarget.setPointerCapture(event.pointerId)
    event.preventDefault()
  }
  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStart.current) return
    const delta = dragStart.current.y - event.clientY
    const nextHeight = Math.max(22, Math.min(78, dragStart.current.height + delta / Math.max(1, window.innerHeight) * 100))
    setSheetHeight(nextHeight)
  }
  const handlePointerUp = () => {
    if (!dragStart.current) return
    // Release always snaps to the nearest resting position; the handle never leaves the sheet halfway open.
    setSheetHeight(height => Math.abs(height - 22) <= Math.abs(height - 78) ? 22 : 78)
    dragStart.current = null
  }

  // The home screen owns the viewport; only the learning sheet itself may scroll.
  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    const previous = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      bodyOverscroll: body.style.overscrollBehavior,
    }
    html.style.overflow = "hidden"
    body.style.overflow = "hidden"
    body.style.overscrollBehavior = "none"
    return () => {
      html.style.overflow = previous.htmlOverflow
      body.style.overflow = previous.bodyOverflow
      body.style.overscrollBehavior = previous.bodyOverscroll
    }
  }, [])

  const handleHomeBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (sheetHeight <= 28) return
    const target = event.target as HTMLElement
    if (target.closest(".learn-sheet, .learn-project-tile, .learn-floating-create, .learn-header, .learn-project-search, .learn-stats-row, .learn-project-modal-backdrop, .bottom-nav")) return
    setSheetHeight(22)
  }
  const getNodeStatus = useCallback((node: LearningPathNode): "completed" | "current" | "locked" => {
    const sourceLesson = unitLessons.find(lesson => lesson.id === node.lessonId)
    if (!sourceLesson) return "locked"
    const sourceIsUnlocked = sourceLesson.id === unitLessons[0]?.id || completedLessons.includes(sourceLesson.id - 1)

    if (node.kind === "lesson") {
      if (completedLessons.includes(node.lessonId)) return "completed"
      return node.lessonId === currentLessonId ? "current" : "locked"
    }

    const activityId = node.specialId ?? node.lessonId
    const activityLesson = node.specialId
      ? pathActivityLessons.find(lesson => lesson.id === node.specialId)
      : sourceLesson
    const activityComplete = !!activityLesson?.questions.every((_, questionIndex) =>
      answeredTasks.includes(activityId + "-" + questionIndex)
    )
    if (activityComplete) return "completed"
    return sourceIsUnlocked && readLessons.includes(node.lessonId) ? "current" : "locked"
  }, [unitLessons, completedLessons, currentLessonId, answeredTasks, readLessons])

  const statusKey = pathNodes.map(node => node.key + ":" + (forcedOpenNodeKeys.includes(node.key) ? "forced" : getNodeStatus(node))).join("|")

  // Keep the newest available stop in view when the path opens or progress changes.
  useEffect(() => {
    let frame = 0
    frame = window.requestAnimationFrame(() => {
      const latestAvailable = [...pathNodes].reverse().find(node => getNodeStatus(node) === "current")
      const target = latestAvailable ? nodeRefs.current.get(latestAvailable.key) : null
      const sheet = sheetRef.current
      if (!target || !sheet) return
      const sheetRect = sheet.getBoundingClientRect()
      const targetRect = target.getBoundingClientRect()
      const targetTop = targetRect.top - sheetRect.top + sheet.scrollTop
      const centeredTop = targetTop - sheet.clientHeight * 0.42
      sheet.scrollTo({ top: Math.max(0, centeredTop), behavior: "smooth" })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [statusKey, sheetHeight, getNodeStatus, pathNodes])

  useEffect(() => {
    const host = pathRef.current
    if (!host) return
    let frame = 0
    const updateConnectors = () => {
      const bounds = host.getBoundingClientRect()
      const points = pathNodes.map(node => {
        const nodeElement = nodeRefs.current.get(node.key)
        if (!nodeElement) return null
        const rect = nodeElement.getBoundingClientRect()
        return { x: rect.left + rect.width / 2 - bounds.left, y: rect.top + rect.height / 2 - bounds.top }
      })
      const paths: string[] = []
      for (let index = 0; index < points.length - 1; index++) {
        const from = points[index]
        const to = points[index + 1]
        if (!from || !to) continue
        const controlY = from.y + (to.y - from.y) * 0.5
        paths.push("M " + from.x + " " + from.y + " C " + from.x + " " + controlY + ", " + to.x + " " + controlY + ", " + to.x + " " + to.y)
      }
      setPathSize(previous => previous.width === bounds.width && previous.height === bounds.height ? previous : { width: bounds.width, height: bounds.height })
      setConnectorPaths(previous => previous.length === paths.length && previous.every((path, index) => path === paths[index]) ? previous : paths)
    }
    const scheduleUpdate = () => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(updateConnectors)
    }
    scheduleUpdate()
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(scheduleUpdate) : null
    observer?.observe(host)
    window.addEventListener("resize", scheduleUpdate)
    return () => {
      window.cancelAnimationFrame(frame)
      observer?.disconnect()
      window.removeEventListener("resize", scheduleUpdate)
    }
  }, [statusKey, pathNodes.length, pathHeight, sheetHeight])

  return <div className="learn-home-screen" onClick={handleHomeBackdropClick}>
    <div className="learn-home-gradient" aria-hidden="true" />
    <header className="learn-header">
      <Brand />
      <button className="learn-header-profile" type="button" onClick={onOpenProfile} aria-label={"Profil: " + userName}>
        <UserAvatar userName={userName} avatar={avatar} avatarImage={avatarImage} variant="header" />
      </button>
    </header>
    <section className="learn-home-intro" aria-label="Learning projects">
      <h2 className="learn-greeting">Hello, {userName.trim().split(/\s+/)[0] || "there"}!</h2>
      <label className="learn-project-search">
        <span className="sr-only">Filter projects</span>
        <input
          ref={projectSearchRef}
          type="search"
          value={projectQuery}
          onChange={event => { setProjectQuery(event.target.value); setSheetHeight(22) }}
          placeholder="Filter projects..."
          autoComplete="off"
        />
        <Search size={21} strokeWidth={1.9} aria-hidden="true" />
        {projectQuery && <button type="button" className="learn-search-clear" aria-label="Clear project filter" onClick={() => { setProjectQuery(""); projectSearchRef.current?.blur() }}><X size={16} /></button>}
      </label>
      <div className="learn-project-grid" aria-label="Projects">
        {filteredProjects.map(project => <button
          type="button"
          key={project}
          className={"learn-project-tile" + (project === activeProject ? " selected" : "") + (project === "Erasmus+" || project === "Erasmus" ? " learn-project-tile-erasmus" : "")}
          aria-pressed={project === activeProject}
          onClick={() => {
            const normalized = project === "Erasmus" ? "Erasmus+" : project
            setActiveProject(normalized)
            setProjectQuery("")
            setSheetHeight(78)
          }}
        >
          <span className="learn-project-tile-symbol" aria-hidden="true">
            <ProjectNotebookIcon accent={getProjectAccent(project)} />
          </span>
          <span className="learn-project-tile-title">{project === "Erasmus" ? "Erasmus+" : project}</span>
        </button>)}
        <button type="button" className="learn-project-tile learn-project-tile-add" onClick={() => { setNewProjectName(projectQuery.trim()); setCreateProjectOpen(true) }} aria-label="Create a new project">
          <span className="learn-project-add-ring"><Plus size={26} strokeWidth={2.3} aria-hidden="true" /></span>
          <span className="learn-project-add-label">New project</span>
        </button>
        {filteredProjects.length === 0 && <p className="learn-project-empty">No matching projects. Create one to get started.</p>}
      </div>
    </section>
    <button type="button" className="learn-floating-create" onClick={() => { setNewProjectName(""); setCreateProjectOpen(true) }} aria-label="Create a new project" title="Create a new project">
      <Plus size={25} strokeWidth={2.4} aria-hidden="true" />
    </button>
    <div className="learn-stats-row" aria-label="Tanulási statisztikák">
      <div className="learn-stat-chip learn-streak-chip" aria-label={"Sorozat: " + dailyStudy.streak + " nap"}>
        <span className="learn-stat-label">Streak</span>
        <strong className="learn-stat-value">{dailyStudy.streak}</strong>
      </div>
      <div className="learn-stat-chip learn-points-chip" aria-label={stars + " csillag"}>
        <span className="learn-stat-label">Stars</span>
        <strong className="learn-stat-value">{stars}</strong>
      </div>
      <div className="learn-stat-chip learn-xp-chip" aria-label={xp + " XP"}>
        <span className="learn-stat-label">XP</span>
        <strong className="learn-stat-value">{xp}</strong>
      </div>
    </div>
    {notice && <button className="inline-notice learn-inline-notice" type="button" onClick={clearNotice}><span>{notice}</span><X size={16} aria-hidden="true" /></button>}

    <section className={"learn-sheet " + (sheetHeight <= 28 ? "learn-sheet-collapsed" : "learn-sheet-expanded")} ref={sheetRef} style={{ ["--learn-sheet-height" as string]: sheetHeight + "dvh" } as React.CSSProperties} aria-label="Tanulási útvonal">
      <div
        className="learn-sheet-handle"
        role="slider"
        aria-label="Tanulási panel magassága"
        aria-orientation="vertical"
        aria-valuemin={22}
        aria-valuemax={78}
        aria-valuenow={Math.round(sheetHeight)}
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={event => {
          if (event.key === "ArrowUp" || event.key === "Enter" || event.key === " ") { event.preventDefault(); setSheetHeight(78) }
          if (event.key === "ArrowDown" || event.key === "Escape") { event.preventDefault(); setSheetHeight(22) }
        }}
      />
      {sheetHeight > 28 && <>
      {activeProject === "Erasmus+" || activeProject === "Erasmus" ? <>
      <div className="learn-sheet-heading">
        <h1>Erasmus+</h1>
        <div className="learn-theme-row">
          <span className="learn-theme-icon" aria-hidden="true"><Languages size={18} strokeWidth={2.3} /></span>
          <span>Angol nyelvtanulás</span>
        </div>
        <p>Válassz egy leckét az útvonalon a tanulás megkezdéséhez.</p>
        <div className="learn-progress-row">
          <div className="learn-progress-track" role="progressbar" aria-label="Leckék teljesítése" aria-valuemin={0} aria-valuemax={unitLessons.length} aria-valuenow={completedCount}>
            <span style={{ width: progress + "%" }} />
          </div>
          <span className="learn-progress-value">{completedCount} / {unitLessons.length}</span>
        </div>
      </div>

      <div className="learn-path-track" ref={pathRef} style={{ height: pathHeight + "px" }}>
        <svg className="learn-path-connectors" width="100%" height="100%" viewBox={"0 0 " + Math.max(1, pathSize.width) + " " + Math.max(1, pathSize.height)} preserveAspectRatio="none" aria-hidden="true">
          {connectorPaths.map((path, index) => <path key={index} d={path} />)}
        </svg>
        {pathNodes.map((node, index) => {
          const sourceLesson = unitLessons.find(lesson => lesson.id === node.lessonId)
          if (!sourceLesson) return null
          const naturalStatus = getNodeStatus(node)
          const isForcedOpen = forcedOpenNodeKeys.includes(node.key)
          const status = isForcedOpen && naturalStatus === "locked" ? "current" : naturalStatus
          const lessonIndex = unitLessons.findIndex(lesson => lesson.id === node.lessonId)
          const label = node.kind === "lesson"
            ? "Lesson " + (lessonIndex + 1)
            : node.kind === "task" ? "Task"
              : node.kind === "words" ? "New Words"
                : node.kind === "hard" ? "Hard Task" : "Test"
          const stateLabel = status === "completed" ? "completed" : status === "current" ? "available" : "locked"
          const activityDescription = node.kind === "lesson"
            ? sourceLesson.title
            : label + " for " + sourceLesson.title
          const icon = node.kind === "lesson"
            ? <BookOpen size={30} strokeWidth={2.2} aria-hidden="true" />
            : node.kind === "task" ? <ClipboardCheck size={27} strokeWidth={2.2} aria-hidden="true" />
              : node.kind === "words" ? <Languages size={27} strokeWidth={2.2} aria-hidden="true" />
                : node.kind === "hard" ? <Dumbbell size={27} strokeWidth={2.3} aria-hidden="true" />
                  : <Timer size={27} strokeWidth={2.2} aria-hidden="true" />
          return <div className={"learn-path-node learn-path-node-" + status + " learn-path-node-kind-" + node.kind} key={node.key} style={{ left: (index % 2 === 0 ? 35 : 65) + "%", top: index * 132 + "px" }}>
            <button
              ref={element => {
                if (element) nodeRefs.current.set(node.key, element)
                else nodeRefs.current.delete(node.key)
              }}
              type="button"
              className="learn-path-node-button"
              aria-disabled={status === "locked"}
              aria-label={activityDescription + ", " + (isForcedOpen ? "force-opened" : stateLabel) + ". Triple-click to force open."}
              onClick={() => {
                // Completed lessons and activities are final: never reopen them for replay.
                if (naturalStatus === "completed") return
                const now = Date.now()
                const previous = tripleClickTracker.current
                const count = previous.key === node.key && now - previous.lastAt <= 650
                  ? previous.count + 1
                  : 1
                tripleClickTracker.current = { key: node.key, count, lastAt: now }

                if (count >= 3) {
                  tripleClickTracker.current = { key: "", count: 0, lastAt: 0 }
                  setForcedOpenNodeKeys(keys => keys.includes(node.key) ? keys : [...keys, node.key])
                  if (node.kind === "lesson") onOpenLesson(node.lessonId)
                  else onOpenTask(node.specialId ?? node.lessonId, 0, node.lessonId, true)
                  return
                }

                if (naturalStatus === "locked") return
                if (node.kind === "lesson") onOpenLesson(node.lessonId)
                else onOpenTask(node.specialId ?? node.lessonId, 0, node.lessonId)
              }}
            >
              {icon}
              {status === "completed" && <span className="learn-path-node-check" aria-hidden="true"><Check size={17} strokeWidth={3} /></span>}
            </button>
            <span className="learn-path-node-label">{label}</span>
            {status === "current" && node.kind === "lesson" && <span className="learn-start-pill">START</span>}
          </div>
        })}
      </div>
      </> : <div className="learn-project-empty-state">
        <span className="learn-project-empty-icon"><GraduationCap size={27} /></span>
        <h2>{activeProject}</h2>
        <p>This project is ready for your learning materials. Choose Erasmus+ to continue with the English grammar path.</p>
        <button type="button" onClick={() => { setActiveProject("Erasmus+"); setSheetHeight(78) }}>Open Erasmus lessons <ChevronRight size={17} /></button>
      </div>}
      </>}
    </section>
    {createProjectOpen && <div className="learn-project-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setCreateProjectOpen(false) }}>
      <section className="learn-project-modal" role="dialog" aria-modal="true" aria-labelledby="learn-project-modal-title">
        <div className="learn-project-modal-heading">
          <span className="learn-project-modal-icon"><Plus size={22} /></span>
          <button type="button" className="learn-project-modal-close" aria-label="Close" onClick={() => setCreateProjectOpen(false)}><X size={20} /></button>
        </div>
        <h2 id="learn-project-modal-title">Create a project</h2>
        <p>Organize a new topic or learning goal in its own space.</p>
        <form onSubmit={event => {
          event.preventDefault()
          const name = newProjectName.trim().slice(0, 40)
          if (!name) return
          const existing = projects.find(project => project.toLocaleLowerCase() === name.toLocaleLowerCase())
          const selected = existing ?? name
          setProjects(current => existing ? current : [...current, name])
          setActiveProject(selected)
          setProjectQuery("")
          setSheetHeight(22)
          setCreateProjectOpen(false)
        }}>
          <label htmlFor="learn-project-name">Project name</label>
          <input id="learn-project-name" autoFocus maxLength={40} value={newProjectName} onChange={event => setNewProjectName(event.target.value)} placeholder="e.g. Biology, History..." required />
          <button type="submit" disabled={!newProjectName.trim()}>Create project <ArrowRight size={18} /></button>
        </form>
      </section>
    </div>}
  </div>
}
function LessonIntro({ lesson, onExit, onReadComplete, onPractice, alreadyRead }: {
  lesson: LessonUnit; onExit: () => void; onReadComplete: () => void; onPractice: () => void; alreadyRead: boolean
}) {
  const [secondsLeft, setSecondsLeft] = useState(alreadyRead ? 0 : 30)
  const [readingComplete, setReadingComplete] = useState(alreadyRead)
  useEffect(() => {
    if (readingComplete) return
    const timer = window.setInterval(() => setSecondsLeft((seconds) => Math.max(0, seconds - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [readingComplete])
  useEffect(() => {
    if (secondsLeft === 0 && !readingComplete) {
      setReadingComplete(true)
      onReadComplete()
    }
  }, [secondsLeft, readingComplete, onReadComplete])
  const circumference = 2 * Math.PI * 18
  const progress = (30 - secondsLeft) / 30
  return <div className="lesson-layout lesson-intro-layout lesson-reader" data-lesson-theme={lesson.id}>
    <header className="lesson-topbar">
      <button className="exit-lesson ios-glass-button" onClick={onExit} aria-label="Vissza a tanulási útvonalhoz"><X size={27} /></button>
      <div className="intro-top-title"><span>LESSON {String(lesson.id).padStart(2, "0")}</span><strong>{lesson.title}</strong></div>
    </header>
    <div className="intro-scroll-content">
      <div className="intro-hero">
        <div className="intro-hero-mascot"><img src={foxIcon} alt="Evölingo fox" /></div>
        <span className="intro-eyebrow">ANGOL NYELVTAN · {lesson.level}</span>
        <h1>{lesson.title}</h1>
        <div className="intro-meta"><span><BookOpen size={15} /> Tananyag</span><span><Zap size={15} /> +10 XP for reading</span></div>
      </div>
      <LessonContentBlockView block={{ type: "image", src: (lessonIllustrations[lesson.id] ?? lessonIllustrations[1]).src, alt: (lessonIllustrations[lesson.id] ?? lessonIllustrations[1]).alt, caption: (lessonIllustrations[lesson.id] ?? lessonIllustrations[1]).alt, layout: "hero", aspect: "natural", fit: "contain" }} />
      {lesson.sections.map((section, index) => <LessonSectionContent section={section} index={index} key={section.title} />)}
      <section className="lesson-note-block"><h2>Gyors összefoglaló</h2><ul className="lesson-summary-list">{lesson.sections.slice(0, 3).map((section) => <li key={section.title}>{section.title}: {getLessonSectionSummary(section)}.</li>)}</ul></section>
      
      <div className="reading-inline-status">{readingComplete ? <><CheckCircle2 size={19} /><span>Tananyag elolvasva · +10 XP</span></> : <><BookOpen size={19} /><span>Olvasd át a tananyagot. A körben láthatod a hátralévő időt.</span></>}</div>
      {readingComplete && <div className="reading-complete-state"><div><strong>Mehetünk tovább!</strong><p>A leckéhez tartozó négy feladat most már elérhető az útvonalon.</p></div><button className="primary-action" onClick={onPractice}>Feladatok megnyitása <ArrowRight size={19} /></button></div>}
    </div>
  </div>
}

function getLessonSectionSummary(section: LessonSection): string {
  const paragraph = section.blocks?.find((block): block is Extract<LessonContentBlock, { type: "paragraph" }> => block.type === "paragraph")
  const richText = paragraph?.text
  const source = section.body ?? (typeof richText === "string" ? richText : richText?.map((run) => run.text).join(" ")) ?? section.title
  return source.split(".")[0] || section.title
}

function LessonInlineText({ value }: { value: LessonText }) {
  if (Array.isArray(value)) {
    return <>{value.map((run, index) => <span key={index} className={(run.marks ?? []).map((mark) => "lesson-mark-" + mark).join(" ") || undefined}>{run.text}</span>)}</>
  }

  const tokens = value.split(/(\*\*[^*]+\*\*|==[^=]+==|`[^\`]+`|\*[^*]+\*)/g).filter(Boolean)
  return <>{tokens.map((token, index) => {
    if (token.startsWith("**") && token.endsWith("**")) return <strong key={index}>{token.slice(2, -2)}</strong>
    if (token.startsWith("==") && token.endsWith("==")) return <mark key={index} className="lesson-mark-highlight">{token.slice(2, -2)}</mark>
    if (token.startsWith("`") && token.endsWith("`")) return <code key={index} className="lesson-mark-code">{token.slice(1, -1)}</code>
    if (token.startsWith("*") && token.endsWith("*")) return <em key={index}>{token.slice(1, -1)}</em>
    return <span key={index}>{token}</span>
  })}</>
}

function LessonContentBlockView({ block }: { block: LessonContentBlock }) {
  if (block.type === "paragraph") {
    return <p className={"lesson-block-paragraph size-" + (block.size ?? "normal") + " align-" + (block.align ?? "left")}><LessonInlineText value={block.text} /></p>
  }
  if (block.type === "heading") {
    const headingText = <LessonInlineText value={block.text} />
    return block.level === 4 ? <h4 className="lesson-block-heading">{headingText}</h4> : <h3 className="lesson-block-heading">{headingText}</h3>
  }
  if (block.type === "example") {
    return <figure className="lesson-example">
      <figcaption>{block.label ?? "PÉLDA"}</figcaption>
      <p><LessonInlineText value={block.sentence} /></p>
      {block.translation && <small><LessonInlineText value={block.translation} /></small>}
      {block.note && <div className="lesson-example-note"><LessonInlineText value={block.note} /></div>}
    </figure>
  }
  if (block.type === "table") {
    return <div className="lesson-table-wrap">
      {block.caption && <p className="lesson-table-caption">{block.caption}</p>}
      <table className="lesson-content-table">
        {block.headers?.length ? <thead><tr>{block.headers.map((header, index) => <th scope="col" key={index}>{header}</th>)}</tr></thead> : null}
        <tbody>{block.rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{!block.headers?.length && cellIndex > 0 ? <strong>{cell}</strong> : <span>{cell}</span>}</td>)}</tr>)}</tbody>
      </table>
    </div>
  }
  if (block.type === "callout") {
    const CalloutIcon = block.icon === "check" || block.tone === "success" ? CheckCircle2 : block.icon === "book" ? BookOpen : block.icon === "info" ? Zap : Lightbulb
    return <aside className={"lesson-content-callout tone-" + (block.tone ?? "neutral")}>
      <CalloutIcon size={19} aria-hidden="true" />
      <div>{block.title && <strong>{block.title}</strong>}<p><LessonInlineText value={block.text} /></p></div>
    </aside>
  }
  if (block.type === "list") {
    const items = block.items.map((item, index) => <li key={index}><LessonInlineText value={item} /></li>)
    if (block.style === "numbered") return <ol className="lesson-content-list style-numbered">{items}</ol>
    if (block.style === "check") return <ul className="lesson-content-list style-check">{items}</ul>
    return <ul className="lesson-content-list style-bullet">{items}</ul>
  }
  if (block.type === "image") {
    const layout = block.layout ?? "full"
    return <figure className={"lesson-content-media layout-" + layout + " aspect-" + (block.aspect ?? "natural") + " fit-" + (block.fit ?? "cover")}>
      <img src={block.src} alt={block.alt} loading="lazy" />
      {block.title && <strong className="lesson-media-title">{block.title}</strong>}
      {block.text && <div className="lesson-media-text"><LessonInlineText value={block.text} /></div>}
      {block.caption && <figcaption>{block.caption}</figcaption>}
    </figure>
  }
  if (block.type === "quote") {
    return <blockquote className="lesson-content-quote"><p><LessonInlineText value={block.text} /></p>{block.attribution && <cite>{block.attribution}</cite>}</blockquote>
  }
  if (block.type === "formula") {
    return <div className="lesson-formula">{block.label && <span>{block.label}</span>}<code>{block.value}</code>{block.explanation && <p><LessonInlineText value={block.explanation} /></p>}</div>
  }
  if (block.type === "vocabulary") {
    return <dl className="lesson-vocabulary">{block.items.map((item) => <div key={item.term}><dt>{item.term}</dt><dd>{item.meaning}{item.example && <small>{item.example}</small>}</dd></div>)}</dl>
  }
  if (block.type === "comparison") {
    return <div className="lesson-comparison">
      {[block.left, block.right].map((side) => <section key={side.title}><h4>{side.title}</h4><ul>{side.items.map((item) => <li key={item}>{item}</li>)}</ul></section>)}
    </div>
  }
  return <div className="lesson-content-divider" aria-hidden="true">{block.label && <span>{block.label}</span>}</div>
}

function LessonSectionContent({ section, index }: { section: LessonSection; index: number }) {
  const blocks: LessonContentBlock[] = section.blocks ?? [
    ...(section.body ? [{ type: "paragraph" as const, text: section.body }] : []),
    ...(section.rows?.length ? [{ type: "table" as const, rows: section.rows.map(([left, right]) => [left, right]) }] : []),
    ...(section.examples ?? []).map((example) => ({ type: "example" as const, sentence: example.sentence, translation: example.translation })),
    ...(section.tip ? [{ type: "callout" as const, text: section.tip, tone: "tip" as const, icon: "lightbulb" as const }] : []),
  ]
  return <section className="lesson-note-block" key={section.title}>
    <h2>{index + 1}. {section.title}</h2>
    {blocks.map((block, blockIndex) => <LessonContentBlockView block={block} key={section.title + "-" + block.type + "-" + blockIndex} />)}
  </section>
}

function playAnswerSound(correct: boolean) {
  try {
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return
    const context = new AudioContextClass()
    const now = context.currentTime
    // Pick a different tiny synthesized UI sound on each submitted answer.
    const effects = correct
      ? [
          { notes: [660, 880], wave: "sine" as OscillatorType, step: 0.075, duration: 0.19 },
          { notes: [523, 659, 784], wave: "triangle" as OscillatorType, step: 0.055, duration: 0.22 },
          { notes: [740, 988], wave: "sine" as OscillatorType, step: 0.065, duration: 0.18 },
          { notes: [587, 784, 1046], wave: "triangle" as OscillatorType, step: 0.045, duration: 0.2 },
        ]
      : [
          { notes: [260, 196], wave: "sine" as OscillatorType, step: 0.07, duration: 0.17 },
          { notes: [330, 247], wave: "triangle" as OscillatorType, step: 0.055, duration: 0.16 },
          { notes: [294, 220, 185], wave: "sine" as OscillatorType, step: 0.045, duration: 0.18 },
          { notes: [370, 277], wave: "triangle" as OscillatorType, step: 0.06, duration: 0.16 },
        ]
    const effect = effects[Math.floor(Math.random() * effects.length)]
    effect.notes.forEach((frequency, index) => {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      const start = now + index * effect.step
      const end = Math.max(start + 0.045, now + effect.duration)
      oscillator.type = effect.wave
      oscillator.frequency.setValueAtTime(frequency, start)
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(0.085, start + 0.012)
      gain.gain.exponentialRampToValueAtTime(0.0001, end)
      oscillator.connect(gain)
      gain.connect(context.destination)
      oscillator.start(start)
      oscillator.stop(end + 0.01)
      if (index === effect.notes.length - 1) oscillator.onended = () => { void context.close() }
    })
    if (context.state === "suspended") void context.resume()
  } catch { /* Sound is optional; keep the exercise working if audio is unavailable. */ }
}

function TaskExercise({ lesson, taskIndex, onExit, onComplete, lives, onWrongAnswer, onNextQuestion, onOutOfLives }: {
  lesson: LessonUnit; taskIndex: number; onExit: () => void; onComplete: () => void;
  lives: number; onWrongAnswer: () => void; onNextQuestion: (index: number) => void; onOutOfLives: () => void
}) {
  const question = lesson.questions[taskIndex]
  const [selectedAnswer, setSelectedAnswer] = useState("")
  const [typedAnswer, setTypedAnswer] = useState("")
  const [selectedWords, setSelectedWords] = useState<string[]>([])
  const [checked, setChecked] = useState(false)
  const [answerCorrect, setAnswerCorrect] = useState(false)
  const [rewardPulse, setRewardPulse] = useState(false)
  const [heartLost, setHeartLost] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(30)
  const isTimedChallenge = lesson.specialType === "timed"
  const currentAnswer = question.type === "choice" ? selectedAnswer : question.type === "text" ? typedAnswer : selectedWords.map((item) => item.split(":").slice(1).join(":")).join(" ")
  const canCheck = currentAnswer.trim().length > 0 && lives > 0
  const acceptedAnswers = [question.answer, ...(question.accepted ?? [])]
  const resetAnswer = () => { setSelectedAnswer(""); setTypedAnswer(""); setSelectedWords([]); setChecked(false); setAnswerCorrect(false); setHeartLost(false); if (isTimedChallenge) setSecondsLeft(30) }
  useEffect(() => { setSelectedAnswer(""); setTypedAnswer(""); setSelectedWords([]); setChecked(false); setAnswerCorrect(false); setHeartLost(false); setRewardPulse(false); setSecondsLeft(30) }, [taskIndex])
  useEffect(() => { if (!isTimedChallenge || checked || secondsLeft <= 0) return; const timer = window.setTimeout(() => setSecondsLeft(value => value - 1), 1000); return () => window.clearTimeout(timer) }, [isTimedChallenge, checked, secondsLeft])
  useEffect(() => { if (isTimedChallenge && secondsLeft === 0 && !checked) { setChecked(true); setAnswerCorrect(false); setHeartLost(true); onWrongAnswer() } }, [isTimedChallenge, secondsLeft, checked, onWrongAnswer])
  const submitAnswer = () => {
    if (lives <= 0) { onOutOfLives(); return }
    if (checked && !answerCorrect) { resetAnswer(); return }
    if (checked && answerCorrect) {
      if (taskIndex + 1 < lesson.questions.length) {
        onNextQuestion(taskIndex + 1)
      } else {
        onComplete()
      }
      return
    }
    const correct = acceptedAnswers.some((answer) => normalizeAnswer(answer) === normalizeAnswer(currentAnswer))
    playAnswerSound(correct)
    setAnswerCorrect(correct)
    setChecked(true)
    if (correct) {
      setRewardPulse(true)
      window.setTimeout(() => setRewardPulse(false), 750)
    } else {
      setHeartLost(true)
      onWrongAnswer()
    }
  }
  const toggleWord = (word: string, position: number) => {
    if (checked || lives <= 0) return
    setSelectedWords((previous) => previous.includes(position + ":" + word) ? previous.filter((item) => item !== position + ":" + word) : [...previous, position + ":" + word])
  }
  const chosenWords = selectedWords.map((item) => item.split(":").slice(1).join(":"))
  const buttonLabel = lives <= 0 ? "Vissza az útvonalhoz" : checked ? (answerCorrect ? (taskIndex + 1 === lesson.questions.length ? "Csomag befejezése" : "Következő kérdés") : "Próbáld újra") : "Ellenőrzés"
  const progress = Math.round((taskIndex / lesson.questions.length) * 100)
  if (lives <= 0) return <div className="lesson-layout task-exercise-layout"><header className="lesson-topbar"><button className="exit-lesson" onClick={onOutOfLives} aria-label="Kilépés"><X size={27} /></button><div className="intro-top-title"><span>{lesson.title}</span><strong>Próba vége</strong></div><div className="lesson-hearts"><Heart size={21} fill="#e94f64" /><strong>0</strong></div></header><div className="session-ended"><div className="session-ended-heart"><Heart size={52} fill="currentColor" /></div><h1>Elfogytak az életeid</h1><p>A kérdéssort most nem tudod folytatni. Térj vissza az útvonalhoz, és később indíts új próbát.</p><button className="primary-action" onClick={onOutOfLives}>Vissza a tanuláshoz</button></div></div>
  return <div className="lesson-layout task-exercise-layout">
    <header className="lesson-topbar">
      <button className="exit-lesson ios-glass-button" onClick={onExit} aria-label="Kilépés a feladatból"><X size={27} /></button>
      <div className="lesson-progress-wrap"><div className="lesson-progress-track" aria-label="Haladás"><span style={{ width: progress + "%" }} /></div><strong className="lesson-progress-label">{taskIndex + 1}<span>/</span>{lesson.questions.length}</strong></div>
      <div className={"lesson-hearts " + (heartLost ? "heart-lost" : "")}><Heart size={22} fill="#e94f64" /><strong>{Math.max(0, lives)}</strong></div>
    </header>
    <div className="task-exercise-content">
      <h1 className="task-screen-title">{question.prompt}</h1>
      {question.type === "choice" && <div className="answer-options" role="group" aria-label="Válaszlehetőségek">{question.options?.map((option, index) => {
        const selected = selectedAnswer === option
        const isRight = checked && option === question.answer
        const isWrong = checked && selected && !answerCorrect
        return <button key={option} className={"answer-option " + (selected ? "selected " : "") + (isRight ? "correct " : "") + (isWrong ? "incorrect " : "") + (rewardPulse && isRight ? "answer-pop" : "")} onClick={() => !checked && setSelectedAnswer(option)} disabled={checked || lives <= 0}><span className="option-letter">{String.fromCharCode(65 + index)}</span><span>{option}</span>{isRight && <Check size={19} />}</button>
      })}</div>}
      {question.type === "text" && <div className={"answer-input-wrap " + (checked ? (answerCorrect ? "is-correct" : "is-incorrect") : "")}><label htmlFor="typed-answer">Válaszod</label><input id="typed-answer" autoComplete="off" autoCapitalize="none" disabled={lives <= 0 || checked} placeholder="Írd be a választ…" value={typedAnswer} onChange={(event) => setTypedAnswer(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && canCheck && !checked) submitAnswer() }} />{checked && answerCorrect && <CheckCircle2 size={20} />}</div>}
      {question.type === "arrange" && <div className="word-arrange-area"><div className={"word-answer-line " + (checked ? (answerCorrect ? "is-correct" : "is-incorrect") : "")} aria-label="Saját mondat">{chosenWords.length ? chosenWords.map((word, index) => <button key={index + "-" + word} onClick={() => !checked && setSelectedWords((previous) => previous.filter((_, itemIndex) => itemIndex !== index))} disabled={checked || lives <= 0} className="chosen-word">{word}</button>) : <span className="word-placeholder">Koppints a szavakra a mondat összeállításához</span>}</div><div className="word-bank">{question.words?.map((word, index) => { const token = index + ":" + word; const used = selectedWords.includes(token); return <button key={token} className="word-chip" disabled={used || checked || lives <= 0} onClick={() => toggleWord(word, index)}>{word}</button> })}</div></div>}
      {checked && answerCorrect && <span className={"star-flight " + (rewardPulse ? "star-flight-active" : "")} aria-label="Egy csillag megszerezve"><Star size={25} fill="currentColor" /></span>}
      {checked && <div className={"task-feedback " + (answerCorrect ? "is-correct" : "is-review")} role="status">
        {answerCorrect ? <CheckCircle2 size={19} /> : <Lightbulb size={19} />}
        <div className="task-feedback-copy">
          <strong>{answerCorrect ? "Helyes válasz" : "Tanuljunk belőle"}</strong>
          <p>{question.explanation}</p>
          {question.tip && <small>{question.tip}</small>}
          {!answerCorrect && <span>Válaszd a „Próbáld újra” lehetőséget, ha készen állsz.</span>}
        </div>
      </div>}
    </div>
    <footer className="lesson-action-bar task-action-bar"><button className="primary-action" disabled={!checked && !canCheck} onClick={lives <= 0 ? onOutOfLives : submitAnswer}>{buttonLabel}{checked && answerCorrect && <ArrowRight size={19} />}</button></footer>
  </div>
}

function TaskIllustration({ type, lessonId, taskIndex }: { type: Question["type"]; lessonId: number; taskIndex: number }) {
  const themes = [
    { icon: BookOpen, label: "Nyelvtani minta", color: "#58a83c", pale: "#eef8e9" },
    { icon: Lightbulb, label: "Gondold át", color: "#58a83c", pale: "#eef8e9" },
    { icon: ClipboardCheck, label: "Rakd sorrendbe", color: "#58a83c", pale: "#eef8e9" },
  ]
  const theme = themes[type === "choice" ? 0 : type === "text" ? 1 : 2]
  const Icon = theme.icon
  return <div className="task-illustration" role="img" aria-label={theme.label}>
    <div className="task-illustration-sun" />
    <div className="task-illustration-art"><span className="task-art-card task-art-card-back" /><span className="task-art-card task-art-card-front"><Icon size={43} strokeWidth={1.8} /></span><span className="task-art-spark task-art-spark-one">✦</span><span className="task-art-spark task-art-spark-two">✧</span></div>
    <div className="task-illustration-caption"><strong>{lessonId < 3 ? "Tanulj példákból" : "Gyakorolj lépésről lépésre"}</strong><span>{theme.label} · {taskIndex + 1}. feladat</span></div>
  </div>
}
function Shop({ stars, purchasedItems, onPurchase }: { stars: number; purchasedItems: string[]; onPurchase: (id: string, cost: number) => void }) {
  const items = [
    { id: "fox-green", name: "Zöld róka téma", description: "Zöld kiemelések az alkalmazásban", cost: 5, icon: Palette },
    { id: "streak-freeze", name: "Sorozatvédő", description: "Egy napig megőrzi a tanulási sorozatot", cost: 10, icon: Gift },
    { id: "fox-badge", name: "Róka jelvény", description: "Egy különleges profiljelvény", cost: 8, icon: Star },
  ]
  return <><PageHeader title="Bolt" /><div className="shop-balance"><Star size={25} fill="currentColor" /><div><strong>{stars} csillag</strong><span>Jutalmak feladatok megoldásáért</span></div></div><div className="shop-intro"><h2>Jutalmak</h2><p>Használd a csillagokat a gyűjteményed bővítésére.</p></div><div className="shop-items">{items.map((item) => {
    const Icon = item.icon
    const owned = purchasedItems.includes(item.id)
    const canAfford = stars >= item.cost
    return <article className="shop-item" key={item.id}><div className="shop-item-icon"><Icon size={26} /></div><div className="shop-item-copy"><strong>{item.name}</strong><p>{item.description}</p><span><Star size={14} fill="currentColor" /> {item.cost} csillag</span></div><button className="shop-buy" disabled={owned || !canAfford} onClick={() => onPurchase(item.id, item.cost)}>{owned ? "Megvéve" : canAfford ? "Megveszem" : "Kevés csillag"}</button></article>
  })}</div><p className="shop-footnote">A bolt bemutató funkció: a megvett jutalmak egyelőre csak az alkalmazás aktuális munkamenetében maradnak meg.</p></>
}
function Leaderboard() { return <div className="leaderboard-page classroom-empty"><PageHeader title="Tanterem" /></div> }
type FriendProfile = {
  id: string
  name: string
  handle: string
  evoTag: string
  avatar: string
  avatarImage?: string
  streak: number | null
  xp: number
  status: string
  online: boolean
  isGuest?: boolean
}

type FriendsTab = "friends" | "requests" | "suggested"

function Friends({ userName, avatar, avatarImage, xp, dailyStudy, saveStatus, onRetryCloudSave }: {
  userName: string; avatar: string; avatarImage: string; xp: number; dailyStudy: DailyStudyState
  saveStatus: CloudSaveStatus; onRetryCloudSave: () => void
}) {
  const [tab, setTab] = useState<FriendsTab>("friends")
  const [query, setQuery] = useState("")
  const [notice, setNotice] = useState("")
  const [friends, setFriends] = useState<string[]>([])
  const [requests, setRequests] = useState<string[]>([])
  const [incomingRequests, setIncomingRequests] = useState<string[]>([])
  const [profiles, setProfiles] = useState<FriendProfile[]>([])
  const [profilesReady, setProfilesReady] = useState(false)
  const [stateReady, setStateReady] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [addQuery, setAddQuery] = useState("")
  const [addNotice, setAddNotice] = useState("")
  const [profileOpen, setProfileOpen] = useState<FriendProfile | null>(null)

  const ownTag = "EVO-" + userName.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8).padEnd(4, "X") + "-0001"

  useEffect(() => {
    let cancelled = false
    fetch("/api/friends/suggestions", { credentials: "same-origin", cache: "no-store" })
      .then(async response => {
        if (!response.ok) throw new Error("Friend suggestions unavailable")
        const result = await response.json() as { profiles?: FriendProfile[] }
        if (!cancelled && Array.isArray(result.profiles)) setProfiles(result.profiles)
      })
      .catch(() => { if (!cancelled) setProfiles([]) })
      .finally(() => { if (!cancelled) setProfilesReady(true) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    fetch("/api/state", { credentials: "same-origin", cache: "no-store" })
      .then(async response => {
        if (!response.ok) throw new Error("State unavailable")
        const result = await response.json() as { state?: { friends?: unknown; friendRequests?: unknown; incomingFriendRequests?: unknown } }
        if (cancelled) return
        const state = result.state || {}
        if (Array.isArray(state.friends)) setFriends(state.friends.filter((value): value is string => typeof value === "string").slice(0, 100))
        if (Array.isArray(state.friendRequests)) setRequests(state.friendRequests.filter((value): value is string => typeof value === "string").slice(0, 100))
        if (Array.isArray(state.incomingFriendRequests)) setIncomingRequests(state.incomingFriendRequests.filter((value): value is string => typeof value === "string").slice(0, 100))
      })
      .catch(() => {
        try {
          const raw = localStorage.getItem("evolingo.friends.v1")
          if (!cancelled && raw) {
            const stored = JSON.parse(raw) as { friends?: unknown; requests?: unknown; incomingRequests?: unknown }
            if (Array.isArray(stored.friends)) setFriends(stored.friends.filter((value): value is string => typeof value === "string").slice(0, 100))
            if (Array.isArray(stored.requests)) setRequests(stored.requests.filter((value): value is string => typeof value === "string").slice(0, 100))
            if (Array.isArray(stored.incomingRequests)) setIncomingRequests(stored.incomingRequests.filter((value): value is string => typeof value === "string").slice(0, 100))
          }
        } catch {
          // The page remains usable if local storage is unavailable.
        }
      })
      .finally(() => { if (!cancelled) setStateReady(true) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!stateReady) return
    try {
      localStorage.setItem("evolingo.friends.v1", JSON.stringify({ version: 5, friends, requests, incomingRequests }))
    } catch {
      // Local persistence is best-effort.
    }
    const timer = window.setTimeout(() => {
      fetch("/api/state", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friends, friendRequests: requests }),
      }).catch(() => setNotice("A módosítást nem sikerült a felhőbe menteni."))
    }, 450)
    return () => window.clearTimeout(timer)
  }, [stateReady, friends, requests, incomingRequests])

  useEffect(() => {
    if (!showAdd && !profileOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowAdd(false)
        setProfileOpen(null)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [showAdd, profileOpen])

  const availableProfiles = profiles
    .filter(friend => friend.handle.replace(/^@/, "").toLocaleLowerCase("hu") !== userName.toLocaleLowerCase("hu"))
    .filter((friend, index, list) => list.findIndex(item => item.id === friend.id || item.handle.toLocaleLowerCase("hu") === friend.handle.toLocaleLowerCase("hu")) === index)
  const normalizedQuery = query.trim().toLocaleLowerCase("hu")
  const matchesQuery = (friend: FriendProfile, value: string) =>
    !value ||
    friend.name.toLocaleLowerCase("hu").includes(value) ||
    friend.handle.toLocaleLowerCase("hu").includes(value) ||
    friend.evoTag.toLocaleLowerCase("hu").includes(value)

  const followedFriends = availableProfiles.filter(friend => friends.includes(friend.id))
  const outgoingRequests = availableProfiles.filter(friend => requests.includes(friend.id))
  const incomingProfiles = availableProfiles.filter(friend => incomingRequests.includes(friend.id))
  const recommendations = availableProfiles.filter(friend =>
    !friends.includes(friend.id) &&
    !requests.includes(friend.id) &&
    !incomingRequests.includes(friend.id) &&
    matchesQuery(friend, normalizedQuery)
  )
  const visibleFriends = followedFriends.filter(friend => matchesQuery(friend, normalizedQuery))
  const visibleOutgoing = outgoingRequests.filter(friend => matchesQuery(friend, normalizedQuery))
  const visibleIncoming = incomingProfiles.filter(friend => matchesQuery(friend, normalizedQuery))
  // Show real registered accounts on the Friends tab, not just followed friends or demo recommendations.
  const registeredUsers = profiles
    .filter(friend => friend.handle.replace(/^@/, "").toLocaleLowerCase("hu") !== userName.toLocaleLowerCase("hu"))
    .filter((friend, index, list) => list.findIndex(item => item.id === friend.id) === index)
    .filter(friend => matchesQuery(friend, normalizedQuery))
  const displayName = (friend: FriendProfile) => friend.name

  const shareInvite = async () => {
    const inviteUrl = window.location.origin + "/?invite=" + encodeURIComponent(ownTag)
    try {
      if (navigator.share) {
        await navigator.share({ title: "Csatlakozz hozzám az Evölingóban!", text: "Tanuljunk együtt az Evölingóban!", url: inviteUrl })
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(inviteUrl)
        setNotice("Meghívólink másolva.")
      } else {
        setNotice("Másold ki ezt a meghívólinket: " + inviteUrl)
      }
    } catch {
      setNotice("A megosztás nem sikerült. Meghívólinked: " + inviteUrl)
    }
  }

  const openContacts = async () => {
    const contactPicker = (navigator as Navigator & {
      contacts?: { select: (properties: string[], options?: { multiple?: boolean }) => Promise<unknown[]> }
    }).contacts
    if (!contactPicker?.select) {
      setNotice("A névjegyek keresése ezen a böngészőn nem támogatott. Oszd meg inkább a meghívólinkedet.")
      return
    }
    try {
      const chosen = await contactPicker.select(["name", "tel"], { multiple: true })
      setNotice(chosen.length ? "A kiválasztott névjegyeket a telefon megosztási funkciójával hívhatod meg." : "Nem választottál névjegyet.")
    } catch {
      setNotice("A névjegyek megnyitása megszakadt.")
    }
  }

  const toggleFollow = (friend: FriendProfile) => {
    const alreadyFollowing = friends.includes(friend.id)
    setFriends(current => alreadyFollowing ? current.filter(id => id !== friend.id) : [...current, friend.id])
    setRequests(current => current.filter(id => id !== friend.id))
    setNotice(alreadyFollowing ? "Már nem követed: " + friend.name : "Mostantól követed: " + friend.name + (friend.id.startsWith("demo-") ? " (helyi prototípus)." : "."))
  }

  const sendRequest = (friend: FriendProfile) => {
    if (requests.includes(friend.id) || friends.includes(friend.id)) return
    if (friend.id.startsWith("demo-")) {
      setRequests(current => [...current, friend.id])
      setNotice("A kérés helyben, prototípusként lett elmentve.")
      return
    }
    setRequests(current => [...current, friend.id])
    setNotice("A kérés helyi állapotként lett elmentve; valódi kérésekhez szerveroldali támogatás szükséges.")
  }

  const respondToRequest = (friend: FriendProfile, accept: boolean) => {
    setIncomingRequests(current => current.filter(id => id !== friend.id))
    if (accept) setFriends(current => current.includes(friend.id) ? current : [...current, friend.id])
    setNotice(accept ? friend.name + " mostantól a barátaid között van (helyi prototípus)." : "A kérés elutasítva (helyi prototípus).")
  }

  const openAddDialog = () => { setAddNotice(""); setAddQuery(""); setShowAdd(true) }
  const addFromSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAddNotice("")
    const value = addQuery.trim().toLocaleLowerCase("hu").replace(/^@/, "")
    if (!value) { setAddNotice("Írj be egy nevet, felhasználónevet vagy Evo-tag-et."); return }
    if (value.replace(/-/g, "") === ownTag.toLocaleLowerCase("hu").replace(/-/g, "")) { setAddNotice("Ez a saját Evo-tag-ed."); return }
    const friend = availableProfiles.find(item =>
      item.name.toLocaleLowerCase("hu") === value ||
      item.handle.toLocaleLowerCase("hu").replace(/^@/, "") === value ||
      item.evoTag.toLocaleLowerCase("hu") === value
    )
    if (!friend) { setAddNotice("Nincs ilyen tanuló a jelenleg betöltött profilok között."); return }
    if (friends.includes(friend.id)) { setAddNotice("Már követed ezt a tanulót."); return }
    sendRequest(friend)
    setShowAdd(false)
  }

  const renderPerson = (friend: FriendProfile, mode: "suggested" | "friend" | "outgoing" | "incoming") => (
    <article className="friends-person" key={friend.id}>
      <button className="friends-person-info" type="button" onClick={() => setProfileOpen(friend)} aria-label={displayName(friend) + " profiljának megnyitása"}>
        <span className={"friends-avatar " + (friend.avatarImage ? "has-image" : "")}>{friend.avatarImage ? <img src={friend.avatarImage} alt="" /> : friend.avatar}</span>
        <span className="friends-person-copy">
          <strong>{displayName(friend)}</strong>
                    <span>{(friend.streak ?? 0) + " napos sorozat"} <i aria-hidden="true">·</i> {friend.xp} XP</span>
        </span>
      </button>
      {mode === "suggested" && <button className="friends-follow-button" type="button" onClick={() => sendRequest(friend)}>{requests.includes(friend.id) ? "Kérés elküldve" : "Követés"}</button>}
      {mode === "outgoing" && <button className="friends-follow-button is-pending" type="button" onClick={() => { setRequests(current => current.filter(id => id !== friend.id)); setNotice("A függő kérés visszavonva.") }}>Visszavonás</button>}
      {mode === "friend" && <button className="friends-follow-button is-following" type="button" onClick={() => toggleFollow(friend)}>Követed</button>}
      {mode === "incoming" && <div className="friends-request-actions"><button type="button" aria-label="Kérés elutasítása" onClick={() => respondToRequest(friend, false)}>Elutasít</button><button type="button" onClick={() => respondToRequest(friend, true)}>Elfogad</button></div>}
    </article>
  )

  return <div className="friends-screen">
    <header className="friends-header">
      <div className="friends-title-group"><span>KÖZÖSSÉG</span><h1>Barátok</h1></div>
    </header>
    <label className="friends-search">
      <Search size={19} aria-hidden="true" />
      <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Keresés név vagy felhasználónév alapján" aria-label="Barátok keresése" />
      {query && <button type="button" aria-label="Keresés törlése" onClick={() => setQuery("")}><X size={17} /></button>}
    </label>

    <div className="friends-tabs" role="tablist" aria-label="Barátok nézetei">
      <button type="button" role="tab" aria-selected={tab === "friends"} className={tab === "friends" ? "active" : ""} onClick={() => setTab("friends")}>Barátaim{friends.length > 0 && <span>{friends.length}</span>}</button>
      <button type="button" role="tab" aria-selected={tab === "requests"} className={tab === "requests" ? "active" : ""} onClick={() => setTab("requests")}>Kérések{(requests.length + incomingRequests.length) > 0 && <span>{requests.length + incomingRequests.length}</span>}</button>
      <button type="button" role="tab" aria-selected={tab === "suggested"} className={tab === "suggested" ? "active" : ""} onClick={() => setTab("suggested")}>Ajánlott</button>
    </div>

    {followedFriends.length === 0 && <section className="friends-shortcuts" aria-label="Tanulótársak meghívása">
      <button type="button" className="friends-shortcut" onClick={shareInvite}>
        <span className="friends-shortcut-icon"><Share2 size={21} strokeWidth={1.9} aria-hidden="true" /></span>
        <span className="friends-shortcut-copy"><strong>Meghívó link megosztása</strong><small>Hívd meg barátaidat Evölingo-ra</small></span>
        <ChevronRight size={20} aria-hidden="true" />
      </button>
      <button type="button" className="friends-shortcut" onClick={openContacts}>
        <span className="friends-shortcut-icon"><Contact2 size={21} strokeWidth={1.9} aria-hidden="true" /></span>
        <span className="friends-shortcut-copy"><strong>Névjegyek keresése</strong><small>Találd meg ismerőseidet a telefonodban</small></span>
        <ChevronRight size={20} aria-hidden="true" />
      </button>
    </section>}

    {notice && <div className="friends-notice" role="status"><span>{notice}</span><button type="button" aria-label="Üzenet bezárása" onClick={() => setNotice("")}><X size={16} /></button></div>}

    {tab === "friends" && <>
      {saveStatus === "saved" && <section className="friends-section friends-own-profile-section" aria-labelledby="friends-own-profile-heading">
        <div className="friends-section-heading">
          <h2 className="friends-section-title" id="friends-own-profile-heading">SAJÁT PROFILOD</h2>
          <span className="friends-count">Tanuló</span>
        </div>
        <div className="friends-list">
          <article className="friends-person friends-own-profile-row">
            <div className="friends-person-info">
              <span className={"friends-avatar " + (avatarImage ? "has-image" : "")}>
                {avatarImage ? <img src={avatarImage} alt="" /> : avatar === "fox" ? "🦊" : avatar === "book" ? "📚" : avatar === "star" ? "⭐" : "✨"}
              </span>
              <span className="friends-person-copy">
                <strong>{userName}</strong>
                <span>{dailyStudy.streak} napos sorozat <i aria-hidden="true">·</i> {xp.toLocaleString("hu-HU")} XP</span>
              </span>
            </div>
            <span className={"friends-own-profile-save save-" + saveStatus}>{saveStatus === "saved" ? "Mentve" : saveStatus === "saving" || saveStatus === "loading" ? "Mentés…" : "Újrapróbálás"}</span>
          </article>
        </div>
      </section>}
      <section className="friends-section friends-all-users-section" aria-labelledby="friends-all-users-heading">
        <div className="friends-section-heading">
          <h2 className="friends-section-title" id="friends-all-users-heading">EVÖLINGO TANULÓI</h2>
          <span className="friends-count">{profilesReady ? registeredUsers.length : "…"}</span>
        </div>
        <div className="friends-list">
          {!profilesReady ? <><div className="friends-skeleton-row"/><div className="friends-skeleton-row"/></> :
            registeredUsers.map(friend => renderPerson(friend, friends.includes(friend.id) ? "friend" : requests.includes(friend.id) ? "outgoing" : "suggested"))}
          {profilesReady && registeredUsers.length === 0 && <div className="friends-empty">
            <strong>{query ? "Nincs találat" : "Még nincs más regisztrált tanuló"}</strong>
            <p>{query ? "Próbálj másik nevet vagy felhasználónevet." : "Amikor más felhasználók regisztrálnak az Evölingóba, a profiljuk itt jelenik meg."}</p>
          </div>}
        </div>
      </section>
      {followedFriends.length > 0 && <>
      <section className="friends-section friends-following-section friends-connected-first" aria-labelledby="friends-following-heading">
        <div className="friends-section-heading"><h2 className="friends-section-title" id="friends-following-heading">BARÁTAIM</h2><span className="friends-count">{followedFriends.length}</span></div>
        <div className="friends-list">
          {!profilesReady || !stateReady ? <div className="friends-skeleton-row"/> : visibleFriends.map(friend => renderPerson(friend, "friend"))}
          {profilesReady && stateReady && visibleFriends.length === 0 && <div className="friends-empty"><strong>Még nincsenek barátaid</strong><p>Kövess egy tanulótársat, vagy hívd meg az ismerőseidet.</p><button type="button" onClick={() => setTab("suggested")}>Ajánlott tanulók</button></div>}
        </div>
      </section>
      </>}
      <section className="friends-section" aria-labelledby="friends-recommended-heading">
        <div className="friends-section-heading"><h2 className="friends-section-title" id="friends-recommended-heading">AJÁNLOTT TANULÓTÁRSAK</h2><button className="friends-see-all" type="button" onClick={() => setTab("suggested")}>Összes <ChevronRight size={17} /></button></div>
        <div className="friends-list">
          {!profilesReady || !stateReady ? <><div className="friends-skeleton-row"/><div className="friends-skeleton-row"/></> :
            recommendations.slice(0, 5).map(friend => renderPerson(friend, "suggested"))}
          {profilesReady && stateReady && recommendations.length === 0 && <div className="friends-empty"><strong>{query ? "Nincs találat" : "Nincs új ajánlás"}</strong><p>{query ? "Próbálj másik nevet vagy felhasználónevet." : "Hívd meg egy barátodat, vagy nézz körül az ajánlások között."}</p><button type="button" onClick={shareInvite}>Barát meghívása</button></div>}
        </div>
        {profilesReady && profiles.length === 0 && <p className="friends-demo-note">Bemutatóprofilok láthatók, mert még nincs elérhető valódi ajánlás.</p>}
      </section>
      {followedFriends.length === 0 && <section className="friends-empty-banner">
        <div className="friends-empty-banner-icon"><Users size={29} aria-hidden="true"/></div>
        <div><strong>Tanulj együtt másokkal</strong><p>Kövess más tanulókat, és motiváljátok egymást minden nap!</p><button type="button" onClick={() => setTab("suggested")}>Tanulótársak felfedezése</button></div>
      </section>}

    </>}

    {tab === "requests" && <section className="friends-section" aria-labelledby="friends-requests-heading">
      <div className="friends-section-heading"><h2 className="friends-section-title" id="friends-requests-heading">BARÁTI KÉRÉSEK</h2></div>
      <div className="friends-list">
        {!profilesReady || !stateReady ? <div className="friends-skeleton-row"/> : <>
          {visibleIncoming.map(friend => renderPerson(friend, "incoming"))}
          {visibleOutgoing.map(friend => renderPerson(friend, "outgoing"))}
          {visibleIncoming.length === 0 && visibleOutgoing.length === 0 && <div className="friends-empty"><strong>Nincsenek új kérések</strong><p>Ha valaki felveszi veled a kapcsolatot, itt fog megjelenni.</p><button type="button" onClick={() => setTab("suggested")}>Tanulótársak felfedezése</button></div>}
        </>}
      </div>
      {(visibleIncoming.length > 0 || visibleOutgoing.length > 0) && <p className="friends-demo-note">A helyi prototípusban a kérések csak ezen az eszközön tárolódnak.</p>}
    </section>}

    {tab === "suggested" && <section className="friends-section" aria-labelledby="friends-all-heading">
      <div className="friends-section-heading"><h2 className="friends-section-title" id="friends-all-heading">AJÁNLOTT TANULÓTÁRSAK</h2><span className="friends-count">{recommendations.length}</span></div>
      <div className="friends-list">
        {!profilesReady || !stateReady ? <><div className="friends-skeleton-row"/><div className="friends-skeleton-row"/></> : recommendations.map(friend => renderPerson(friend, "suggested"))}
        {profilesReady && stateReady && recommendations.length === 0 && <div className="friends-empty"><strong>Nincs több ajánlás</strong><p>Hívd meg az ismerőseidet, hogy együtt tanulhassatok.</p><button type="button" onClick={shareInvite}>Meghívó link megosztása</button></div>}
      </div>
    </section>}

    {showAdd && <div className="friends-modal-backdrop" role="presentation" onClick={() => setShowAdd(false)}>
      <section className="friends-modal" role="dialog" aria-modal="true" aria-labelledby="friends-add-title" onClick={event => event.stopPropagation()}>
        <header><h2 id="friends-add-title">Tanulótárs hozzáadása</h2><button type="button" aria-label="Bezárás" onClick={() => setShowAdd(false)}><X size={20}/></button></header>
        <p>Keresés név, felhasználónév vagy Evo-tag alapján.</p>
        <form onSubmit={addFromSearch}><input autoFocus value={addQuery} onChange={event => setAddQuery(event.target.value)} placeholder="Név, @felhasználónév vagy Evo-tag" aria-label="Keresendő tanuló"/><button type="submit">Kérés küldése</button></form>
        {addNotice && <p className="friends-modal-notice" role="status">{addNotice}</p>}
      </section>
    </div>}

    {profileOpen && <div className="friends-modal-backdrop" role="presentation" onClick={() => setProfileOpen(null)}>
      <section className="friends-modal friends-profile-modal" role="dialog" aria-modal="true" aria-labelledby="friends-profile-title" onClick={event => event.stopPropagation()}>
        <header><h2 id="friends-profile-title">Tanulói profil</h2><button type="button" aria-label="Bezárás" onClick={() => setProfileOpen(null)}><X size={20}/></button></header>
        <div className="friends-profile-summary"><span className="friends-avatar">{profileOpen.avatarImage ? <img src={profileOpen.avatarImage} alt=""/> : profileOpen.avatar}</span><div><strong>{profileOpen.name}</strong><span>{profileOpen.handle}</span></div></div>
        <p className="friends-profile-status">{profileOpen.status}</p>
        <div className="friends-profile-stats"><div><Flame size={18}/><strong>{profileOpen.streak ?? 0} nap</strong><span>Sorozat</span></div><div><Zap size={18}/><strong>{profileOpen.xp.toLocaleString("hu-HU")} XP</strong><span>Összes XP</span></div></div>
        <button className="friends-follow-button friends-profile-follow" type="button" onClick={() => { sendRequest(profileOpen); setProfileOpen(null) }}>{friends.includes(profileOpen.id) ? "Követed" : requests.includes(profileOpen.id) ? "Kérés elküldve" : "Kérés küldése"}</button>
      </section>
    </div>}
  </div>
}

function Profile({ completedCount, readCount, completedTaskCount, xp, stars, userName, setUserName, avatar, setAvatar, avatarImage, setAvatarImage, bannerImage, setBannerImage, dailyStudy, onDailyGoalChange, saveStatus, onRetryCloudSave, notifications, setNotifications, compactMode, setCompactMode, showSettings, setShowSettings }: {
  completedCount: number; readCount: number; completedTaskCount: number; xp: number; stars: number; userName: string; setUserName: (value: string) => void;
  avatar: string; setAvatar: (value: string) => void; avatarImage: string; setAvatarImage: (value: string) => void; bannerImage: string; setBannerImage: (value: string) => void;
  dailyStudy: DailyStudyState; onDailyGoalChange: (goal: number) => void; saveStatus: CloudSaveStatus; onRetryCloudSave: () => void; notifications: boolean; setNotifications: (value: boolean) => void;
  compactMode: boolean; setCompactMode: (value: boolean) => void; showSettings: boolean; setShowSettings: (value: boolean) => void
}) {
  const [draftName, setDraftName] = useState(userName)
  const [saved, setSaved] = useState(false)
  const [showStreakSettings, setShowStreakSettings] = useState(false)
  const [profileStorageReady, setProfileStorageReady] = useState(false)
  const [remoteProfileReady, setRemoteProfileReady] = useState(false)
  const [profileTheme, setProfileTheme] = useState<"mist" | "sage">("mist")
  const [imageError, setImageError] = useState("")
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)
  useEffect(() => setDraftName(userName), [userName])
  useEffect(() => {
    let cancelled = false
    fetch("/api/state", { credentials: "same-origin", cache: "no-store" })
      .then(async response => {
        if (!response.ok) throw new Error("profile unavailable")
        const result = await response.json() as { state?: Record<string, unknown> }
        const data = result.state || {}
        if (cancelled) return
        if (data.theme === "mist" || data.theme === "sage") setProfileTheme(data.theme)
        if (typeof data.avatarImage === "string" && data.avatarImage.startsWith("data:image/")) setAvatarImage(data.avatarImage)
        if (typeof data.bannerImage === "string" && data.bannerImage.startsWith("data:image/")) setBannerImage(data.bannerImage)
      })
      .catch(() => { /* The local profile remains available offline. */ })
      .finally(() => { if (!cancelled) setRemoteProfileReady(true) })
    return () => { cancelled = true }
  }, [])
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("evolingo.profile.v1")
      if (raw) {
        const profile = JSON.parse(raw) as { userName?: unknown; avatar?: unknown; notifications?: unknown; compactMode?: unknown; theme?: unknown; avatarImage?: unknown; bannerImage?: unknown }
        if (typeof profile.userName === "string" && profile.userName.trim()) setUserName(profile.userName.slice(0, 32))
        if (["fox", "book", "star", "spark"].includes(String(profile.avatar))) setAvatar(String(profile.avatar))
        if (typeof profile.notifications === "boolean") setNotifications(profile.notifications)
        if (profile.theme === "mist" || profile.theme === "sage") setProfileTheme(profile.theme)
        if (typeof profile.avatarImage === "string" && profile.avatarImage.startsWith("data:image/")) setAvatarImage(profile.avatarImage)
        if (typeof profile.bannerImage === "string" && profile.bannerImage.startsWith("data:image/")) setBannerImage(profile.bannerImage)
        if (typeof profile.compactMode === "boolean") {
          setCompactMode(profile.compactMode)
          document.documentElement.classList.toggle("compact-ui", profile.compactMode)
        }
      }
    } catch {
      // Keep the profile usable if local storage is unavailable or invalid.
    } finally {
      setProfileStorageReady(true)
    }
  }, [setUserName, setAvatar, setNotifications, setCompactMode])
  useEffect(() => {
    if (!profileStorageReady) return
    try {
      window.localStorage.setItem("evolingo.profile.v1", JSON.stringify({ userName, avatar, notifications, compactMode, theme: profileTheme, avatarImage, bannerImage }))
    } catch {
      setImageError("A kép túl nagy a helyi mentéshez. Válassz egy kisebb képet.")
    }
  }, [profileStorageReady, userName, avatar, notifications, compactMode, profileTheme, avatarImage, bannerImage])
  useEffect(() => {
    if (!profileStorageReady || !remoteProfileReady) return
    const timer = window.setTimeout(() => {
      fetch("/api/state", {
        method: "PATCH", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userName, avatar, notifications, compactMode, theme: profileTheme, avatarImage, bannerImage }),
      }).catch(() => { setImageError("A profil felhőmentése nem sikerült; a helyi mentés továbbra is elérhető.") })
    }, 650)
    return () => window.clearTimeout(timer)
  }, [profileStorageReady, remoteProfileReady, userName, avatar, notifications, compactMode, profileTheme, avatarImage, bannerImage])

  const openSettings = () => {
    setDraftName(userName)
    setSaved(false)
    setImageError("")
    setShowSettings(true)
  }
  const handleGalleryImage = async (file: File | undefined, kind: "avatar" | "banner") => {
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setImageError("Kérlek, képfájlt válassz.")
      return
    }
    if (file.size > 12 * 1024 * 1024) {
      setImageError("A kép legfeljebb 12 MB lehet.")
      return
    }
    try {
      const bitmap = await createImageBitmap(file)
      const maxDimension = kind === "avatar" ? 640 : 1400
      const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
      const canvas = document.createElement("canvas")
      canvas.width = Math.max(1, Math.round(bitmap.width * scale))
      canvas.height = Math.max(1, Math.round(bitmap.height * scale))
      const context = canvas.getContext("2d")
      if (!context) throw new Error("Canvas unavailable")
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
      bitmap.close()
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(result => result ? resolve(result) : reject(new Error("Image conversion failed")), "image/jpeg", .78))
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Image read failed"))
        reader.onerror = () => reject(new Error("Image read failed"))
        reader.readAsDataURL(blob)
      })
      if (kind === "avatar") setAvatarImage(dataUrl)
      else setBannerImage(dataUrl)
      setImageError("")
    } catch {
      setImageError("Ezt a képet nem sikerült betölteni. Próbálj másik fájlt.")
    }
  }
  const progressPercent = Math.max(0, Math.min(100, Math.round((completedCount / lessons.length) * 100)))
  const todayDate = getLocalDateKey()
  const yesterdayDate = getPreviousLocalDateKey(todayDate)
  const visibleStreak = dailyStudy.lastStudyDate && dailyStudy.lastStudyDate !== todayDate && dailyStudy.lastStudyDate !== yesterdayDate ? 0 : dailyStudy.streak
  const todayActivityCount = dailyStudy.activityDate === todayDate ? dailyStudy.todayActivityCount : 0
  const dailyGoalProgress = Math.min(100, Math.round((todayActivityCount / Math.max(1, dailyStudy.dailyGoal)) * 100))
  const avatarOptions = ["fox", "book", "star", "spark"]
  const defaultAvatar = avatar === "fox" ? "🦊" : avatar === "book" ? "📚" : avatar === "star" ? "⭐" : "✨"

  return <div className={"profile-page profile-theme-" + profileTheme}>
    <section className="profile-hero">
      <div className={"profile-cover" + (bannerImage ? " has-custom-banner" : "")} aria-hidden="true">{bannerImage && <img className="profile-cover-image" src={bannerImage} alt="" />}</div>
      <button className="profile-streak-badge" type="button" onClick={() => setShowStreakSettings(true)} aria-label={visibleStreak + " napos tanulási sorozat, napi cél beállítása"} aria-haspopup="dialog">
        <span className="profile-streak-icon"><Flame size={17} fill="currentColor" /></span>
        <span className="profile-streak-copy"><strong>{visibleStreak} nap</strong><small>NAPI SOROZAT</small></span>
        <Settings size={14} className="profile-streak-settings-icon" aria-hidden="true" />
      </button>
      <button className="profile-banner-settings" type="button" aria-label="Profil és borítókép szerkesztése" title="Profil szerkesztése" onClick={openSettings}>
        <Pencil size={20} strokeWidth={2.2} />
      </button>
      <div className="profile-identity">
        <div className="profile-avatar-wrap">
          <div className="large-avatar">
            {avatarImage ? <img src={avatarImage} alt="Egyéni profilkép" /> : avatar === "fox" ? <img src={foxIcon} alt="Róka profilkép" /> : <span className="avatar-emoji">{defaultAvatar}</span>}
          </div>
          <button className="profile-avatar-edit" type="button" onClick={() => avatarInputRef.current?.click()} aria-label="Profilkép kiválasztása a galériából"><Pencil size={18} strokeWidth={2.5} /></button>
          <input ref={avatarInputRef} className="profile-file-input" type="file" accept="image/*" aria-label="Profilkép kiválasztása" onChange={event => { void handleGalleryImage(event.target.files?.[0], "avatar"); event.currentTarget.value = "" }} />
        </div>
        <h1 className="profile-display-name">{userName || "Tanuló"}</h1>
        <p className="profile-handle">@{(userName || "tanulo").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 20) || "tanulo"}</p>
      </div>
    </section>

    <input ref={bannerInputRef} className="profile-file-input" type="file" accept="image/*" aria-label="Borítókép kiválasztása" onChange={event => { void handleGalleryImage(event.target.files?.[0], "banner"); event.currentTarget.value = "" }} />

    <GuestSaveBanner userName={userName} status={saveStatus} onRetry={onRetryCloudSave} />

    {showStreakSettings && <div className="profile-streak-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setShowStreakSettings(false) }}>
      <section className="profile-streak-sheet" role="dialog" aria-modal="true" aria-labelledby="profile-streak-title">
        <header className="profile-streak-sheet-heading">
          <span className="profile-streak-sheet-symbol"><Flame size={22} fill="currentColor" /></span>
          <div><h2 id="profile-streak-title">Napi tanulási sorozat</h2><p>Alakíts ki egy könnyen tartható napi rutint.</p></div>
          <button type="button" aria-label="Bezárás" onClick={() => setShowStreakSettings(false)}><X size={20} /></button>
        </header>
        <div className="profile-streak-current">
          <div><strong>{visibleStreak} nap</strong><span>egymást követő tanulási nap</span></div>
          <span className="profile-streak-current-icon"><Flame size={25} fill="currentColor" /></span>
        </div>
        <div className="profile-streak-goal-heading"><strong>Napi cél</strong><span>{todayActivityCount} / {dailyStudy.dailyGoal} aktivitás</span></div>
        <div className="profile-streak-progress"><span style={{ width: dailyGoalProgress + "%" }} /></div>
        <p className="profile-streak-explainer">Egy aktivitásnak számít egy új lecke elolvasása vagy egy kérdés megoldása.</p>
        <div className="profile-streak-goal-options" role="group" aria-label="Napi tanulási cél">
          {[1, 3, 5].map(goal => <button key={goal} type="button" className={dailyStudy.dailyGoal === goal ? "selected" : ""} onClick={() => onDailyGoalChange(goal)} aria-pressed={dailyStudy.dailyGoal === goal}>
            <strong>{goal}</strong><span>{goal === 1 ? "Könnyű" : goal === 3 ? "Kiegyensúlyozott" : "Kihívás"}</span><small>{goal} aktivitás / nap</small>
          </button>)}
        </div>
        <button className="profile-streak-done" type="button" onClick={() => setShowStreakSettings(false)}>Kész</button>
      </section>
    </div>}

    <section className="profile-social-stats" aria-label="Profilstatisztikák">
      <div className="profile-social-stat"><span className="profile-stat-icon"><BookOpen size={22} /></span><strong>{readCount}</strong><span>Elolvasott lecke</span></div>
      <div className="profile-social-stat"><span className="profile-stat-icon"><CheckCircle2 size={22} /></span><strong>{completedCount}</strong><span>Teljesített lecke</span></div>
      <div className="profile-social-stat"><span className="profile-stat-icon"><Zap size={22} /></span><strong>{xp.toLocaleString("en-US")}</strong><span>Tapasztalati pont</span></div>
    </section>

    <section className="profile-learning-card">
      <div className="profile-section-link"><span><strong>Tanulási haladás</strong><small>Folytasd a fejlődést!</small></span><ChevronRight size={21} /></div>
      <div className="profile-learning-content">
        <div className="profile-progress-ring" role="progressbar" aria-label="Teljesített alaptémák" aria-valuemin={0} aria-valuemax={10} aria-valuenow={Math.min(completedCount, 10)} style={{ background: "conic-gradient(#252525 " + progressPercent + "%, #e9e9e9 " + progressPercent + "% 100%)" }}>
          <div><strong>{progressPercent}%</strong><span>kész</span></div>
        </div>
        <div className="profile-learning-metrics">
          <div><BookOpen size={20} /><span><strong>{completedCount}</strong><small>Teljesített lecke</small></span></div>
          <div><CheckCircle2 size={20} /><span><strong>{completedTaskCount}</strong><small>Kész feladatcsomag</small></span></div>
          <div><Star size={20} /><span><strong>{stars.toLocaleString("en-US")}</strong><small>Összegyűjtött csillag</small></span></div>
        </div>
      </div>
      <div className="profile-learning-foot"><span>{readCount} lecke elolvasva</span><span>{Math.min(completedCount, 10)} / {lessons.length} alaptéma</span></div>
    </section>

    {showSettings && <div className="profile-edit-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setShowSettings(false) }}>
      <section className="profile-edit-sheet" role="dialog" aria-modal="true" aria-labelledby="profile-edit-title">
        <div className="profile-edit-heading"><div><h2 id="profile-edit-title">Profil szerkesztése</h2><p>Állítsd be a képeidet és a neved.</p></div><button type="button" onClick={() => setShowSettings(false)} aria-label="Bezárás"><X size={21} /></button></div>
        <label className="setting-label" htmlFor="profile-name">Megjelenített név</label>
        <div className="profile-name-form"><input id="profile-name" maxLength={32} value={draftName} onChange={event => { setDraftName(event.target.value); setSaved(false) }} placeholder="Írd be a neved" /><button type="button" onClick={() => { const value = draftName.trim(); if (value) { setUserName(value); setSaved(true) } }}>Mentés</button></div>
        {saved && <p className="setting-success" role="status">A profilnév frissítve.</p>}
        <div className="profile-gallery-actions">
          <button type="button" onClick={() => avatarInputRef.current?.click()}><UserRound size={19} /><span><strong>Profilkép cseréje</strong><small>Válassz képet a galériából</small></span><ChevronRight size={18} /></button>
          <button type="button" onClick={() => bannerInputRef.current?.click()}><Palette size={19} /><span><strong>Borítókép cseréje</strong><small>Válassz egy széles képet</small></span><ChevronRight size={18} /></button>
        </div>
        <span className="setting-label">Gyors profilképek</span>
        <div className="avatar-options">{avatarOptions.map(id => <button key={id} type="button" className={"avatar-option " + (!avatarImage && avatar === id ? "selected" : "")} onClick={() => { setAvatar(id); setAvatarImage("") }} aria-label={"Profilkép: " + id} aria-pressed={!avatarImage && avatar === id}>{id === "fox" ? "🦊" : id === "book" ? "📚" : id === "star" ? "⭐" : "✨"}</button>)}</div>
        {bannerImage && <button className="profile-remove-banner" type="button" onClick={() => setBannerImage("")}>Borítókép visszaállítása</button>}
        {imageError && <p className="profile-image-error" role="alert">{imageError}</p>}
      </section>
    </div>}
  </div>
}
function PageHeader({ title }: { title: string }) {
  return <header className="page-header">
    <div className="brand compact">
      <Image src={foxIcon} alt="Evölingo róka" width={40} height={40} unoptimized />
      <div><h1>Evölingo</h1></div>
    </div>
    <h1>{title}</h1>
  </header>
}
function Nav({ screen, setScreen, userName, avatar, avatarImage }: { screen: Screen; setScreen: (screen: Screen) => void; userName: string; avatar: string; avatarImage: string }) {
  const items: [Screen, string, React.ElementType][] = [["home", "Tanulás", BookOpen], ["friends", "Barátok", Users], ["leaderboard", "Tanterem", BarChart3], ["profile", "Profil", UserRound]]
  const activeIndex = Math.max(0, items.findIndex(([id]) => id === screen))
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const dragStart = useRef<{ x: number; index: number; width: number } | null>(null)
  const startIndicatorDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const nav = event.currentTarget.parentElement
    if (!nav) return
    event.preventDefault()
    dragStart.current = { x: event.clientX, index: activeIndex, width: nav.clientWidth / items.length }
    setDragIndex(activeIndex)
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const moveIndicatorDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStart.current) return
    const delta = (event.clientX - dragStart.current.x) / dragStart.current.width
    setDragIndex(Math.max(0, Math.min(items.length - 1, dragStart.current.index + delta)))
  }
  const finishIndicatorDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = dragStart.current
    if (start && event.type === "pointerup") {
      // Derive the final tab from pointer-up coordinates, not a potentially stale React state snapshot.
      const delta = (event.clientX - start.x) / start.width
      const index = Math.max(0, Math.min(items.length - 1, Math.round(start.index + delta)))
      setScreen(items[index][0])
    }
    dragStart.current = null
    setDragIndex(null)
  }
  return <nav className="bottom-nav">
    <div
      className={"nav-selection-indicator " + (dragIndex !== null ? "is-dragging" : "")}
      aria-label="Húzd jobbra vagy balra a kiválasztott fület"
      role="slider"
      aria-valuemin={0}
      aria-valuemax={items.length - 1}
      aria-valuenow={Math.round(dragIndex ?? activeIndex)}
      aria-valuetext={items[Math.round(dragIndex ?? activeIndex)]?.[1]}
      tabIndex={0}
      style={{ transform: `translateX(calc(${(dragIndex ?? activeIndex) * 100}%))` }}
      onPointerDown={startIndicatorDrag}
      onPointerMove={moveIndicatorDrag}
      onPointerUp={finishIndicatorDrag}
      onPointerCancel={finishIndicatorDrag}
      onKeyDown={(event) => {
        let nextIndex = activeIndex
        if (event.key === "ArrowRight") nextIndex = Math.min(items.length - 1, activeIndex + 1)
        else if (event.key === "ArrowLeft") nextIndex = Math.max(0, activeIndex - 1)
        else if (event.key === "Home") nextIndex = 0
        else if (event.key === "End") nextIndex = items.length - 1
        else return
        event.preventDefault()
        setScreen(items[nextIndex][0])
      }}
    />
    {items.map(([id, label, Icon], index) => <button key={id} data-tab-index={index} className={screen === id ? "active" : ""} onClick={() => setScreen(id)} aria-current={screen === id ? "page" : undefined} aria-label={id === "profile" ? "Profil: " + userName : label} title={id === "profile" ? userName : undefined}>{id === "profile" ? <UserAvatar userName={userName} avatar={avatar} avatarImage={avatarImage} variant="nav" /> : <Icon size={24} strokeWidth={2} aria-hidden="true" />}<span>{label}</span></button>)}
  </nav>
}
