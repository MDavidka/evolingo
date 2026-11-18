/**
 * Server-Sent Events (SSE) consumer for Avalingo / Evolingo Cowork Agentic Compatibility.
 * Connects to GET /api/cowork/runs/:id/events and validates strictly monotonic streaming.
 */

import { EventEmitter } from "node:events";
import { assertEnvelopeValid, assertMonotonic, AssertionError } from "./assert.mjs";

export class SseConsumer extends EventEmitter {
  /**
   * @param {string} runId - Target run ID
   * @param {object} [options]
   * @param {string} [options.baseUrl] - API host (default http://127.0.0.1:28500)
   * @param {number} [options.afterSeq] - Resume after this sequence number (?after_seq=)
   * @param {number|string} [options.lastEventId] - Resume via Last-Event-ID header
   * @param {Record<string, string>} [options.headers] - Additional HTTP headers
   * @param {boolean} [options.autoValidateEnvelopes=true] - Validate each event as it arrives
   * @param {boolean} [options.autoValidateMonotonic=true] - Validate monotonic seq order on arrival
   */
  constructor(runId, options = {}) {
    super();
    if (!runId) throw new Error("runId is required for SseConsumer");

    this.runId = runId;
    this.baseUrl = (
      options.baseUrl ||
      process.env.COWORK_API_URL ||
      "http://127.0.0.1:28500"
    ).replace(/\/+$/, "");
    this.afterSeq = options.afterSeq !== undefined ? options.afterSeq : null;
    this.lastEventId = options.lastEventId !== undefined ? options.lastEventId : null;
    this.headers = options.headers || {};
    this.autoValidateEnvelopes = options.autoValidateEnvelopes !== false;
    this.autoValidateMonotonic = options.autoValidateMonotonic !== false;

    this.events = [];
    this.rawComments = [];
    this.isConnected = false;
    this.isAborted = false;
    this.abortController = null;
    this.streamPromise = null;
    this.connectionError = null;
  }

  /**
   * Connect to the SSE stream.
   * @returns {Promise<void>} Resolves when connection is established and headers received.
   */
  async connect() {
    if (this.isConnected) return;
    this.isAborted = false;

    let url = `${this.baseUrl}/api/cowork/runs/${encodeURIComponent(this.runId)}/events`;
    if (this.afterSeq !== null) {
      url += `?after_seq=${encodeURIComponent(this.afterSeq)}`;
    }

    const headers = {
      Accept: "text/event-stream",
      "Cache-Control": "no-cache",
      ...this.headers,
    };

    if (this.lastEventId !== null) {
      headers["Last-Event-ID"] = String(this.lastEventId);
    }

    this.abortController = new AbortController();

    try {
      const response = await fetch(url, {
        method: "GET",
        headers,
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`SSE stream failed HTTP ${response.status} ${response.statusText}: ${errorText}`);
      }

      this.isConnected = true;
      this.emit("connected", { status: response.status, headers: response.headers });

      // Start asynchronous read loop
      this.streamPromise = this._readStream(response.body);
    } catch (err) {
      this.connectionError = err;
      this.emit("error", err);
      throw err;
    }
  }

