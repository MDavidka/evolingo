# Cowork upstream integration decision record

**Checked:** 2026-11-12. Dependency pin is recorded in `package.json` and `package-lock.json`; local worker, permission mapping, and native iOS client are integrated. Production route deployment remains pending.

## OpenCode — preferred engine candidate

- Repository: https://github.com/anomalyco/opencode (MIT, per public repository metadata).
- Selected integration package: `@opencode/client@2.2.7`, exact pin, MIT. Its npm package source directory is `packages/client`; the upstream tag `v2.2.7` resolves to commit `fedc6f208aa2bd54c1019227214568083f6380ad`.
- The client package exposes the documented V2 `OpenCode.make({ baseUrl, headers })` API, including `session.create`, `event.subscribe`, and `server.info`. `createOpenCodeClient` accepts a per-sandbox URL/password so each owner container has its own authenticated OpenCode server.
- A thin adapter exists in `app/lib/cowork-vm/opencode-adapter.ts` for the documented text, tool, and execution event families. It redacts split text secrets and leaves successful OpenCode execution in Avalingo's `verifying` state; Avalingo must run its own checks before emitting `run.completed`.
- `app/lib/cowork-vm/opencode-client.ts` requires a private/internal server URL and V2 Basic Auth password (`opencode` username), rejects public hostnames and embedded URL credentials, and supports per-sandbox credentials supplied by the manager.
- The pinned `@opencode/cli@2.2.7` is installed in the private Incus image alias `cowork-template-opencode` (compressed image 183.59 MiB). The host manager derives a stable per-owner server password from a 32-character-or-longer master secret, provisions/starts `opencode serve` as UID 1000 on the private container interface, and returns that container's authenticated URL.
- Real smoke evidence: fresh owner container, `server.info` version 2.2.7, `session.create`, `session.prompt`, `session.wait`, and assistant response `PONG` from the built-in `big-pickle` model. Test session and instance were removed. Model response used synthetic prompt text; no user workspace data was sent.
- The OpenCode API reference describes native `/api/event` as volatile: events can be missed during disconnect and slow consumers can overflow. Avalingo must persist and replay its own event log; native OpenCode events cannot serve as the durable delivery contract.
- Migration docs state OpenCode 2 revised its API and clients. Integration uses the current documented V2 client package, not V1 server examples.
- Sources: https://opencode.ai/docs/build/sdk ; https://opencode.ai/docs/build/client ; https://opencode.ai/docs/api ; https://opencode.ai/docs/migrate-v1 ; https://github.com/anomalyco/opencode/tree/v2.2.7/packages/client
- Implemented: durable run worker, session-scoped permission rules (read allowed; edit/shell ask in Build; edits/shell denied in Plan; unknown actions ask; external-directory and subagent access denied), action-digest-bound one-time approval mapping, cancellation, persisted replay and terminal-event handling. Actual authenticated local runs exercised text completion, file edit approval, and cancellation while approval was pending. Full crash-recovery/load acceptance remains outstanding; runs with expired worker leases are marked interrupted rather than replayed.
- Native integration: `ios/Sources/Evolingo/NativeCoworkAPI.swift` calls the existing Cowork endpoints from the SwiftUI Cowork tab, using the app's HTTP-only guest session cookie and persisted remote conversation/run IDs. `xtool dev build --configuration debug` succeeds. Both current production host candidates still return the site's HTML 404 page for the Cowork route, so the backend must be deployed before release.

## assistant-ui — UI candidate only

- Repository: https://github.com/assistant-ui/assistant-ui (MIT core per supplied blueprint; verify exact selected packages and licenses at the pin).
- No package or adapter is installed in this repository. The available upstream tool documentation alone does not prove compatibility with the selected OpenCode SDK or Avalingo's durable event contract.
- Pending: inspect current official OpenCode adapter docs/source at the selected pins, compare supported tool/action parts and approval UX, then decide whether to use primitives or a narrow local adapter.

## Alternatives considered

- Cline SDK: not selected; no compatibility assessment against this Next.js/Mongo/Incus architecture has been completed. Do not transplant implementation code.
- Codex: reference only for checkpointing, permissions, diff UX and verification; not selected as runtime.
- Pi: not selected; investigate only if documented OpenCode APIs prove unsuitable.

## Lock requirements before integration

Record immutable git SHAs, package versions, LICENSE contents, API docs/source permalinks, supported runtime, auth, event schemas and integration results. Do not ship against a floating branch or undocumented internal imports.

## Dependency review

- The initially tried embedded `@opencode/sdk@2.2.7` brought the server/runtime into the web application and caused npm audit to report the SDK and several bundled OpenCode packages as high severity. It was removed in favor of the network client only.
- After switching, `npm audit --omit=dev` reported 10 production dependency advisories (4 low, 6 high) in the current full app dependency graph. `@opencode/client` was not itself listed in the advisories. Review and resolve the app-wide findings before release; do not attribute all findings to the OpenCode client.
