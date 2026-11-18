import { OpenCode, type OpenCodeClient } from "@opencode/client"
import ipaddr from "ipaddr.js"

function isPrivateAddress(hostname: string): boolean {
  try {
    const address = ipaddr.parse(hostname)
    return ["private", "loopback", "linkLocal", "uniqueLocal"].includes(address.range())
  } catch {
    return false
  }
}

function isInternalHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "")
  return !host.includes(".") || [".internal", ".local", ".svc", ".cluster.local", ".consul"].some(suffix => host.endsWith(suffix))
}

/** Create a documented V2 network client for a private, password-protected worker. */
export function createOpenCodeClient(options: { baseUrl?: string; password?: string } = {}): OpenCodeClient {
  const configuredUrl = options.baseUrl?.trim() || process.env.OPENCODE_SERVER_URL?.trim()
  const password = options.password?.trim() || process.env.OPENCODE_PASSWORD?.trim() || process.env.OPENCODE_SERVER_PASSWORD?.trim()
  if (!configuredUrl || !password) {
    throw new Error("OpenCode worker URL and server password must be configured.")
  }

  let url: URL
  try { url = new URL(configuredUrl) } catch {
    throw new Error("OpenCode worker URL is invalid.")
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error("OpenCode worker URL must be a plain HTTP(S) internal address without embedded credentials.")
  }
  if (!isPrivateAddress(url.hostname) && !isInternalHostname(url.hostname)) {
    throw new Error("OpenCode worker must use a private address or internal hostname.")
  }

  const authorization = Buffer.from(`opencode:${password}`).toString("base64")
  return OpenCode.make({
    baseUrl: url.origin,
    headers: { Authorization: `Basic ${authorization}` },
  })
}
