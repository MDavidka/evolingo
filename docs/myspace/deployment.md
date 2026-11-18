# Deployment

Required: MONGO_URI, optionally MONGO_DB_NAME. Configure MYSPACE_HOST_ORIGIN to the exact public HTTPS origin when behind a reverse proxy. Never expose these variables through NEXT_PUBLIC prefixes. MongoDB index myspace_installations(owner, appId) is unique. Preferences are guest scoped in myspace_preferences.

Run npm run typecheck, npm test, node --experimental-strip-types --test lib/myspace/tests/*.test.mjs and npm run build before deployment. Existing production service is evolingo-ai-backend. Do not restart it until a verified build is ready. The public reverse proxy now exposes /myspace, /api/myspace and its child routes, Next assets, profile state and images over HTTPS. Native build 82 now embeds the trusted /myspace page with persistent WKWebView cookies and a main-frame pin-summary bridge. Device testing remains outstanding. The VM uses MYSPACE_HOST_ORIGIN=https://api.sycord.site.

AI generation is disabled until an isolated sandbox provider is implemented and configured. No fallback executes generated code on the production host. Public distribution must stay disabled until verified identity and trusted review are available.

Set MYSPACE_ARTIFACT_DIR to a persistent absolute directory for production template archives. Run npm run build:myspace with the same directory before npm run build. The build archives prior/current reviewed templates without overwriting existing digest files. The API can serve the current embedded artifact if it matches the requested digest; older versions require the retained archive. Do not prune artifacts referenced by installations. Object-storage replication, archive cleanup and multi-instance durability remain to implement.
