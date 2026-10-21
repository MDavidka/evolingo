"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import {
  ArrowRight, BarChart3, BookOpen, Check, CheckCircle2, Headphones, MessageCircle, CircleHelp, Puzzle,
  Flame, Heart, Lightbulb, Medal, RotateCcw, Trophy, UserRound, Dumbbell, Timer, Languages, Volume2,
  X, Zap, LockKeyhole, ClipboardCheck, Star, ShoppingBag, Gift, Palette, Pencil, Settings, ChevronRight, CalendarDays, Sparkles, Target, Search, UserPlus, Users, Link2, Bell, Share2, Contact2, Cloud,
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
      { type: "text", instruction: "Egészítsd ki", prompt: "This book is _____ (interesting) than that one.", answer: "more interesting", explanation: "A hosszú mellékneveknél a more + melléknév szerkezetet használjuk.", tip: "more interesting than…" },
      { type: "arrange", instruction: "Rakd sorrendbe", prompt: "Ő a legjobb tanuló az osztályban.", words: ["student", "best", "the", "She", "is", "class.", "in", "the"], answer: "She is the best student in the class.", explanation: "A good felsőfoka the best, előtte a the névelő áll.", tip: "the best + főnév" },
      { type: "choice", instruction: "Melyik mondat helyes?", prompt: "Choose the correct sentence.", options: ["He is more tall than me.", "He is taller than me.", "He is tallest than me.", "He is more taller than me."], answer: "He is taller than me.", explanation: "A tall rövid melléknév, középfoka taller, utána than áll.", tip: "tall → taller than" },
    ],
  },
  {
    id: 10, title: "First Conditional", level: "A2–B1", summary: "Valós, jövőbeli feltételes helyzetek.",
    sections: [
      { title: "Szerkezet", body: "Az if-es tagmondatban Present Simple, a főmondatban will + alapige áll.", rows: [["Feltétel", "If it rains,"], ["Eredmény", "I will stay home."]], examples: [{ sentence: "If you study, you will pass. ", translation: "Ha tanulsz, át fogsz menni." }], tip: "Az if után nem használunk will-t: If it rains, nem If it will rain." },
      { title: "Sorrend", body: "A két tagmondat sorrendje felcserélhető. Ha az if-es tagmondat áll elöl, vessző követi.", examples: [{ sentence: "I will call you if I arrive early.", translation: "Felhívlak, ha korán érkezem." }] },
      { title: "Gyakori hibák", body: "A leggyakoribb hiba az if utáni will és a főmondatban hagyott -s végződés.", examples: [{ sentence: "If she comes, we will start.", translation: "Ha eljön, elkezdjük." }] },
    ],
    questions: [
      { type: "choice", instruction: "Válaszd ki a helyes alakot", prompt: "If it _____ tomorrow, we will stay inside.", options: ["will rain", "rains", "rained", "is raining"], answer: "rains", explanation: "Az if-es tagmondatban Present Simple szerepel, will helyett.", tip: "If + Present Simple" },
      { type: "text", instruction: "Egészítsd ki", prompt: "If you hurry, you _____ catch the bus.", answer: "will", explanation: "A főmondatban will + alapige áll.", tip: "…you will catch…" },
      { type: "arrange", instruction: "Rakd sorrendbe", prompt: "Ha tanulsz, sikeres leszel.", words: ["study,", "you", "If", "succeed.", "will", "you"], answer: "If you study, you will succeed.", explanation: "If + Present Simple, majd will + alapige.", tip: "If you study, you will succeed." },
      { type: "choice", instruction: "Melyik mondat helyes?", prompt: "Choose the correct sentence.", options: ["If it will rain, I stay home.", "If it rains, I will stay home.", "If it rains, I stay will home.", "If it raining, I will stay home."], answer: "If it rains, I will stay home.", explanation: "Az if után Present Simple, a főmondatban will + alapige áll.", tip: "If + jelen, will + alapige" },
    ],
  },
]
const specialTasks: LessonUnit[] = [
  { id: 101, title: "Nehéz kihívás", level: "B1", specialType: "hard", summary: "Vegyes feladatok haladóknak.", sections: [], questions: [
    { type: "choice", instruction: "Válaszd ki a helyes alakot", prompt: "She _____ here since 2019.", options: ["works", "has worked", "worked", "is working"], answer: "has worked", explanation: "A since 2019 egy múltban kezdődött és tartó állapotot jelöl, ezért Present Perfect kell.", tip: "since + Present Perfect" },
    { type: "choice", instruction: "Válaszd ki a helyes alakot", prompt: "If I _____ you, I would apologize.", options: ["am", "was", "were", "be"], answer: "were", explanation: "A második típusú feltételes mondatban a were alak használatos.", tip: "If I were you…" },
    { type: "choice", instruction: "Válaszd ki a helyes alakot", prompt: "By the time we arrived, the film _____.", options: ["started", "has started", "had started", "starts"], answer: "had started", explanation: "A Past Perfect a korábban lezajlott eseményt jelöli.", tip: "had + past participle" },
    { type: "choice", instruction: "Válaszd ki a helyes alakot", prompt: "He suggested _____ a doctor.", options: ["see", "to see", "seeing", "seen"], answer: "seeing", explanation: "A suggest ige után -ing alak áll.", tip: "suggest + -ing" },
  ] },
  { id: 102, title: "Időzített feladat", level: "A2", specialType: "timed", summary: "Gyors tempójú feladatsor.", sections: [], questions: [
    { type: "choice", instruction: "Gyors kérdés", prompt: "Choose the correct form: He _____ to school every day.", options: ["go", "goes", "going", "gone"], answer: "goes", explanation: "A he alanyhoz -s végződés tartozik.", tip: "He goes…" },
    { type: "choice", instruction: "Gyors kérdés", prompt: "Which is correct?", options: ["I am agree.", "I agree.", "I agreeing.", "I am agreeing now."], answer: "I agree.", explanation: "Az agree ige önmagában áll, nem kell hozzá létige.", tip: "I agree." },
    { type: "choice", instruction: "Gyors kérdés", prompt: "Choose the correct question.", options: ["Where you are going?", "Where are you going?", "Where you going?", "Where going you?"], answer: "Where are you going?", explanation: "Kérdésben a segédige az alany elé kerül.", tip: "Where are you going?" },
    { type: "choice", instruction: "Gyors kérdés", prompt: "Pick the correct past form.", options: ["buyed", "bought", "buy", "buying"], answer: "bought", explanation: "A buy rendhagyó múlt idejű alakja bought.", tip: "buy → bought" },
  ] },
  { id: 103, title: "Szókincs", level: "A2", specialType: "words", summary: "Szókincsfejlesztő feladatsor.", sections: [], questions: [
    { type: "choice", instruction: "Válaszd ki a jelentést", prompt: "What does \"borrow\" mean?", options: ["kölcsönad", "kölcsönkér", "elad", "megvesz"], answer: "kölcsönkér", explanation: "A borrow jelentése kölcsönkérni valamit valakitől.", tip: "borrow = kölcsönkér" },
    { type: "choice", instruction: "Válaszd ki a jelentést", prompt: "What does \"lend\" mean?", options: ["kölcsönad", "kölcsönkér", "elveszít", "megtalál"], answer: "kölcsönad", explanation: "A lend jelentése kölcsönadni valakinek valamit.", tip: "lend = kölcsönad" },
    { type: "choice", instruction: "Válaszd ki a jelentést", prompt: "What does \"achieve\" mean?", options: ["elér", "elhagy", "elad", "elolt"], answer: "elér", explanation: "Az achieve jelentése elérni egy célt.", tip: "achieve = elér" },
    { type: "choice", instruction: "Válaszd ki a jelentést", prompt: "What does \"improve\" mean?", options: ["javít", "ront", "kér", "vár"], answer: "javít", explanation: "Az improve jelentése javítani, fejleszteni.", tip: "improve = javít" },
  ] },
]
const placeholders = Array.from({ length: 14 }, (_, index) => ({ id: 11 + index, title: index % 2 === 0 ? "Jövőbeli lecke" : "Ismétlés", summary: "Hamarosan elérhető", isPlaceholder: true as const }))
const pathItems = [...lessons, ...specialTasks, ...placeholders]

