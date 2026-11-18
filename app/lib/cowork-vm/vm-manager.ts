import { modeInstruction } from "../../../lib/arlen/modes.ts"
import { coworkModel } from "../../../lib/arlen/models.ts"
import { execFile, spawn } from "child_process"
import { promisify } from "util"
import { createHash, createHmac } from "node:crypto"

const execFileAsync = promisify(execFile)

export interface VMInfo {
  name: string
  status: string
  ip?: string
  memoryLimit: string
  cpuLimit: string
  type: string
}

export interface ExecResult {
  stdout: string
  stderr: string
  exitCode: number
}

const TEMPLATE_IMAGE = "cowork-template-opencode"
const PROFILE_NAME = "cowork-vm" // limits.memory=1GB, limits.cpu=1
const AGENT_UID = "1000"
const AGENT_GID = "1000"
const AGENT_WORKSPACE = "/workspace"

export class CoworkVMManager {
  /**
   * Run an incus command safely
   */
  private static async runIncus(args: string[]): Promise<string> {
    try {
      const { stdout } = await execFileAsync("incus", args, { timeout: 120000, maxBuffer: 1024 * 1024 })
      return stdout.trim()
    } catch (err: any) {
      const stderr = err.stderr ? err.stderr.toString().trim() : ""
      const stdout = err.stdout ? err.stdout.toString().trim() : ""
      throw new Error(`Incus command failed (incus ${args.join(" ")}): ${stderr || stdout || err.message}`)
    }
  }

