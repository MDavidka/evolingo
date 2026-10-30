import type { IntelligentBlock, IntelligentUI } from "./schema"

export type LessonOverviewItem = {
  id: number
  title: string
  summary: string
  read: boolean
  completed: boolean
}

/** Build visual lesson content from existing app state, not model guesses.
 * It can be reused by Erasmus, any other topic, or the all-lessons view.
 */
export function buildLessonOverview(lessons: LessonOverviewItem[], topicId = 0): IntelligentUI {
  if (!lessons.length) return { version: "1", blocks: [] }
  const finished = lessons.filter(lesson => lesson.completed).length
  const started = lessons.filter(lesson => lesson.read && !lesson.completed).length
  const waiting = lessons.length - finished - started
  const blocks: IntelligentBlock[] = [{
    id: "lesson-status",
    type: "chart_card",
    props: {
      title: "Leckék állapota",
      chartType: "donut",
      source: "verified",
      unit: "lecke",
      points: [
        { label: "Befejezett", value: finished },
        { label: "Elkezdett", value: started },
        { label: "Hátralévő", value: waiting },
      ],
    },
  }]
  const available = lessons.filter(lesson => lesson.title.trim() && lesson.summary.trim())
  if (available.length) {
    blocks.push({
      id: "lesson-review",
      type: "vocabulary_flashcard",
      props: {
        title: "Leckefogalmak áttekintése",
        cards: available.slice(0, 6).map(lesson => ({
          front: lesson.title.slice(0, 120),
          back: lesson.summary.slice(0, 180),
        })),
      },
    })
  }
  const distinct = available.filter((lesson, index, all) => all.findIndex(other => other.title === lesson.title) === index)
  if (distinct.length >= 3) {
    const correctIndex = Math.abs(topicId) % 3
    const choices = distinct.slice(1, 3).map(lesson => lesson.title.slice(0, 160))
    choices.splice(correctIndex, 0, distinct[0].title.slice(0, 160))
    blocks.push({
      id: "lesson-overview-quiz",
      type: "quiz_choice",
      props: {
        question: "Melyik leckéhez tartozik ez a leírás? " + distinct[0].summary.slice(0, 190),
        choices,
        correctIndex,
        explanation: "A megfelelő lecke: " + distinct[0].title.slice(0, 120),
      },
    })
  }
  return { version: "1", blocks }
}
