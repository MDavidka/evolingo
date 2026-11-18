import { NextResponse } from "next/server"
import { listWorkspace } from "../../vps-helper"
import fs from "fs"
import path from "path"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const targetPath = searchParams.get("path") || "/root/evolingo"
    const items = listWorkspace(targetPath)
    return NextResponse.json({
      path: targetPath,
      items,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to list workspace" }, { status: 400 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const action = body.action // "create_file" | "create_folder" | "read_file"
    const targetPath = path.resolve(body.path || "")

    if (!targetPath.startsWith("/root")) {
      return NextResponse.json({ error: "Access restricted to /root hierarchy" }, { status: 403 })
    }

    if (action === "read_file") {
      const content = fs.readFileSync(targetPath, "utf8")
      return NextResponse.json({ path: targetPath, content: content.slice(0, 100000) })
    }

    if (action === "create_folder") {
      fs.mkdirSync(targetPath, { recursive: true })
      return NextResponse.json({ success: true, path: targetPath })
    }

    if (action === "create_file") {
      fs.mkdirSync(path.dirname(targetPath), { recursive: true })
      fs.writeFileSync(targetPath, body.content || "", "utf8")
      return NextResponse.json({ success: true, path: targetPath })
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Operation failed" }, { status: 500 })
  }
}
