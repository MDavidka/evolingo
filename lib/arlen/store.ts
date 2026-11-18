import type { Db } from "mongodb"
import { getDatabase } from "../mongodb.ts"

export interface ProjectMetadata {
  id: string
  owner: string
  name: string
  description?: string
  icon?: string
  revision: string
  draftVersion: string
  workingVersion?: string | null
  sdkVersion?: string
  status?: string
  createdAt: Date | string
  updatedAt: Date | string
  lastOpenedAt?: Date | string | null
}

export const OPTIMIZED_PROJECT_PROJECTION = {
  files: 0,
  "metadata.raw": 0,
} as const

const storeIndexesCache = new WeakMap<Db, Promise<void>>()

/**
 * Ensures all optimized compound indexes across projects, access grants, messages, and events.
 * Specifically:
 * - myspace_projects: { owner: 1, updatedAt: -1, createdAt: -1 }
 * - myspace_project_access: { projectId: 1, revoked: 1 }
 * - cowork_messages: { conversation_id: 1, owner_id: 1, created_at: 1, id: 1 }
 * - cowork_events: { run_id: 1, type: 1 }
 */
export async function ensureArlenStoreIndexes(db?: Db): Promise<void> {
  const targetDb = db || (await getDatabase())
  if (!storeIndexesCache.has(targetDb)) {
    const p = (async () => {
      await Promise.all([
        // Compound index for sorted project listings per owner
        targetDb.collection("myspace_projects").createIndex({
          owner: 1,
          updatedAt: -1,
          createdAt: -1,
        }),
        // Compound index for active project access lookups
        targetDb.collection("myspace_project_access").createIndex({
          projectId: 1,
          revoked: 1,
        }),
        // Compound index for message history retrieval
        targetDb.collection("cowork_messages").createIndex({
          conversation_id: 1,
          owner_id: 1,
          created_at: 1,
          id: 1,
        }),
        // Index for run event polling and terminal status resolution
        targetDb.collection("cowork_events").createIndex({
          run_id: 1,
          type: 1,
        }),
      ])
    })().catch(err => {
      storeIndexesCache.delete(targetDb)
      throw err
    })
    storeIndexesCache.set(targetDb, p)
  }
  return storeIndexesCache.get(targetDb)
}

/**
 * Lists projects for an owner without transferring heavy virtual filesystem files.
 * Uses index { owner: 1, updatedAt: -1, createdAt: -1 } and projection { files: 0, "metadata.raw": 0 }.
 */
export async function listProjectsOptimized(
  owner: string,
  options: {
    limit?: number
    offset?: number
    search?: string
    db?: Db
  } = {},
): Promise<{ projects: ProjectMetadata[]; total: number }> {
  const db = options.db || (await getDatabase())
  await ensureArlenStoreIndexes(db)

  const limit = Math.max(1, Math.min(options.limit ?? 20, 100))
  const offset = Math.max(0, options.offset ?? 0)

  const filter: Record<string, unknown> = { owner }
  if (options.search?.trim()) {
    const rx = new RegExp(options.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
    filter.$or = [{ name: rx }, { description: rx }]
  }

  const collection = db.collection("myspace_projects")
  const [total, rawDocs] = await Promise.all([
    collection.countDocuments(filter),
    collection
      .find(filter, { projection: OPTIMIZED_PROJECT_PROJECTION })
      .sort({ updatedAt: -1, createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .toArray(),
  ])

  const projects: ProjectMetadata[] = rawDocs.map(doc => ({
    id: String(doc.id),
    owner: String(doc.owner),
    name: String(doc.name),
    description: String(doc.description || ""),
    icon: String(doc.icon || "books"),
    revision: String(doc.revision),
    draftVersion: String(doc.draftVersion),
    workingVersion: doc.workingVersion ? String(doc.workingVersion) : null,
    sdkVersion: String(doc.sdkVersion || "1.0.0"),
    status: String(doc.status || "ready"),
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt),
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : String(doc.updatedAt),
    lastOpenedAt: doc.lastOpenedAt instanceof Date ? doc.lastOpenedAt.toISOString() : (doc.lastOpenedAt || null),
  }))

  return { projects, total }
}

/**
 * Fetches a single project's metadata without files.
 */
export async function getProjectWithoutFiles(
  id: string,
  owner?: string,
  dbInstance?: Db,
): Promise<ProjectMetadata | null> {
  const db = dbInstance || (await getDatabase())
  await ensureArlenStoreIndexes(db)

  const filter: Record<string, unknown> = { id }
  if (owner) filter.owner = owner

  const doc = await db.collection("myspace_projects").findOne(filter, {
    projection: OPTIMIZED_PROJECT_PROJECTION,
  })
  if (!doc) return null

  return {
    id: String(doc.id),
    owner: String(doc.owner),
    name: String(doc.name),
    description: String(doc.description || ""),
    icon: String(doc.icon || "books"),
    revision: String(doc.revision),
    draftVersion: String(doc.draftVersion),
    workingVersion: doc.workingVersion ? String(doc.workingVersion) : null,
    sdkVersion: String(doc.sdkVersion || "1.0.0"),
    status: String(doc.status || "ready"),
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt),
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : String(doc.updatedAt),
    lastOpenedAt: doc.lastOpenedAt instanceof Date ? doc.lastOpenedAt.toISOString() : (doc.lastOpenedAt || null),
  }
}

/**
 * Batches project lookups without virtual filesystems to eliminate N+1 overhead.
 */
export async function batchGetProjectsWithoutFiles(
  ids: string[],
  dbInstance?: Db,
): Promise<ProjectMetadata[]> {
  if (ids.length === 0) return []
  const db = dbInstance || (await getDatabase())
  await ensureArlenStoreIndexes(db)

  const rawDocs = await db
    .collection("myspace_projects")
    .find({ id: { $in: ids } }, { projection: OPTIMIZED_PROJECT_PROJECTION })
    .toArray()

  return rawDocs.map(doc => ({
    id: String(doc.id),
    owner: String(doc.owner),
    name: String(doc.name),
    description: String(doc.description || ""),
    icon: String(doc.icon || "books"),
    revision: String(doc.revision),
    draftVersion: String(doc.draftVersion),
    workingVersion: doc.workingVersion ? String(doc.workingVersion) : null,
    sdkVersion: String(doc.sdkVersion || "1.0.0"),
    status: String(doc.status || "ready"),
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt),
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : String(doc.updatedAt),
    lastOpenedAt: doc.lastOpenedAt instanceof Date ? doc.lastOpenedAt.toISOString() : (doc.lastOpenedAt || null),
  }))
}
