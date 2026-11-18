# Runtime contract 1.0

The initial @myspace/runtime 1.0.0 package contains a strict protocol validator. It is not yet the complete SDK. Notes currently uses this protocol directly.

Supported operations: STORAGE_GET (empty payload) and STORAGE_SET ({value: string}, maximum 16,000 UTF-8 bytes). Every message includes protocol, appId, instanceId, nonce, requestId, operation and payload. Unexpected fields fail validation. Host verifies the sending iframe window before parsing. Instance and nonce are independently generated on mount. Duplicate request IDs are rejected and the instance accepts at most 1,000 requests before restart is needed.

Responses echo protocol/app/instance/nonce/request identity with result or error. The child waits 10 seconds before reporting TIMEOUT and ignores responses for expired requests. It shows Saved only after HTTP success, and cleans up pending requests on pagehide. Host listeners are removed on unmount. In-flight HTTP work is not yet cancellable on runtime disposal. No clipboard, network, terminal, files or notification SDK capability is exposed.

The runtime remains an opaque iframe with allow-scripts only. It receives no cookies or general bearer tokens. CSP blocks direct network access, forms, external resources and base URL changes. Native browser integration and malicious iframe end-to-end validation remain outstanding.

## Package sources added

All packages are private internal packages at semantic version 1.0.0; they are not published npm packages. `@myspace/ui` includes AppShell, Stack, Row, Grid, Container, Section, Divider, ScrollArea, Button, IconButton, TextField, TextArea, SearchField, Select, Checkbox, Toggle, DatePicker, Slider, Card, Badge, Alert, LoadingIndicator, ProgressBar, EmptyState, ErrorState, CodeBlock, JSONViewer and StatusIndicator. Controls use native HTML semantics and independently bundled CSS tokens derived from the host palette. The registry currently records names, import paths, version, source type references and general accessibility/mobile rules; detailed prop schemas and tailored examples are incomplete.

`@myspace/types` validates private manifests, schema/SDK compatibility, bounded names/descriptions, IDs, slugs, versions, safe source paths, approved icons, categories, permissions and navigation. It never accepts owner or publication approval from the client.

`@myspace/sdk` exports createMyspace(identity), app.getInfo(), storage.get(), storage.set() and dispose(). Storage currently operates on one bounded text snapshot per installation rather than the future key/value namespace API. It limits concurrent pending requests to 16, times out after 10 seconds and rejects outstanding calls on disposal.

`@myspace/templates` exports Notes and FocusBoard React components taking the same StorageAPI. FocusBoard caps task count at 100 and saves mutations before replacing the visible task list; Notes preserves unsaved text on write failure. These new templates are not yet wired into the installed runtime or catalog. The existing Notes runtime remains operational until that integration is complete.

Verification: `node scripts/check-myspace-packages.mjs` independently bundles all five entry points for a browser, without importing the host shell. Successful bundling does not verify browser behavior or isolation.

The runtime now additionally supports NETWORK_REQUEST for API Inspector only. Its payload is a strictly bounded NetworkRequest (url, method, headers, body); other app identities cannot invoke it through the bridge. `sdk.network.request()` validates the contract before posting, and the trusted host calls the server gateway. The current SDK still exposes only supported operations, not general host fetch. API Inspector is compiled from the shared UI/SDK template, displays actual status/duration/body, and saves/loads/deletes bounded request presets through app storage. Network permission is managed separately in host settings.
