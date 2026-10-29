/**
 * The SVG artwork in /public/icons/tasks is from the user's provided
 * Evölingo task icon pack (6 kinds × completed/incomplete).
 *
 * Completed = orange; incomplete (locked or available) = gray.
 * Keep unlock logic separate from the purely visual completion state.
 */
export type PathTileKind = "task" | "conversation" | "writing" | "flashcards" | "lesson" | "hard-task"
export type PathTileState = "completed" | "incomplete"
const filenames: Record<PathTileKind, string> = {
  task: "task",
  conversation: "conversation",
  writing: "writing",
  flashcards: "flashcards",
  lesson: "lesson",
  "hard-task": "hard-task",
}
export default function PathTile({
  kind, completed, size=88,
}: {
  kind: PathTileKind
  completed: boolean
  size?: number
}) {
  const state: PathTileState = completed ? "completed" : "incomplete"
  return <img
    className="evo-path-svg-tile"
    src={`/icons/tasks/${filenames[kind]}-${state}.svg`}
    alt=""
    aria-hidden="true"
    width={size}
    height={size}
    loading="lazy"
    decoding="async"
    draggable={false}
  />
}
