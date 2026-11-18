import{validNetworkRequest,type NetworkRequest,type NetworkResponse}from'../../myspace-types/src/network'
import type {RuntimeRequest} from '../../myspace-runtime/src/protocol'
export type RuntimeIdentity={appId:string;instanceId:string;nonce:string}
export function createMyspace(identity:RuntimeIdentity){
 let count=0;let disposed=false
 const pending=new Map<string,{resolve:(value:unknown)=>void;reject:(error:Error)=>void;timer:ReturnType<typeof setTimeout>}>()
 const receive=(e:MessageEvent)=>{const r=e.data;if(e.source!==parent||!r||r.protocol!=='1.0'||r.appId!==identity.appId||r.instanceId!==identity.instanceId||r.nonce!==identity.nonce)return;const p=pending.get(r.requestId);if(!p)return;clearTimeout(p.timer);pending.delete(r.requestId);r.error?p.reject(Error(r.error)):p.resolve(r.result)}
 window.addEventListener('message',receive)
 const request=(operation:RuntimeRequest['operation'],payload:RuntimeRequest['payload']={})=>new Promise<unknown>((resolve,reject)=>{
 if(disposed){reject(Error('UNAUTHORIZED'));return}if(pending.size>=16){reject(Error('QUOTA_EXCEEDED'));return}
 const requestId=String(++count);const timer=setTimeout(()=>{pending.delete(requestId);reject(Error('TIMEOUT'))},10000)
 pending.set(requestId,{resolve,reject,timer});parent.postMessage({...identity,protocol:'1.0',requestId,operation,payload},'*')
 })
 return {network:{request:async(input:NetworkRequest)=>{if(!validNetworkRequest(input))throw Error('INVALID_REQUEST');return await request('NETWORK_REQUEST',input) as NetworkResponse}},app:{getInfo:()=>({id:identity.appId,sdkVersion:'1.0.0'})},storage:{get:async()=>await request('STORAGE_GET') as string,set:async(value:string)=>{if(new TextEncoder().encode(value).length>16000)throw Error('QUOTA_EXCEEDED');await request('STORAGE_SET',{value})}},dispose:()=>{disposed=true;window.removeEventListener('message',receive);for(const p of pending.values()){clearTimeout(p.timer);p.reject(Error('UNAUTHORIZED'))}pending.clear()}}
}
