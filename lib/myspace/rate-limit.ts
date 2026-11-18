import{getDatabase}from'../mongodb'
import{MyspaceError}from'./contracts'
let initialized:Promise<unknown>|undefined
export async function enforceRate(owner:string,limit=120){
 const db=await getDatabase();const collection=db.collection<{_id:string;count:number;expiresAt:Date}>('myspace_rate_limits')
 if(!initialized)initialized=collection.createIndex({expiresAt:1},{expireAfterSeconds:0}).catch(e=>{initialized=undefined;throw e})
 await initialized
 const bucket=Math.floor(Date.now()/60000)
 const row=await collection.findOneAndUpdate({_id:owner+':'+bucket},{$inc:{count:1},$setOnInsert:{expiresAt:new Date((bucket+2)*60000)}},{upsert:true,returnDocument:'after'})
 if(!row||row.count>limit)throw new MyspaceError(429,'Too many requests. Retry in a minute.')
}
