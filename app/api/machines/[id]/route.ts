import { NextResponse } from "next/server"
import { getLiveMachineStats } from "../vps-helper"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const machine = getLiveMachineStats()
  return NextResponse.json({ machine })
}
