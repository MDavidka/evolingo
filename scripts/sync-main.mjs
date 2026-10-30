import { spawnSync } from "node:child_process"

const run = (args, options = {}) => spawnSync("git", args, {
  cwd: process.cwd(),
  encoding: "utf8",
  stdio: options.quiet ? "pipe" : "inherit",
})

const inside = run(["rev-parse", "--is-inside-work-tree"], { quiet: true })
if (inside.status !== 0 || inside.stdout.trim() !== "true") {
  console.warn("[dev-sync] Git repository not found; starting without syncing.")
  process.exit(0)
}

const remote = run(["remote", "get-url", "origin"], { quiet: true })
if (remote.status !== 0) {
  console.warn("[dev-sync] No origin remote; starting without syncing.")
  process.exit(0)
}

console.log("[dev-sync] Fetching the latest origin/main…")
const fetched = run(["fetch", "origin", "main", "--prune"])
if (fetched.status !== 0) {
  console.warn("[dev-sync] Fetch failed; using the local checkout so development is not blocked.")
  process.exit(0)
}

const branch = run(["branch", "--show-current"], { quiet: true }).stdout.trim()
if (branch !== "main") {
  console.log(`[dev-sync] Fetched origin/main; current branch is ${branch || "detached HEAD"}, so no files were changed.`)
  process.exit(0)
}

const dirty = run(["status", "--porcelain", "--untracked-files=normal"], { quiet: true }).stdout.trim()
if (dirty) {
  console.log("[dev-sync] Fetched origin/main; local work is present, so the checkout was left unchanged.")
  process.exit(0)
}

const local = run(["rev-parse", "HEAD"], { quiet: true }).stdout.trim()
const upstream = run(["rev-parse", "origin/main"], { quiet: true }).stdout.trim()
if (local === upstream) {
  console.log("[dev-sync] main is already current.")
  process.exit(0)
}

const localContainsUpstream = run(["merge-base", "--is-ancestor", upstream, local], { quiet: true })
if (localContainsUpstream.status === 0) {
  console.log("[dev-sync] Local main already contains origin/main.")
  process.exit(0)
}

const ancestor = run(["merge-base", "--is-ancestor", local, upstream], { quiet: true })
if (ancestor.status !== 0) {
  console.warn("[dev-sync] Local main and origin/main have diverged; automatic merge was skipped.")
  process.exit(0)
}

const updated = run(["merge", "--ff-only", "origin/main"])
if (updated.status === 0) console.log("[dev-sync] Fast-forwarded local main to origin/main.")
else console.warn("[dev-sync] Fast-forward failed; starting from the existing local commit.")
