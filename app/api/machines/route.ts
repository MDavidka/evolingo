import { NextResponse } from "next/server"
import { getLiveMachineStats } from "./vps-helper"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const primary = getLiveMachineStats()
  return NextResponse.json({
    machines: [primary],
    activeMachineId: primary.id,
  })
}
