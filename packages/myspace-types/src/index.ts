export const SDK_VERSION='1.0.0'
export const PERMISSIONS=['storage:app','clipboard:write','notifications:local','network:approved','connection:ssh','files:app','files:user-selected'] as const
export type Permission=typeof PERMISSIONS[number]
export type Manifest={schemaVersion:'1.0';id:string;name:string;slug:string;version:string;description:string;category:'productivity'|'developer'|'utilities'|'education'|'planning'|'analytics'|'automation'|'ai';entry:string;icon:'notes'|'checklist'|'terminal'|'chart'|'code';sdkVersion:'1.0.0';permissions:Permission[];navigation:{sidebarEligible:boolean};visibility:'private'}
export function validateManifest(value:unknown):Manifest{
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Manifest must be an object')
 const m=value as Record<string,unknown>
 const keys=['schemaVersion','id','name','slug','version','description','category','entry','icon','sdkVersion','permissions','navigation','visibility']
 if(Object.keys(m).length!==keys.length||Object.keys(m).some(k=>!keys.includes(k)))throw Error('Unexpected or missing manifest fields')
 if(m.schemaVersion!=='1.0'||m.sdkVersion!==SDK_VERSION||m.visibility!=='private')throw Error('Unsupported schema, SDK or visibility')
 for(const k of ['id','slug'])if(typeof m[k]!=='string'||! /^[a-z][a-z0-9-]{1,63}$/.test(m[k] as string))throw Error('Invalid '+k)
 for(const[k,max]of[['name',48],['description',240]]as const)if(typeof m[k]!=='string'||!(m[k] as string).trim()||(m[k] as string).length>max)throw Error('Invalid '+k)
 if(typeof m.version!=='string'||!/^\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(m.version))throw Error('Invalid version')
 if(typeof m.entry!=='string'||!/^src\/[a-zA-Z0-9/_-]+\.tsx$/.test(m.entry)||m.entry.includes('..'))throw Error('Invalid entry')
 if(!['productivity','developer','utilities','education','planning','analytics','automation','ai'].includes(String(m.category)))throw Error('Invalid category')
 if(!['notes','checklist','terminal','chart','code'].includes(String(m.icon)))throw Error('Invalid icon')
 if(!Array.isArray(m.permissions)||m.permissions.length>7||new Set(m.permissions).size!==m.permissions.length||m.permissions.some(p=>!PERMISSIONS.includes(p)))throw Error('Invalid permissions')
 const n=m.navigation as Record<string,unknown>
 if(!n||Array.isArray(n)||Object.keys(n).length!==1||typeof n.sidebarEligible!=='boolean')throw Error('Invalid navigation')
 return m as Manifest
}
export const ERROR_CODES=['PERMISSION_DENIED','UNAUTHORIZED','RESOURCE_NOT_FOUND','QUOTA_EXCEEDED','NETWORK_UNAVAILABLE','INVALID_REQUEST','TIMEOUT','UNSUPPORTED_OPERATION'] as const
export type ErrorCode=typeof ERROR_CODES[number]
