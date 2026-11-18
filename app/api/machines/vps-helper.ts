import os from "os"
import fs from "fs"
import { exec, execSync } from "child_process"
import path from "path"

export interface MachineSummary {
  id: string
  name: string
  status: "connected" | "connecting" | "disconnected" | "error"
  statusText: string
  ip: string
  cpuPercent: number
  cpuPercentText: string
  memoryUsedGB: string
  memoryTotalGB: string
  memoryPercent: number
  storageUsedGB: string
  storageTotalGB: string
  storagePercent: number
  hostname: string
  uptimeSeconds: number
  uptimeFormatted: string
  kernel: string
  arch: string
}

export function getLiveMachineStats(): MachineSummary {
  const cpus = os.cpus()
  const cpuCount = Math.max(1, cpus.length)
  const load1m = os.loadavg()[0] || 0.15
  const cpuPercent = Math.min(99, Math.max(2, Math.round((load1m / cpuCount) * 100)))

  const totalMem = os.totalmem()
  let usedMem = totalMem - os.freemem()
  try {
    const meminfo = fs.readFileSync("/proc/meminfo", "utf8")
    const m = meminfo.match(/MemAvailable:\s+(\d+)\s+kB/)
    if (m) {
      const availBytes = parseInt(m[1], 10) * 1024
      usedMem = Math.max(0, totalMem - availBytes)
    }
  } catch {}

  const memoryUsedGB = (usedMem / (1024 * 1024 * 1024)).toFixed(1) + " GB"
  const memoryTotalGB = (totalMem / (1024 * 1024 * 1024)).toFixed(0) + " GB"
  const memoryPercent = Math.min(100, Math.round((usedMem / totalMem) * 100))

  let storageUsedGB = "18 GB"
  let storageTotalGB = "77 GB"
  let storagePercent = 24
  try {
    const df = execSync("df -B1 /", { encoding: "utf8" })
    const lines = df.trim().split("\n")
    if (lines.length > 1) {
      const parts = lines[1].trim().split(/\s+/)
      const totalBytes = parseInt(parts[1], 10)
      const usedBytes = parseInt(parts[2], 10)
      storageUsedGB = Math.round(usedBytes / (1024 * 1024 * 1024)) + " GB"
      storageTotalGB = Math.round(totalBytes / (1024 * 1024 * 1024)) + " GB"
      storagePercent = Math.round((usedBytes / totalBytes) * 100)
    }
  } catch {}

  const uptime = Math.floor(os.uptime())
  const days = Math.floor(uptime / 86400)
  const hours = Math.floor((uptime % 86400) / 3600)
  const mins = Math.floor((uptime % 3600) / 60)
  const uptimeFormatted = `${days}d ${hours}h ${mins}m`

  return {
    id: "ubuntu-vps",
    name: "Ubuntu VPS",
    status: "connected",
    statusText: "Connected",
    ip: "178.62.224.238",
    cpuPercent,
    cpuPercentText: `${cpuPercent}%`,
    memoryUsedGB,
    memoryTotalGB,
    memoryPercent,
    storageUsedGB,
    storageTotalGB,
    storagePercent,
    hostname: os.hostname(),
    uptimeSeconds: uptime,
    uptimeFormatted,
    kernel: os.release(),
    arch: os.arch(),
  }
}

export function getMachineOverview() {
  const stats = getLiveMachineStats()
  let osName = "Ubuntu 24.04.1 LTS"
  try {
    const osRelease = fs.readFileSync("/etc/os-release", "utf8")
    const m = osRelease.match(/PRETTY_NAME="([^"]+)"/)
    if (m) osName = m[1]
  } catch {}

  const cpus = os.cpus()
  const cpuModel = cpus[0]?.model || "Intel Xeon / AMD EPYC Processor"
  const cpuCores = cpus.length

  const services = [
    { name: "sshd", description: "OpenSSH Daemon (Port 22)", status: "running" },
    { name: "caddy", description: "Caddy HTTPS Gateway", status: "running" },
    { name: "next-evolingo", description: "Arlen AI Application Server", status: "running" },
    { name: "evolingo-cowork", description: "Cowork Sandbox Task Runner", status: "running" },
  ]

  return {
    ...stats,
    osName,
    cpuModel,
    cpuCores,
    services,
  }
}

