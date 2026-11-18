/**
 * Avalingo / Evolingo Canonical Agent Tools Suite
 * Milestone 2 (M2: Hardened Incus Sandbox Broker & Tool Suite)
 *
 * Implements:
 * - Canonical tool definitions (bash, read_file, write_file, edit_file, search_code, vm_status)
 * - OpenAI / LLM function calling schemas
 * - Strict argument validation & dispatching via executeTool
 * - Secret redaction on all tool outputs
 * - Unified diffs on file mutations
 * - Backward compatibility with legacy VM_AGENT_TOOLS & AgentTool
 */

import { CoworkVMManager } from "./vm-manager";
import { SandboxBroker, redactSecrets } from "./sandbox-broker";
import {
  CanonicalToolDefinition,
  ToolExecutionResult,
  PermissionTier,
  RiskLevel,
} from "./types";

// ============================================================================
// 1. Canonical Tool Definitions & Schemas
// ============================================================================

export interface ToolDefinitionWithMeta extends CanonicalToolDefinition {
  name: "bash" | "read_file" | "write_file" | "edit_file" | "search_code" | "vm_status";
}

export const CANONICAL_TOOLS: Record<string, ToolDefinitionWithMeta> = {
  bash: {
    name: "bash",
    description:
      "Execute a shell command or script inside the isolated Incus container sandbox (/root/workspace).",
    permission: "execute" as PermissionTier,
    risk: "high" as RiskLevel,
    timeout_ms: 30000,
    parameters: {
      type: "object",
      properties: {
        command: {
          type: "string",
          description: "The shell command line or script to execute.",
        },
        cwd: {
          type: "string",
          description:
            "Optional directory to execute the command in (relative to or inside /root/workspace).",
        },
        timeout_ms: {
          type: "number",
          description:
            "Optional command timeout in milliseconds (defaults to 30000). Process is SIGKILLed if exceeded.",
        },
      },
      required: ["command"],
    },
  },

  read_file: {
    name: "read_file",
    description:
      "Read the contents of a file within the workspace sandbox, with optional 1-indexed line slicing.",
    permission: "read" as PermissionTier,
    risk: "low" as RiskLevel,
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description:
            "File path relative to workspace or absolute within /root/workspace.",
        },
        start_line: {
          type: "number",
          description: "Optional 1-indexed starting line number.",
        },
        end_line: {
          type: "number",
          description: "Optional 1-indexed ending line number (inclusive).",
        },
      },
      required: ["path"],
    },
  },

  write_file: {
    name: "write_file",
    description:
      "Write full contents to a file in the workspace, automatically creating parent directories and recording a git checkpoint.",
    permission: "write" as PermissionTier,
    risk: "medium" as RiskLevel,
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description:
            "File path relative to workspace or absolute within /root/workspace.",
        },
        content: {
          type: "string",
          description: "Full text content to write into the file.",
        },
      },
      required: ["path", "content"],
    },
  },

  edit_file: {
    name: "edit_file",
    description:
      "Replace an exact target text sequence in an existing file with a replacement sequence and compute a unified diff.",
    permission: "write" as PermissionTier,
    risk: "medium" as RiskLevel,
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description:
            "File path relative to workspace or absolute within /root/workspace.",
        },
        target: {
          type: "string",
          description: "Exact target string to locate and replace in the file.",
        },
        replacement: {
          type: "string",
          description: "Replacement string to substitute in place of the target.",
        },
      },
      required: ["path", "target", "replacement"],
    },
  },

  search_code: {
    name: "search_code",
    description:
      "Search for text or symbol patterns across workspace files using recursive grep.",
    permission: "read" as PermissionTier,
    risk: "low" as RiskLevel,
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Pattern or text substring to search for.",
        },
        path: {
          type: "string",
          description:
            "Optional directory or file subpath within /root/workspace to restrict search.",
        },
        file_pattern: {
          type: "string",
          description:
            "Optional glob filename pattern filter (e.g. '*.ts', '*.py', 'package.json').",
        },
      },
      required: ["query"],
    },
  },

  vm_status: {
    name: "vm_status",
    description:
      "Inspect current sandbox hardware and cgroup metrics (CPU usage %, memory used/max, load average, uptime, disk).",
    permission: "read" as PermissionTier,
    risk: "low" as RiskLevel,
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
};

/**
 * OpenAI-compatible tool specifications for function calling.
 */
export const OPENAI_TOOL_SCHEMAS = Object.values(CANONICAL_TOOLS).map((tool) => ({
  type: "function" as const,
  function: {
    name: tool.name,
    description: tool.description,
    parameters: {
      type: "object",
      properties: tool.parameters.properties,
      required: tool.parameters.required || [],
    },
  },
}));

