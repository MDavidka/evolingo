import{createHash}from'node:crypto'
export function networkScope(domains:readonly string[]){return createHash('sha256').update(JSON.stringify([...new Set(domains.map(d=>d.toLowerCase()))].sort())).digest('hex')}
export function networkGrantEffective(granted:unknown,approvedScope:unknown,currentScope:string){return granted===true&&approvedScope===currentScope}