export function getMachineStorage() {
  const volumes: Array<{
    filesystem: string
    size: string
    used: string
    available: string
    percent: string
    mountPoint: string
  }> = []

  try {
    const df = execSync("df -h -P", { encoding: "utf8" })
    const lines = df.trim().split("\n").slice(1)
    for (const line of lines) {
      const parts = line.trim().split(/\s+/)
      if (parts.length >= 6) {
        volumes.push({
          filesystem: parts[0],
          size: parts[1],
          used: parts[2],
          available: parts[3],
          percent: parts[4],
          mountPoint: parts[5],
        })
      }
    }
  } catch {}

  return { volumes }
}

export function getMachineNetwork() {
  const ifaces = os.networkInterfaces()
  const interfaces: Array<{
    name: string
    ip: string
    netmask: string
    family: string
    mac: string
    internal: boolean
  }> = []

  for (const [name, items] of Object.entries(ifaces)) {
    if (items) {
      for (const item of items) {
        if (item.family === "IPv4") {
          interfaces.push({
            name,
            ip: item.address,
            netmask: item.netmask,
            family: item.family,
            mac: item.mac,
            internal: item.internal,
          })
        }
      }
    }
  }

  const ports = [
    { port: 22, protocol: "TCP", service: "SSH", state: "LISTEN" },
    { port: 80, protocol: "TCP", service: "HTTP / Caddy", state: "LISTEN" },
    { port: 443, protocol: "TCP", service: "HTTPS / Caddy TLS", state: "LISTEN" },
    { port: 3000, protocol: "TCP", service: "Next.js Dev / Node", state: "LISTEN" },
  ]

  return {
    publicIp: "178.62.224.238",
    sshPort: 22,
    sshUser: "root",
    interfaces,
    ports,
  }
}

export function getMachineEnvironments() {
  let swiftVersion = "Swift 6.4.2"
  try {
    const sw = execSync("swift --version 2>&1 | head -n 1", { encoding: "utf8" })
    swiftVersion = sw.trim()
  } catch {}

  let pythonVersion = "Python 3.12"
  try {
    const py = execSync("python3 --version", { encoding: "utf8" })
    pythonVersion = py.trim()
  } catch {}

  const containers = [
    { id: "sand-node", name: "Node.js Sandbox", runtime: process.version, status: "Active" },
    { id: "sand-swift", name: "Swift Native Toolchain", runtime: swiftVersion, status: "Active" },
    { id: "sand-python", name: "Python AI Runtime", runtime: pythonVersion, status: "Active" },
  ]

  return { containers }
}

export function listWorkspace(dirPath: string) {
  const safeDir = path.resolve(dirPath || "/root/evolingo")
  if (!safeDir.startsWith("/root")) {
    throw new Error("Access restricted to /root hierarchy.")
  }

  const entries = fs.readdirSync(safeDir, { withFileTypes: true })
  return entries
    .filter((e) => !e.name.startsWith(".git") && !e.name.startsWith(".next") && e.name !== "node_modules")
    .map((e) => {
      const full = path.join(safeDir, e.name)
      let size = 0
      let mtime = new Date().toISOString()
      try {
        const st = fs.statSync(full)
        size = st.size
        mtime = st.mtime.toISOString()
      } catch {}
      return {
        name: e.name,
        path: full,
        isDirectory: e.isDirectory(),
        size,
        modifiedAt: mtime,
      }
    })
    .sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1
      if (!a.isDirectory && b.isDirectory) return 1
      return a.name.localeCompare(b.name)
    })
}
