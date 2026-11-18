import {randomUUID, createHash} from 'node:crypto'
import {getDatabase, withDatabaseTransaction} from '../../mongodb'
import {MyspaceError} from '../contracts'
import type {ProjectInput, ProjectMetaAction} from './schema'
import type {Db} from 'mongodb'

const indexes = new WeakMap<Db, Promise<void>>()

export function sourceRevision(files: Record<string, string>) {
  return createHash('sha256')
    .update(JSON.stringify(Object.entries(files).sort(([a], [b]) => a.localeCompare(b))))
    .digest('hex')
}

export async function projectCollections() {
  const db = await getDatabase()
  if (!indexes.has(db)) {
    indexes.set(
      db,
      (async () => {
        await db.collection('myspace_projects').createIndex({owner: 1, id: 1}, {unique: true})
        await db.collection('myspace_projects').createIndex({id: 1})
        await db.collection('myspace_versions').createIndex({owner: 1, projectId: 1, id: 1}, {unique: true})
        await db.collection('myspace_project_quotas').createIndex({owner: 1}, {unique: true})
        await db.collection('myspace_project_access').createIndex({projectId: 1, granteeOwner: 1}, {unique: true})
        await db.collection('myspace_project_access').createIndex({granteeOwner: 1, revoked: 1})
        await db.collection('myspace_project_shortcuts').createIndex({owner: 1, projectId: 1}, {unique: true})
        await db.collection('myspace_project_executions').createIndex({projectId: 1, createdAt: -1})
      })().catch(e => {
        indexes.delete(db)
        throw e
      })
    )
  }
  await indexes.get(db)
  return {
    projects: db.collection('myspace_projects'),
    versions: db.collection('myspace_versions'),
    access: db.collection('myspace_project_access'),
    shortcuts: db.collection('myspace_project_shortcuts'),
    executions: db.collection('myspace_project_executions'),
  }
}

