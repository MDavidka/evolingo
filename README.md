# Evölingo — AI-asszisztens

Next.js-alapú, mobil-első AI-munkaterület. A korábbi nyelvtanulási modul helyett az alábbi fő felületek érhetők el:

- **AI chat** (`/chat`) – beszélgetések, mellékletek és strukturált AI-válaszok.
- **Ütemezés** (`/utemezes`) – helyben mentett, kézzel kezelhető feladatok.
- **Könyvtár** (`/konyvtar`) – fájlok, mappák, letöltési előzmények, visszaállítható törlés.
- **Eszközök** (`/eszkozok`) – integrációs katalógus és külső gép hivatkozások.
- **Ötletbörze** (`/otletborze`) – közös AI builder feladatok.
- **Profil** (`/profil`) – személyes adatok, értesítések és beállítások.
- **Belépés és regisztráció** – előkészített űrlapok; tényleges fiókos autentikáció még nincs bevezetve.

Az ütemezett feladatok **nem futnak automatikusan a háttérben**. Az integrációs katalógusban szereplő szolgáltatók szintén nem jelentenek aktív kapcsolatot.

## Fejlesztés

```bash
npm ci
npm run typecheck
npm test
npm run build
```

A projekthez GitHub Actions minőségellenőrzés tartozik. A `docs/removal-inventory.md` és `docs/ai-restyle-implementation.md` tartalmazza az átalakítás műszaki leltárát.

## AI provider configuration

Az AI chat OpenRouter kompatibilis chat-completions API-t használ. Állítsd be az `EVO_AI` környezeti változót fejlesztéskor a `.env.local` fájlban, élesítéskor pedig a szerver környezetében. Az `EVO_AI_MODEL` felülírhatja az alapértelmezett modellt. Titkos kulcsot ne commitolj.