// ============================================================================
// 2. Dispatcher: executeTool
// ============================================================================

/**
 * Validates tool arguments, executes against the SandboxBroker, redacts secrets,
 * and formats the result.
 */
export async function executeTool(
  name: string,
  args: Record<string, any>,
  broker: SandboxBroker
): Promise<ToolExecutionResult> {
  const startTime = Date.now();
  const tool = CANONICAL_TOOLS[name];

  if (!tool) {
    return {
      output: redactSecrets(`Unknown tool: '${name}'. Valid tools: ${Object.keys(CANONICAL_TOOLS).join(", ")}`),
      exit_code: 1,
      is_error: true,
      duration_ms: 0,
    };
  }

  try {
    switch (name) {
      case "bash": {
        if (!args || typeof args.command !== "string" || !args.command.trim()) {
          return {
            output: "Validation error: 'command' argument is required and must be a non-empty string.",
            exit_code: 1,
            is_error: true,
            duration_ms: Date.now() - startTime,
          };
        }

        const res = await broker.exec(args.command, {
          cwd: typeof args.cwd === "string" ? args.cwd : undefined,
          timeout_ms: typeof args.timeout_ms === "number" ? args.timeout_ms : undefined,
        });

        let output = res.stdout;
        if (res.stderr) {
          output = output ? `${output}\n${res.stderr}` : res.stderr;
        }
        if (!output) {
          output = `(Command completed with exit code ${res.exit_code})`;
        }

        return {
          output: redactSecrets(output),
          exit_code: res.exit_code,
          is_error: res.exit_code !== 0,
          duration_ms: res.duration_ms,
        };
      }

      case "read_file": {
        if (!args || typeof args.path !== "string" || !args.path.trim()) {
          return {
            output: "Validation error: 'path' argument is required and must be a non-empty string.",
            exit_code: 1,
            is_error: true,
            duration_ms: Date.now() - startTime,
          };
        }

        const res = await broker.readFile(args.path, {
          startLine: typeof args.start_line === "number" ? args.start_line : undefined,
          endLine: typeof args.end_line === "number" ? args.end_line : undefined,
        });

        return {
          output: redactSecrets(res.content),
          exit_code: 0,
          is_error: false,
          duration_ms: Date.now() - startTime,
          metadata: { bytes: res.bytes },
        };
      }

      case "write_file": {
        if (!args || typeof args.path !== "string" || !args.path.trim()) {
          return {
            output: "Validation error: 'path' argument is required and must be a non-empty string.",
            exit_code: 1,
            is_error: true,
            duration_ms: Date.now() - startTime,
          };
        }
        if (typeof args.content !== "string") {
          return {
            output: "Validation error: 'content' argument is required and must be a string.",
            exit_code: 1,
            is_error: true,
            duration_ms: Date.now() - startTime,
          };
        }

        const res = await broker.writeFile(args.path, args.content);
        const formatted = `Successfully written ${res.bytes_written} bytes to ${args.path}\n${res.diff}`;

        return {
          output: redactSecrets(formatted),
          exit_code: 0,
          is_error: false,
          duration_ms: Date.now() - startTime,
          diff: res.diff,
          metadata: { bytes_written: res.bytes_written },
        };
      }

      case "edit_file": {
        if (!args || typeof args.path !== "string" || !args.path.trim()) {
          return {
            output: "Validation error: 'path' argument is required and must be a non-empty string.",
            exit_code: 1,
            is_error: true,
            duration_ms: Date.now() - startTime,
          };
        }
        if (typeof args.target !== "string" || !args.target) {
          return {
            output: "Validation error: 'target' argument is required and must be a non-empty string.",
            exit_code: 1,
            is_error: true,
            duration_ms: Date.now() - startTime,
          };
        }
        if (typeof args.replacement !== "string") {
          return {
            output: "Validation error: 'replacement' argument is required and must be a string.",
            exit_code: 1,
            is_error: true,
            duration_ms: Date.now() - startTime,
          };
        }

        const res = await broker.editFile(args.path, args.target, args.replacement);
        const formatted = `Successfully edited ${args.path}\n${res.diff}`;

        return {
          output: redactSecrets(formatted),
          exit_code: 0,
          is_error: false,
          duration_ms: Date.now() - startTime,
          diff: res.diff,
          metadata: { bytes_written: res.bytes_written },
        };
      }

      case "search_code": {
        if (!args || typeof args.query !== "string" || !args.query.trim()) {
          return {
            output: "Validation error: 'query' argument is required and must be a non-empty string.",
            exit_code: 1,
            is_error: true,
            duration_ms: Date.now() - startTime,
          };
        }

        const matches = await broker.searchCode(args.query, {
          path: typeof args.path === "string" ? args.path : undefined,
          filePattern: typeof args.file_pattern === "string" ? args.file_pattern : undefined,
        });

        const formatted =
          matches.length > 0
            ? matches.map((m) => `${m.file}:${m.line}: ${m.content}`).join("\n")
            : "(No matches found)";

        return {
          output: redactSecrets(formatted),
          exit_code: 0,
          is_error: false,
          duration_ms: Date.now() - startTime,
          metadata: { matches, count: matches.length },
        };
      }

      case "vm_status": {
        const metrics = await broker.getVMStatus();
        const memUsedMB = (metrics.memory_used_bytes / (1024 * 1024)).toFixed(1);
        const memTotalMB = (metrics.memory_total_bytes / (1024 * 1024)).toFixed(1);
        const diskUsedMB = (metrics.disk_used_bytes / (1024 * 1024)).toFixed(1);
        const diskTotalMB = (metrics.disk_total_bytes / (1024 * 1024)).toFixed(1);

        const formatted =
          `Container Status & Hardware Metrics:\n` +
          `- CPU Usage: ${metrics.cpu_usage_pct}%\n` +
          `- Memory: ${memUsedMB}MB / ${memTotalMB}MB\n` +
          `- Uptime: ${Math.round(metrics.uptime_seconds)}s\n` +
          `- Load Average: ${metrics.load_average.map((l) => l.toFixed(2)).join(", ")}\n` +
          `- Disk Space: ${diskUsedMB}MB / ${diskTotalMB}MB`;

        return {
          output: redactSecrets(formatted),
          exit_code: 0,
          is_error: false,
          duration_ms: Date.now() - startTime,
          metadata: metrics as unknown as Record<string, unknown>,
        };
      }

      default:
        return {
          output: redactSecrets(`Unhandled tool: ${name}`),
          exit_code: 1,
          is_error: true,
          duration_ms: Date.now() - startTime,
        };
    }
  } catch (err: any) {
    return {
      output: redactSecrets(`Tool error (${name}): ${err.message || String(err)}`),
      exit_code: 1,
      is_error: true,
      duration_ms: Date.now() - startTime,
    };
  }
}

