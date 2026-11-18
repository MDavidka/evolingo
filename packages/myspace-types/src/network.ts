export type NetworkRequest={url:string;method:'GET'|'HEAD'|'OPTIONS'|'POST'|'PUT'|'PATCH'|'DELETE';headers:Record<string,string>;body:string}
export type NetworkResponse={status:number;durationMs:number;headers:Record<string,string>;body:string}
export function validNetworkRequest(input:unknown):input is NetworkRequest{
 if(!input||typeof input!=='object'||Array.isArray(input))return false
 const r=input as Record<string,unknown>
 if(Object.keys(r).length!==4||Object.keys(r).some(k=>!['url','method','headers','body'].includes(k)))return false
 if(typeof r.url!=='string'||r.url.length>2000||!['GET','HEAD','OPTIONS','POST','PUT','PATCH','DELETE'].includes(String(r.method))||typeof r.body!=='string'||new TextEncoder().encode(r.body).length>16000)return false
 if(['GET','HEAD'].includes(String(r.method))&&r.body)return false
 if(!r.headers||typeof r.headers!=='object'||Array.isArray(r.headers)||Object.keys(r.headers).length>2)return false
 return Object.entries(r.headers).every(([k,v])=>['accept','content-type'].includes(k.toLowerCase())&&typeof v==='string'&&v.length<=200&&!/[\r\n\x00]/.test(v))
}
