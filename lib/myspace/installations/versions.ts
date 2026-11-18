import{getDatabase,withDatabaseTransaction}from'../../mongodb'
import{artifactAt,latestArtifact}from'../artifacts/store'
import{MyspaceError}from'../contracts'
type HistoryEntry={integrity:string;version:string;approvedAt:Date|string}
export function cleanHistory(value:unknown):HistoryEntry[]{if(!Array.isArray(value))return[];return value.filter(v=>v&&typeof v.integrity==='string'&&/^[a-f0-9]{64}$/.test(v.integrity)&&typeof v.version==='string'&&/^\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(v.version)).slice(-20).map(v=>({integrity:v.integrity,version:v.version,approvedAt:v.approvedAt instanceof Date?v.approvedAt:typeof v.approvedAt==='string'&&v.approvedAt.length<=40?v.approvedAt:''}))}
export async function changeRuntime(owner:string,appId:string,requested?:string){
 const db=await getDatabase();await db.collection('myspace_audit').createIndex({expiresAt:1},{expireAfterSeconds:0})
 return withDatabaseTransaction(async(db,session)=>{
 const apps=db.collection('myspace_installations');const app=await apps.findOne({owner,appId},{session})
 if(!app)throw new MyspaceError(404,'Install the application first')
 if(requested&&requested===app.artifactIntegrity)return{ok:true,unchanged:true}
 const history=cleanHistory(app.runtimeHistory)
 const target=requested?history.find(v=>v.integrity===requested):latestArtifact(appId)
 if(!target)throw new MyspaceError(403,'Runtime version was not previously approved for this installation')
 const artifact=await artifactAt(appId,target.integrity)
 if(!artifact)throw new MyspaceError(409,'The selected artifact is unavailable; current runtime and data are unchanged')
 if(app.artifactIntegrity===target.integrity)return{ok:true,unchanged:true}
 const previous=typeof app.artifactIntegrity==='string'&&/^[a-f0-9]{64}$/.test(app.artifactIntegrity)?{integrity:app.artifactIntegrity,version:app.version,approvedAt:new Date()}:null
 const next=history.filter(v=>v.integrity!==target.integrity&&v.integrity!==previous?.integrity)
 if(previous)next.push(previous)
 await apps.updateOne({owner,appId},{$set:{artifactIntegrity:target.integrity,version:artifact.version,runtimeHistory:next.slice(-20),updatedAt:new Date()}},{session})
 await db.collection('myspace_audit').insertOne({owner,appId,operation:requested?'app.runtime.restore':'app.runtime.update',fromIntegrity:app.artifactIntegrity||null,toIntegrity:target.integrity,createdAt:new Date(),expiresAt:new Date(Date.now()+90*86400000)},{session})
 return{ok:true}
 })
}
