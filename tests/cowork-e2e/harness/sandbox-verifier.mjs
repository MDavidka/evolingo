/**
 * Incus Sandbox Verifier for Avalingo / Evolingo Cowork Agentic Compatibility.
 * Directly inspects and interacts with the isolated container (cowork-default)
 * without depending on Next.js backend APIs.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export class SandboxVerifier {
  /**
   * @param {string} [containerName] - Name of Incus container (default 'cowork-default')
   */
  constructor(containerName) {
    this.containerName = (
      containerName ||
      process.env.COWORK_SANDBOX_NAME ||
      "cowork-default"
    );
  }

  /**
   * Execute arbitrary bash command inside the container.
   *
   * @param {string} cmd - Command string to execute.
   * @param {object} [options]
   * @param {number} [options.timeoutMs=30000] - Timeout in milliseconds.
   * @param {string} [options.cwd="/root/workspace"] - Working directory.
   * @returns {Promise<{ stdout: string, stderr: string, exitCode: number, durationMs: number }>}
   */
  async execInSandbox(cmd, options = {}) {
    const timeoutMs = options.timeoutMs || 30000;
    const cwd = options.cwd || "/root/workspace";
    const startTime = Date.now();

    const wrappedCommand = `mkdir -p ${JSON.stringify(cwd)} && cd ${JSON.stringify(cwd)} && ${cmd}`;
    const args = ["exec", this.containerName, "--", "bash", "-c", wrappedCommand];

    try {
      const { stdout, stderr } = await execFileAsync("incus", args, {
        timeout: timeoutMs,
        maxBuffer: 10 * 1024 * 1024,
      });

      return {
        stdout: stdout ? stdout.toString() : "",
        stderr: stderr ? stderr.toString() : "",
        exitCode: 0,
        durationMs: Date.now() - startTime,
      };
    } catch (err) {
      const durationMs = Date.now() - startTime;
      return {
        stdout: err.stdout ? err.stdout.toString() : "",
        stderr: err.stderr ? err.stderr.toString() : (err.message || ""),
        exitCode: typeof err.code === "number" ? err.code : (err.killed ? 124 : 1),
        durationMs,
      };
    }
  }

  /**
   * Reads file content directly from inside the container.
   *
   * @param {string} filePath - Absolute path inside container.
   * @returns {Promise<string>} File contents.
   */
  async readSandboxFile(filePath) {
    const args = ["exec", this.containerName, "--", "cat", filePath];
    try {
      const { stdout } = await execFileAsync("incus", args);
      return stdout.toString();
    } catch (err) {
      throw new Error(`Failed to read file ${filePath} from sandbox: ${err.message}`);
    }
  }

  /**
   * Checks whether a file exists inside the container.
   *
   * @param {string} filePath - Absolute path inside container.
   * @returns {Promise<boolean>}
   */
  async sandboxFileExists(filePath) {
    const args = ["exec", this.containerName, "--", "test", "-e", filePath];
    try {
      await execFileAsync("incus", args);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Writes content to a file inside the container.
   *
   * @param {string} filePath - Absolute path inside container.
   * @param {string} content - Text content to write.
   */
  async writeSandboxFile(filePath, content) {
    const dir = filePath.substring(0, filePath.lastIndexOf("/"));
    if (dir) {
      await execFileAsync("incus", ["exec", this.containerName, "--", "mkdir", "-p", dir]);
    }
    const child = execFile("incus", ["exec", this.containerName, "--", "tee", filePath]);
    return new Promise((resolve, reject) => {
      child.on("error", reject);
      child.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Failed to write file ${filePath}: tee exited with ${code}`));
      });
      child.stdin.write(content);
      child.stdin.end();
    });
  }

  /**
   * Removes a file inside the container.
   *
   * @param {string} filePath - Absolute path inside container.
   */
  async removeSandboxFile(filePath) {
    await execFileAsync("incus", ["exec", this.containerName, "--", "rm", "-rf", filePath]);
  }

  /**
   * Collects cgroup and resource metrics from inside the container.
   *
   * @returns {Promise<object>}
   */
  async getSandboxMetrics() {
    const memMaxCmd = "cat /sys/fs/cgroup/memory.max 2>/dev/null || cat /sys/fs/cgroup/memory/memory.limit_in_bytes 2>/dev/null || echo max";
    const memCurCmd = "cat /sys/fs/cgroup/memory.current 2>/dev/null || cat /sys/fs/cgroup/memory/memory.usage_in_bytes 2>/dev/null || echo 0";
    const uptimeCmd = "uptime";
    const diskCmd = "df -h /";

    const memMax = (await this.execInSandbox(memMaxCmd)).stdout.trim();
    const memCur = (await this.execInSandbox(memCurCmd)).stdout.trim();
    const uptime = (await this.execInSandbox(uptimeCmd)).stdout.trim();
    const disk = (await this.execInSandbox(diskCmd)).stdout.trim();

    return {
      container: this.containerName,
      cgroup: {
        memoryMax: memMax,
        memoryCurrent: memCur,
      },
      uptime,
      disk,
    };
  }
}

export default SandboxVerifier;
