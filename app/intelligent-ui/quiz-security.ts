/**
 * Server-only self-practice quiz tickets.
 * Encrypting (not encoding or signing plaintext) prevents the correct answer
 * appearing in the initial client JSON, React props, or sessionStorage.
 *
 * Does NOT award official lesson scores or mutate any student records.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto"
import type { QuizChoiceBlock, PublicQuizChoiceBlock } from "./schema.ts"
import { validateIntelligentUI } from "./schema.ts"

const VERSION = 1
const LIFETIME_MS = 72 * 60 * 60 * 1000
const MAX_TICKET = 2700

type PrivateRecord = {
  id: string
  question: string
  choices: string[]
  correctIndex: number
  explanation: string
  issuedAt: number
  expiresAt: number
}

export type QuizGrade = {
  correct: boolean
  selectedIndex: number
  correctIndex: number
  explanation: string
}

/** Derived under a separate domain label; a dedicated secret is preferred.
 * Existing NVIDIA credentials provide a stable fallback for projects not yet
 * configured with EVO_VISUAL_QUIZ_SECRET.
 */
function encryptionKey(): Buffer {
  const secret = process.env.EVO_VISUAL_QUIZ_SECRET?.trim() ||
    process.env.EVO_AI?.trim() || process.env.EVO_Ai?.trim()
  if (!secret || secret.length < 16) throw new Error("A kvíz ellenőrzése nincs beállítva.")
  return createHash("sha256").update("evolingo-quiz-aes-256-gcm:v1:", "utf8").update(secret).digest()
}

function asRecord(value: unknown): PrivateRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const item = value as Record<string, unknown>
  if (
    typeof item.id !== "string" ||
    typeof item.question !== "string" ||
    !Array.isArray(item.choices) ||
    typeof item.correctIndex !== "number" ||
    typeof item.explanation !== "string" ||
    typeof item.issuedAt !== "number" ||
    typeof item.expiresAt !== "number"
  ) return null
  const verified = validateIntelligentUI({
    version: "1",
    blocks: [{ id: item.id, type: "quiz_choice",
      props: { question: item.question, choices: item.choices, correctIndex: item.correctIndex, explanation: item.explanation } }],
  })
  if (!verified || !Number.isSafeInteger(item.issuedAt) || !Number.isSafeInteger(item.expiresAt)) return null
  return item as PrivateRecord
}

export function issueQuizTicket(block: QuizChoiceBlock, now = Date.now()): PublicQuizChoiceBlock {
  if (!validateIntelligentUI({ version: "1", blocks: [block] }))
    throw new Error("Érvénytelen kvízleírás.")
  const payload: PrivateRecord = {
    id: block.id,
    question: block.props.question,
    choices: block.props.choices,
    correctIndex: block.props.correctIndex,
    explanation: block.props.explanation,
    issuedAt: now,
    expiresAt: now + LIFETIME_MS,
  }
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()])
  const token = Buffer.concat([Buffer.from([VERSION]), iv, cipher.getAuthTag(), ciphertext]).toString("base64url")
  if (token.length > MAX_TICKET) throw new Error("A kvízkártya túl hosszú.")
  return { id: block.id, type: "quiz_choice", props: {
    question: block.props.question, choices: [...block.props.choices], ticket: token,
  } }
}

export function gradeQuizTicket(token: unknown, selectedIndex: unknown, now = Date.now()): QuizGrade {
  if (typeof token !== "string" || token.length > MAX_TICKET || !/^[A-Za-z0-9_-]{80,2700}$/.test(token))
    throw new Error("Érvénytelen kvízazonosító.")
  if (typeof selectedIndex !== "number" || !Number.isInteger(selectedIndex))
    throw new Error("Érvénytelen válasz.")
  try {
    const data = Buffer.from(token, "base64url")
    if (data.length < 38 || data[0] !== VERSION) throw new Error("Invalid ticket version")
    const iv = data.subarray(1, 13)
    const tag = data.subarray(13, 29)
    const encrypted = data.subarray(29)
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv)
    decipher.setAuthTag(tag)
    const plaintext = Buffer.concat([decipher.update(encrypted), decipher.final()])
    const record = asRecord(JSON.parse(plaintext.toString("utf8")))
    if (!record) throw new Error("Invalid ticket payload")
    if (record.issuedAt > now + 60_000 || record.expiresAt < now || record.expiresAt - record.issuedAt > LIFETIME_MS)
      throw new Error("Quiz ticket expired")
    if (selectedIndex < 0 || selectedIndex >= record.choices.length)
      throw new Error("Index outside choices")
    return {
      correct: selectedIndex === record.correctIndex,
      selectedIndex,
      correctIndex: record.correctIndex,
      explanation: record.explanation,
    }
  } catch {
    throw new Error("A kvíz lejárt vagy érvénytelen. Kérj új gyakorlókérdést.")
  }
}
