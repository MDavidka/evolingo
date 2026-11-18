# Repository audit and foundation

Existing infrastructure: Next.js App Router with a catch-all for known single-segment screens; global App renders ReferenceScreens and AppTabBar. MongoDB uses lib/mongodb.ts and MONGO_URI. Existing chat and agent are unchanged. Existing guest cookies are not authenticated identities.

Added explicit /myspace route mounted inside the existing app shell with a lazy-loaded content view, URL-backed contextual navigation and a Notes workspace. The existing sidebar and global profile control are reused. Sidebar links refresh after mutations, show saved shortcut names, close the drawer when selected, and open the actual workspace route.

Implemented persistent three-step onboarding with skip/reopen and BottomSheet app settings, permission revocation, rename and pin controls.

Added /api/myspace endpoint, built-in Notes catalog, owner-scoped MongoDB installations and opaque iframe Notes workspace. New random HttpOnly guest cookie is intentionally separate from legacy profile identity: no silent data merge. SHA-256 cookie digest scopes database queries. Public publishing, SSH, arbitrary network and generated code are unavailable.

Index: myspace_installations(owner, appId), unique. Installation includes version, pinned, data, timestamps. Uninstall deletes app data. Storage consent is explicit before install. Only immutable trusted built-in Notes is currently accepted. No generated code is compiled or run on the production server.

This is an initial executable foundation, not the complete Myspace specification. Full sidebar management, complete SDK packages, AI tools, isolated build adapter, templates and end-to-end security validation remain unfinished. Do not enable public distribution.

## Trusted template artifacts

Notes and Focus Board are now catalog entries backed by separately compiled React/UI/SDK artifacts. `npm run build:myspace` compiles only these reviewed repository templates; it is not a generated-code build path. `lib/myspace/artifacts.generated.json` records HTML, semantic version and SHA-256 digest. `/api/myspace/artifacts/[id]` serves the public built-in package. Runtime fetches it on demand, bounds its size and verifies the digest before injecting only per-instance capability identity into its bootstrap slot. No session credential enters the child.

Installations, data, grants, rename, pin and launch time are keyed by both owner and app ID. Runtime validation independently binds the iframe request to that app ID. Focus Board uses the same app-scoped 16 KB text snapshot storage as Notes and the same isolation boundary. Browser and database end-to-end tests are still pending. New catalog UI and mobile shell need visual QA; the Create view remains disabled.

Sidebar shortcuts now support explicit app-name saves, an allowlist of five Tabler icon choices, server-persisted order, pin/unpin and launch routes. Reorder runs in a transaction, verifies the exact current guest's pinned app set, and rejects stale or duplicate orders. Native pin metadata preserves server order and chosen icon; native render maps the same five icon choices to bundled Tabler artwork. Catalog cards now render once per actual catalog entry, with install consent tied explicitly to the selected app ID.

## Installation artifact pinning

Installations now store artifactIntegrity. Runtime launch requests that exact digest and independently verifies HTML against the installed reference. Repeated install is idempotent and does not move the reference. An explicit approve-update action selects only the server's current reviewed built-in artifact; callers cannot submit arbitrary hashes. It preserves data, names, pins and grants.

Trusted template builds archive previous and current artifacts by app ID and digest with write-once file semantics. Default archive directory is .dev-runtime/myspace-artifacts; MYSPACE_ARTIFACT_DIR can select a persistent mount. Current embedded artifacts provide an exact-digest fallback. Missing historical artifacts produce an explicit error, never a silent latest-version substitution. Digest URLs have immutable cache headers; unpinned catalog lookups remain non-cache-stable. This archive handles reviewed public built-ins only, not private/generated source distribution.

Legacy installations lacking a digest require explicit current-runtime approval before execution. Their stored data remains unchanged. Runtime rollback UI and a production object-storage adapter are still pending. Persist the archive outside disposable deploy directories to retain old versions across deployments.