export default function App() {
  const [screen, setScreen] = useState<Screen>("home")
  const [xp, setXp] = useState(0)
  const [stars, setStars] = useState(0)
  const [dailyStreak, setDailyStreak] = useState(0)
  const [readLessons, setReadLessons] = useState<number[]>([])
  const [completedLessons, setCompletedLessons] = useState<number[]>([])
  const [answeredTasks, setAnsweredTasks] = useState<string[]>([])
  const [purchasedItems, setPurchasedItems] = useState<string[]>([])
  const [activeLesson, setActiveLesson] = useState<number | null>(null)
  const [activeTaskIndex, setActiveTaskIndex] = useState(0)
  const [notice, setNotice] = useState("")
  const [userName, setUserName] = useState("")
  const [avatar, setAvatar] = useState("fox")
  const [avatarImage, setAvatarImage] = useState("")
  const [bannerImage, setBannerImage] = useState("")
  const [dailyStudy, setDailyStudy] = useState<DailyStudyState>({ streak: 0, lastStudyDate: "", todayActivityCount: 0, activityDate: "", dailyGoal: 3 })
  const [saveStatus, setSaveStatus] = useState<CloudSaveStatus>("loading")
  const [sessionKey, setSessionKey] = useState("")
  const hydrated = useRef(false)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(LOCAL_PROGRESS_KEY)
      if (raw) {
        const snapshot = JSON.parse(raw) as LocalProgressSnapshot
        const state = snapshot?.state ?? {}
        if (typeof state.userName === "string") setUserName(state.userName)
        if (Array.isArray(state.readLessons)) setReadLessons(state.readLessons as number[])
        if (Array.isArray(state.completedLessons)) setCompletedLessons(state.completedLessons as number[])
        if (Array.isArray(state.answeredTasks)) setAnsweredTasks(state.answeredTasks as string[])
        if (Array.isArray(state.purchasedItems)) setPurchasedItems(state.purchasedItems as string[])
        if (typeof state.xp === "number") setXp(state.xp)
        if (typeof state.stars === "number") setStars(state.stars)
        if (typeof state.dailyStreak === "number") setDailyStreak(state.dailyStreak)
        if (state.dailyStudy && typeof state.dailyStudy === "object") setDailyStudy(state.dailyStudy as DailyStudyState)
        if (typeof state.avatar === "string") setAvatar(state.avatar)
        if (typeof state.avatarImage === "string") setAvatarImage(state.avatarImage)
        if (typeof state.bannerImage === "string") setBannerImage(state.bannerImage)
      }
    } catch {}
    hydrated.current = true
  }, [])

  useEffect(() => {
    if (!hydrated.current) return
    const snapshot: LocalProgressSnapshot = {
      version: 1, sessionKey, savedAt: Date.now(),
      state: { userName, readLessons, completedLessons, answeredTasks, purchasedItems, xp, stars, dailyStreak, dailyStudy, avatar, avatarImage, bannerImage },
    }
    try { window.localStorage.setItem(LOCAL_PROGRESS_KEY, JSON.stringify(snapshot)) } catch {}
    let cancelled = false
    setSaveStatus("saving")
    fetch("/api/progress", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionKey, state: snapshot.state }) })
      .then((response) => { if (!cancelled) setSaveStatus(response.ok ? "saved" : "local") })
      .catch(() => { if (!cancelled) setSaveStatus("local") })
    return () => { cancelled = true }
  }, [userName, readLessons, completedLessons, answeredTasks, purchasedItems, xp, stars, dailyStreak, dailyStudy, avatar, avatarImage, bannerImage, sessionKey])

  const openLesson = useCallback((id: number) => { setActiveLesson(id); setScreen("lessonIntro") }, [])
  const openTask = useCallback((lessonId: number, index: number) => { setActiveLesson(lessonId); setActiveTaskIndex(index); setScreen("task") }, [])

  const completeLesson = (lessonId: number) => {
    setCompletedLessons((previous) => previous.includes(lessonId) ? previous : [...previous, lessonId])
    const reward = 25
    setXp((previous) => previous + reward)
    setStars((previous) => previous + 5)
    setScreen("home")
    setActiveLesson(null)
    setNotice("Lecke teljesítve! +" + reward + " XP és +5 csillag.")
  }
  const completeTask = (lessonId: number, index: number) => {
    const taskKey = lessonId + "-" + index
    setAnsweredTasks((previous) => previous.includes(taskKey) ? previous : [...previous, taskKey])
    const reward = 15
    setXp((previous) => previous + reward)
    setStars((previous) => previous + 2)
    setScreen("home")
    setActiveLesson(null)
    setNotice("Feladatcsomag teljesítve! " + (answeredTasks.includes(taskKey) ? "" : "Jutalom jóváírva."))
  }
  return <main className={"app-shell " + ((screen === "lessonIntro" || screen === "task") ? "lesson-open" : "")}>
    <section className={"screen-content " + ((screen === "lessonIntro" || screen === "task") ? "lesson-page" : "")}>
      {screen === "home" && <Home
        readLessons={readLessons}
        completedLessons={completedLessons}
        answeredTasks={answeredTasks}
        stars={stars}
        notice={notice}
        clearNotice={() => setNotice("")}
        onOpenLesson={(id) => openLesson(id)}
        onOpenTask={(lessonId, index) => openTask(lessonId, index)}
        userName={userName}
        saveStatus={saveStatus}
        onRetryCloudSave={() => setStars(stars)} />}
    </section>
    <Nav screen={screen} setScreen={setScreen} userName={userName} avatar={avatar} avatarImage={avatarImage} />
  </main>
}