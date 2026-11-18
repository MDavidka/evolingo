import type{NextRequest}from'next/server'
import{ownerFor,respond,failure}from'@/lib/myspace/server'
import{boundedJSON,MyspaceError}from'@/lib/myspace/contracts'
import{getDatabase}from'@/lib/mongodb'
import{enforceRate}from'@/lib/myspace/rate-limit'
import{validNetworkRequest}from'@/packages/myspace-types/src/network'
import{approvedDomains,approvedURL}from'@/lib/myspace/network/policy'
import{networkScope}from'@/lib/myspace/network/scope'
import{networkRequest}from'@/lib/myspace/network/gateway'
let auditIndex:Promise<unknown>|undefined
export async function POST(req:NextRequest){try{
 const owner=await ownerFor(req);await enforceRate(owner+':network',20)
 const body=await boundedJSON(req);if(!validNetworkRequest(body))throw new MyspaceError(400,'INVALID_REQUEST')
 const db=await getDatabase();const audit=db.collection('myspace_audit')
 if(!auditIndex)auditIndex=audit.createIndex({expiresAt:1},{expireAfterSeconds:0}).catch(e=>{auditIndex=undefined;throw e})
 await auditIndex
 const domains=approvedDomains(process.env.MYSPACE_NETWORK_DOMAINS)
 const installation=await db.collection('myspace_installations').findOne({owner,appId:'api-inspector',networkGranted:true,networkScope:networkScope(domains)})
 if(!installation){await audit.insertOne({owner,appId:'api-inspector',operation:'network.request',outcome:'permission-denied',createdAt:new Date(),expiresAt:new Date(Date.now()+90*86400000)});throw new MyspaceError(403,'PERMISSION_DENIED: Allow approved network access in app settings first')}
 let hostname:string
 try{hostname=approvedURL(body.url,domains).hostname}catch(e){throw new MyspaceError(400,e instanceof Error?e.message:'PERMISSION_DENIED')}
 // No URL path/query, request/response body, headers or credentials are retained.
 const record=await audit.insertOne({owner,appId:'api-inspector',operation:'network.request',domain:hostname,method:body.method,outcome:'started',createdAt:new Date(),expiresAt:new Date(Date.now()+90*86400000)})
 try{const result=await networkRequest(body,domains,req.signal);await audit.updateOne({_id:record.insertedId},{$set:{outcome:'completed',status:result.status,durationMs:result.durationMs}});return respond(result)}catch(e){await audit.updateOne({_id:record.insertedId},{$set:{outcome:'failed'}});throw new MyspaceError(400,e instanceof Error?e.message:'NETWORK_UNAVAILABLE')}
 }catch(e){return failure(e)}}
