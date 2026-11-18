import{shortcutIcons,validateOrder}from'./shortcuts.ts'
export type Installation = {appId:'notes'|'focus-board'|'api-inspector'; version:string; runtimeHistory?:{integrity:string;version:string;approvedAt:string}[];artifactIntegrity?:string;latestArtifactIntegrity?:string;artifactUpdateAvailable?:boolean;pinned:boolean; storageGranted?:boolean;networkGranted?:boolean; name?:string; icon?:string;sidebarOrder?:number; lastOpenedAt?:string; data:string; createdAt:string; updatedAt?:string}
export type Overview = {catalog:readonly {id:string;name:string;description:string;version:string;permissions:readonly string[]}[];installations:Installation[];onboarded?:boolean;networkDomains?:string[];builder:{available:boolean;reason:string}}
export type Mutation = {action:'restore-runtime';appId:'notes'|'focus-board'|'api-inspector';value:string}| {action:'network-permission';appId:'notes'|'focus-board'|'api-inspector';value:boolean}| {action:'icon';appId:'notes'|'focus-board'|'api-inspector';value:string}|{action:'reorder';appId:'notes'|'focus-board'|'api-inspector';value:string[]}| {action:'onboarding';appId:'notes'|'focus-board'|'api-inspector';value:boolean}|{action:'permission';appId:'notes'|'focus-board'|'api-inspector';value:boolean}|{action:'launch';appId:'notes'|'focus-board'|'api-inspector'}|{action:'rename';appId:'notes'|'focus-board'|'api-inspector';value:string}| {action:'install'|'approve-update';appId:'notes'|'focus-board'|'api-inspector';consent:true}|{action:'uninstall';appId:'notes'|'focus-board'|'api-inspector'}|{action:'pin';appId:'notes'|'focus-board'|'api-inspector';value:boolean}|{action:'save';appId:'notes'|'focus-board'|'api-inspector';value:string}
export class MyspaceError extends Error {status:number; constructor(status:number,message:string){super(message);this.status=status}}
export function mutation(input:unknown):Mutation {
 if(!input||typeof input!=='object'||Array.isArray(input))throw new MyspaceError(400,'Expected an object')
 const b=input as Record<string,unknown>
 if(b.appId!=='notes'&&b.appId!=='focus-board'&&b.appId!=='api-inspector')throw new MyspaceError(400,'Unknown application')
 const allowed=['install','approve-update'].includes(String(b.action))?['action','appId','consent']:['pin','save','permission','onboarding','rename','icon','reorder','network-permission','restore-runtime'].includes(String(b.action))?['action','appId','value']:['action','appId']
 if(Object.keys(b).some(k=>!allowed.includes(k)))throw new MyspaceError(400,'Unexpected fields')
 switch(b.action){
 case 'install':case 'approve-update':if(b.consent!==true)throw new MyspaceError(403,'Storage permission requires approval');break
 case 'uninstall':case 'launch':break
 case 'restore-runtime':if(typeof b.value!=='string'||!/^[a-f0-9]{64}$/.test(b.value))throw new MyspaceError(400,'Invalid runtime version');break
 case 'icon':if(!shortcutIcons.includes(b.value as any))throw new MyspaceError(400,'Unsupported shortcut icon');break
 case 'reorder':if(!validateOrder(b.value))throw new MyspaceError(400,'Invalid sidebar order');break
 case 'network-permission':if(b.appId!=='api-inspector')throw new MyspaceError(403,'App does not declare network permission');
 case 'permission':case 'onboarding':if(typeof b.value!=='boolean')throw new MyspaceError(400,'Expected a boolean');break
 case 'rename':if(typeof b.value!=='string'||!b.value.trim()||b.value.length>48)throw new MyspaceError(400,'Name must contain 1–48 characters');break
 case 'pin':if(typeof b.value!=='boolean')throw new MyspaceError(400,'Invalid pin');break
 case 'save':if(typeof b.value!=='string'||new TextEncoder().encode(b.value).length>16000)throw new MyspaceError(413,'Notes storage limit is 16 KB');break
 default:throw new MyspaceError(400,'Unsupported operation')
 }
 return b as Mutation
}
export async function boundedJSON(request:Request,limit=18000):Promise<unknown>{
 const reader=request.body?.getReader();if(!reader)throw new MyspaceError(400,'Request body required')
 let size=0;const parts:Uint8Array[]=[]
 while(true){const{done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();throw new MyspaceError(413,'Request exceeds 18 KB')}parts.push(value)}
 const buffer=new Uint8Array(size);let offset=0;for(const part of parts){buffer.set(part,offset);offset+=part.length}
 try{return JSON.parse(new TextDecoder().decode(buffer))}catch{throw new MyspaceError(400,'Invalid JSON')}
}
