"use client"

import { useCallback, useEffect, useState } from "react"
import {
  ArrowRight, BarChart3, BookOpen, Check, CheckCircle2,
  Flame, Heart, Lightbulb, Medal, RotateCcw, Trophy, UserRound,
  X, Zap, LockKeyhole, ClipboardCheck, Star, ShoppingBag, Gift, Palette,
} from "lucide-react"

const foxIcon = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Image-D15751D4-6Ne8AGNrryN8wlvyBepC8VDGQkHTw4.jpeg"
type Screen = "home" | "lessonIntro" | "task" | "shop" | "leaderboard" | "profile"
type Example = { sentence: string; translation: string }
type LessonSection = { title: string; body: string; rows?: [string, string][]; examples?: Example[]; tip?: string }
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
type LessonUnit = { id: number; title: string; summary: string; sections: LessonSection[]; questions: Question[]; level: string }
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

const placeholders = Array.from({ length: 90 }, (_, index) => ({ id: index + 11, title: "Lecke " + (index + 11), inDevelopment: true }))
const pathItems = [...lessons, ...placeholders]
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
  const [userName, setUserName] = useState("Márton Dávid")
  const [avatar, setAvatar] = useState("fox")
  const [notifications, setNotifications] = useState(false)
  const [compactMode, setCompactMode] = useState(false)
  const [showSettings, setShowSettings] = useState(true)
  const [sessionQuestionIndex, setSessionQuestionIndex] = useState(0)
  const [notice, setNotice] = useState("")
  const activeLesson = lessons.find((lesson) => lesson.id === activeLessonId) ?? lessons[0]
  const handleReadComplete = useCallback((lessonId: number) => {
    setReadLessons((previous) => {
      if (previous.includes(lessonId)) return previous
      return [...previous, lessonId]
    })
    setXp((current) => current + (readLessons.includes(lessonId) ? 0 : 10))
  }, [readLessons])
  const openLesson = (lessonId: number) => {
    setActiveLessonId(lessonId)
    setScreen("lessonIntro")
  }
  const openTask = (lessonId: number, taskIndex: number) => {
    setActiveLessonId(lessonId)
    setActiveTaskIndex(taskIndex)
    setLives(5)
    setSessionQuestionIndex(taskIndex)
    const isUnlocked = lessonId === 1 || completedLessons.includes(lessonId - 1)
    if (!isUnlocked) {
      setNotice("Először fejezd be az előző leckét!")
      setScreen("home")
      return
    }
    if (!readLessons.includes(lessonId)) {
      setScreen("lessonIntro")
      setNotice("Előbb olvasd át a leckét; utána megnyílnak a feladatok.")
      return
    }
    setScreen("task")
  }
  const completeTask = (lessonId: number, taskIndex: number) => {
    const taskKey = lessonId + "-" + taskIndex
    const nextAnswered = answeredTasks.includes(taskKey) ? answeredTasks : [...answeredTasks, taskKey]
    setAnsweredTasks(nextAnswered)
    setXp((current) => current + (answeredTasks.includes(taskKey) ? 0 : 5))
    setStars((current) => current + 0)
    const lesson = lessons.find((item) => item.id === lessonId)
    if (lesson && lesson.questions.every((_, index) => nextAnswered.includes(lessonId + "-" + index))) {
      setCompletedLessons((previous) => previous.includes(lessonId) ? previous : [...previous, lessonId])
    }
    setScreen("home")
    setNotice("Feladat elvégezve! " + (answeredTasks.includes(taskKey) ? "" : "+5 XP"))
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
        alreadyAnswered={answeredTasks.includes(activeLesson.id + "-" + activeTaskIndex)}
        onExit={() => setScreen("home")}
        onComplete={() => completeTask(activeLesson.id, activeTaskIndex)}
        lives={lives}
        onWrongAnswer={() => setLives((current) => Math.max(0, current - 1))}
        onNextQuestion={(nextIndex) => { setActiveTaskIndex(nextIndex); setSessionQuestionIndex(nextIndex); }}
        onOutOfLives={() => { setNotice("Elfogytak az életeid. Pihenj egy kicsit, és próbáld újra!"); setScreen("home"); }}
      />}
      {screen === "shop" && <Shop stars={stars} purchasedItems={purchasedItems} onPurchase={(id, cost) => { if (stars >= cost && !purchasedItems.includes(id)) { setStars((value) => value - cost); setPurchasedItems((items) => [...items, id]); setNotice("Sikeres vásárlás!"); } }} />}
      {screen === "leaderboard" && <Leaderboard />}
      {screen === "profile" && <Profile completedCount={completedLessons.length} xp={xp} userName={userName} setUserName={setUserName} avatar={avatar} setAvatar={setAvatar} notifications={notifications} setNotifications={setNotifications} compactMode={compactMode} setCompactMode={setCompactMode} showSettings={showSettings} setShowSettings={setShowSettings} />}
    </section>
    {screen !== "lessonIntro" && screen !== "task" && <Nav screen={screen} setScreen={setScreen} />}
  </main>
}

