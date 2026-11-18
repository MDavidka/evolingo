/**
 * REST API client for Avalingo / Evolingo Cowork Agentic Compatibility.
 * Interacts with Next.js App Router /api/cowork/* endpoints.
 */

export class HttpError extends Error {
  constructor(status, statusText, url, body) {
    super(`HTTP ${status} ${statusText} from ${url}: ${typeof body === "string" ? body : JSON.stringify(body)}`);
    this.name = "HttpError";
    this.status = status;
    this.statusText = statusText;
    this.url = url;
    this.body = body;
  }
}

export class CoworkClient {
  /**
   * @param {object} [options]
   * @param {string} [options.baseUrl] - Base URL (e.g. 'http://127.0.0.1:28500')
   * @param {Record<string, string>} [options.headers] - Default headers (e.g. auth)
   * @param {number} [options.timeoutMs] - Request timeout in ms (default 30000)
   */
  constructor(options = {}) {
    this.baseUrl = (
      options.baseUrl ||
      process.env.COWORK_API_URL ||
      "http://127.0.0.1:28500"
    ).replace(/\/+$/, "");
    this.defaultHeaders = {
      Accept: "application/json",
      ...options.headers,
    };
    this.timeoutMs = options.timeoutMs || 30000;
  }

  /**
   * Internal generic fetch request helper.
   */
  async request(path, options = {}) {
    const url = path.startsWith("http://") || path.startsWith("https://")
      ? path
      : `${this.baseUrl}${path.startsWith("/") ? "" : "/"}${path}`;

    const headers = {
      ...this.defaultHeaders,
      ...options.headers,
    };

    let body = options.body;
    if (body !== undefined && typeof body === "object" && !(body instanceof FormData) && !(body instanceof Blob) && !Buffer.isBuffer(body)) {
      headers["Content-Type"] = headers["Content-Type"] || "application/json";
      body = JSON.stringify(body);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs || this.timeoutMs);

    try {
      const response = await fetch(url, {
        method: options.method || "GET",
        headers,
        body,
        signal: controller.signal,
      });

      const contentType = response.headers.get("content-type") || "";
      let responseData = null;

      if (contentType.includes("application/json")) {
        try {
          responseData = await response.json();
        } catch {
          responseData = null;
        }
      } else {
        responseData = await response.text();
      }

      if (options.rawResponse) {
        return {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          data: responseData,
        };
      }

      if (!response.ok && !options.allowError) {
        throw new HttpError(response.status, response.statusText, url, responseData);
      }

      return responseData;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Create a new conversation.
   * POST /api/cowork/conversations
   */
  async createConversation(title = "E2E Test Conversation", workspace_id = "ws_default", options = {}) {
    return this.request("/api/cowork/conversations", {
      method: "POST",
      body: { title, workspace_id },
      ...options,
    });
  }

  /**
   * Get conversation by ID.
   * GET /api/cowork/conversations/:id
   */
  async getConversation(id, options = {}) {
    if (!id) throw new Error("Conversation ID is required");
    return this.request(`/api/cowork/conversations/${encodeURIComponent(id)}`, {
      method: "GET",
      ...options,
    });
  }

  /**
   * Create a run.
   * POST /api/cowork/runs (or /api/cowork/conversations/:conversation_id/runs)
   */
  async createRun(params, options = {}) {
    if (!params || typeof params !== "object") {
      throw new Error("Run params object is required");
    }

    const headers = { ...options.headers };
    if (params.idempotency_key) {
      headers["Idempotency-Key"] = params.idempotency_key;
    }
    if (params.provider_url) {
      headers["x-mock-provider-url"] = params.provider_url;
    }
    if (params.fallback_provider_url) {
      headers["x-fallback-provider-url"] = params.fallback_provider_url;
    }

    const payload = {
      conversation_id: params.conversation_id,
      mode: params.mode || "plan",
      prompt: params.prompt,
      workspace_id: params.workspace_id || "ws_default",
      provider_url: params.provider_url,
      fallback_provider_url: params.fallback_provider_url,
    };

    return this.request("/api/cowork/runs", {
      method: "POST",
      headers,
      body: payload,
      ...options,
    });
  }

  /**
   * Cancel an active run.
   * POST /api/cowork/runs/:id/cancel
   */
  async cancelRun(id, reason = "Cancelled by test runner", options = {}) {
    if (!id) throw new Error("Run ID is required");
    return this.request(`/api/cowork/runs/${encodeURIComponent(id)}/cancel`, {
      method: "POST",
      body: { reason },
      ...options,
    });
  }

  /**
   * Retrieve state snapshot for a run.
   * GET /api/cowork/runs/:id/snapshot
   */
  async getSnapshot(id, options = {}) {
    if (!id) throw new Error("Run ID is required");
    return this.request(`/api/cowork/runs/${encodeURIComponent(id)}/snapshot`, {
      method: "GET",
      ...options,
    });
  }

  /**
   * Submit an approval decision for a suspended risky operation.
   * POST /api/cowork/approvals/:id/decision
   */
  async sendApprovalDecision(id, decision, action_digest, options = {}) {
    if (!id) throw new Error("Approval ID is required");
    return this.request(`/api/cowork/approvals/${encodeURIComponent(id)}/decision`, {
      method: "POST",
      body: { decision, action_digest },
      ...options,
    });
  }

  /**
   * Inspect VM status.
   * GET /api/cowork/vm
   */
  async getVMStatus(options = {}) {
    return this.request("/api/cowork/vm", {
      method: "GET",
      ...options,
    });
  }
}

export default CoworkClient;
