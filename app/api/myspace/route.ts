import {NextRequest,NextResponse} from 'next/server'
import {randomBytes,createHash} from 'node:crypto'
import {getDatabase,withDatabaseTransaction} from '@/lib/mongodb'
import {builderReadiness} from '@/lib/myspace/builder-config'
import {enforceRate} from '@/lib/myspace/rate-limit'
import {samePinnedSet} from '@/lib/myspace/shortcuts'
import {approvedDomains} from '@/lib/myspace/network/policy'
import {latestArtifact} from '@/lib/myspace/artifacts/store'
import {networkScope,networkGrantEffective} from '@/lib/myspace/network/scope'
import {changeRuntime,cleanHistory} from '@/lib/myspace/installations/versions'
import {catalog} from '@/lib/myspace/catalog'
import {boundedJSON,mutation,MyspaceError} from '@/lib/myspace/contracts'
export const runtime='nodejs'
export const dynamic='force-dynamic'
const cookie='myspace_guest'
async function handle(req:NextRequest){
 try{
 if(req.method==='POST'){
 const expected=process.env.MYSPACE_HOST_ORIGIN||req.nextUrl.origin
 const origin=req.headers.get('origin')
 const headerGuest=req.headers.get('x-myspace-guest')?.trim()
 if(origin&&origin!==expected)throw new MyspaceError(403,'Invalid origin')
 if(!origin&&!(headerGuest&&/^[a-f0-9]{64}$/.test(headerGuest)))throw new MyspaceError(403,'Invalid origin')
 if(!req.headers.get('content-type')?.startsWith('application/json'))throw new MyspaceError(415,'JSON content type required')
 }
 const cookieExisting=req.cookies.get(cookie)?.value
 const headerExisting=req.headers.get('x-myspace-guest')?.trim()
 const existing=(cookieExisting&&/^[a-f0-9]{64}$/.test(cookieExisting))?cookieExisting:((headerExisting&&/^[a-f0-9]{64}$/.test(headerExisting))?headerExisting:undefined)
 const token=existing?existing:randomBytes(32).toString('hex')
 if(req.method==='POST'&&token!==existing)throw new MyspaceError(401,'Open Myspace before making changes')
 const owner=createHash('sha256').update(token).digest('hex');await enforceRate(owner)
 const body=req.method==='POST'?mutation(await boundedJSON(req)):null
 const db=await getDatabase();const apps=db.collection('myspace_installations')
 await apps.createIndex({owner:1,appId:1},{unique:true})
 const reply=(data:unknown)=>{const r=NextResponse.json(data,{headers:{'Cache-Control':'no-store'}});if(token!==existing)r.cookies.set(cookie,token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:31536000});return r}
 if(!body)return reply({onboarded:(await db.collection('myspace_preferences').findOne({owner}))?.onboarded===true,catalog,networkDomains:approvedDomains(process.env.MYSPACE_NETWORK_DOMAINS),installations:(await apps.find({owner},{projection:{_id:0,owner:0}}).sort({sidebarOrder:1,createdAt:1}).toArray()).map(app=>({...app,runtimeHistory:cleanHistory(app.runtimeHistory),networkGranted:networkGrantEffective(app.networkGranted,app.networkScope,networkScope(approvedDomains(process.env.MYSPACE_NETWORK_DOMAINS))),latestArtifactIntegrity:latestArtifact(app.appId)?.integrity,artifactUpdateAvailable:app.artifactIntegrity!==latestArtifact(app.appId)?.integrity,data:app.storageGranted===true?app.data:''})),builder:builderReadiness(process.env)})
 if(body.action==='onboarding'){await db.collection('myspace_preferences').updateOne({owner},{$set:{onboarded:body.value}},{upsert:true});return reply({ok:true})}
 if(body.action==='reorder'){
 await withDatabaseTransaction(async(db,session)=>{
 const collection=db.collection('myspace_installations');const pinned=await collection.find({owner,pinned:true},{session}).toArray()
 if(!samePinnedSet(body.value,pinned.map(p=>p.appId)))throw new MyspaceError(409,'Pinned apps changed. Reload before reordering.')
 for(let order=0;order<body.value.length;order++)await collection.updateOne({owner,appId:body.value[order],pinned:true},{$set:{sidebarOrder:order}},{session})
 });return reply({ok:true})
 }
 const filter={owner,appId:body.appId}
 switch(body.action){
 case 'install':await apps.updateOne(filter,{$setOnInsert:{...filter,version:latestArtifact(body.appId)!.version,artifactIntegrity:latestArtifact(body.appId)!.integrity,pinned:false,sidebarOrder:999,storageGranted:true,networkGranted:false,name:catalog.find(a=>a.id===body.appId)!.name,icon:body.appId==='api-inspector'?'code':body.appId,data:'',createdAt:new Date()}},{upsert:true});break
 case 'approve-update':await changeRuntime(owner,body.appId);break
 case 'restore-runtime':await changeRuntime(owner,body.appId,body.value);break
 case 'uninstall':await apps.deleteOne(filter);break
 case 'network-permission':case 'icon':case 'launch':case 'rename':case 'permission':case 'pin':case 'save':{
 const query=body.action==='save'?{...filter,storageGranted:true}:filter
 const change=body.action==='network-permission'?{networkGranted:body.value,networkScope:body.value?networkScope(approvedDomains(process.env.MYSPACE_NETWORK_DOMAINS)):null}:body.action==='icon'?{icon:body.value}:body.action==='pin'?{pinned:body.value}:body.action==='permission'?{storageGranted:body.value}:body.action==='rename'?{name:body.value.trim()}:body.action==='launch'?{lastOpenedAt:new Date()}:{data:body.value,updatedAt:new Date()}
 const result=await apps.updateOne(query,{$set:change})
 if(!result.matchedCount)throw new MyspaceError(body.action==='save'?403:404,body.action==='save'?'Storage permission denied or application not installed':'Install the application first')
 break
 }
 }
 return reply({ok:true})
 }catch(e){const known=e instanceof MyspaceError;return NextResponse.json({error:known?e.message:'Myspace storage is unavailable. Please retry.',code:known?e.status:503},{status:known?e.status:503,headers:{'Cache-Control':'no-store'}})}
}
export const GET=handle;export const POST=handle
