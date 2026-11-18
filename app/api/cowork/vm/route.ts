import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  return NextResponse.json(
    { error: "Cowork sandbox access is unavailable until workspace authorization is configured." },
    { status: 503 },
  )
}

export async function POST() {
  return NextResponse.json(
    { error: "Cowork sandbox access is unavailable until workspace authorization is configured." },
    { status: 503 },
  )
}
