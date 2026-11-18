import type {NextRequest} from 'next/server'
import {ownerFor, respond, failure} from '@/lib/myspace/server'
import {boundedJSON, MyspaceError} from '@/lib/myspace/contracts'
import {createProject} from '@/lib/myspace/projects/schema'
import {create, listProjects} from '@/lib/myspace/projects/store'

export async function GET(req: NextRequest) {
  try {
    const owner = await ownerFor(req)
    const rawFilter = req.nextUrl.searchParams.get('filter')
    const filter = rawFilter === 'created' || rawFilter === 'shared' ? rawFilter : 'all'
    const q = req.nextUrl.searchParams.get('q') || ''
    const cursor = Number(req.nextUrl.searchParams.get('cursor') || '0') || 0
    const limit = Number(req.nextUrl.searchParams.get('limit') || '20') || 20
    return respond(await listProjects(owner, {filter, q, cursor, limit}))
  } catch (e) {
    return failure(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const owner = await ownerFor(req)
    const parsed = createProject.safeParse(await boundedJSON(req, 70000))
    if (!parsed.success) throw new MyspaceError(400, parsed.error.issues[0].message)
    return respond(await create(owner, parsed.data), 201)
  } catch (e) {
    return failure(e)
  }
}
