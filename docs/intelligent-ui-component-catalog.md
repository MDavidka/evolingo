# Evölingo — Intelligent UI v1

## Állapot

Az interaktív tanulási felület kizárólag a **külön Evölingo AI chatben** aktív. A **Tanulás kezdőképernyőn nem jelenik meg AI-funkció**. Az oktatási komponensek egy saját React-készletből állnak, nem az OpenAI ChatGPT belső, nem publikus felületrajzolójából.

A meglévő `POST /api/chat` útvonal változatlanul támogatja a `{ messages }` JSON-kérésre adott `{ reply }` JSON-választ. Az `{ messages, interactive: true }` kérés szöveges eseményfolyamot ad: először `text`, majd szükség esetén `ui`, végül `done`. Nem tokenenkénti szövegstream: a kész szöveg érkezik a válaszhoz később hozzáadott interaktív blokkok előtt.

## Engedélyezett komponensek

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

1. Az eredeti modellvégpont előállítja a magyar szöveges választ.
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

A teljes tervből a további változatokra marad a szélesebb komponenskatalógus (például szókártyapárosítás, diagramok és dokumentum-összegzés), hitelesített személyes haladás megjelenítése, perzisztens felhőbeli beszélgetések, szolgáltatói strukturált kimenet, valódi tokenstream, teljes mobilos VoiceOver-interakciós teszt és fokozatos felhasználói bevezetés. Ezeket a v1 nem állítja késznek.
