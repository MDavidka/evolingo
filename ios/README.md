# Evolingo iOS

Native SwiftUI client for the existing Evolingo service. It targets iOS 17 and uses SwiftUI, UIKit haptic generators, UserNotifications, Quick Look, Files import, and the system share sheet.

## Native screens

- **Chat:** streamed Server-Sent Events from `https://api.sycord.site/api/chat`; no login, Meshnet, or VM address is required on the device. The provider key remains server-side. The VPS API has a shared 100 POST/minute limit. When the remote endpoint fails, text-only prompts can fall back to Apple's on-device Foundation Model on eligible Apple Intelligence devices running iOS 26 or later; this local model has less capability than a server model. Responses render in 40 ms batches; generation is cancellable, and failures restore the original draft and attachment when the composer is unused. Photos are orientation-corrected, downsampled, and JPEG-compressed off the main actor. The composer uses iOS 26 Liquid Glass with a material fallback on iOS 17–25, plus a spring transition from a closed pill to a roomier rounded rectangle while editing. Conversation history remains on-device.
- **Cowork:** native SwiftUI screen backed by `NativeCoworkAPI`. It bootstraps the existing guest session, sends owner-scoped conversation/run requests, consumes persisted SSE events, restores active runs, and supports digest-bound one-time approval and cancellation. Plan mode is read-only; Auto/Fast use the Build agent. Multi-step server plans render as validated native progress rows and update from real server events.
- **Ötletbörze:** uses the existing `/api/brainstorm` list, create, and approval endpoints.
- **Ütemezés:** on-device tasks, a native week strip and DatePicker, progress, repeat schedules, and optional local iOS notifications. Date, task-filter, appearance, library-sort, and tab selections use the iOS selection haptic. Save and completion feedback follows the actual local persistence result; a failed task save rolls back the in-memory change and leaves the editor available for retry. Reminder creation and reactivation give success only after scheduling succeeds, and a warning if the task is saved without an active notification. Successful destructive actions use completion feedback; error feedback is reserved for failed operations. It does not run a server-side background worker.
- **Könyvtár:** imports copies from Files, creates and navigates local folders, searches and sorts items, saves notes locally, previews with Quick Look, shares with the iOS share sheet, and includes multi-select plus a restorable trash. Large file copies, directory scans/sorts, note writes, web-export writes, and permanent deletes run on background actors while security-scoped URLs remain open; the list shows import progress and gives one outcome haptic. The browser import index is an atomic, file-protected Application Support file. Trash moves and restores update file paths and metadata together, with rollback attempts on metadata failure. VoiceOver exposes file selection state; batch trash uses one success haptic only when all selected items move, and reports failure if any move fails.
- **Eszközök:** native integration directory and local interest flags. OAuth integrations are not connected; saved machine addresses are validated HTTPS bookmarks and are not health checked.
- **Profil:** local display name and avatar, appearance, reduced-motion preference, configurable UIKit haptics, actual notification authorization status, and an explicit system permission request for local reminders. Haptic generators are reused and prepared when the app becomes active. Avatar image normalization also runs off the main actor. A shared downsampled avatar appears in the profile and chat toolbar; decoded images are cached with a memory limit.

Cowork uses `https://api.sycord.site` for its authenticated API and lets `URLSession` retain the HTTP-only guest session cookie created by `/api/state`. Text attachments are sent as bounded prompt context; image attachments are currently unsupported. The VPS Caddy config already routes `/api/cowork/*` to the Next.js service, but the running Next.js build has not been refreshed with the new route handlers yet. The Cowork worker service is prepared at `deploy/evolingo-cowork-worker.service` and is not installed or running. Before release, the backend build and worker must be deployed together with a shared `COWORK_SECRET` (32+ characters); MongoDB transactions and the prepared Incus OpenCode image are required.

Chat, Cowork, schedule, trash metadata, and the browser import index are stored as atomic, file-protected JSON snapshots in the app's private Application Support directory. Serialization and disk I/O run on dedicated actors, keeping large payloads off the UI thread. Existing `UserDefaults` records migrate only after the file is written successfully; reimported browser conversations and tasks merge into the file-backed stores. Storage errors keep the original file and provide a retry path.

The profile avatar is stored as a downsampled, file-protected JPEG instead of a base64 preference value. The shared in-memory image cache serves the profile and chat toolbar; an existing avatar preference migrates after the JPEG is written successfully. Saved external machine bookmarks are stored in a separate file-protected JSON snapshot; existing bookmark preferences migrate only after the file write succeeds, and web-export imports merge into this same store. The small integration-interest flags remain in `UserDefaults`.

## Data boundaries

Chat history, Cowork history, schedule entries, imported files, tools bookmarks, and profile preferences live in this app's iPhone sandbox. Safari/localStorage data is not automatically migrated into the iOS app. Brainstorm tasks use the existing web API. The Files library is app-local because the web `/api/space` endpoint reports that no remote storage provider is configured.

To move local browser data, open the web profile in Safari and use **Adatok átvitele → Exportálás iOS-apphoz**. Save `evolingo-ios-transfer.json` to Files, then open the native app's **Profil → Adatok átvitele → Webes adatok importálása**. Import merges records by ID; imported files and nested folders are recreated in the local iPhone library, and an on-device ID index prevents duplicate copies when the same export is imported again. The importer limits packages to 60 MB, 5,000 entries, and 20 MB per file, sanitizes names, and keeps existing local data. File reading and JSON decoding run off the main actor, and the security-scoped Files URL stays available until the import completes. The export can contain private chat text and file contents, so keep it on your own device and delete the transfer file after import if you no longer need it.

