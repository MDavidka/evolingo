import { NextResponse } from "next/server"
import { getMachineStorage } from "../../vps-helper"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const data = getMachineStorage()
  return NextResponse.json(data)
}
