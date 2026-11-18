/**
 * Avalingo / Evolingo Hardened Incus Sandbox Broker
 * Milestone 2 (M2: Hardened Incus Sandbox Broker & Tool Suite)
 *
 * Implements ISandboxBroker for isolated container execution:
 * - incus exec with timeout (default 30s) and SIGKILL termination
 * - Output buffer cap at 500KB (512,000 bytes) with [OUTPUT TRUNCATED]
 * - Comprehensive secret redaction for API keys, tokens, passwords, private keys
 * - Airtight path traversal and symlink escape defenses rooted at /workspace
 * - File operations with unified diff generation
 * - Code search with grep/find
 * - Real container cgroup and hardware status metrics
 * - Git worktree checkpointing
 */

import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import type {
  ISandboxBroker,
  ExecOptions,
  ExecResult,
  ReadFileOptions,
  ReadFileResult,
  WriteFileResult,
  EditFileResult,
  SearchOptions,
  SearchResult,
  VMStatusMetrics,
} from "./types.ts";

const execFileAsync = promisify(execFile);

export const DEFAULT_WORKSPACE_ROOT = "/workspace";
export const DEFAULT_TIMEOUT_MS = 30000;
export const MAX_OUTPUT_BYTES = 512000; // 500KB cap
const AGENT_UID = "1000";
const AGENT_GID = "1000";

// ============================================================================
// 1. Secret Redaction
// ============================================================================

/**
 * Redacts sensitive credentials, tokens, private keys, and passwords from strings.
 */
export function redactSecrets(text: string): string {
  if (!text || typeof text !== "string") return text;

  return text
    // PEM private keys (full blocks)
    .replace(
      /-----BEGIN [A-Z0-9 ]+PRIVATE KEY-----[\s\S]*?-----END [A-Z0-9 ]+PRIVATE KEY-----/g,
      "[REDACTED]"
    )
    // Standalone PEM private key header lines
    .replace(/-----BEGIN [A-Z0-9 ]+PRIVATE KEY-----[^\n]*/g, "[REDACTED]")
    // OpenAI / Anthropic / AI API keys (e.g. sk-...)
    .replace(/\bsk-[a-zA-Z0-9_\-]{20,}\b/g, "[REDACTED]")
    // GitHub personal access tokens
    .replace(/\bghp_[a-zA-Z0-9]{36}\b/g, "[REDACTED]")
    .replace(/\bgithub_pat_[a-zA-Z0-9_]{82}\b/g, "[REDACTED]")
    // Slack tokens
    .replace(/\bxox[baprs]-[0-9a-zA-Z]{10,}\b/g, "[REDACTED]")
    // AWS Access Key IDs
    .replace(/\bAKIA[0-9A-Z]{16}\b/g, "[REDACTED]")
    // JWT / Bearer tokens
    .replace(
      /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
      "[REDACTED]"
    )
    .replace(/\bBearer\s+[A-Za-z0-9\-._~+/]+=*/gi, "Bearer [REDACTED]")
    // Common key-value credential pairs (password=..., token=..., api_key=...)
    .replace(
      /((?:api[_-]?key|secret|password|access_token|private_key)\s*[:=]\s*["']?)([^\s"',;]+)(["']?)/gi,
      "$1[REDACTED]$3"
    );
}

// ============================================================================
// 2. Unified Diff Generation
// ============================================================================

/**
 * Computes a standard unified diff between two string contents.
 */