  /**
   * Internal reader loop processing chunks from ReadableStream.
   */
  async _readStream(readableStream) {
    if (!readableStream) return;
    const reader = readableStream.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    try {
      while (this.isConnected) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Hardening: Normalize \r\n to \n to guard against reverse proxies injecting CRLF.
        // Preserve trailing \r across chunk boundaries.
        let trailingCr = false;
        let processable = buffer;
        if (processable.endsWith("\r")) {
          trailingCr = true;
          processable = processable.slice(0, -1);
        }
        buffer = processable.replace(/\r\n/g, "\n") + (trailingCr ? "\r" : "");

        // SSE messages are delimited by double newlines (\n\n)
        let delimiterIndex;
        while ((delimiterIndex = buffer.indexOf("\n\n")) !== -1) {
          const rawBlock = buffer.slice(0, delimiterIndex);
          buffer = buffer.slice(delimiterIndex + 2);
          this._processSseBlock(rawBlock);
        }
      }
    } catch (err) {
      // Defect 5: Check this.isAborted and err.name to prevent unhandled AbortError
      const isAbort =
        this.isAborted ||
        err?.name === "AbortError" ||
        err?.code === "ABORT_ERR" ||
        Boolean(this.abortController?.signal?.aborted);
      if (!isAbort) {
        this.emit("error", err);
      }
    } finally {
      this.isConnected = false;
      this.emit("disconnected");
      try {
        reader.releaseLock();
      } catch {
        // Ignore release errors on abort
      }
    }
  }

  /**
   * Process a single SSE chunk block.
   */
  _processSseBlock(block) {
    if (!block || block.trim().length === 0) return;

    const lines = block.split(/\r?\n/);
    let id = null;
    let eventType = null;
    const dataLines = [];

    for (const line of lines) {
      if (line.startsWith(":")) {
        // SSE comment, e.g. ": heartbeat"
        const comment = line.slice(1).trim();
        this.rawComments.push(comment);
        this.emit("comment", comment);
        continue;
      }

      const colonIdx = line.indexOf(":");
      if (colonIdx === -1) continue;

      const field = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).replace(/^\s/, "");

      if (field === "id") {
        id = value;
      } else if (field === "event") {
        eventType = value;
      } else if (field === "data") {
        dataLines.push(value);
      }
    }

    if (dataLines.length === 0) return;

    const rawData = dataLines.join("\n");
    let parsedEnvelope = null;

    try {
      parsedEnvelope = JSON.parse(rawData);
    } catch (parseErr) {
      this.emit("malformed", { rawData, error: parseErr });
      return;
    }

    if (this.autoValidateEnvelopes) {
      assertEnvelopeValid(parsedEnvelope, this.runId);
    }

    if (this.autoValidateMonotonic && this.events.length > 0) {
      const lastSeq = this.events[this.events.length - 1].seq;
      if (parsedEnvelope.seq <= lastSeq) {
        const violation = new AssertionError(
          `SSE sequence violation: incoming seq ${parsedEnvelope.seq} <= previous seq ${lastSeq}`,
          parsedEnvelope.seq,
          lastSeq + 1
        );
        this.emit("error", violation);
        throw violation;
      }
    }

    this.events.push(parsedEnvelope);
    this.emit("event", parsedEnvelope);
    if (eventType) {
      this.emit(eventType, parsedEnvelope);
    }
  }

  /**
   * Wait for an event matching a specific type or custom predicate.
   *
   * @param {string|Function} typeOrPredicate - Type name (e.g. 'run.completed') or function (evt) => boolean.
   * @param {number} [timeoutMs=15000] - Timeout in milliseconds.
   * @param {number} [startIndex=0] - Only consider events received at or after this index.
   * @returns {Promise<object>} The matching event envelope.
   */
  async waitForEvent(typeOrPredicate, timeoutMs = 15000, startIndex = 0) {
    const predicate = typeof typeOrPredicate === "function"
      ? typeOrPredicate
      : (evt) => evt.type === typeOrPredicate;

    // Check already collected events starting from startIndex
    for (let i = startIndex; i < this.events.length; i++) {
      if (predicate(this.events[i])) {
        return this.events[i];
      }
    }

    // Wait for incoming matching event
    return new Promise((resolve, reject) => {
      let timeoutHandle = null;

      const onEvent = (evt) => {
        try {
          if (predicate(evt)) {
            cleanup();
            resolve(evt);
          }
        } catch (err) {
          cleanup();
          reject(err);
        }
      };

      const onError = (err) => {
        cleanup();
        reject(err);
      };

      const cleanup = () => {
        if (timeoutHandle) clearTimeout(timeoutHandle);
        this.removeListener("event", onEvent);
        this.removeListener("error", onError);
      };

      timeoutHandle = setTimeout(() => {
        cleanup();
        const predicateDesc = typeof typeOrPredicate === "function"
          ? "custom predicate"
          : `type "${typeOrPredicate}"`;
        reject(new Error(`Timed out after ${timeoutMs}ms waiting for event matching ${predicateDesc}. Received ${this.events.length} events.`));
      }, timeoutMs);

      this.on("event", onEvent);
      this.on("error", onError);
    });
  }

  /**
   * Collect events for a given duration in milliseconds.
   *
   * @param {number} durationMs - Duration to listen for events.
   * @returns {Promise<object[]>} Array of events collected during this period.
   */
  async collectEvents(durationMs = 3000) {
    const initialCount = this.events.length;
    await new Promise((resolve) => setTimeout(resolve, durationMs));
    return this.events.slice(initialCount);
  }

  /**
   * Disconnect cleanly from the SSE stream.
   */
  disconnect() {
    this.isConnected = false;
    this.isAborted = true;
    if (this.abortController) {
      try {
        this.abortController.abort();
      } catch {
        // Ignore abort exception
      }
      this.abortController = null;
    }
  }

  /**
   * Returns a copy of all events received so far.
   */
  getEvents() {
    return [...this.events];
  }

  /**
   * Asserts that all events captured by this consumer strictly conform to monotonic ordering.
   */
  assertMonotonicSequence(strictContiguous = false) {
    assertMonotonic(this.events, { strictContiguous });
  }
}

export default SseConsumer;
