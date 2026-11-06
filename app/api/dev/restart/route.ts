import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
const exec = promisify(execFile)

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") return NextResponse.json({ error: "Csak fejlesztői módban érhető el." }, { status: 404 })
  const origin = request.headers.get("origin")
  const requestHost = request.headers.get("host")
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",", 1)[0]?.trim()
  let originHost = ""
  try { originHost = origin ? new URL(origin).host : "" } catch {}
  if (!originHost || ![requestHost, forwardedHost].filter(Boolean).includes(originHost)) {
    return NextResponse.json({ error: "Érvénytelen kérés." }, { status: 403 })
  }
  try {
    const cwd = process.cwd()
    const { stdout: branch } = await exec("git", ["branch", "--show-current"], { cwd })
    if (branch.trim() !== "main") return NextResponse.json({ error: "A fejlesztői szerver nem a main ágon fut." }, { status: 409 })
    // Ignore local skill/install artifacts: reset --hard updates tracked files
    // only, so untracked files are retained safely when the dev server refreshes.
    const { stdout: status } = await exec("git", ["status", "--porcelain", "--untracked-files=no"], { cwd })
    if (status.trim()) return NextResponse.json({ error: "Előbb mentsd vagy commitold a módosításokat." }, { status: 409 })
    await exec("git", ["fetch", "origin", "main", "--prune"], { cwd, timeout: 30000 })
    const { stdout: head } = await exec("git", ["rev-parse", "HEAD"], { cwd })
    const { stdout: latest } = await exec("git", ["rev-parse", "origin/main"], { cwd })
    if (head.trim() !== latest.trim()) {
      await exec("git", ["branch", `backup/profile-restart-${Date.now()}`, head.trim()], { cwd })
      await exec("git", ["reset", "--hard", "origin/main"], { cwd })
    }
    const response = NextResponse.json({ ok: true, commit: latest.trim().slice(0, 7) }, { status: 202 })
    setTimeout(() => process.kill(process.pid, "SIGTERM"), 900)
    return response
  } catch {
    return NextResponse.json({ error: "Frissítés sikertelen. A szerver nem indult újra." }, { status: 500 })
  }
}
