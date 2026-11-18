import { z } from 'zod'

const toolSearchResultSchema = z.object({
  id: z.string().min(1).max(64),
  title: z.string().min(1).max(300),
  url: z.string().url().max(2048),
  domain: z.string().min(1).max(160),
  faviconUrl: z.string().url().max(512).optional(),
  snippet: z.string().max(1200),
  pageExcerpt: z.string().max(2400).optional(),
  publishedAt: z.string().max(80).optional(),
  retrievedAt: z.string().datetime(),
  source: z.string().min(1).max(120),
  verifiedPage: z.boolean().optional(),
})

export const chatPayload = z.discriminatedUnion('type', [
  z.object({ type: z.literal('delta'), delta: z.string().max(30000) }).strict(),
  z.object({ type: z.literal('text'), reply: z.string().max(30000) }).strict(),
  z.object({ type: z.literal('error'), error: z.string().max(1000) }).strict(),
  z.object({ type: z.literal('done') }).strict(),
  z.object({
    type: z.literal('tool.started'),
    executionId: z.string().min(1).max(64),
    tool: z.string().min(1).max(64),
    status: z.enum(['pending', 'searching', 'reviewing', 'reading', 'preparing']),
    title: z.string().min(1).max(160),
    query: z.string().min(1).max(240),
    queries: z.array(z.string().max(240)).max(6).optional(),
  }).strict(),
  z.object({
    type: z.literal('tool.step.started'),
    executionId: z.string().min(1).max(64),
    tool: z.string().min(1).max(64),
    stepId: z.string().min(1).max(64),
    status: z.enum(['pending', 'searching', 'reviewing', 'reading', 'preparing']),
    label: z.string().min(1).max(240),
    query: z.string().max(240).optional(),
  }).strict(),
  z.object({
    type: z.literal('tool.step.completed'),
    executionId: z.string().min(1).max(64),
    tool: z.string().min(1).max(64),
    stepId: z.string().min(1).max(64),
    status: z.literal('completed'),
    label: z.string().min(1).max(240),
  }).strict(),
  z.object({
    type: z.literal('tool.results'),
    executionId: z.string().min(1).max(64),
    tool: z.string().min(1).max(64),
    query: z.string().min(1).max(240),
    queries: z.array(z.string().max(240)).max(6),
    results: z.array(toolSearchResultSchema).max(15),
  }).strict(),
  z.object({
    type: z.literal('tool.completed'),
    executionId: z.string().min(1).max(64),
    tool: z.string().min(1).max(64),
    status: z.literal('completed'),
    summary: z.string().min(1).max(240),
    sourceCount: z.number().int().min(0).max(50),
    durationMs: z.number().int().min(0),
    query: z.string().min(1).max(240),
    queries: z.array(z.string().max(240)).max(6),
    results: z.array(toolSearchResultSchema).max(15),
  }).strict(),
  z.object({
    type: z.literal('tool.failed'),
    executionId: z.string().min(1).max(64),
    tool: z.string().min(1).max(64),
    status: z.literal('failed'),
    error: z.string().min(1).max(600),
    query: z.string().max(240),
  }).strict(),
  z.object({
    type: z.literal('tool.cancelled'),
    executionId: z.string().min(1).max(64),
    tool: z.string().min(1).max(64),
    status: z.literal('cancelled'),
    query: z.string().max(240),
  }).strict(),
])
export type ChatPayload = z.infer<typeof chatPayload>
export const chatEventSchema = z.object({
  version: z.literal('arlen.stream/v1'),
  eventId: z.string().uuid(),
  sessionId: z.string().uuid(),
  timestamp: z.string().datetime(),
  sequence: z.number().int().positive(),
  payload: chatPayload,
})

/** Chat is request-scoped. Durable Cowork events continue to use its persisted event store. */
export function chatEventWriter(sessionId: string) {
  z.string().uuid().parse(sessionId)
  let sequence = 0
  return (payload: ChatPayload) => {
    const event = chatEventSchema.parse({
      version: 'arlen.stream/v1',
      eventId: crypto.randomUUID(),
      sessionId,
      timestamp: new Date().toISOString(),
      sequence: ++sequence,
      payload,
    })
    // Legacy clients still read top-level type/delta/reply. New clients use the envelope.
    return `id: ${event.eventId}\ndata: ${JSON.stringify({ ...event, ...event.payload })}\n\n`
  }
}
