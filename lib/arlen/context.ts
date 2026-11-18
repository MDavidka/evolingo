export type ContextCategory = 'session' | 'user' | 'project' | 'execution'
export type ContextRecord = {
  id: string; ownerId: string; category: ContextCategory; text: string;
  sessionId?: string; projectId?: string; runId?: string; consent?: boolean;
}
export type ContextScope = { ownerId: string; sessionId: string; projectId?: string; runId?: string }

/** A bounded selector over already-retrieved records. Never accepts cross-scope memory. */
export function selectContext(records: readonly ContextRecord[], scope: ContextScope, query: string, maxChars = 12000) {
  if (!Number.isSafeInteger(maxChars) || maxChars < 0 || maxChars > 32000) throw new Error('Invalid context budget')
  const terms = new Set(query.toLocaleLowerCase().match(/[\p{L}\p{N}_]{2,}/gu) || [])
  const permitted = records.filter(r => {
    if (r.ownerId !== scope.ownerId) return false
    switch (r.category) {
      case 'session': return r.sessionId === scope.sessionId
      case 'user': return r.consent === true
      case 'project': return !!scope.projectId && r.projectId === scope.projectId
      case 'execution': return !!scope.runId && r.runId === scope.runId && r.sessionId === scope.sessionId
      default: return false
    }
  }).map((record, index) => ({ record, index, score: [...terms].filter(t => record.text.toLocaleLowerCase().includes(t)).length }))
    .filter(r => r.record.category === 'session' || r.record.category === 'execution' || r.score > 0)
    .sort((a, b) => b.score - a.score || b.index - a.index)
  let used = 0
  return permitted.flatMap(({ record }) => {
    if (used + record.text.length > maxChars) return []
    used += record.text.length
    return [record]
  })
}