function Brand() { return <div className="brand"><img src={foxIcon} alt="Evölingo fox mascot" /><div><h1>Evölingo</h1></div></div> }

function Home({ readLessons, completedLessons, answeredTasks, stars, notice, clearNotice, onOpenLesson, onOpenTask }: {
  readLessons: number[]; completedLessons: number[]; answeredTasks: string[]; stars: number; notice: string; clearNotice: () => void
  onOpenLesson: (id: number) => void; onOpenTask: (lessonId: number, index: number) => void
}) {
  return <>
    <header className="app-header home-header"><Brand /><div className="home-currencies"><div className="star-balance" aria-label={stars + " csillag"}><Star size={21} fill="currentColor" /><strong>{stars}</strong></div><div className="health"><Heart fill="currentColor" size={20} /><strong>5</strong></div></div></header>
    <div className="section-heading home-heading"><div><p className="eyebrow">ANGOL</p><h2>Tanulási útvonal</h2></div></div>
    {notice && <button className="inline-notice" onClick={clearNotice}><span>{notice}</span><X size={16} /></button>}
    <div className="learning-path">
      {pathItems.map((item) => {
        const lesson = "questions" in item ? item as LessonUnit : null
        const unlocked = item.id === 1 || completedLessons.includes(item.id - 1)
        const read = readLessons.includes(item.id)
        const complete = completedLessons.includes(item.id)
        if (!lesson) return <div className="future-path-node" key={item.id}><span className="future-book-dot"><LockKeyhole size={23} /></span><div><strong>{item.title}</strong><span>Kidolgozás alatt</span></div></div>
        return <article className={"path-lesson " + (unlocked ? "path-lesson-open" : "path-lesson-locked") + (complete ? " path-lesson-complete" : "")} key={lesson.id}>
          <div className="path-lesson-main">
            <button className="path-lesson-book" disabled={!unlocked} onClick={() => onOpenLesson(lesson.id)} aria-label={"Tananyag: " + lesson.title}>
              <BookOpen size={25} />
              {read && <span className="lesson-read-mark"><Check size={11} /></span>}
            </button>
            <button className="path-lesson-title" disabled={!unlocked} onClick={() => onOpenLesson(lesson.id)}>
              <span className="path-lesson-overline">LECKE {String(lesson.id).padStart(2, "0")} · {lesson.level}</span>
              <strong>{lesson.title}</strong>
              <span>{lesson.summary}</span>
            </button>
            {complete && <span className="lesson-completed-badge"><CheckCircle2 size={17} /></span>}
          </div>
          <div className="path-task-row">
            <span className="path-task-caption"><ClipboardCheck size={14} /> FELADATOK</span>
            <div className="path-task-dots">
              {lesson.questions.map((_, index) => {
                const answered = answeredTasks.includes(lesson.id + "-" + index)
                const taskOpen = unlocked && read
                return <button
                  key={index}
                  className={"path-task-dot " + (answered ? "task-answered" : taskOpen ? "task-available" : "task-locked")}
                  disabled={!unlocked}
                  onClick={() => onOpenTask(lesson.id, index)}
                  aria-label={lesson.title + " — " + (index + 1) + ". feladat" + (answered ? ", megoldva" : "")}
                  title={(index + 1) + ". feladat" + (answered ? " · Megoldva" : "")}
                >{answered ? <Check size={15} /> : taskOpen ? index + 1 : <LockKeyhole size={12} />}</button>
              })}
            </div>
          </div>
        </article>
      })}
    </div>
  </>
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
  return <div className="lesson-layout lesson-intro-layout">
    <header className="lesson-topbar">
      <button className="exit-lesson" onClick={onExit} aria-label="Vissza a tanulási útvonalhoz"><X size={27} /></button>
      <div className="intro-top-title"><span>LECKE {String(lesson.id).padStart(2, "0")}</span><strong>{lesson.title}</strong></div>
      <div className={"reading-clock " + (readingComplete ? "is-complete" : "")} aria-label={readingComplete ? "Olvasás kész" : "Hátralévő idő: " + secondsLeft + " másodperc"}>
        {readingComplete ? <CheckCircle2 size={23} /> : <><svg viewBox="0 0 44 44" aria-hidden="true"><circle className="reading-clock-track" cx="22" cy="22" r="18" /><circle className="reading-clock-progress" cx="22" cy="22" r="18" strokeDasharray={circumference} strokeDashoffset={circumference * progress} /></svg><span>{secondsLeft}</span></>}
      </div>
    </header>
    <div className="intro-scroll-content">
      <div className="intro-hero">
        <div className="intro-hero-mascot"><img src={foxIcon} alt="Evölingo róka" /></div>
        <span className="intro-eyebrow">ANGOL NYELVTAN · {lesson.level}</span>
        <h1>{lesson.title}</h1>
        <p>{lesson.summary}</p>
        <div className="intro-meta"><span><BookOpen size={15} /> Tananyag</span><span><Zap size={15} /> +10 XP olvasásért</span></div>
      </div>
      <figure className="lesson-illustration"><img src="https://undraw.co/illustrations/education_3vwh.svg" alt="Tanulási illusztráció" /><figcaption>{lesson.summary}</figcaption></figure>
      {lesson.sections.map((section, index) => <section className="lesson-note-block" key={section.title}>
        <h2>{index + 1}. {section.title}</h2><p>{section.body}</p>
        {section.rows && <div className="grammar-table">{section.rows.map(([left, right]) => <div key={left}><span>{left}</span><strong>{right}</strong></div>)}</div>}
        {section.examples?.map((example) => <div className="example-card" key={example.sentence}><span className="example-label">PÉLDA</span><p>{example.sentence}</p><small>{example.translation}</small></div>)}
        {section.tip && <div className="lesson-callout"><Lightbulb size={19} /><p>{section.tip}</p></div>}
      </section>)}
      <section className="lesson-note-block"><h2>Gyors összefoglaló</h2><ul className="lesson-summary-list">{lesson.sections.slice(0, 3).map((section) => <li key={section.title}>{section.title}: {section.body.split(".")[0]}.</li>)}</ul></section>
      <figure className="lesson-illustration second-lesson-illustration"><img src="https://undraw.co/illustrations/reading-time.svg" alt="Olvasás és tanulás illusztráció" /><figcaption>Olvass, gondold át a példákat, és folytasd a tanulást.</figcaption></figure>
      <div className="reading-inline-status">{readingComplete ? <><CheckCircle2 size={19} /><span>Tananyag elolvasva · +10 XP</span></> : <><BookOpen size={19} /><span>Olvasd át a tananyagot. A körben láthatod a hátralévő időt.</span></>}</div>
      {readingComplete && <div className="reading-complete-state"><div><strong>Mehetünk tovább!</strong><p>A leckéhez tartozó négy feladat most már elérhető az útvonalon.</p></div><button className="primary-action" onClick={onPractice}>Feladatok megnyitása <ArrowRight size={19} /></button></div>}
    </div>
  </div>
}

