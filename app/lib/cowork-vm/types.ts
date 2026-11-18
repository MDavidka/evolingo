/**
 * Avalingo / Evolingo Cowork Agentic Compatibility Protocol Types
 * Milestone 1 (M1: Durable Event Store & Cryptographic State)
 *
 * Conforms strictly to:
 * - /tmp/aval_cowork/protocols/EVENTS_AND_MESSAGES.md
 * - /tmp/aval_cowork/security/SANDBOX_AND_PERMISSIONS.md
 * - /tmp/aval_cowork/architecture/SYSTEM_BLUEPRINT.md
 */

// ============================================================================
// 1. Canonical 18 SSE Event Types
// ============================================================================

export const CANONICAL_SSE_EVENTS = [
  "run.queued",
  "run.started",
  "run.status",
  "message.started",
  "message.delta",
  "message.completed",
  "plan.updated",
  "tool.started",
  "tool.output",
  "tool.completed",
  "tool.failed",
  "file.changed",
  "approval.required",
  "approval.resolved",
  "run.completed",
  "run.failed",
  "run.cancelled",
  "heartbeat",
] as const;

export type CoworkEventType = (typeof CANONICAL_SSE_EVENTS)[number];

// ============================================================================
// 2. Execution Modes, Run Statuses, Risk & Permission Tiers
// ============================================================================

export type CoworkMode = "plan" | "build";

export const COWORK_RUN_STATUSES = [
  "queued",
  "planning",
  "running",
  "waiting_approval",
  "verifying",
  "completed",
  "failed",
  "cancelled",
  "interrupted",
] as const;

export type CoworkRunStatus = (typeof COWORK_RUN_STATUSES)[number];

export const RISK_LEVELS = ["low", "medium", "high", "critical"] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];
export type CoworkRiskLevel = RiskLevel;

export const PERMISSION_TIERS = [
  "read",
  "write",
  "execute",
  "network",
  "privileged",
] as const;
export type PermissionTier = (typeof PERMISSION_TIERS)[number] | "scoped_network";
export type CoworkPermissionTier = PermissionTier;

// ============================================================================
// 3. Message Parts & Plan Steps
// ============================================================================

export interface TextPart {
  type: "text";
  text: string;
}

export interface ReasoningSummaryPart {
  type: "reasoning_summary";
  summary: string; // Public summary only; NEVER private raw CoT
}

export interface ToolCallPart {
  type: "tool_call";
  tool_call_id: string;
  name: string;
  args: Record<string, unknown>;
  safe_label?: string;
}

export interface ToolResultPart {
  type: "tool_result";
  tool_call_id: string;
  output: string;
  exit_code?: number;
  is_error?: boolean;
  duration_ms?: number;
}

export interface ArtifactPart {
  type: "artifact";
  artifact_id: string;
  title: string;
  path?: string;
  content?: string;
}

export interface ApprovalPart {
  type: "approval";
  approval_id: string;
  action_digest: string;
  risk: RiskLevel;
  status: "pending" | "allowed" | "denied" | "expired";
}

export interface ErrorPart {
  type: "error";
  error_code: string;
  message: string;
}

export type CoworkMessagePart =
  | TextPart
  | ReasoningSummaryPart
  | ToolCallPart
  | ToolResultPart
  | ArtifactPart
  | ApprovalPart
  | ErrorPart;

export interface PlanStep {
  id: string;
  title: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
}
export type CoworkPlanStep = PlanStep;

// ============================================================================
// 4. SSE Event Payloads & Map
// ============================================================================

export interface RunQueuedPayload {
  queue_position?: number;
  estimated_wait_ms?: number;
}

export interface RunStartedPayload {
  engine_version: string;
  model_id?: string;
  model?: string;
  config_version?: string;
  mode?: CoworkMode;
}

export interface RunStatusPayload {
  status: CoworkRunStatus;
  previous_status?: CoworkRunStatus;
  reason?: string;
  message?: string;
  metadata?: Record<string, unknown>;
}

export interface MessageStartedPayload {
  message_id: string;
  role: "user" | "assistant" | "system";
}

export interface MessageDeltaPayload {
  message_id: string;
  part_id: string;
  delta_seq?: number;
  text_delta: string;
}

export interface MessageCompletedPayload {
  message_id: string;
  role: "user" | "assistant" | "system" | string;
  parts: CoworkMessagePart[];
}

export interface PlanUpdatedPayload {
  revision: number;
  steps: PlanStep[];
}