export function createUnifiedDiff(
  filePath: string,
  oldContent: string,
  newContent: string
): string {
  if (oldContent === newContent) return "";

  const oldLines = oldContent ? oldContent.split("\n") : [];
  const newLines = newContent ? newContent.split("\n") : [];

  if (oldLines.length === 0) {
    return [
      "--- /dev/null",
      `+++ b/${filePath}`,
      `@@ -0,0 +1,${newLines.length} @@`,
      ...newLines.map((l) => "+" + l),
    ].join("\n");
  }

  if (newLines.length === 0) {
    return [
      `--- a/${filePath}`,
      "+++ /dev/null",
      `@@ -1,${oldLines.length} +0,0 @@`,
      ...oldLines.map((l) => "-" + l),
    ].join("\n");
  }

  // LCS-based unified diff
  const n = oldLines.length;
  const m = newLines.length;

  // For very large files, avoid NxM memory explosion
  if (n * m > 2000000) {
    return [
      `--- a/${filePath}`,
      `+++ b/${filePath}`,
      `@@ -1,${oldLines.length} +1,${newLines.length} @@`,
      ...oldLines.map((l) => "-" + l),
      ...newLines.map((l) => "+" + l),
    ].join("\n");
  }

  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      if (oldLines[i] === newLines[j]) {
        dp[i + 1][j + 1] = dp[i][j] + 1;
      } else {
        dp[i + 1][j + 1] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  type DiffOp = { type: "common" | "add" | "del"; line: string };
  const edits: DiffOp[] = [];
  let i = n;
  let j = m;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      edits.push({ type: "common", line: oldLines[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      edits.push({ type: "add", line: newLines[j - 1] });
      j--;
    } else if (i > 0) {
      edits.push({ type: "del", line: oldLines[i - 1] });
      i--;
    }
  }
  edits.reverse();

  const lines = [
    `--- a/${filePath}`,
    `+++ b/${filePath}`,
    `@@ -1,${oldLines.length} +1,${newLines.length} @@`,
  ];

  for (const edit of edits) {
    if (edit.type === "common") lines.push(" " + edit.line);
    else if (edit.type === "del") lines.push("-" + edit.line);
    else if (edit.type === "add") lines.push("+" + edit.line);
  }

  return lines.join("\n");
}

// ============================================================================
// 3. Path Traversal Guard
// ============================================================================

/**
 * Validates and canonicalizes a path against the container workspace root.
 * Throws an Error if path escapes the workspace root.
 */
export function canonicalizeWorkspacePath(
  inputPath: string,
  workspaceRoot: string = DEFAULT_WORKSPACE_ROOT
): string {
  if (!inputPath || typeof inputPath !== "string") {
    throw new Error("Invalid path: path must be a non-empty string");
  }

  if (inputPath.includes("\0")) {
    throw new Error("Invalid path: contains null byte");
  }

  const trimmed = inputPath.trim();
  const root = path.posix.normalize(workspaceRoot);

  if (path.posix.isAbsolute(trimmed)) {
    const normalized = path.posix.normalize(trimmed);
    if (normalized !== root && !normalized.startsWith(root + "/")) {
      throw new Error(
        `Path traversal rejected: absolute path '${trimmed}' is outside workspace '${root}'`
      );
    }
    return normalized;
  }

  const resolved = path.posix.resolve(root, trimmed);
  if (resolved !== root && !resolved.startsWith(root + "/")) {
    throw new Error(
      `Path traversal rejected: path '${trimmed}' resolves outside workspace '${root}'`
    );
  }

  return resolved;
}

// ============================================================================
// 4. SandboxBroker Implementation
// ============================================================================

export interface SandboxBrokerOptions {
  containerName: string;
  workspaceRoot?: string;
  defaultTimeoutMs?: number;
  maxBufferBytes?: number;
}

export class SandboxBroker implements ISandboxBroker {
  readonly containerName: string;
  readonly workspaceRoot: string;
  readonly defaultTimeoutMs: number;
  readonly maxBufferBytes: number;

  constructor(options: SandboxBrokerOptions) {
    this.containerName = options.containerName;
    if (!/^cowork-[a-f0-9]{24}$/.test(this.containerName)) {
      throw new Error("Invalid Cowork sandbox identifier")
    }
    this.workspaceRoot = path.posix.normalize(options.workspaceRoot || DEFAULT_WORKSPACE_ROOT);
    if (this.workspaceRoot !== DEFAULT_WORKSPACE_ROOT) {
      throw new Error("Cowork tools are restricted to the provisioned workspace")
    }
    this.defaultTimeoutMs = options.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxBufferBytes = options.maxBufferBytes ?? MAX_OUTPUT_BYTES;
  }

  /**
   * Canonicalizes path and enforces workspace boundary.
   */
  canonicalizePath(targetPath: string): string {
    return canonicalizeWorkspacePath(targetPath, this.workspaceRoot);
  }

  /**
   * Asserts that a canonical path inside the container does not escape via symlinks.
   */
  async assertNoSymlinkEscape(canonicalPath: string): Promise<void> {
    try {
      const { stdout } = await execFileAsync("incus", [
        "exec",
        this.containerName,
        "--user",
        AGENT_UID,
        "--group",
        AGENT_GID,
        "--cwd",
        this.workspaceRoot,
        "--",
        "readlink",
        "-f",
        canonicalPath,
      ]);

      const real = stdout.trim();
      if (real && real !== this.workspaceRoot && !real.startsWith(this.workspaceRoot + "/")) {
        throw new Error(
          `Symlink escape detected: '${canonicalPath}' resolves to '${real}' outside workspace`
        );
      }
    } catch (err: any) {
      if (err.message?.includes("Symlink escape detected")) {
        throw err;
      }
      // If readlink failed for another reason (e.g. parent dir check), verify parent
      const parent = path.posix.dirname(canonicalPath);
      if (parent !== this.workspaceRoot && parent.startsWith(this.workspaceRoot + "/")) {
        await this.assertNoSymlinkEscape(parent);
      }
    }
  }

  /**
   * Executes a command inside the container with timeout, output bounds, and secret redaction.
   */
  async exec(command: string, options?: ExecOptions): Promise<ExecResult> {
    const timeoutMs = options?.timeout_ms ?? this.defaultTimeoutMs;
    const cwd = options?.cwd ? this.canonicalizePath(options.cwd) : this.workspaceRoot;
    const startTime = Date.now();

    const envArgs: string[] = [];
    if (options?.env) {
      for (const [key, val] of Object.entries(options.env)) {
        envArgs.push("--env", `${key}=${val}`);
      }
    }

    const incusArgs = [
      "exec",
      this.containerName,
      "--user",
      AGENT_UID,
      "--group",
      AGENT_GID,
      "--cwd",
      cwd,
      ...envArgs,
      "--",
      "bash",
      "-c",
      command,
    ];

    return new Promise<ExecResult>((resolve) => {
      const stdoutChunks: Buffer[] = [];
      const stderrChunks: Buffer[] = [];
      let stdoutBytes = 0;
      let stderrBytes = 0;
      let stdoutTruncated = false;
      let stderrTruncated = false;
      let timedOut = false;
      let timer: ReturnType<typeof setTimeout> | null = null;

      const child = spawn("incus", incusArgs);

      if (timeoutMs > 0) {
        timer = setTimeout(() => {
          timedOut = true;
          child.kill("SIGKILL");
        }, timeoutMs);
      }

      child.stdout.on("data", (chunk: Buffer) => {
        if (stdoutBytes < this.maxBufferBytes) {
          const remaining = this.maxBufferBytes - stdoutBytes;
          if (chunk.length <= remaining) {
            stdoutChunks.push(chunk);
            stdoutBytes += chunk.length;
          } else {
            stdoutChunks.push(chunk.subarray(0, remaining));
            stdoutBytes += remaining;
            stdoutTruncated = true;
          }
        } else {
          stdoutTruncated = true;
        }
      });

      child.stderr.on("data", (chunk: Buffer) => {
        if (stderrBytes < this.maxBufferBytes) {
          const remaining = this.maxBufferBytes - stderrBytes;
          if (chunk.length <= remaining) {
            stderrChunks.push(chunk);
            stderrBytes += chunk.length;
          } else {
            stderrChunks.push(chunk.subarray(0, remaining));
            stderrBytes += remaining;
            stderrTruncated = true;
          }
        } else {
          stderrTruncated = true;
        }
      });

      child.on("close", (code) => {
        if (timer) clearTimeout(timer);
        const duration_ms = Date.now() - startTime;

        let stdout = Buffer.concat(stdoutChunks).toString("utf8");
        if (stdoutTruncated) {
          stdout += "\n[OUTPUT TRUNCATED]";
        }

        let stderr = Buffer.concat(stderrChunks).toString("utf8");
        if (stderrTruncated) {
          stderr += "\n[OUTPUT TRUNCATED]";
        }

        let exit_code = code ?? 0;
        if (timedOut) {
          exit_code = 124;
          const timeoutMsg = `Command timed out after ${timeoutMs}ms`;
          stderr = stderr ? `${stderr}\n${timeoutMsg}` : timeoutMsg;
        }

        resolve({
          stdout: redactSecrets(stdout),
          stderr: redactSecrets(stderr),
          exit_code,
          duration_ms,
        });
      });

      child.on("error", (err) => {
        if (timer) clearTimeout(timer);
        const duration_ms = Date.now() - startTime;
        resolve({
          stdout: "",
          stderr: redactSecrets(`Process spawn error: ${err.message}`),
          exit_code: 1,
          duration_ms,
        });
      });
    });
  }

  /**
   * Reads a file from inside the container with line slicing support.
   */
  async readFile(filePath: string, options?: ReadFileOptions): Promise<ReadFileResult> {
    const canonicalPath = this.canonicalizePath(filePath);
    await this.assertNoSymlinkEscape(canonicalPath);

    const pullArgs = ["file", "pull", `${this.containerName}${canonicalPath}`, "-"];
    try {
      const { stdout } = await execFileAsync("incus", pullArgs, {
        maxBuffer: 20 * 1024 * 1024,
        encoding: "utf8",
      });

      let content = stdout;
      if (options?.startLine !== undefined || options?.endLine !== undefined) {
        const lines = content.split("\n");
        const totalLines = lines.length;
        const start = options.startLine !== undefined ? Math.max(1, options.startLine) : 1;
        const end =
          options.endLine !== undefined ? Math.min(totalLines, options.endLine) : totalLines;

        if (start > end || start > totalLines) {
          content = "";
        } else {
          content = lines.slice(start - 1, end).join("\n");
        }
      }

      return {
        content,
        bytes: Buffer.byteLength(content, "utf8"),
      };
    } catch (err: any) {
      if (err.message?.includes("Not Found") || err.stderr?.includes("Not Found")) {
        throw new Error(`File not found: ${filePath}`);
      }
      throw new Error(`Failed to read file ${filePath}: ${err.stderr || err.message}`);
    }
  }

  /**
   * Writes a file inside the container, checkpoints git worktree, and returns unified diff.
   */
  async writeFile(filePath: string, content: string): Promise<WriteFileResult> {
    const canonicalPath = this.canonicalizePath(filePath);
    await this.assertNoSymlinkEscape(canonicalPath);

    // Git checkpoint before mutation if worktree exists
    await this.checkpointBeforeMutation();

    // Read old content to compute unified diff
    let oldContent = "";
    try {
      const existing = await this.readFile(filePath);
      oldContent = existing.content;
    } catch {
      oldContent = "";
    }

    const pushArgs = [
      "file", "push", "-p", "--uid", AGENT_UID, "--gid", AGENT_GID,
      "-", `${this.containerName}${canonicalPath}`,
    ];
    await new Promise<void>((resolve, reject) => {
      const child = spawn("incus", pushArgs);
      child.stdin.write(content, "utf8");
      child.stdin.end();

      let stderr = "";
      child.stderr.on("data", (c) => {
        stderr += c.toString();
      });

      child.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Failed to write file ${filePath}: ${stderr}`));
      });

      child.on("error", reject);
    });

    const diff = createUnifiedDiff(filePath, oldContent, content);
    const bytes_written = Buffer.byteLength(content, "utf8");

    return {
      bytes_written,
      diff,
    };
  }

  /**
   * Replaces an exact target string in a file and returns unified diff.
   */
  async editFile(
    filePath: string,
    target: string,
    replacement: string
  ): Promise<EditFileResult> {
    const canonicalPath = this.canonicalizePath(filePath);
    await this.assertNoSymlinkEscape(canonicalPath);

    const existing = await this.readFile(filePath);
    if (!existing.content.includes(target)) {
      throw new Error(`Target string not found in ${filePath}`);
    }

    const newContent = existing.content.replace(target, replacement);
    const writeRes = await this.writeFile(filePath, newContent);

    return {
      bytes_written: writeRes.bytes_written,
      diff: writeRes.diff,
    };
  }

  /**
   * Searches for a text pattern in the container workspace files using grep.
   */
  async searchCode(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    const searchRoot = options?.path ? this.canonicalizePath(options.path) : this.workspaceRoot;
    await this.assertNoSymlinkEscape(searchRoot);

    const escapedQuery = query.replace(/'/g, "'\\''");
    let command: string;
    if (options?.filePattern) {
      const escapedPattern = options.filePattern.replace(/'/g, "'\\''");
      command = `find '${searchRoot}' -type f -name '${escapedPattern}' -exec grep -Hn -F '${escapedQuery}' {} +`;
    } else {
      command = `grep -rn -F '${escapedQuery}' '${searchRoot}'`;
    }

    const res = await this.exec(command, { cwd: this.workspaceRoot });
    if (res.exit_code !== 0 && res.exit_code !== 1) {
      throw new Error(`Search failed: ${res.stderr}`);
    }

    if (!res.stdout.trim()) {
      return [];
    }

    const lines = res.stdout.split("\n");
    const results: SearchResult[] = [];

    for (const line of lines) {
      if (!line.trim()) continue;
      const firstColon = line.indexOf(":");
      if (firstColon === -1) continue;
      const secondColon = line.indexOf(":", firstColon + 1);
      if (secondColon === -1) continue;

      const file = line.slice(0, firstColon);
      const lineNum = parseInt(line.slice(firstColon + 1, secondColon), 10);
      const content = line.slice(secondColon + 1);

      if (isNaN(lineNum)) continue;

      results.push({
        file,
        line: lineNum,
        content: redactSecrets(content),
      });
    }

    return results;
  }

  /**
   * Retrieves container cgroup CPU, memory, uptime, and disk metrics.
   */
  async getVMStatus(): Promise<VMStatusMetrics> {
    const script = `
cat /proc/uptime
echo "---METRIC_DELIM---"
cat /sys/fs/cgroup/memory.current 2>/dev/null || free -b | awk '/Mem:/ {print $3}'
echo "---METRIC_DELIM---"
cat /sys/fs/cgroup/memory.max 2>/dev/null || echo "500000000"
echo "---METRIC_DELIM---"
cat /proc/loadavg
echo "---METRIC_DELIM---"
df -B1 /root/workspace 2>/dev/null || df -B1 /
echo "---METRIC_DELIM---"
top -bn1 2>/dev/null | head -n 3
`;

    const res = await this.exec(script, { cwd: this.workspaceRoot });
    const parts = res.stdout.split("---METRIC_DELIM---").map((p) => p.trim());

    // 1. Uptime
    const uptimeRaw = parts[0]?.split(" ")[0];
    const uptime_seconds = uptimeRaw ? parseFloat(uptimeRaw) : 0;

    // 2. Memory current
    const memUsedRaw = parts[1];
    let memory_used_bytes = memUsedRaw ? parseInt(memUsedRaw, 10) : 0;
    if (isNaN(memory_used_bytes)) memory_used_bytes = 0;

    // 3. Memory max
    const memMaxRaw = parts[2];
    let memory_total_bytes = 500 * 1024 * 1024; // Default 500MB
    if (memMaxRaw && memMaxRaw !== "max") {
      const parsed = parseInt(memMaxRaw, 10);
      if (!isNaN(parsed) && parsed > 0) {
        memory_total_bytes = parsed;
      }
    }

    // 4. Load average
    const loadParts = parts[3]?.split(/\s+/).slice(0, 3) || [];
    const load_average = loadParts.map((l) => parseFloat(l) || 0);
    while (load_average.length < 3) load_average.push(0);

    // 5. Disk
    let disk_used_bytes = 0;
    let disk_total_bytes = 0;
    if (parts[4]) {
      const diskLines = parts[4].split("\n").filter((l) => l.trim().length > 0);
      const lastLine = diskLines[diskLines.length - 1];
      const columns = lastLine.split(/\s+/);
      if (columns.length >= 4) {
        const total = parseInt(columns[1], 10);
        const used = parseInt(columns[2], 10);
        if (!isNaN(total)) disk_total_bytes = total;
        if (!isNaN(used)) disk_used_bytes = used;
      }
    }

    // 6. CPU usage pct
    let cpu_usage_pct = 0;
    if (parts[5]) {
      const cpuMatch = parts[5].match(/CPU:\s*(\d+)%\s*usr\s*(\d+)%\s*sys/i);
      if (cpuMatch) {
        cpu_usage_pct = parseInt(cpuMatch[1], 10) + parseInt(cpuMatch[2], 10);
      } else {
        const idleMatch = parts[5].match(/(\d+)%\s*idle/i);
        if (idleMatch) {
          cpu_usage_pct = Math.max(0, 100 - parseInt(idleMatch[1], 10));
        } else {
          cpu_usage_pct = Math.min(100, Math.round((load_average[0] || 0) * 100));
        }
      }
    }

    return {
      cpu_usage_pct,
      memory_used_bytes,
      memory_total_bytes,
      uptime_seconds,
      load_average,
      disk_used_bytes,
      disk_total_bytes,
    };
  }

  /**
   * Creates a git checkpoint commit in /root/workspace.
   */
  async createCheckpoint(): Promise<string> {
    await this.ensureGitRepo();
    const timestamp = Date.now();
    await this.exec(
      `git add -A && git commit --allow-empty -m "checkpoint-${timestamp}"`,
      { cwd: this.workspaceRoot }
    );
    const hashRes = await this.exec("git rev-parse HEAD", { cwd: this.workspaceRoot });
    const hash = hashRes.stdout.trim() || `${timestamp}`;
    return `checkpoint-${hash}`;
  }

  /**
   * Initializes git repository in /root/workspace if missing.
   */
  async ensureGitRepo(): Promise<void> {
    const check = await this.exec("git rev-parse --is-inside-work-tree", {
      cwd: this.workspaceRoot,
    });
    if (check.exit_code !== 0 || check.stdout.trim() !== "true") {
      await this.exec(
        'git init && git config user.name "Cowork Agent" && git config user.email "agent@cowork.local" && git commit --allow-empty -m "initial repo"',
        { cwd: this.workspaceRoot }
      );
    }
  }

  /**
   * Performs git checkpoint before mutating operations if dirty.
   */
  private async checkpointBeforeMutation(): Promise<void> {
    try {
      const checkGit = await this.exec("git rev-parse --is-inside-work-tree", {
        cwd: this.workspaceRoot,
      });
      if (checkGit.exit_code === 0 && checkGit.stdout.trim() === "true") {
        const statusRes = await this.exec("git status --porcelain", {
          cwd: this.workspaceRoot,
        });
        if (statusRes.stdout.trim().length > 0) {
          await this.createCheckpoint();
        }
      }
    } catch {
      // Non-blocking
    }
  }
}
