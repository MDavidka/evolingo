import { NextResponse } from "next/server"
import { getLiveMachineStats } from "../../vps-helper"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const stats = getLiveMachineStats()
  return NextResponse.json({
    metrics: {
      cpuPercent: stats.cpuPercent,
      cpuPercentText: stats.cpuPercentText,
      memoryUsedGB: stats.memoryUsedGB,
      memoryTotalGB: stats.memoryTotalGB,
      memoryPercent: stats.memoryPercent,
      storageUsedGB: stats.storageUsedGB,
      storageTotalGB: stats.storageTotalGB,
      storagePercent: stats.storagePercent,
      status: stats.status,
      timestamp: Date.now(),
    },
  })
}
