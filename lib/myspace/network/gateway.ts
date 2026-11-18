import{setTimeout as nodeSetTimeout,clearTimeout as nodeClearTimeout}from'node:timers'
import{lookup}from'node:dns/promises'
import{request}from'node:https'
import{performance}from'node:perf_hooks'
import{approvedURL,publicAddress}from'./policy.ts'
import type{NetworkRequest,NetworkResponse}from'../../../packages/myspace-types/src/network'
export async function networkRequest(input:NetworkRequest,domains:string[],signal?:AbortSignal):Promise<NetworkResponse>{
 const started=performance.now();const deadline=AbortSignal.any([signal||new AbortController().signal,AbortSignal.timeout(8000)])
 async function send(value:string,redirects:number):Promise<NetworkResponse>{
 const url=approvedURL(value,domains)
 let dnsTimer:ReturnType<typeof nodeSetTimeout>
 const addresses=await Promise.race([lookup(url.hostname,{all:true,verbatim:true}),new Promise<never>((_,reject)=>{dnsTimer=nodeSetTimeout(()=>reject(Error('TIMEOUT: DNS resolution exceeded limit')),2000)})]).finally(()=>nodeClearTimeout(dnsTimer))
 if(!addresses.length||addresses.some(a=>!publicAddress(a.address)))throw Error('PERMISSION_DENIED: DNS target is not public')
 const chosen=addresses[0]
 return new Promise((resolve,reject)=>{
 const req=request(url,{method:input.method,agent:false,family:chosen.family,servername:url.hostname,signal:deadline,
 headers:{...input.headers,'accept-encoding':'identity','user-agent':'Evolingo-Myspace-Inspector/1.0','content-length':Buffer.byteLength(input.body)},
 lookup:((_host:unknown,options:any,callback:any)=>options?.all?callback(null,[chosen]):callback(null,chosen.address,chosen.family)) as any},res=>{
 res.on('error',()=>reject(Error('NETWORK_UNAVAILABLE: Response interrupted')))
 if([301,302,303,307,308].includes(res.statusCode||0)&&res.headers.location){res.resume();if(redirects>=3){reject(Error('INVALID_REQUEST: Redirect limit reached'));return}if(!['GET','HEAD'].includes(input.method)){reject(Error('INVALID_REQUEST: Redirects for write methods are disabled'));return}let next:string;try{next=new URL(res.headers.location,url).href}catch{reject(Error('INVALID_REQUEST: Invalid redirect'));return}void send(next,redirects+1).then(resolve,reject);return}
 if(res.headers['content-encoding']&&res.headers['content-encoding']!=='identity'){res.destroy();reject(Error('UNSUPPORTED_OPERATION: Compressed response rejected'));return}
 let bytes=0;const chunks:Buffer[]=[]
 res.on('data',(chunk:Buffer)=>{bytes+=chunk.length;if(bytes>256000){res.destroy();reject(Error('QUOTA_EXCEEDED: Response exceeds 256 KB'))}else chunks.push(chunk)})
 res.on('end',()=>resolve({status:res.statusCode||0,durationMs:Math.round(performance.now()-started),headers:{'content-type':String(res.headers['content-type']||'')},body:Buffer.concat(chunks).toString('utf8')}));res.on('error',()=>reject(Error('NETWORK_UNAVAILABLE: Response interrupted')))
 });req.on('error',()=>reject(Error(deadline.aborted?'TIMEOUT':'NETWORK_UNAVAILABLE')));req.end(input.body)
 })
 }
 return send(input.url,0)
}
