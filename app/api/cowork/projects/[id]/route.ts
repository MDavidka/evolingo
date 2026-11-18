import { NextResponse } from "next/server"
import { readProjects, writeProjects, ProjectRecord } from "../store"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const projects = readProjects()
  const found = projects.find((p) => p.id === id)
  if (!found) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }
  return NextResponse.json({ project: found })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const body = await req.json()
    const projects = readProjects()
    const idx = projects.findIndex((p) => p.id === id)
    if (idx === -1) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    const current = projects[idx]
    const updated: ProjectRecord = {
      ...current,
      name: body.name !== undefined ? String(body.name).trim() : current.name,
      branch: body.branch !== undefined ? String(body.branch).trim() : current.branch,
      folderName: body.folderName !== undefined ? String(body.folderName).trim() : current.folderName,
      folderPath: body.folderPath !== undefined ? String(body.folderPath).trim() : current.folderPath,
      machineName: body.machineName !== undefined ? String(body.machineName).trim() : current.machineName,
      isArchived: body.isArchived !== undefined ? Boolean(body.isArchived) : current.isArchived,
      updatedAt: new Date().toISOString(),
    }
    updated.statusText = `${updated.machineName} · ${updated.branch}`

    projects[idx] = updated
    writeProjects(projects)

    return NextResponse.json({ project: updated })
  } catch (err) {
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const projects = readProjects()
  const nextProjects = projects.filter((p) => p.id !== id)
  if (nextProjects.length === projects.length) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }
  writeProjects(nextProjects)
  return NextResponse.json({ success: true, id })
}
