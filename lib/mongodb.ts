import { MongoClient, type Db } from "mongodb"

type MongoCache = { client: MongoClient | null; promise: Promise<MongoClient> | null }
declare global {
  // eslint-disable-next-line no-var
  var evolingoMongo: MongoCache | undefined
}
const cache = global.evolingoMongo ?? { client: null, promise: null }
if (!global.evolingoMongo) global.evolingoMongo = cache

export async function getDatabase(): Promise<Db> {
  const uri = process.env.MONGO_URI
  if (!uri) throw new Error("MONGO_URI is missing. Add it to Vercel Environment Variables.")
  if (!cache.client) {
    if (!cache.promise) {
      cache.promise = new MongoClient(uri, { maxPoolSize: 10, serverSelectionTimeoutMS: 8000 }).connect()
    }
    cache.client = await cache.promise
  }
  const dbName = process.env.MONGO_DB_NAME || undefined
  return dbName ? cache.client.db(dbName) : cache.client.db()
}

export async function closeDatabase(): Promise<void> {
  const client = cache.client
  cache.client = null
  cache.promise = null
  if (client) await client.close()
}

/** All writes in the callback commit together; no production code is executed here. */
export async function withDatabaseTransaction<T>(work: (db: Db, session: import('mongodb').ClientSession) => Promise<T>): Promise<T> {
  const db = await getDatabase()
  const session = cache.client!.startSession()
  try {
    return await session.withTransaction(() => work(db, session), {
      readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' },
      maxCommitTimeMS: 5000, timeoutMS: 15000,
    })
  } finally { await session.endSession() }
}
