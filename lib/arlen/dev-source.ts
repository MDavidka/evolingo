import { createProject, sources } from '../myspace/projects/schema.ts'
import { ARLEN_COMPONENT_CATALOG } from '../myspace/ui-library.ts'

/** Validate declared source and component references; does not claim compilation or runtime success. */
export function validateDevSource(output: unknown, existingFiles?: Record<string, string>) {
  if (!output || typeof output !== 'object' || Array.isArray(output)) throw new Error('Expected generated project')
  const candidate = output as Record<string, unknown>
  const files = sources.parse(candidate.files)
  if (typeof files['src/app.ui.json'] !== 'string') throw new Error('UI manifest required')
  const manifest = JSON.parse(files['src/app.ui.json'])
  if (manifest?.schema !== 'arlen-app/v1' || typeof manifest.title !== 'string' || !manifest.title.trim()
    || !Array.isArray(manifest.nodes) || !manifest.nodes.length) throw new Error('Invalid UI manifest')
  let count = 0
  function visit(nodes: unknown[], depth: number) {
    if (depth > 12) throw new Error('Component tree too deep')
    for (const value of nodes) {
      if (++count > 200 || !value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid component tree')
      const node = value as Record<string, unknown>
      if (typeof node.type !== 'string' || !Object.hasOwn(ARLEN_COMPONENT_CATALOG, node.type)) throw new Error('Unknown component')
      const definition = ARLEN_COMPONENT_CATALOG[node.type as keyof typeof ARLEN_COMPONENT_CATALOG]
      if (node.variant !== undefined && (typeof node.variant !== 'string' || !definition.variants.includes(node.variant))) throw new Error('Unknown component variant')
      if (node.action !== undefined) {
        if (!node.action || typeof node.action !== 'object' || Array.isArray(node.action)) throw new Error('Invalid action')
        const action = node.action as Record<string, unknown>
        if (!['increment', 'decrement', 'toggle', 'append', 'reset'].includes(String(action.type))) throw new Error('Unsupported generated action')
        if (['increment', 'decrement', 'toggle'].includes(String(action.type)) && typeof action.key !== 'string') throw new Error('Action requires state key')
        if (action.type === 'append' && typeof action.listKey !== 'string') throw new Error('Append requires list key')
      }
      if (node.children !== undefined) {
        if (!Array.isArray(node.children)) throw new Error('Invalid children')
        visit(node.children, depth + 1)
      }
    }
  }
  visit(manifest.nodes, 0)
  return createProject.parse({ ...candidate, files: { ...existingFiles, ...files } })
}
