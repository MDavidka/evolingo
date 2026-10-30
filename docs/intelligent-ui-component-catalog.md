# Evölingo — Visual Intelligence: első megvalósított komponensfázis

## Állapot

Az AI által kiválasztott interaktív komponensek a **külön Evölingo AI chatben** aktívak. Ugyanezek a React-komponensek a **Tanulás / Erasmus témák Áttekintés** nézetében is megjelennek, ott kizárólag a valódi leckékről származtatott tartalommal. A **Tanulás kezdőképernyőn nem jelenik meg AI-funkció**. Az oktatási komponensek egy saját React-készletből állnak, nem az OpenAI ChatGPT belső, nem publikus felületrajzolójából.

A meglévő `POST /api/chat` útvonal változatlanul támogatja a `{ messages }` JSON-kérésre adott `{ reply }` JSON-választ. Az `{ messages, interactive: true }` kérés szöveges eseményfolyamot ad: először fokozatos `delta` szövegrészek, majd egy végleges `text` esemény, szükség esetén `ui`, végül `done`. Az interaktív blokkok a már megjelenített szöveg után érkeznek. A kliens az animációs képkockákhoz igazítva frissíti a szöveget, hogy az iPhone görgetése gördülékeny maradjon.

## Az AI-válaszok megjelenítése

A korábbi nyers Markdown-szöveg helyett a `app/chat-rich-text.tsx` biztonságos React-megjelenítő rajzolja a címsorokat, kiemeléseket, idézeteket, felsorolásokat, egyszerű kódpéldákat, táblázatokat, képeket és hivatkozásokat. A felhasználó nem a `###` vagy `**` formázójeleket látja, hanem a megfelelő felületi elemeket. A hivatkozások csak ellenőrzött HTTPS-címek vagy belső útvonalak lehetnek. Külső képeket kizárólag engedélyezett, ismert médiakiszolgálókról jelenítünk meg.

A modelltől származó HTML/JS/JSX/CSS soha nem kerül végrehajtásra, és a UI-komponensek kizárólag ellenőrzött JSON-adatokból, előre elkészített React-kódból épülnek fel. A sima szöveges válasz végig használható marad, ha az opcionális UI nem áll össze.

## Engedélyezett komponensek

| Típus | Használat | Felhasználói interakció | Biztonsági korlát |
| --- | --- | --- | --- |
| `chart_card` | Mobilra méretezett oszlop-, vonal- és kördiagram | Adatpont választása, részletes számlista | Modell csak `example` forrást kérhet; `verified` kizárólag valódi leckeadatból |
| `concept_card` | Rövid vizuális fogalommagyarázat | Fix Lucide ikon, oktatási jelvény | Ellenőrzött ikonválaszték; nincs fiókstátusz-állítás |
| `grammar_rule` | Nyelvtani szabály és példák | Olvasás | 5 példa |
| `quiz_choice` | Feleletválasztás és visszajelzés | Válasz, újrapróbálás | 2–5 válasz |
| `vocabulary_flashcard` | Kétnyelvű szógyakorlás | Megfordítás, előző/következő | 1–12 kártya |
| `comparison_table` | Két fogalom összehasonlítása | Olvasás | 1–8 sor |
| `tense_timeline` | Időrend vagy nyelvtani igeidő | Lépésválasztás | 2–5 lépés |
| `study_plan` | Napi feladatlista | Jelölőnégyzetek | 1–7 nap, csak helyi állapot |
| `progress_bars` | Hitelesített előrehaladás | Olvasás | Modellszövegből **nem** engedélyezett |

Forrás: `app/intelligent-ui/schema.ts` és `renderer.tsx`.

Minden mezőnek kötelező típusa és hosszhatára van. Ismeretlen típus, mező, túlméretezett lista vagy ismétlődő blokkazonosító esetén az egész UI-leírás elutasításra kerül. A React kizárólag szöveget ír ki, nem értelmez modelltől kapott HTML-t, CSS-t vagy programkódot.

## Első három működő komponens (2026. október 30.)

1. **Feleletválasztós kvíz:** válaszkijelölés, külön „Válasz ellenőrzése” gomb, rögtön megjelenő indoklás, újrapróbálás; az állapotot a böngésző az adott kártyához menti. A modellgenerált megfejtés nem hivatalosan hitelesített tanári értékelés.
2. **Tanulókártya:** koppintásra megfordítható, oldalra húzható, előző/következő gombokkal, a böngésző beszédszintetizálójával angol kiejtésre képes, a „Tudom” / „Ismétlem” választások helyileg mentődnek. Nincs még ütemezett spaced-repetition algoritmus.
3. **Grafikon:** sávos, vonalas és gyűrűdiagram, szöveges akadálymentes adatsor, választható pontok és egyértelmű forrásjelölés. A modell által generált grafikon szemléltető. A témaáttekintés a már létező `read` / `completed` leckejelzőket összesíti; nincs hét napra lebontott aktivitásadat kitalálva.

