import type {NextRequest} from 'next/server'
import {ownerFor, respond, failure} from '@/lib/myspace/server'
import {boundedJSON, MyspaceError} from '@/lib/myspace/contracts'
import {projectID, updateProject, projectMetaAction} from '@/lib/myspace/projects/schema'
import {inspect, update, remove, applyMetaAction} from '@/lib/myspace/projects/store'

type Context = {params: Promise<{id: string}>}

export async function GET(req: NextRequest, {params}: Context) {
  try {
    const owner = await ownerFor(req)
    const {id} = await params
    if (!projectID.safeParse(id).success) throw new MyspaceError(400, 'Invalid project ID')
    const version = req.nextUrl.searchParams.get('version')
    if (version && !projectID.safeParse(version).success) throw new MyspaceError(400, 'Invalid version ID')
    return respond(await inspect(owner, id, version || undefined))
  } catch (e) {
    return failure(e)
  }
}

export async function PATCH(req: NextRequest, {params}: Context) {
  try {
    const owner = await ownerFor(req)
    const {id} = await params
    if (!projectID.safeParse(id).success) throw new MyspaceError(400, 'Invalid project ID')
    const raw = await boundedJSON(req, 70000)
    if (raw && typeof raw === 'object' && 'action' in (raw as Record<string, unknown>)) {
      const meta = projectMetaAction.safeParse(raw)
      if (!meta.success) throw new MyspaceError(400, meta.error.issues[0].message)
      return respond(await applyMetaAction(owner, id, meta.data))
    }
    const parsed = updateProject.safeParse(raw)
    if (!parsed.success) throw new MyspaceError(400, parsed.error.issues[0].message)
    return respond(await update(owner, id, parsed.data.revision, parsed.data.files, parsed.data.summary))
  } catch (e) {
    return failure(e)
  }
}

export async function DELETE(req: NextRequest, {params}: Context) {
  try {
    const owner = await ownerFor(req)
    const {id} = await params
    if (!projectID.safeParse(id).success) throw new MyspaceError(400, 'Invalid project ID')
    const body = await boundedJSON(req, 256)
    if (!body || typeof body !== 'object' || Object.keys(body).length !== 1 || (body as Record<string, unknown>)['confirm'] !== true) {
      throw new MyspaceError(400, 'Explicit deletion confirmation required')
    }
    return respond(await remove(owner, id))
  } catch (e) {
    return failure(e)
  }
}