export interface ToolStartedPayload {
  tool_call_id: string;
  name: string;
  safe_label: string;
  args_redacted: Record<string, unknown>;
}

export interface ToolOutputPayload {
  tool_call_id: string;
  chunk_seq: number;
  stream: "stdout" | "stderr" | "metadata";
  text_delta: string;
}

export interface ToolCompletedPayload {
  tool_call_id: string;
  result_summary: string;
  exit_code: number;
  duration_ms: number;
  output_ref?: string;
}

export interface ToolFailedPayload {
  tool_call_id: string;
  error_code: string;
  safe_message: string;
  retryable: boolean;
  duration_ms?: number;
}

export interface FileChangedPayload {
  path: string;
  diff_ref?: string;
  diff?: string;
  operation: "create" | "update" | "delete" | "created" | "modified" | "deleted";
  bytes_changed: number;
}

export interface ApprovalRequiredPayload {
  approval_id: string;
  action_digest: string;
  tool_call_id?: string;
  tool_name?: string;
  summary: string;
  risk: RiskLevel;
  expiry?: string;
  expiry_ts?: string;
  args_redacted?: Record<string, unknown>;
}

export interface ApprovalResolvedPayload {
  approval_id: string;
  decision: "allow_once" | "deny";
  actor_id: string;
  resolved_at?: string;
  action_digest?: string;
}

export interface RunCompletedPayload {
  result_message_id?: string;
  verification_summary?: string;
  total_duration_ms?: number;
  duration_ms?: number;
}

export interface RunFailedPayload {
  safe_error: string;
  diagnostics_ref?: string;
  fatal?: boolean;
}

export interface RunCancelledPayload {
  reason: string;
  cleanup_status: "completed" | "in_progress" | "failed" | "cleaned" | "partial";
}

export interface HeartbeatPayload {
  server_time?: string;
  ts?: string;
}

export interface CoworkEventPayloadMap {
  "run.queued": RunQueuedPayload;
  "run.started": RunStartedPayload;
  "run.status": RunStatusPayload;
  "message.started": MessageStartedPayload;
  "message.delta": MessageDeltaPayload;
  "message.completed": MessageCompletedPayload;
  "plan.updated": PlanUpdatedPayload;
  "tool.started": ToolStartedPayload;
  "tool.output": ToolOutputPayload;
  "tool.completed": ToolCompletedPayload;
  "tool.failed": ToolFailedPayload;
  "file.changed": FileChangedPayload;
  "approval.required": ApprovalRequiredPayload;
  "approval.resolved": ApprovalResolvedPayload;
  "run.completed": RunCompletedPayload;
  "run.failed": RunFailedPayload;
  "run.cancelled": RunCancelledPayload;
  "heartbeat": HeartbeatPayload;
}

// ============================================================================
// 5. Universal Event Envelope
// ============================================================================

export interface CoworkEventEnvelope<
  T extends CoworkEventType = CoworkEventType,
  P = CoworkEventPayloadMap[T]
> {
  event_id: string;
  run_id: string;
  conversation_id: string;
  seq: number;
  type: T;
  ts: string;
  payload: P;
}

// ============================================================================
// 6. Domain Data Models
// ============================================================================