A UI a `app/intelligent-ui/schema.ts` megengedett típuslistájából épül, a közös `renderer.tsx` komponens rajzolja. A pontos leckeműködés a `lesson-overview.ts` tiszta függvényben van elkülönítve, így bármelyik téma azonos funkciókat kap. A rendszer **nem ír leckehaladást az adatbázisba** egy önálló AI-kvíz vagy tanulókártya-jelölés hatására; ez külön, hitelesített backendfolyamatot igényel.

### Kiadási kapcsoló és inkompatibilis modellkimenetek

`EVO_INTELLIGENT_UI_ENABLED=false` esetén az API kizárólag szöveges választ ad az új kérésekhez. Az AI elsőként szöveget streamel, utána opcionálisan ellenőrzött vizuális elemeket. Hibás JSON esetén legfeljebb egyszer kér javítást az NVIDIA-modelltől, és ha az sem megfelelő, a szöveg sértetlenül megmarad. A Nemotron NIM esetén a gyors szöveg- és JSON-kimenethez a támogatott `enable_thinking: false` beállítást használja.

A közzétett terv javasolt **Vercel AI SDK / Zod / Recharts / shadcn / Motion** csomagjait jelenleg **nem adtuk hozzá** a telepítési függőségekhez: az alap meglévő, OpenAI-kompatibilis NVIDIA-kapcsolatot és a szigorú TypeScript-validálást használtuk, a grafikonhoz natív SVG-t, így a meglévő `package-lock.json` nem sérül. Ezek a csomagok a következő migrációs fázis részei, frissített lockfájllal és kompatibilitás-ellenőrzéssel. A jelenlegi kéréshez működő komponensek vannak, nem csak statikus mockup.

**Még hiányzik:** képi és fájlbemenet a chatben; AI alapú szabad szöveges válaszértékelés; automatikus spaced repetition; szerveroldali, felhasználóhoz kötött mastery-szinkron; heti aktivitástörténet; teljes mobilos és VoiceOver-eszközteszt.

## A modellel való együttműködés

1. Az eredeti modellvégpont SSE-ként fokozatosan továbbítja a magyar szöveges választ.
2. Egy gyors témaszűrő eldönti, hogy a kérés alkalmas-e tanulási UI-ra; ez költség- és késleltetésvédelmi szűrő.
3. Ha igen, a modell **külön kérésben** megkísérel legfeljebb két szabályosan strukturált UI-blokkot összeállítani.
4. A szerver ellenőrzi a szigorú sémát, majd csak a megfelelő blokkokat továbbítja.
5. Ha a második modellhívás hibás, lejár vagy érvénytelen leírást ad, a szöveges válasz változatlanul használható.

Az NVIDIA-kompatibilis modellvégpontnál nem feltételezzük, hogy a natív OpenAI Structured Outputs minden módját támogatja; ehelyett korlátozott JSON-formátumot kérünk, majd a szerveren is ellenőrizzük. A jelenlegi függőségek megőrzése érdekében a v1 ellenőrzője saját típusvédőket használ, nem Zodot.

**Kapcsoló:** `EVO_INTELLIGENT_UI_ENABLED=false` kikapcsolja az opcionális UI-generálást, de a szöveges chat működik.

## Adatok és műveletek

- Az adatbázis, a leckehaladás, a profil és a jogosultságok nincsenek automatikusan elérhetővé téve a modellnek.
- Modellgenerált statisztikából nem készülhet haladási diagram.
- Nincs AI-indította adatbázisírás, fájlfeltöltés vagy külső szolgáltatóhoz csatlakozás.
- A chat és a tanulási terv jelölései az aktuális böngészőfül `sessionStorage` területén maradnak; ez nem felhős szinkronizáció.
- A modell válasza tévedhet, különösen kvízhelyesség esetén; a válaszadás tanulási segédlet, nem ellenőrzött oktatási vizsga.

## Mintakérések

- „Magyarázd el a Present Perfectet két példával.”
- „Gyakoroljuk az Erasmushoz szükséges angol szavakat tanulókártyákkal.”
- „Mi a különbség a Past Simple és a Present Perfect között?”
- „Készíts heti angoltanulási tervet.”
- „Kérdezz tőlem egy Present Simple kvízkérdést.”
- „Csak egy rövid, szöveges választ szeretnék.”

## Tesztelés és következő fázisok

```bash
npm ci
npm test
npm run typecheck
npm run build
```

Az ellenőrzőtesztek érvényes és rosszindulatú UI-adatokat is vizsgálnak. A GitHub Actions `verify.yml` workflow ugyanezeket futtatja.

A következő fázisban következhet a többkérdéses kvízsorozat, szókártyapárosítás, fogalomtérképek, fájlfeldolgozás, a tanulási haladás hitelesített szerveroldali szinkronizációja, és a kompatibilis AI SDK/Zod/Recharts csomagok integrációja. A jelenlegi funkciók nem tartalmazzák ezeket.