## Build

The VPS has Swift 6.4.2 and xtool 1.24.0. With the Swift toolchain on `PATH`:

```sh
xtool dev build --configuration release --ipa
```

For this shell environment:

```sh
PATH=/root/.local/share/swiftly/toolchains/6.4.2/usr/bin:$PATH xtool dev build --configuration release --ipa
```

The build artifact is written to `xtool/Evolingo.ipa`. This Linux build is unsigned and has no provisioning profile; sign it on-device with the chosen sideloading app. A successful compile does not verify runtime behavior on an iPhone.

## Native UI update

The Chat screen follows the supplied light iPhone reference: a white-to-blue-gray canvas, spaced sidebar/avatar controls, and a glass composer with attachment, message, Tutor mode, and waveform focus control. The chat canvas is pinned to light appearance; other app screens still follow the app appearance preference. The waveform control focuses the text field so the iOS keyboard can provide its own dictation feature; this app does not capture audio itself. AI requests go to the hosted API over HTTPS; the iOS client does not contact a Meshnet VPS or store the AI provider key.

Release build 1.1 (57) targets `api.sycord.site`. The VPS domain, TLS proxy, shared rate limit, and one unauthenticated streamed AI response were verified. The IPA is unsigned and contains no embedded provisioning profile, so it must be signed by a compatible on-device sideloading app before installation. Compilation does not verify rendering or runtime behavior on the iPhone.

The app icon is generated from the repository's existing `public/icon.svg` at 1024×1024, flattened to an opaque RGB PNG, and supplied to xtool through `iconPath`.

Build 64 uses rounded SF system chat typography with Dynamic Type. A custom SwiftUI layout measures compact user bubbles at their natural width and wraps longer content at 85% of the chat width. Agent messages remain left-aligned and unfilled. Completed responses have copy confirmation, device-local feedback, cancellable read-aloud with language detection, a native share sheet, and a selectable text view. Feedback is not sent to the backend. Speech stops when leaving the chat. Device rendering, VoiceOver, and audio playback require iPhone verification.

Build 80 replaces native app icon glyphs with Tabler Icons (MIT), compiled from the installed @tabler/icons-react package into SwiftUI paths using `scripts/import_tabler_icons.py`. Native system prompts keep their system artwork.

Build 81 adds a locally bundled React profile inside WKWebView. Rebuild it with `node ios/scripts/build_profile.mjs` before the native build. Settings use an allowlisted bridge to native persistence, notifications, photo selection, and import. External web navigation is blocked; no remote scripts or web server are required. The bridge sends state only when changed. React is bundled in production mode with only the imported Tabler icons. Profile controls reserve their layout, respond on press, support reduced motion and light/dark appearance. Native direct SF Symbol calls now route through EvoIcon; all literal semantic keys are covered by the Tabler manifest.

Build 82 replaces the placeholder Space plugin screen with the real HTTPS Myspace UI in a persistent WKWebView. Native sidebar/profile controls remain outside the web content; duplicate web shell controls are hidden by a main-frame-only script. Pinned built-in apps are copied as bounded non-sensitive metadata into native preferences only from the trusted HTTPS main frame, and appear under My Apps in the native sidebar. Guest web cookies stay in WKWebsiteDataStore and are never exposed to mini-apps or the native pin bridge. Main-frame navigation is limited to /myspace on api.sycord.site; child navigation permits about:srcdoc only. Loading, retry and process-termination states are implemented. Native swipe-back is enabled; the outer drawer-open swipe is disabled over Myspace to avoid stealing iframe/editor gestures. Real WKWebView, keyboard and pin synchronization tests require an iPhone; Linux compilation alone cannot establish them.

Build 84 adds API Inspector to native shortcut launching and icon metadata. The web feature sends requests only through the separately approved, owner-checked gateway; mini-app direct fetch remains blocked. Chromium checks cover Inspector permission approval/revocation and presets, plus specific iframe isolation attempts. Real iOS WebKit and keyboard validation are still outstanding.


Build 100 updates Cowork and Machine while retaining Arlen’s custom action cards and neutral styling. Cowork respects the native top and bottom safe areas, uses bundled Inter with Dynamic Type, gives composer actions 44 pt targets, and sends from the trailing control when a draft is present. Machine detail sections share a native tab bar with Tabler template artwork and per-tab navigation; iPhone uses the system More tab for overflow. Metrics polling belongs to the visible, active Machine screen, avoids overlapping requests, and reports unavailable status instead of showing sample metrics as connected. Workspaces now decodes the API’s top-level `items` array and reports loading failures.

Swipe left through the Machine cards to reach **Add a new VM**, or use **Add VM**. This saves an existing VM’s validated HTTPS dashboard in the shared, file-protected machine store on this iPhone; it does not provision a server or expose the Ubuntu VPS tools against the saved address. Duplicate dashboards and save failures keep the form open. Saved machines can open their dashboard. The three previously unmapped Cowork glyphs (expand, environment box, settings sliders) are now pinned Tabler assets. Host-side checks cover API response decoding, URL validation, persistence/reload, duplicate and concurrent adds, and unreadable-store preservation. Native swipe, tab overflow, Dynamic Type, keyboard, VoiceOver, and 360/390/430 pt rendering still require simulator or device validation.
