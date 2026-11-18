import{validNetworkRequest,type NetworkRequest}from'../../myspace-types/src/network.ts'
export const protocolVersion='1.0' as const
type Base={protocol:'1.0';appId:string;instanceId:string;nonce:string;requestId:string}
export type RuntimeRequest=Base&({operation:'STORAGE_GET';payload:Record<string,never>}|{operation:'STORAGE_SET';payload:{value:string}}|{operation:'NETWORK_REQUEST';payload:NetworkRequest})
export function parseRequest(input:unknown,instanceId:string,nonce:string,appId='notes'):RuntimeRequest|null{
 if(!input||typeof input!=='object'||Array.isArray(input))return null
 const r=input as Record<string,unknown>
 if(Object.keys(r).some(k=>!['protocol','appId','instanceId','nonce','requestId','operation','payload'].includes(k)))return null
 if(r.protocol!=='1.0'||r.appId!==appId||r.instanceId!==instanceId||r.nonce!==nonce||typeof r.requestId!=='string'||!/^[-a-zA-Z0-9]{1,64}$/.test(r.requestId))return null
 if(r.operation==='NETWORK_REQUEST')return appId==='api-inspector'&&validNetworkRequest(r.payload)?r as RuntimeRequest:null
 if(!r.payload||typeof r.payload!=='object'||Array.isArray(r.payload))return null
 const p=r.payload as Record<string,unknown>
 if(r.operation==='STORAGE_GET'&&Object.keys(p).length===0)return r as RuntimeRequest
 if(r.operation==='STORAGE_SET'&&Object.keys(p).length===1&&typeof p.value==='string'&&new TextEncoder().encode(p.value).length<=16000)return r as RuntimeRequest
 return null
}
