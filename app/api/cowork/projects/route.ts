import { NextResponse } from "next/server"
import { readProjects, writeProjects, ProjectRecord } from "./store"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const projects = readProjects()
  return NextResponse.json({ projects })
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const name = (body.name || "New Project").trim()
    const machineName = body.machineName || "Ubuntu VPS"
    const machineId = body.machineId || "ubuntu-vps"
    const branch = body.branch || "main"
    const folderName = body.folderName || "root"
    const folderPath = body.folderPath || "/root/evolingo"

    const newProject: ProjectRecord = {
      id: "proj-" + Date.now().toString(36) + "-" + Math.random().toString(36).substring(2, 6),
      name,
      machineId,
      machineName,
      branch,
      folderName,
      folderPath,
      section: "Today",
      statusText: `${machineName} · ${branch}`,
      isConnected: true,
      lastActiveText: "Today",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      conversationId: body.conversationId,
    }

    const projects = readProjects()
    projects.unshift(newProject)
    writeProjects(projects)

    return NextResponse.json({ project: newProject }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 })
  }
}