export interface CoworkConversation {
  id: string;
  owner_id?: string;
  workspace_id?: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface CoworkRun {
  id: string;
  conversation_id: string;
  workspace_id?: string;
  mode: CoworkMode;
  status: CoworkRunStatus;
  prompt: string;
  model_id?: string;
  engine_version?: string;
  idempotency_key?: string;
  seq_counter: number;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  error?: string;
}

export interface CoworkApprovalRequest {
  id: string;
  approval_id?: string;
  run_id: string;
  conversation_id?: string;
  tool_call_id: string;
  tool_name: string;
  args?: Record<string, unknown>;
  args_redacted?: Record<string, unknown>;
  action_digest: string;
  workspace_id?: string;
  risk: RiskLevel;
  summary: string;
  status: "pending" | "allowed" | "approved" | "denied" | "expired";
  requested_at?: string;
  expires_at: string;
  expiry_ts?: string;
  created_at?: string;
  decided_at?: string;
  decided_by?: string;
  decision?: "allow_once" | "deny";
}

export interface CoworkAuditRecord {
  id: string;
  actor_id: string;
  run_id: string;
  conversation_id?: string;
  action: string;
  resource: string;
  result: "success" | "denied" | "failure" | "blocked" | "allowed" | "executed";
  details?: Record<string, unknown>;
  timestamp: string;
}

// ============================================================================
// 7. Storage Interface Contract
// ============================================================================

export interface ICoworkStorage {
  createConversation(
    title?: string,
    workspace_id?: string,
    owner_id?: string
  ): Promise<CoworkConversation>;
  getConversation(conversation_id: string): Promise<CoworkConversation | null>;
  createRun(params: {
    conversation_id: string;
    mode: CoworkMode;
    prompt: string;
    workspace_id?: string;
    model_id?: string;
    engine_version?: string;
    idempotency_key?: string;
  }): Promise<CoworkRun>;
  getRun(run_id: string): Promise<CoworkRun | null>;
  getRunByIdempotencyKey?(
    key: string,
    conversation_id?: string
  ): Promise<CoworkRun | null>;
  updateRunStatus(
    run_id: string,
    status: CoworkRunStatus,
    error?: string
  ): Promise<void>;
  appendEvent(
    event: Omit<CoworkEventEnvelope, "seq"> & { seq?: number }
  ): Promise<CoworkEventEnvelope>;
  getEvents(run_id: string, after_seq?: number): Promise<CoworkEventEnvelope[]>;
  createApproval(
    approval:
      | CoworkApprovalRequest
      | (Omit<CoworkApprovalRequest, "id" | "status" | "expires_at"> & {
          id?: string;
          status?: CoworkApprovalRequest["status"];
          expires_at?: string;
        })
  ): Promise<CoworkApprovalRequest>;
  getApproval(approval_id: string): Promise<CoworkApprovalRequest | null>;
  resolveApproval(
    approval_id: string,
    decision: "allow_once" | "deny",
    action_digest: string,
    actor_id?: string
  ): Promise<boolean>;
  recordAudit(
    record:
      | CoworkAuditRecord
      | (Omit<CoworkAuditRecord, "id" | "timestamp"> & {
          id?: string;
          timestamp?: string;
        })
  ): Promise<CoworkAuditRecord>;
  queryAudit?(filter: {
    run_id?: string;
    actor_id?: string;
    action?: string;
    limit?: number;
  }): Promise<CoworkAuditRecord[]>;
}

// ============================================================================
// 8. Sandbox & Execution Layer Types (Milestone 2)
// ============================================================================

export interface ExecOptions {
  timeout_ms?: number;
  cwd?: string;
  env?: Record<string, string>;
}

export interface ExecResult {
  stdout: string;
  stderr: string;
  exit_code: number;
  duration_ms: number;
}

export interface ReadFileOptions {
  startLine?: number;
  endLine?: number;
}

export interface ReadFileResult {
  content: string;
  bytes: number;
}

export interface WriteFileResult {
  bytes_written: number;
  diff: string;
}

export interface EditFileResult {
  bytes_written: number;
  diff: string;
}

export interface SearchOptions {
  path?: string;
  filePattern?: string;
}

export interface SearchResult {
  file: string;
  line: number;
  content: string;
}

export interface VMStatusMetrics {
  cpu_usage_pct: number;
  memory_used_bytes: number;
  memory_total_bytes: number;
  uptime_seconds: number;
  load_average: number[];
  disk_used_bytes: number;
  disk_total_bytes: number;
}

export interface ISandboxBroker {
  exec(command: string, options?: ExecOptions): Promise<ExecResult>;
  readFile(path: string, options?: ReadFileOptions): Promise<ReadFileResult>;
  writeFile(path: string, content: string): Promise<WriteFileResult>;
  editFile(path: string, target: string, replacement: string): Promise<EditFileResult>;
  searchCode(query: string, options?: SearchOptions): Promise<SearchResult[]>;
  getVMStatus(): Promise<VMStatusMetrics>;
  createCheckpoint(): Promise<string>;
}

export interface ToolExecutionResult {
  output: string;
  exit_code: number;
  is_error: boolean;
  duration_ms: number;
  diff?: string;
  metadata?: Record<string, unknown>;
}

export interface CanonicalToolParameter {
  type: string;
  description: string;
  enum?: string[];
}

export interface CanonicalToolDefinition {
  name: string;
  description: string;
  permission: PermissionTier;
  risk: RiskLevel;
  timeout_ms?: number;
  parameters: {
    type: "object";
    properties: Record<string, CanonicalToolParameter>;
    required?: string[];
  };
}