// ============================================================================
// 3. Backward-Compatible Legacy Interfaces
// ============================================================================

export interface AgentTool {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, { type: string; description: string; enum?: string[] }>;
    required: string[];
  };
  execute: (args: any, vmName?: string) => Promise<string>;
}

export const VM_AGENT_TOOLS: Record<string, AgentTool> = {
  bash: {
    name: "bash",
    description: CANONICAL_TOOLS.bash.description,
    parameters: {
      type: "object",
      properties: CANONICAL_TOOLS.bash.parameters.properties,
      required: CANONICAL_TOOLS.bash.parameters.required || ["command"],
    },
    execute: async (args: { command: string }, vmName: string) => {
      const broker = new SandboxBroker({ containerName: vmName });
      const res = await executeTool("bash", args, broker);
      return res.output;
    },
  },

  write_file: {
    name: "write_file",
    description: CANONICAL_TOOLS.write_file.description,
    parameters: {
      type: "object",
      properties: CANONICAL_TOOLS.write_file.parameters.properties,
      required: CANONICAL_TOOLS.write_file.parameters.required || ["path", "content"],
    },
    execute: async (args: { path: string; content: string }, vmName: string) => {
      const broker = new SandboxBroker({ containerName: vmName });
      const res = await executeTool("write_file", args, broker);
      return res.output;
    },
  },

  read_file: {
    name: "read_file",
    description: CANONICAL_TOOLS.read_file.description,
    parameters: {
      type: "object",
      properties: CANONICAL_TOOLS.read_file.parameters.properties,
      required: CANONICAL_TOOLS.read_file.parameters.required || ["path"],
    },
    execute: async (args: { path: string }, vmName: string) => {
      const broker = new SandboxBroker({ containerName: vmName });
      const res = await executeTool("read_file", args, broker);
      return res.output;
    },
  },

  vm_status: {
    name: "vm_status",
    description: CANONICAL_TOOLS.vm_status.description,
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
    execute: async (_args: any, vmName: string) => {
      const vm = await CoworkVMManager.getOrCreateVM(vmName);
      const broker = new SandboxBroker({ containerName: vmName });
      const res = await executeTool("vm_status", {}, broker);
      return `Container: ${vm.name} (${vm.status})\nType: Incus LXC (CPU limit: ${vm.cpuLimit}, RAM limit: ${vm.memoryLimit})\nIP: ${vm.ip || "Pending"}\n${res.output}`;
    },
  },
};
