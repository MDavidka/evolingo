import { NextResponse } from "next/server"
import { getMachineNetwork } from "../../vps-helper"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const data = getMachineNetwork()
  return NextResponse.json(data)
}
