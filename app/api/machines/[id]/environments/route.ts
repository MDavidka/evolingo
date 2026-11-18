import { NextResponse } from "next/server"
import { getMachineEnvironments } from "../../vps-helper"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const data = getMachineEnvironments()
  return NextResponse.json(data)
}
