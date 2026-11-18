# Implementation status

See architecture.md for implemented boundaries. This module is not complete; no production-readiness claim is made.

Current automated Myspace tests: 10 unit tests covering strict mutation fields, client ownership rejection, consent, UTF-8 storage size, bounded input streaming, boolean grants, bounded names, forged instance capabilities, malformed runtime requests and protocol payload validation. They do not prove browser isolation or database ownership end-to-end. TypeScript passes. No real iPhone QA has run for Myspace.

16 Myspace unit/artifact tests now pass, including SHA-256 artifact checks, unique bootstrap slots, CSP presence, size limits and cross-app runtime identity rejection. `npm run build:myspace` compiled Notes and Focus Board (approximately 228/231 KB including their independent React runtime). These are static artifact checks, not malicious browser execution tests or proof of whole-platform isolation.

## Live database verification

`scripts/test-myspace-live.mjs` passes against the running production Next backend and MongoDB using temporary guest cookies. Covers guest separation, Notes/Focus storage separation, save/reload, repeated installation without duplicate/reset, rename, pin, revoke/read-mask/write-denial, regrant restoring retained data, forged-owner field rejection, invalid-origin rejection, uninstall and post-uninstall write denial. Test installations are removed in finally. The explicit canonical origin fixed a real reverse-proxy mismatch found by the first run.

## Browser harness

Playwright/Chromium is available on this VM. `scripts/test-myspace-browser.mjs` targets the public HTTPS URL with fresh contexts. It marks the pre-existing development notice dismissed before each test (only in the top frame). Notes and Focus workflows run in their real opaque iframe. The harness waits for server-confirmed completion rather than treating checkbox click feedback as persistence. Browser results do not establish iOS keyboard behavior or all sandbox escape threat cases.

Project integration tests now pass: `node scripts/test-myspace-projects-live.mjs` against public HTTPS/MongoDB, and `node scripts/test-myspace-projects-browser.mjs` in Chromium at 390px. These verify draft source persistence and restoration, not generated app compilation or real iOS WebKit editing. Unit suite remains 22 passing tests; TypeScript and production build passed for the source-manager changes.

Transactional live checks pass after database hardening: regular source project lifecycle plus concurrent creates at the 20-project boundary (one success, two quota rejections), three competing edits (one committed, two stale conflicts), and history containing exactly the two committed snapshots. All temporary projects were deleted through the transactional API. This validates the configured MongoDB cluster's transaction support. The shared rate limiter is implemented but restart/distributed-load and boundary timing tests remain outstanding.

25 unit/artifact tests pass after shortcut changes. Live shortcut tests verify icon/name persistence, reorder, duplicate/unknown icon rejection, stale-set rejection and unpin without uninstall. Chromium checks at 360/390/430px still pass Notes/Focus persistence and parent DOM/cookie isolation. A separate 390px browser test operates the icon selector and Move shortcut down controls and verifies stored order. Screenshot review found portalled settings fields lacked scoped styling; the sheet now has explicit form layout, shared UISettingsSwitchRow and name-save action. Final rendered recheck is pending deployment of that CSS change.

API Inspector Chromium test at 390px passes default network denial, host permission approval, actual HTTPS result, preset persistence after reload and revocation. Deliberate iframe attempts to access parent DOM, fetch an external target, open a popup and navigate the frame to a remote target were blocked; route interception observed no external target requests. This covers these specific browser attack attempts, not all sandbox escape threats. Direct MongoDB inspection verifies network audit records omit sensitive payload fields and have an active TTL index.

Artifact pinning checks pass: scripts/test-myspace-artifact-store.mjs verifies exact historical/current retrieval and rejects tampered, missing, unknown and traversal inputs. scripts/test-myspace-artifacts-live.mjs verifies pinned install references, immutable response caching, explicit update consent, arbitrary digest rejection, and a legacy fixture upgrade preserving data/name/pin/storage grant. Only the fresh test guest's record is altered for the legacy fixture and removed afterward. Unit suite now has 31 passing tests. Notes/Focus Chromium regression passes again at 360,390,430px after pinning; TypeScript and production build pass.
