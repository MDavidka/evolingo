import { NextResponse } from "next/server"
import { exec } from "child_process"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const command = (body.command || "").trim()
    const cwd = body.cwd || "/root/evolingo"

    if (!command) {
      return NextResponse.json({ error: "Command is required" }, { status: 400 })
    }

    return await new Promise<NextResponse>((resolve) => {
      exec(
        command,
        {
          cwd,
          timeout: 25000,
          maxBuffer: 1024 * 1024 * 2, // 2MB
          env: {
            ...process.env,
            PATH: `/root/.local/share/swiftly/toolchains/6.4.2/usr/bin:/root/.local/share/swiftly/bin:${process.env.PATH || ""}`,
          },
        },
        (error, stdout, stderr) => {
          resolve(
            NextResponse.json({
              command,
              stdout: stdout || "",
              stderr: stderr || (error && error.message ? error.message : ""),
              exitCode: error ? error.code || 1 : 0,
              cwd,
            }),
          )
        },
      )
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to execute command" }, { status: 500 })
  }
}