export type ListProjectsQuery = {
  filter?: 'all' | 'created' | 'shared'
  q?: string
  cursor?: number
  limit?: number
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export async function listProjects(owner: string, query: ListProjectsQuery = {}) {
  const {projects, access, shortcuts} = await projectCollections()
  const filterMode = query.filter || 'all'
  const q = (query.q || '').trim()
  const limit = Math.max(1, Math.min(50, Number(query.limit) || 20))
  const offset = Math.max(0, Number(query.cursor) || 0)

  // Determine active shared grants for this user
  const activeGrants = await access
    .find({
      $or: [{granteeOwner: owner}, {granteeOwner: owner.slice(0, 12)}],
      revoked: {$ne: true},
    })
    .toArray()
  const sharedProjectIds = Array.from(new Set(activeGrants.map(g => String(g.projectId))))
  const grantRoleByProject = new Map<string, string>()
  for (const g of activeGrants) {
    grantRoleByProject.set(String(g.projectId), String(g.role || 'viewer'))
  }

  let mongoFilter: Record<string, unknown>
  if (filterMode === 'created') {
    mongoFilter = {owner}
  } else if (filterMode === 'shared') {
    if (sharedProjectIds.length === 0) {
      return {projects: [], nextCursor: null, total: 0, shareCode: owner.slice(0, 12)}
    }
    mongoFilter = {id: {$in: sharedProjectIds}, owner: {$ne: owner}}
  } else {
    mongoFilter = sharedProjectIds.length > 0 ? {$or: [{owner}, {id: {$in: sharedProjectIds}}]} : {owner}
  }

  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i')
    mongoFilter = {
      $and: [
        mongoFilter,
        {$or: [{name: rx}, {description: rx}]},
      ],
    }
  }

  const total = await projects.countDocuments(mongoFilter)
  const rawDocs = await projects
    .find(mongoFilter)
    .sort({updatedAt: -1, createdAt: -1})
    .skip(offset)
    .limit(limit)
    .toArray()

  const userShortcuts = await shortcuts.find({owner}).toArray()
  const pinnedMap = new Map<string, number>()
  for (const s of userShortcuts) {
    pinnedMap.set(String(s.projectId), Number(s.sidebarOrder ?? 0))
  }

  // Also fetch share counts for owned projects
  const ownedIds = rawDocs.filter(d => d.owner === owner).map(d => String(d.id))
  const sharesForOwned = ownedIds.length
    ? await access.find({projectId: {$in: ownedIds}, revoked: {$ne: true}}).toArray()
    : []
  const sharesByProject = new Map<string, {granteeOwner: string; role: string}[]>()
  for (const sh of sharesForOwned) {
    const pid = String(sh.projectId)
    const arr = sharesByProject.get(pid) || []
    arr.push({granteeOwner: String(sh.granteeOwner), role: String(sh.role || 'viewer')})
    sharesByProject.set(pid, arr)
  }

  const mapped = rawDocs.map(doc => {
    const isOwner = doc.owner === owner
    const role = isOwner ? 'owner' : (grantRoleByProject.get(String(doc.id)) || 'viewer')
    return {
      id: String(doc.id),
      name: String(doc.name),
      description: String(doc.description || ''),
      icon: String(doc.icon || 'books'),
      revision: String(doc.revision),
      draftVersion: String(doc.draftVersion),
      workingVersion: doc.workingVersion || null,
      sdkVersion: String(doc.sdkVersion || '1.0.0'),
      status: String(doc.status || 'ready'),
      accessRole: role as 'owner' | 'editor' | 'viewer',
      ownership: isOwner ? ('created' as const) : ('shared' as const),
      pinned: pinnedMap.has(String(doc.id)),
      sidebarOrder: pinnedMap.get(String(doc.id)) ?? null,
      sharedWith: isOwner ? (sharesByProject.get(String(doc.id)) || []) : [],
      createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt),
      updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : String(doc.updatedAt),
      lastOpenedAt: doc.lastOpenedAt instanceof Date ? doc.lastOpenedAt.toISOString() : (doc.lastOpenedAt || null),
    }
  })

  const nextCursor = offset + mapped.length < total ? offset + mapped.length : null
  return {
    projects: mapped,
    nextCursor,
    total,
    shareCode: owner.slice(0, 12),
  }
}

export async function create(owner: string, input: ProjectInput) {
  await projectCollections()
  return withDatabaseTransaction(async (db, session) => {
    await db.collection('myspace_project_quotas').updateOne({owner}, {$inc: {touch: 1}}, {upsert: true, session})
    const projects = db.collection('myspace_projects')
    const versions = db.collection('myspace_versions')
    if ((await projects.countDocuments({owner}, {session})) >= 20) {
      throw new MyspaceError(429, 'Guest project limit reached')
    }
    const id = randomUUID()
    const versionId = randomUUID()
    const revision = sourceRevision(input.files)
    const now = new Date()
    const icon = input.icon || 'books'
    await versions.insertOne(
      {
        id: versionId,
        owner,
        projectId: id,
        parentVersion: null,
        revision,
        files: input.files,
        status: 'draft',
        testStatus: 'passed',
        createdAt: now,
        summary: 'Initial source',
      },
      {session}
    )
    await projects.insertOne(
      {
        id,
        owner,
        name: input.name,
        description: input.description,
        icon,
        revision,
        draftVersion: versionId,
        workingVersion: versionId,
        status: 'ready',
        sdkVersion: '1.0.0',
        createdAt: now,
        updatedAt: now,
      },
      {session}
    )
    return {id, revision, versionId}
  })
}

async function resolveProjectWithAccess(owner: string, id: string) {
  const {projects, access} = await projectCollections()
  const p = await projects.findOne({id})
  if (!p) throw new MyspaceError(404, 'Project not found')
  if (p.owner === owner) {
    return {project: p, role: 'owner' as const}
  }
  const grant = await access.findOne({
    projectId: id,
    $or: [{granteeOwner: owner}, {granteeOwner: owner.slice(0, 12)}],
    revoked: {$ne: true},
  })
  if (!grant) throw new MyspaceError(404, 'Project not found')
  return {project: p, role: (grant.role === 'editor' ? 'editor' : 'viewer') as 'editor' | 'viewer'}
}

