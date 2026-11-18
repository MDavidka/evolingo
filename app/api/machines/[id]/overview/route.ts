import { NextResponse } from "next/server"
import { getMachineOverview } from "../../vps-helper"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const overview = getMachineOverview()
  return NextResponse.json({ overview })
}
