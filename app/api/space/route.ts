import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// The app has no configured blob provider. Report that clearly instead of
// storing uploaded bytes inside the existing users document.
export async function GET() {
  return NextResponse.json({ entries: [], storageUsed: 0, available: false })
}

export async function PATCH() {
  return NextResponse.json({ error: "A fájltárhely szolgáltatás nincs konfigurálva." }, { status: 503 })
}

export async function POST() {
  return NextResponse.json({ error: "A fájlfeltöltési szolgáltatás nincs konfigurálva." }, { status: 503 })
}
