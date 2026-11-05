# AI-only restyle – implementation report

**Branch:** `chore/remove-english-learning-ai-restyle`  
**Based on:** `main` at `4ba407d65f59fcc9259a35d8b069016c9d3da21c`.  
**Release policy:** do not merge to `main` until the owner approves. All changes are reversible; no MongoDB migration or data deletion was performed.

## Implemented

1. **Routes and shell**
   - `app/evolingo-app.tsx` (2580 → 184 lines) is now a lean AI-only shell with preserved guest profile data, local fallback and remote `/api/state` sync.
   - `app/reference-screens.tsx` contains only Chat, Brainstorm, Schedule, Library, Utilities, Profile and Auth.
   - Old learning URLs redirect to `/chat`; `/tudasfelmeres` and unrecognized URLs produce a dedicated Hungarian 404.
   - Hungarian error and loading pages; metadata and PWA description updated for the AI product.

2. **Learning feature removal**
   - Removed legacy lesson/skill/path/shop/ranking/friends components, the unused legacy profile/dashboard and associated test/asset files (41 files in a single reversible tree commit).
   - Removed leaderboard, friend request/suggestion and skill AI API handlers.
   - Removed the community links from ToolsHub.
   - `/api/state` exposes only profile/session/settings fields. Existing MongoDB document keys remain untouched and historical browser localStorage keys are not deleted.

3. **UI and accessibility**
   - Design Spec v1.0 tokens include monochrome colors, typography, spacing, radii, z-index, safe-area and motion.
   - Sidebar uses Lucide icons, top new-chat shortcut, active-row highlight, bottom profile row, touch gestures, focus handling and no X close button.
   - Responsive sidebar: mobile overlay up to 85vw/320px; persistent desktop 260px with saved collapsed state.
   - Chat: starter suggestions, neutral primary controls, 44px icon targets, generic error messages; blur-free header fade.
   - Library: preserved upload/folder/file operations, Favorites, Locations, Downloads and recoverable Trash.
   - ToolsHub: storage and external machine shortcuts; connectors remain visibly unconnected where authentication is not supported.
   - Schedule: tabbed local task tracking, weekly date strip, time input, long-task progress.
   - Profile: AI/data shortcuts, notification permission only on explicit interaction, improved help copy.
   - Builder/Brainstorm: narrow-viewport overflow fixes. EmptyState uses `role="status"`.

4. **PWA and code hygiene**
   - Offline fallback page and cache-first versioned static assets.
   - Lucide replaces the Mage adapter in active UI; removed obsolete Mage adapter and Phosphor package from manifest/lockfile.
   - CSS cleanup of four global/legacy sheets removed about 255 KB of source, after protecting comments and retained shared selectors.

## Checks and limits
- GitHub Actions `verify.yml` runs `npm ci`, `npm test`, `npm run typecheck`, `npm run build` on the branch.
- First QA run found a CSS comment parsing defect. It was fixed; a later `2bf4224e` run passed tests (35/35), typecheck and build.
- Subsequent commits need their own final CI status confirmed before release.
- The source package does not define an `npm run lint` command; typecheck and existing tests are the available built-in checks.
- Pixel comparison screenshots, Lighthouse, axe, actual PWA keyboard/landscape behavior, 200% zoom, and integration tests on real iPhones remain manual QA items.
- Original design targets **CSS below 150 KB, first-load JS below 500 KB and fewer than 100 `!important`** are not yet verified or met. Remaining global CSS needs a separate targeted refactor rather than unsafe blanket deletion.
- PNG/maskable PWA icons, full backend scheduled execution/notifications, credential-based app login, connected provider integrations, and optional command palette are not implemented.
- AI chat orchestrator's generic grammar and flashcard inference remains in place (see `docs/removal-inventory.md`). This is not a lesson or gamification route.

## Data preservation
Do not erase or migrate MongoDB collections/fields without a separate explicit approval. Earlier learning progress remains stored but is neither read nor returned from the AI-only profile/state API. Historic browser storage keys are not cleared.

## Suggested release review
Confirm the final CI run and Vercel preview. Test every retained page at 320px, 390px and 1280px; check sidebar open/close, upload, chat responses, local schedule persistence, file restore, settings saves, unknown URL 404 and offline fallback. Only merge after user approval.
