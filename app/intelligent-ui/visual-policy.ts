import type { IntelligentUI, QuizChoiceBlock } from "./schema"
import { validateIntelligentUI } from "./schema"
import { issueQuizTicket } from "./quiz-security"

/**
 * Server boundary: authored quizzes are converted into safe browser DTOs.
 * Never send correctIndex or explanation before an explicit quiz submission.
 */
export function projectVisualResponse(input: IntelligentUI): IntelligentUI | null {
  const validated = validateIntelligentUI(input)
  if (!validated) return null
  try {
    const blocks = validated.blocks.map(block =>
      block.type === "quiz_choice"
        ? issueQuizTicket(block as QuizChoiceBlock)
        : block,
    )
    const result: IntelligentUI = { version: "1", blocks }
    return validateIntelligentUI(result, { allowPublicQuizzes: true })
  } catch {
    // A failed secret or cipher should not hide an otherwise valid text answer.
    return null
  }
}
