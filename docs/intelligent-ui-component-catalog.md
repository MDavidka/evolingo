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
| `study_calculator` | Napi és heti tanulási idő kiszámítása | Élő csúszkák, újraszámítás, alapértékek visszaállítása | Csak előre ellenőrzött szorzás, nincs `eval` vagy szerveroldali állapotváltoztatás |
| `concept_card` | Rövid vizuális fogalommagyarázat | Fix Lucide ikon, oktatási jelvény | Ellenőrzött ikonválaszték; nincs fiókstátusz-állítás |
| `grammar_rule` | Nyelvtani szabály és példák | Olvasás | 5 példa |
| `quiz_choice` | Feleletválasztás és visszajelzés | Kiválasztás, szerveroldali ellenőrzés, újrapróbálás | A kliens előre csak titkosított kvízjegyet kap, nem megoldókulcsot |
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

## 2. fejlesztési fázis — biztonságos kvízek és élő kalkulátor

**Új kvíz API:** `POST /api/chat/quiz`. Az AI-modell eredeti kvízleírását (`correctIndex`, `explanation`) kizárólag a szerver ellenőrzi, majd AES-256-GCM-mel zárt, 72 óráig érvényes `ticket` kerül a böngészőbe. A felhasználó válasza az ellenőrző végpontra érkezik; az eredményben csak **az ellenőrzés után** szerepel a megoldás és az indoklás. A végpont same-origin ellenőrzést, hosszkorlátot és alap szintű kérésszám-korlátot használ. A token nem felhasználói bejelentkezés és nem jogosít hivatalos pontváltoztatásra.

A régebbi Tanulás / Erasmus témák **helyi önellenőrző feladatai** továbbra is az eddigi, kizárólag kliensoldali visszajelzést adják; ez nem hivatalos szerveroldali pontozás. A modell által az AI chatben mostantól generált új kvízeknél a helyes válasz nem kerül az induló kliens-JSON-ba. Kvízkéréskor a szöveges bevezető szándékosan **nem közli a megoldást**, a szerver ellenőrzése után megjelenik a teljes magyarázat.

**Titkosítás:** előnyben részesített konfiguráció: `EVO_VISUAL_QUIZ_SECRET` (minimum 16 karakter; ajánlott hosszú, véletlen kulcs). Amíg ez nincs külön beállítva, a szerver a már meglévő `EVO_AI` kulcsból külön névterű SHA-256 kulcsot származtat; a szolgáltatói kulcs cseréje ekkor érvényteleníti a korábbi kvízjegyeket. Titok nélkül a kvíz nem használható, de az egyszerű szöveges válasz továbbra is működik. A kvíz-próbálkozások nem írnak adatbázist.

**Új tanulásiidő-kalkulátor:** `study_calculator` típus; 5–120 napi perc (5 perces lépés), 1–7 nap/hét és 1–12 hét. A számítást az alkalmazás saját, tesztelhető függvénye végzi, így a modell nem adhat át végrehajtható matematikai kódot. Az aktuális értékek az adott böngészőfül `sessionStorage` tárhelyén mentődnek. A számított idő nem valós tanulmányi statisztika, ezért külön jelzést kap.

**Válasz-orchestrátor:** `orchestrator.ts` tartalmazza a megengedett komponensek listáját, az alapvető szándékfelismerést és a modell számára küldött megjelenítési javaslatot. Az olyan kérés, hogy „csak szöveggel válaszolj”, nem indítja el a második UI-generálást. Az eredeti NVIDIA NIM API, a működő útvonalak és a Tanulás kezdőoldal változatlanok.

**Automatikus ellenőrzéshez hozzáadott tesztek:** `quiz-security.test.mjs` (titkosság, tokenhamisítás, érvényesség, hibás adat), `orchestrator.test.mjs` (szándékválasztás, kalkulátor), valamint a korábbi sématesztek. A Vercel production build eredménye **nem bizonyítja**, hogy az összes teszt, az iPhone VoiceOver és az éles NVIDIA API-válasz ellenőrzése is sikeres.

## A modellel való együttműködés

1. Általános kérésnél az eredeti modellvégpont SSE-ként fokozatosan továbbítja a magyar szöveges választ. Kvízkérésnél először csak semleges bevezetőszöveg, majd a megoldókulcs nélküli kvízblokk jelenik meg.
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
- A chat, a tanulási terv és a kalkulátor az aktuális böngészőfül `sessionStorage` területén marad; a kvíz-próbálkozás és a tanulókártyák saját értékelése helyi `localStorage` adat. Egyik sem felhős szinkronizáció.
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
