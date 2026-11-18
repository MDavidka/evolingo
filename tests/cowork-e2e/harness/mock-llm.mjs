/**
 * Mock LLM Provider Proxy for E2E Resiliency & Failover Testing.
 * Avalingo / Evolingo Cowork Agentic Compatibility Framework
 *
 * Spawns an ephemeral HTTP server on localhost to simulate upstream LLM providers,
 * HTTP 429 rate limits, exponential backoff timing, and provider failover.
 */

import http from "node:http";

export class MockLlmProxy {
  constructor() {
    this.server = null;
    this.port = 0;
    this.url = "";
    this.requests = [];
    this.handlers = [];
  }

  /**
   * Start mock proxy on an OS-assigned ephemeral port.
   * @returns {Promise<MockLlmProxy>}
   */
  async start() {
    this.server = http.createServer(async (req, res) => {
      let rawBody = "";
      for await (const chunk of req) {
        rawBody += chunk;
      }
      let jsonBody = null;
      try {
        jsonBody = rawBody ? JSON.parse(rawBody) : null;
      } catch {
        jsonBody = rawBody;
      }

      const record = {
        time: Date.now(),
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: jsonBody,
      };
      this.requests.push(record);

      const handler = this.handlers.shift();
      if (handler) {
        handler(req, res, record);
      } else {
        // Default response: 200 OK assistant message
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            id: `mock-${Date.now()}`,
            choices: [
              {
                message: {
                  role: "assistant",
                  content: "Default mock completion response",
                },
              },
            ],
          })
        );
      }
    });

    await new Promise((resolve) => this.server.listen(0, "127.0.0.1", resolve));
    this.port = this.server.address().port;
    this.url = `http://127.0.0.1:${this.port}/v1/chat/completions`;
    return this;
  }

  /**
   * Queue a custom HTTP response.
   */
  enqueueResponse(statusCode, data, delayMs = 0) {
    this.handlers.push((req, res) => {
      setTimeout(() => {
        res.writeHead(statusCode, { "Content-Type": "application/json" });
        res.end(typeof data === "string" ? data : JSON.stringify(data));
      }, delayMs);
    });
  }

  /**
   * Queue an HTTP 429 Rate Limit response.
   */
  enqueueRateLimit(retryAfterSec = 1) {
    this.enqueueResponse(429, {
      error: {
        message: "Rate limit exceeded (429). Please retry later.",
        type: "requests_rate_limit",
        code: 429,
        retry_after: retryAfterSec,
      },
    });
  }

  /**
   * Queue an OpenAI-compatible tool call response.
   */
  enqueueToolCall(toolName, args, toolCallId = `call_${Date.now()}`) {
    this.enqueueResponse(200, {
      id: `mock-${Date.now()}`,
      choices: [
        {
          message: {
            role: "assistant",
            content: null,
            tool_calls: [
              {
                id: toolCallId,
                type: "function",
                function: {
                  name: toolName,
                  arguments: typeof args === "string" ? args : JSON.stringify(args),
                },
              },
            ],
          },
        },
      ],
    });
  }

  /**
   * Queue a standard assistant completion message.
   */
  enqueueCompletion(content) {
    this.enqueueResponse(200, {
      id: `mock-${Date.now()}`,
      choices: [
        {
          message: {
            role: "assistant",
            content,
          },
        },
      ],
    });
  }

  /**
   * Terminate the mock server and clean up sockets.
   */
  async stop() {
    if (this.server) {
      await new Promise((resolve) => this.server.close(resolve));
      this.server = null;
    }
  }
}

export default MockLlmProxy;