export async function inspect(owner: string, id: string, versionId?: string) {
  const {versions, access, shortcuts, executions} = await projectCollections()
  const {project: p, role} = await resolveProjectWithAccess(owner, id)
  const projectOwner = String(p.owner)
  const history = await versions
    .find({owner: projectOwner, projectId: id}, {projection: {_id: 0, owner: 0, files: 0}})
    .sort({createdAt: -1})
    .limit(100)
    .toArray()
  const current = await versions.findOne(
    {owner: projectOwner, projectId: id, id: versionId || p.draftVersion},
    {projection: {_id: 0, owner: 0}}
  )
  if (!current) throw new MyspaceError(404, 'Source version not found')
  const shortcut = await shortcuts.findOne({owner, projectId: id})
  const sharedWith = role === 'owner'
    ? (await access.find({projectId: id, revoked: {$ne: true}}, {projection: {_id: 0, granteeOwner: 1, role: 1, createdAt: 1}}).toArray())
    : []
  const recentExecutions = await executions
    .find({projectId: id}, {projection: {_id: 0}})
    .sort({createdAt: -1})
    .limit(10)
    .toArray()
  const {owner: _omitOwner, _id: _omitId, ...cleanProject} = p
  return {
    project: {
      ...cleanProject,
      id: String(p.id),
      name: String(p.name),
      description: String(p.description || ''),
      revision: String(p.revision),
      draftVersion: String(p.draftVersion),
      workingVersion: p.workingVersion ? String(p.workingVersion) : null,
      icon: String(p.icon || 'books'),
      accessRole: role,
      ownership: role === 'owner' ? 'created' : 'shared',
      pinned: !!shortcut,
      sharedWith,
    },
    history,
    current,
    executions: recentExecutions,
  }
}

export async function update(owner: string, id: string, expected: string, files: Record<string, string>, summary: string) {
  await projectCollections()
  const {project: resolved, role} = await resolveProjectWithAccess(owner, id)
  if (role === 'viewer') throw new MyspaceError(403, 'Viewer access cannot modify project source')
  const projectOwner = String(resolved.owner)
  return withDatabaseTransaction(async (db, session) => {
    const projects = db.collection('myspace_projects')
    const versions = db.collection('myspace_versions')
    const p = await projects.findOne({owner: projectOwner, id, revision: expected}, {session})
    if (!p) throw new MyspaceError(409, 'Project changed or is unavailable. Reload before saving.')
    const revision = sourceRevision(files)
    if (revision === expected) return {id, revision, versionId: p.draftVersion, unchanged: true}
    if ((await versions.countDocuments({owner: projectOwner, projectId: id}, {session})) >= 100) {
      throw new MyspaceError(429, 'Version limit reached')
    }
    const versionId = randomUUID()
    const now = new Date()
    await projects.updateOne(
      {owner: projectOwner, id, revision: expected},
      {$set: {revision, draftVersion: versionId, workingVersion: versionId, updatedAt: now}},
      {session}
    )
    await versions.insertOne(
      {
        id: versionId,
        owner: projectOwner,
        projectId: id,
        parentVersion: p.draftVersion,
        revision,
        files,
        status: 'draft',
        testStatus: 'passed',
        createdAt: now,
        summary,
      },
      {session}
    )
    return {id, revision, versionId}
  })
}

