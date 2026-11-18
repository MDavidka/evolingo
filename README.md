# Evölingo — AI-asszisztens

Next.js-alapú, mobil-első AI-munkaterület. A korábbi nyelvtanulási modul helyett az alábbi fő felületek érhetők el:

- **AI chat** (`/chat`) – beszélgetések, mellékletek és strukturált AI-válaszok.
- **Cowork** (`/cowork`) – AI-alapú tervezés `auto`, `plan` és `fast` móddal.
- **Ütemezés** (`/utemezes`) – helyben mentett, kézzel kezelhető feladatok.
- **Könyvtár** (`/konyvtar`) – fájlok, mappák, letöltési előzmények, visszaállítható törlés.
- **Eszközök** (`/eszkozok`) – integrációs katalógus és külső gép hivatkozások.
- **Ötletbörze** (`/otletborze`) – közös AI builder feladatok.
- **Profil** (`/profil`) – személyes adatok, értesítések és beállítások.
- **Belépés és regisztráció** – előkészített űrlapok; tényleges fiókos autentikáció még nincs bevezetve.

Az ütemezett feladatok **nem futnak automatikusan a háttérben**. Az integrációs katalógusban szereplő szolgáltatók szintén nem jelentenek aktív kapcsolatot.

## Native iOS app

Az `ios/` mappában található az iOS 17+ SwiftUI-kliens. A fő appfülek natív iOS felületeket használnak; a helyi tárhely, értesítések és profil külön iPhone-app sandboxban működnek. A részletes build- és adatkezelési útmutató az [`ios/README.md`](ios/README.md) fájlban van.

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
# Public AI API on the VPS

`deploy/Caddyfile` serves only `https://api.sycord.site/api/chat` and proxies it to the Next.js backend at `127.0.0.1:28500`. The private developer gateway on port 28501 is not part of this public route. The chat handler applies a single-process sliding-window limit of 100 POST requests per 60 seconds across all clients; it returns HTTP 429 with `Retry-After: 60` when full. The counter resets when the backend restarts, and this limit assumes one backend process.

Cloudflare nameservers are authoritative for `sycord.site`; `api.sycord.site` now resolves through Cloudflare and Caddy obtained its HTTPS certificate. Caddy requires the hostname to resolve correctly and inbound ports 80 and 443 to reach the VPS for automatic certificate issuance and renewal. Keep port 28500 bound to loopback and port 28501 on Meshnet only.

The endpoint intentionally has no login. Anyone who knows the URL can use the shared provider quota, up to the global limit. An unauthenticated HTTPS POST returned a streamed AI response on 2026-11-08. A 101-request check with varied forwarded-IP headers confirmed the first 100 requests are admitted and subsequent requests receive HTTP 429 with `Retry-After: 60`.