  /** Incus's launch progress stream can block when stdout is captured by execFile. */
  private static async launchIncus(args: string[]): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const child = spawn("incus", args, { stdio: ["ignore", "ignore", "pipe"] })
      let stderr = ""
      const timer = setTimeout(() => child.kill("SIGTERM"), 120000)
      child.stderr?.on("data", (chunk: Buffer) => { stderr += chunk.toString() })
      child.once("error", (error) => {
        clearTimeout(timer)
        reject(error)
      })
      child.once("close", (code, signal) => {
        clearTimeout(timer)
        if (code === 0) resolve()
        else reject(new Error(`Incus launch failed (${signal || code}): ${stderr.trim() || "no stderr"}`))
      })
    })
  }

  static instanceNameForOwner(ownerId: string): string {
    if (!ownerId || typeof ownerId !== "string") throw new Error("Cowork owner is required")
    return `cowork-${createHash("sha256").update(ownerId).digest("hex").slice(0, 24)}`
  }

  static async startOpenCodeServer(
    instanceName: string,
    masterSecret: string,
  ): Promise<{ vm: VMInfo; baseUrl: string; password: string }> {
    const safeName = this.assertManagedInstanceName(instanceName)
    if (masterSecret.trim().length < 32) throw new Error("Cowork worker secret must be at least 32 characters.")
    const password = createHmac("sha256", masterSecret).update(`opencode:${safeName}`).digest("base64url")
    const vm = await this.getOrCreateVM(safeName)
    if (!vm.ip) throw new Error("Cowork sandbox has no private IPv4 address.")

    const zroApiKey = process.env.ZRO_API_KEY?.trim() || ""
    const opencodeConfig = JSON.stringify({
      agents: {
        build: { system: modeInstruction("cowork") },
        plan: { system: modeInstruction("cowork") + " This run is read-only. Do not mutate files or execute commands." },
      },
      ...(zroApiKey ? {
      $schema: "https://opencode.ai/config.json",
      model: coworkModel(),
      provider: {
        zro: {
          npm: "@ai-sdk/openai-compatible",
          name: "ZRO",
          options: {
            baseURL: "https://zro.moonmath.ai/v1",
            apiKey: zroApiKey,
          },
          models: {
            "deepseek-v4-flash-0731": { name: "DeepSeek V4 Flash" },
            "deepseek-v4.1-flash": { name: "DeepSeek V4.1 Flash" },
          },
        },
      },
      } : {}),
    })

    const script = [
      ...(opencodeConfig ? [
        'mkdir -p /home/cowork/.config/opencode',
        'printf %s "$OPENCODE_CONFIG_JSON" > /home/cowork/.config/opencode/opencode.json',
      ] : []),
      'if curl -fsS --max-time 1 --user "opencode:$OPENCODE_SERVER_PASSWORD" http://127.0.0.1:4096/api/info >/dev/null; then exit 0; fi',
      "nohup opencode serve --hostname 0.0.0.0 --port 4096 >/tmp/opencode.log 2>&1 </dev/null &",
      "i=0",
      'while [ "$i" -lt 20 ]; do if curl -fsS --max-time 1 --user "opencode:$OPENCODE_SERVER_PASSWORD" http://127.0.0.1:4096/api/info >/dev/null; then exit 0; fi; i=$((i + 1)); sleep 0.5; done',
      "cat /tmp/opencode.log",
      "exit 1",
    ].join("\n")
    await this.runIncus([
      "exec", safeName, "--user", AGENT_UID, "--group", AGENT_GID,
      "--cwd", AGENT_WORKSPACE,
      "--env", "HOME=/home/cowork",
      "--env", `OPENCODE_SERVER_PASSWORD=${password}`,
      ...(opencodeConfig ? ["--env", `OPENCODE_CONFIG_JSON=${opencodeConfig}`] : []),
      "--", "sh", "-lc", script,
    ])
    return { vm, baseUrl: `http://${vm.ip}:4096`, password }
  }

  private static assertManagedInstanceName(instanceName: string): string {
    if (!/^cowork-[a-f0-9]{24}$/.test(instanceName)) {
      throw new Error("Invalid Cowork sandbox identifier")
    }
    return instanceName
  }

  private static async prepareAgentWorkspace(instanceName: string): Promise<void> {
    const provision = [
      `id -u cowork >/dev/null 2>&1 || adduser -D -u ${AGENT_UID} -h /home/cowork cowork`,
      `mkdir -p ${AGENT_WORKSPACE}`,
      `if [ -d /root/workspace ] && [ -z "$(ls -A ${AGENT_WORKSPACE})" ]; then cp -a /root/workspace/. ${AGENT_WORKSPACE}/; fi`,
      `chown -R ${AGENT_UID}:${AGENT_GID} ${AGENT_WORKSPACE}`,
      `chmod 700 ${AGENT_WORKSPACE}`,
    ].join(" && ")
    await this.runIncus(["exec", instanceName, "--", "sh", "-lc", provision])

    const identity = await this.runIncus([
      "exec", instanceName, "--user", AGENT_UID, "--group", AGENT_GID,
      "--cwd", AGENT_WORKSPACE, "--", "id", "-u",
    ])
    if (identity.trim() !== AGENT_UID) throw new Error("Cowork agent sandbox did not start as its non-root user")
  }

  private static async waitForInstance(instanceName: string): Promise<VMInfo> {
    for (let attempt = 0; attempt < 20; attempt++) {
      const raw = await this.runIncus(["list", instanceName, "--format", "json"])
      const instance = (JSON.parse(raw || "[]") as any[])[0]
      if (instance?.status === "Running") {
        const vm = this.formatInstance(instance)
        if (vm.ip) return vm
      }
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
    throw new Error("Cowork sandbox did not become reachable on the private Incus network.")
  }

  /**
   * Get or spawn a dedicated VM/container for a cowork session/user
   * Specification: 500MB RAM, 1 CPU, LXC container via Incus
   */
  static async getOrCreateVM(instanceName: string): Promise<VMInfo> {
    const safeName = this.assertManagedInstanceName(instanceName)
    const listRaw = await this.runIncus(["list", "--format", "json"])
    const instances: any[] = JSON.parse(listRaw || "[]")
    const existing = instances.find((i) => i.name === safeName)

    if (existing) {
      if (existing.status !== "Running") {
        await this.runIncus(["start", safeName])
      }
      await this.prepareAgentWorkspace(safeName)
      return this.waitForInstance(safeName)
    }

    // Launch from prepared fast template with cowork-vm profile (500MB RAM, 1 CPU)
    await this.launchIncus([
      "launch",
      TEMPLATE_IMAGE,
      safeName,
      "--quiet",
      "--profile",
      "default",
      "--profile",
      PROFILE_NAME,
    ])

    await this.prepareAgentWorkspace(safeName)
    return this.waitForInstance(safeName)
  }

  /**
   * Execute a command inside the VM
   */
  static async execInVM(
    instanceName: string,
    command: string,
    timeoutMs: number = 30000
  ): Promise<ExecResult> {
    const safeName = this.assertManagedInstanceName(instanceName)
    try {
      const { stdout, stderr } = await execFileAsync(
        "incus",
        ["exec", safeName, "--user", AGENT_UID, "--group", AGENT_GID, "--cwd", AGENT_WORKSPACE, "--", "bash", "-lc", command],
        { timeout: timeoutMs }
      )
      return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode: 0 }
    } catch (err: any) {
      return {
        stdout: err.stdout ? err.stdout.toString().trim() : "",
        stderr: err.stderr ? err.stderr.toString().trim() : (err.message || ""),
        exitCode: err.code || 1,
      }
    }
  }

  /**
   * Read a file from VM
   */
  static async readFile(instanceName: string, filePath: string): Promise<string> {
    const safeName = this.assertManagedInstanceName(instanceName)
    try {
      const { stdout } = await execFileAsync("incus", ["file", "pull", `${safeName}${filePath}`, "-"], {
        timeout: 10000,
        maxBuffer: 5 * 1024 * 1024,
      })
      return stdout
    } catch (err: any) {
      throw new Error(`Failed to read file ${filePath} from VM ${safeName}: ${err.message}`)
    }
  }

  /**
   * Write a file into VM
   */
  static async writeFile(
    instanceName: string,
    filePath: string,
    content: string
  ): Promise<void> {
    const safeName = this.assertManagedInstanceName(instanceName)
    const proc = execFile("incus", ["file", "push", "-", `${safeName}${filePath}`])
    if (proc.stdin) {
      proc.stdin.write(content)
      proc.stdin.end()
    }
    await new Promise((resolve, reject) => {
      proc.on("close", (code) => {
        if (code === 0) resolve(true)
        else reject(new Error(`Failed to write file ${filePath} into VM ${safeName}`))
      })
      proc.on("error", reject)
    })
  }

  private static formatInstance(inst: any): VMInfo {
    const addresses = inst.state?.network?.eth0?.addresses || []
    const ipv4 = addresses.find((a: any) => a.family === "inet")?.address
    return {
      name: inst.name,
      status: inst.status,
      ip: ipv4,
      memoryLimit: inst.expanded_config?.["limits.memory"] || "500MB",
      cpuLimit: inst.expanded_config?.["limits.cpu"] || "1",
      type: inst.type || "container",
    }
  }
}