export async function applyMetaAction(owner: string, id: string, action: ProjectMetaAction) {
  const {projects, versions, access, shortcuts} = await projectCollections()
  const {project: p, role} = await resolveProjectWithAccess(owner, id)
  const projectOwner = String(p.owner)
  const now = new Date()

  switch (action.action) {
    case 'launch': {
      await projects.updateOne({owner: projectOwner, id}, {$set: {lastOpenedAt: now}})
      return {ok: true}
    }
    case 'rename': {
      if (role !== 'owner' && role !== 'editor') throw new MyspaceError(403, 'Not authorized to rename this project')
      const updateFields: Record<string, unknown> = {name: action.name.trim(), updatedAt: now}
      if (action.description !== undefined) updateFields.description = action.description.trim()
      await projects.updateOne({owner: projectOwner, id}, {$set: updateFields})
      return {ok: true, name: action.name.trim()}
    }
    case 'icon': {
      if (role !== 'owner' && role !== 'editor') throw new MyspaceError(403, 'Not authorized to change icon')
      await projects.updateOne({owner: projectOwner, id}, {$set: {icon: action.icon, updatedAt: now}})
      return {ok: true, icon: action.icon}
    }
    case 'pin': {
      if (action.pinned) {
        const count = await shortcuts.countDocuments({owner})
        await shortcuts.updateOne(
          {owner, projectId: id},
          {$setOnInsert: {owner, projectId: id, sidebarOrder: count, createdAt: now}},
          {upsert: true}
        )
      } else {
        await shortcuts.deleteOne({owner, projectId: id})
      }
      return {ok: true, pinned: action.pinned}
    }
    case 'share': {
      if (role !== 'owner') throw new MyspaceError(403, 'Only the project owner can manage sharing')
      if (action.targetOwner === owner || action.targetOwner === owner.slice(0, 12)) {
        throw new MyspaceError(400, 'Project is already owned by you')
      }
      await access.updateOne(
        {projectId: id, granteeOwner: action.targetOwner},
        {
          $set: {
            projectId: id,
            owner,
            granteeOwner: action.targetOwner,
            role: action.role,
            revoked: false,
            updatedAt: now,
          },
          $setOnInsert: {createdAt: now},
        },
        {upsert: true}
      )
      await projects.updateOne({owner: projectOwner, id}, {$set: {updatedAt: now}})
      return {ok: true}
    }
    case 'unshare': {
      if (role !== 'owner') throw new MyspaceError(403, 'Only the project owner can revoke sharing')
      await access.updateOne(
        {projectId: id, granteeOwner: action.targetOwner},
        {$set: {revoked: true, updatedAt: now}}
      )
      // Automatically remove sidebar shortcuts for the revoked grantee
      await shortcuts.deleteMany({
        projectId: id,
        $or: [{owner: action.targetOwner}, {owner: new RegExp('^' + escapeRegex(action.targetOwner))}],
      })
      return {ok: true}
    }
    case 'duplicate': {
      const current = await versions.findOne({owner: projectOwner, projectId: id, id: p.draftVersion})
      if (!current) throw new MyspaceError(404, 'Source version not found')
      const dupName = (action.name?.trim() || `${p.name} Copy`).slice(0, 48)
      return await create(owner, {
        name: dupName,
        description: String(p.description || ''),
        files: current.files as Record<string, string>,
        icon: (p.icon as any) || 'books',
      })
    }
  }
}

export async function remove(owner: string, id: string) {
  await projectCollections()
  return withDatabaseTransaction(async (db, session) => {
    await db.collection('myspace_project_quotas').updateOne({owner}, {$inc: {touch: 1}}, {upsert: true, session})
    const result = await db.collection('myspace_projects').deleteOne({owner, id}, {session})
    if (!result.deletedCount) throw new MyspaceError(404, 'Project not found or not owned by you')
    await db.collection('myspace_versions').deleteMany({owner, projectId: id}, {session})
    await db.collection('myspace_project_access').deleteMany({projectId: id}, {session})
    await db.collection('myspace_project_shortcuts').deleteMany({projectId: id}, {session})
    await db.collection('myspace_project_executions').deleteMany({projectId: id}, {session})
    return {ok: true}
  })
}
