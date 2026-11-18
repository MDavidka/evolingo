# Arlen unified architecture

Implementation baseline: master specification v1.0. This document describes source changes and acceptance gaps; it is not a production-readiness declaration.

## Integrated foundation

`lib/arlen/modes.ts` versions the shared instructions and independent Chat, Dev, and Cowork identities, profiles, lifecycles, and declared capabilities. These declarations do not grant permission or prove operational availability. Chat and Dev consume their instructions directly; Cowork configures the OpenCode build/plan agents with its instruction.

`lib/arlen/models.ts` resolves fast, balanced, coding, reasoning, vision, and embeddings configuration. Existing provider defaults remain compatible. Set `ARLEN_MODEL_<PROFILE>`, optional comma-separated `ARLEN_MODEL_<PROFILE>_FALLBACKS`, and `ARLEN_MODEL_<PROFILE>_MAX_TOKENS` (128–32000). Embeddings requires explicit configuration. Streaming Chat uses the selected candidates with bounded retries on retryable provider responses. Candidates must be available through the configured endpoint; this is not cross-provider credential failover. `ARLEN_COWORK_MODEL` selects a provider/model registered with the existing OpenCode runtime. Configuration is not a model health check.

`lib/arlen/context.ts` implements bounded, relevant context selection with owner, session, project, run, and explicit user-consent boundaries. It is a selection primitive, not an integrated memory database or a replacement for database authorization. Persistent consent, retrieval indexes, mode handoffs, and memory management endpoints are still required. Existing bounded conversation history remains in use.

`lib/arlen/events.ts` validates request-scoped Chat events with version, event ID, session ID, timestamp, sequence, and typed payload. Legacy top-level fields remain for the installed iOS client. Chat events are not persisted and do not offer replay. Cowork retains its existing MongoDB event log and reconnect API; migration to a shared versioned envelope and all clients' duplicate/gap handling remain separate acceptance work.

## Mode boundaries

Chat takes the direct model stream and never calls the agent planner. Legacy `agentMode` input cannot enable execution. Web Chat ignores plan events. Native Chat ignores legacy plan/status events and hides worked-for headers, plans, tool summaries, activity banners, and execution mode controls. Full conversational answers bypass Cowork verdict extraction. Network request cancellation is forwarded to the provider; stream cancellation aborts the streaming request.

Dev loads the real component catalog and current project source before generation. Editing checks access before generation and retains the existing optimistic revision check. Provider failures and malformed source fail explicitly before project mutation; they no longer return a generic checklist template. Source validation requires both the entrypoint and `src/app.ui.json`, checks the catalog's component/variant names, bounds tree depth/count, and restricts generated actions. The project path schema now explicitly permits its required `src/app.ui.json` filename while retaining path restrictions. Unrelated files survive source updates. These are source/component schema checks, not TypeScript compilation, interaction tests, integration verification, or an installed release. Execution records describe a partial draft and explicitly identify unrun checks.

Cowork retains its durable queue, owner-isolated Incus workspaces, OpenCode integration, persisted events, and digest-bound approvals. Session permissions default to ask for Build and deny for Plan, with explicit read/glob/grep/list allowances. Unknown tools do not acquire blanket access. Host containment and effective engine permission behavior still need live adversarial acceptance tests; the configuration regression test is not sandbox evidence.

## Verification

Verification passed: 35 existing Chat/visual tests, 34 My Space tests, six Arlen architecture tests, TypeScript checking, the separate production backend build, and the native iOS debug build. No live provider, sandbox permission, physical-device, or production rollout acceptance is claimed.

Commands used for this change:

- `node --experimental-strip-types --test tests/arlen/*.test.mjs lib/myspace/tests/projects.test.mjs`
- `npm run typecheck`
- `ARLEN_BUILD_DIST_DIR=.next-arlen-validation npm run build`
- `PATH=/root/.local/share/swiftly/toolchains/6.4.2/usr/bin:$PATH xtool dev build --configuration debug` from `ios/`

The separate Next build output avoids replacing the existing `.next` directory. Next may add its validation output paths to `tsconfig.json`; remove only those generated entries after local verification. Native compilation does not establish physical-device behavior, VoiceOver correctness, keyboard behavior, signing, distribution, or TestFlight upload.

## Remaining acceptance work

1. Wire scoped context retrieval, explicit memory consent/deletion, model health/usage budgets, cross-provider fallback, and controlled mode handoffs into authenticated sessions.
2. Connect Chat's validated visual components to generation and native rendering; verify multimodal routing, latency, streaming stability, and factual evaluation. Existing visual components alone do not satisfy this flow.
3. Complete Dev's isolated compile/preview/test/repair/install lifecycle. The current generated-app build runtime remains in setup mode. Expand real component contracts and functional runtime integrations rather than advertising catalog entries as tested capabilities.
4. Verify Cowork permission semantics with the pinned engine; implement missing pause/resume/snapshots, connected MCP and skill discovery, network/resource/spending controls, and minimal activity UI against genuine events. Audit the legacy execution paths separately.
5. Validate authentication across services, sandbox isolation, prompt injection, secrets, recovery, duplicate/out-of-order delivery, concurrency, load, accessibility, and narrow iPhone layouts. Existing audit evidence must be rechecked against the current production deployment.
6. Complete controlled deployment and signed iPhone acceptance. No production restart, deployment, signing, upload, or rollout was performed by this implementation change.

MongoDB and the existing worker are retained. The specification allows compatible existing infrastructure; replacing them with PostgreSQL or another workflow engine requires a demonstrated technical need and a migration plan.
