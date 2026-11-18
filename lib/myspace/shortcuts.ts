export const shortcutIcons=['notes','checklist','terminal','chart','code'] as const
export type ShortcutIcon=typeof shortcutIcons[number]
export function validateOrder(value:unknown):value is string[]{return Array.isArray(value)&&value.length<=50&&value.every(id=>typeof id==='string'&&['notes','focus-board','api-inspector'].includes(id))&&new Set(value).size===value.length}
export function samePinnedSet(order:string[],pinned:string[]){return order.length===pinned.length&&pinned.every(id=>order.includes(id))}
