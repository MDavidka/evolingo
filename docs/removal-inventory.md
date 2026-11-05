# Evölingo – eltávolítási leltár

Kiindulópont: `main` – `4ba407d65f59fcc9259a35d8b069016c9d3da21c` (2026-11-04).
Munkavégzés: `chore/remove-english-learning-ai-restyle`; a `main` nem módosul.

## Eltávolítandó útvonalak és képernyők
- `/utvonal`, `/temak`, `/temak/:id`, `/lecke/:id`, `/lecke/:id/tanulas`, `/gyakorlas/:id`, `/gyakorlas/:id/keszseg`, `/szokartyak/:id` → ideiglenes `/chat` redirect.
- `/baratok`, `/ranglista`, `/bolt` → `/chat`; `/tudasfelmeres` → 404.
- A `Screen`-alapú legacy nézetek és állapotok a `app/evolingo-app.tsx` fájlban.
- A `ReferenceScreens` tanulási `home`, `topic`, `selector` nézetei és típusaik.

## Követendő források / elsődleges hivatkozások
- `app/evolingo-app.tsx`: tananyagok, feladatok, tanulási állapot, XP, csillagok, streak, ládák, jutalmak, ranglista, barátok, legacy profil; ügyfél routing és session kezelés.
- `app/reference-screens.tsx`: `Topics`, `TopicDetail`, `LessonSelector`, angol kurzus választó, valamint a maradó Profil/Auth komponensek.
- `app/[...slug]/page.tsx`, `next.config.mjs`: route validálás, metadata, redirectek.
- `app/tools-hub.tsx`: közösségi Barátok/Ranglista sorok.
- `app/api/state/route.ts`: tanulási mezőket tartalmazó whitelist/default/API válasz.
- API eltávolítás: `app/api/leaderboard/route.ts`, `app/api/friends/requests/route.ts`, `app/api/friends/suggestions/route.ts`, `app/api/skill-ai/route.ts`.

## Tanuláshoz kötött modulok és állományok
- `app/skill-exercises.tsx`, `app/skill-exercises.css`, `app/skill-icons.tsx`, `app/skill-vocabulary.ts`, `app/path-tile.tsx`.
- `app/learning-home.css`, `app/profile-dashboard.tsx`, `app/profile-dashboard.css`, `app/profile-mobile.css` (csak ha nincs maradó használat), `app/profile-reference-exact.css`.
- `app/intelligent-ui/lesson-overview.ts` és annak `lesson-overview.test.mjs` tesztje.
- Tanulási CSS szelektorcsoportok: `lesson`, `learn`, `task`, `skill`, `flashcard`, `chest`, `shop`, `leaderboard`, `friends`, `bottom-nav`, `path`, `xp`, `streak`; források: `globals.css`, `redesign.css`, `unified-screens.css`, `reference-screens.css`, `uiarc-integration.css`, `readability.css`.

## Assetek (hivatkozásellenőrzés után)
- `public/images/path-cloud.png`, `path-symbols.png`, `lesson-level-6.png`, `chest-notification.svg`, `chest-open.svg`, `task-ready.svg`, `campaign-sticker-pack.webp`, `evoskill-original-cutouts.webp`, `evoskill-cutouts-v3/`, `profile-badges/`.
- A megmaradó `evolingo-ai-orb.svg`, `icon.svg`, általános `icons/` és `development-warning.png` sértetlen.

## Megőrzendő kód / adat
- `/api/chat`, `/api/chat/quiz`, `/api/brainstorm`, `/api/space`, `/api/dev/restart`, `/api/state`.
- `ChatInterface`, `Brainstorm`, `LibrarySpace`, `Schedule`, `ToolsHub`, profil és auth.
- A MongoDB `users` dokumentumainak **meglévő mezői és gyűjteményei nem törölhetők**; a tanulási mezők kizárólag a UI és az API szerializálásából/whitelistjéből kerülhetnek ki.
- A `localStorage` régi kulcsait (`evolingo.user-progress.v1`, `evolingo.friends.v1`) nem szabad törölni; nem használjuk őket.
- `intelligent-ui/orchestrator.ts` általános chat-kvíz/nyelvi heurisztikái **kérdésként nyitva maradnak**; nem töröljük őket automatikusan.

## QA és mérési megjegyzések
- Az eredeti audit szerint a globális CSS kb. 713 KB, a JS kb. 1.085 MB (tömörítetlen). A mérés külön buildben megismétlendő.
- A környezetben az eredeti privát tároló teljes helyi klónja és a függőségek nem érhetők el; a kiinduló `npm ci`, lint, build és Playwright lokális futtatása **nem történt meg**. A commit utáni CI/Vercel build státuszt külön ellenőrizni kell.
- Ne pusholj a `main` ágra; új ági módosítások visszafordíthatók. Merge csak külön jóváhagyásra.
