# Builder setup mode and project persistence

User instruction: keep the builder in setup mode until sandbox access is arranged. Generated code execution remains disabled regardless of credential presence. `/api/myspace/builder` returns explicit setup status, a list of missing configuration variable names (never values), and executionEnabled=false. Existing general chat is unchanged.

Installed dependencies for the next adapter/orchestrator work: AI SDK 7.0.170, OpenAI-compatible provider 3.0.90, Vercel Sandbox 3.9.1, Zod 4.6.7. No specialized agent loop, sandbox execution, automated build/test job or AI generation is operational yet. Installing a dependency is not provider setup.

Implemented project endpoints:
- GET /api/myspace/projects: current guest's project metadata only.
- POST /api/myspace/projects: strict name, description and source tree; creates a project and immutable initial draft version.
- GET /api/myspace/projects/:id: owner-filtered project, draft source and bounded version metadata.
- PATCH /api/myspace/projects/:id: revision-checked full source snapshot and change summary. Advances only the draft pointer; never workingVersion.

Inputs reject client owner, permissions, publication and workingVersion fields. Source files stay in bounded MongoDB snapshots, separate from the host source tree; they are not evaluated or compiled on the server. Paths must be under src/ with ts, tsx, css or json extensions, 1–32 files, src/App.tsx present, at most 64 KB total serialized UTF-8. Each source file is bounded. Draft version count is limited to 100; project count to 20 per guest. Project creation now serializes owner quota checks inside a MongoDB transaction; project, initial version and draft-pointer changes commit atomically. Version updates and project/version deletion are transactional too.

Revision is SHA-256 of sorted file entries. A revision-checked project update detects concurrent edits; unsuccessful transactions leave no candidate version committed. Creating a version does not mark it built, tested, installed or approved. Generated source remains untrusted. Version restore, tool execution API, cost accounting, persistent agent jobs and build artifacts for generated projects are still incomplete.

Required future sandbox configuration: VERCEL_TOKEN, VERCEL_TEAM_ID, VERCEL_PROJECT_ID and a digest-pinned MYSPACE_SANDBOX_IMAGE with a reviewed build runner and preinstalled pinned dependencies. No fallback to eval, Node vm or production child processes is permitted.

## Source editor integration

My Creations now lazy-loads an actual source manager. It lists current guest projects, creates a bounded starter source draft, selects/edits files, adds validated source paths, saves snapshots with change summaries, displays history, restores previous draft source and explicitly confirms project deletion. The editor displays draft/build setup status rather than claiming a preview is available.

GET /api/myspace/projects/:id?version=:versionId retrieves an owner-filtered earlier snapshot. Restore uses the current project revision and the selected historical files to create a new draft; it does not mutate historical versions or workingVersion. DELETE requires JSON {confirm:true} and removes only the owner's project and its source versions. The UI source manager still needs unsaved-change protection, file deletion, and expanded mobile editing QA.

Live verification passes for create/read/edit/history/restore, two-guest isolation, stale updates, explicit deletion and setup-mode readiness. A Chromium 390px test creates a project through the UI, edits/saves/reloads/restores its source and checks horizontal overflow. Temporary test projects are deleted afterward. No AI provider or sandbox was invoked.
