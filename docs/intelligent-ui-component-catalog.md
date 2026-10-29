# Evölingo — archív Intelligent UI komponenskatalógus

**Jelenlegi működés: kizárólag szöveges AI-válaszok.** Az interaktív AI-válaszkártyák, táblázatok, tanulókártyák, kvízgombok, jelvények, ikonok, linkek, válaszhoz tartozó másolásgomb és vizuális betöltésjelzők **ki vannak kapcsolva**. Az AI nem készít JSON-alapú felületleírásokat, és a kliens nem jeleníti meg a korábban elmentett UI-leírásokat sem. A Tanulás képernyő továbbra is AI-mentes.

A `POST /api/chat` továbbra is működik: a `{ messages }` kérés JSON-választ, a `{ messages, interactive: true }` kérés pedig kizárólag `delta`, `text`, `done` (vagy `error`) eseményeket küld. A JSON csak belső adatcsere, nem a felhasználói válasz tartalma. Az esetleges régebbi Markdown-szintaxist a kliens olvasható szöveggé alakítja.

Az alábbi katalógus **archív referencia**, nem aktív vagy bekapcsolandó funkciólista. A megmaradt forrásfájlok nem kapcsolódnak a chat megjelenítéséhez. Visszakapcsolásukhoz külön termékdöntés szükséges.

---

## Korábban megvalósított, jelenleg inaktív komponensek

| Típus | Használat | Felhasználói interakció | Biztonsági korlát |
| --- | --- | --- | --- |
| `grammar_rule` | Nyelvtani szabály és példák | Olvasás | 5 példa |
| `quiz_choice` | Feleletválasztás és visszajelzés | Válasz, újrapróbálás | 2–5 válasz |
| `vocabulary_flashcard` | Kétnyelvű szógyakorlás | Megfordítás, előző/következő | 1–12 kártya |
| `comparison_table` | Két fogalom összehasonlítása | Olvasás | 1–8 sor |
| `tense_timeline` | Időrend vagy nyelvtani igeidő | Lépésválasztás | 2–5 lépés |
| `study_plan` | Napi feladatlista | Jelölőnégyzetek | 1–7 nap, csak helyi állapot |
| `progress_bars` | Hitelesített előrehaladás | Olvasás | Modellszövegből **nem** engedélyezett |

Forrás: `app/intelligent-ui/schema.ts` és `renderer.tsx`.

Minden mezőnek kötelező típusa és hosszhatára van. Ismeretlen típus, mező, túlméretezett lista vagy ismétlődő blokkazonosító esetén az egész UI-leírás elutasításra kerül. A React kizárólag szöveget ír ki, nem értelmez modelltől kapott HTML-t, CSS-t vagy programkódot.

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

A teljes tervből a további változatokra marad a szélesebb komponenskatalógus (például szókártyapárosítás, diagramok és dokumentum-összegzés), hitelesített személyes haladás megjelenítése, perzisztens felhőbeli beszélgetések, szolgáltatói strukturált kimenet, teljes mobilos VoiceOver-interakciós teszt és fokozatos felhasználói bevezetés. Ezeket a v1 nem állítja késznek.
