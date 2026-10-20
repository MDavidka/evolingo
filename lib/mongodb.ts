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