function TaskExercise({ lesson, taskIndex, onExit, onComplete, alreadyAnswered, lives, onWrongAnswer, onNextQuestion, onOutOfLives }: {
  lesson: LessonUnit; taskIndex: number; onExit: () => void; onComplete: () => void; alreadyAnswered: boolean;
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
  const currentAnswer = question.type === "choice" ? selectedAnswer : question.type === "text" ? typedAnswer : selectedWords.map((item) => item.split(":").slice(1).join(":")).join(" ")
  const canCheck = currentAnswer.trim().length > 0 && lives > 0
  const acceptedAnswers = [question.answer, ...(question.accepted ?? [])]
  const resetAnswer = () => { setSelectedAnswer(""); setTypedAnswer(""); setSelectedWords([]); setChecked(false); setAnswerCorrect(false); setHeartLost(false) }
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
      <button className="exit-lesson" onClick={onExit} aria-label="Kilépés a feladatból"><X size={27} /></button>
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
      {checked && <div className={"answer-feedback " + (answerCorrect ? "feedback-correct" : "feedback-incorrect")} role="status"><span className="feedback-icon">{answerCorrect ? <CheckCircle2 size={23} /> : <RotateCcw size={22} />}</span><div><strong>{answerCorrect ? "Helyes! +1 csillag" : "Ez most nem sikerült"}</strong>{!answerCorrect && <p>Próbáld újra. A hibás válasz egy életbe kerül.</p>}</div></div>}
      {checked && answerCorrect && <div className={"star-reward " + (rewardPulse ? "star-reward-pop" : "")}><Star size={22} fill="currentColor" /><strong>+1 csillag</strong></div>}
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
function Leaderboard() { return <><PageHeader title="Ranglista" /><div className="league-card"><div className="league-top"><div className="league-badge"><Trophy size={26} /></div><div><h3>Bronz liga</h3><p>Vége: 2 nap múlva</p></div></div><div className="league-progress"><span style={{ width: "68%" }} /></div></div><div className="rank-list">{ranks.map((rank) => <div className={"rank-row " + (rank.name === "You" ? "you" : "")} key={rank.name}><div className="rank-number">{rank.place <= 3 ? <Medal size={21} /> : rank.place}</div><div className="rank-avatar">{rank.name.charAt(0)}</div><div className="rank-name"><strong>{rank.name === "You" ? "Te" : rank.name}</strong><span>{rank.name === "You" ? "Csak így tovább!" : "Angolt tanul"}</span></div><strong className="rank-xp">{rank.xp}</strong></div>)}</div></> }
function Profile({ completedCount, xp, userName, setUserName, avatar, setAvatar, notifications, setNotifications, compactMode, setCompactMode, showSettings, setShowSettings }: {
  completedCount: number; xp: number; userName: string; setUserName: (value: string) => void;
  avatar: string; setAvatar: (value: string) => void; notifications: boolean; setNotifications: (value: boolean) => void;
  compactMode: boolean; setCompactMode: (value: boolean) => void; showSettings: boolean; setShowSettings: (value: boolean) => void
}) {
  const [draftName, setDraftName] = useState(userName)
  const [saved, setSaved] = useState(false)
  useEffect(() => setDraftName(userName), [userName])
  const avatarSrc = avatar === "fox" ? foxIcon : avatar === "book" ? "" : ""
  return <>
    <PageHeader title="Profil" />
    <div className="profile-card profile-edit-card">
      <div className="large-avatar">{avatar === "fox" ? <img src={foxIcon} alt="Róka profilkép" /> : <span className="avatar-emoji">{avatar === "book" ? "📚" : avatar === "star" ? "⭐" : "🦊"}</span>}</div>
      <div><h2>{userName || "Tanuló"}</h2><p>Saját tanulói profil</p></div>
    </div>
    <div className="profile-stats"><div><Flame /><strong>7</strong><span>napos sorozat</span></div><div><Zap /><strong>{xp.toLocaleString("en-US")}</strong><span>XP</span></div><div><BookOpen /><strong>{completedCount}</strong><span>kész lecke</span></div></div>
    <section className="profile-settings">
      <button className="settings-section-heading" onClick={() => setShowSettings(!showSettings)} aria-expanded={showSettings}><span>Profil és beállítások</span><span>{showSettings ? "−" : "+"}</span></button>
      {showSettings && <>
        <label className="setting-label" htmlFor="profile-name">Név</label>
        <div className="profile-name-form"><input id="profile-name" maxLength={32} value={draftName} onChange={(event) => { setDraftName(event.target.value); setSaved(false) }} placeholder="Írd be a neved" /><button onClick={() => { const value = draftName.trim(); if (value) { setUserName(value); setSaved(true) } }}>Mentés</button></div>
        {saved && <p className="setting-success">A profilnév frissítve.</p>}
        <span className="setting-label">Profilkép</span>
        <div className="avatar-options">{[["fox","🦊"],["book","📚"],["star","⭐"],["spark","✨"]].map(([id,emoji]) => <button key={id} className={"avatar-option " + (avatar === id ? "selected" : "")} onClick={() => setAvatar(id)} aria-label={"Profilkép: " + emoji}>{emoji}</button>)}</div>
        <label className="setting-toggle"><span><strong>Értesítések</strong><small>Tanulási emlékeztetők (felület-beállítás)</small></span><input type="checkbox" checked={notifications} onChange={(event) => setNotifications(event.target.checked)} /></label>
        <label className="setting-toggle"><span><strong>Kompakt felület</strong><small>Kisebb térközök és tömörebb kártyák</small></span><input type="checkbox" checked={compactMode} onChange={(event) => { setCompactMode(event.target.checked); document.documentElement.classList.toggle("compact-ui", event.target.checked) }} /></label>
        <p className="setting-footnote">Ezek a beállítások jelenleg ezen az oldalon, a megnyitott munkamenet alatt működnek. A rendszer értesítéseit még nem küldi ki.</p>
      </>}
    </section>
  </>
}
function PageHeader({ title }: { title: string }) { return <header className="page-header"><div className="brand compact"><img src={foxIcon} alt="Evölingo róka" /><div><h1>Evölingo</h1></div></div><h1>{title}</h1></header> }
function Nav({ screen, setScreen }: { screen: Screen; setScreen: (screen: Screen) => void }) { const items: [Screen, string, React.ElementType][] = [["home", "Tanulás", BookOpen], ["shop", "Bolt", ShoppingBag], ["leaderboard", "Ranglista", BarChart3], ["profile", "Profil", UserRound]]; return <nav className="bottom-nav">{items.map(([id, label, Icon]) => <button key={id} className={screen === id ? "active" : ""} onClick={() => setScreen(id)} aria-current={screen === id ? "page" : undefined}><Icon size={23} /><span>{label}</span></button>)}</nav> }
