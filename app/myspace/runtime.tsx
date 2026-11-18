'use client'
import {useEffect,useRef,useState} from 'react'
import {parseRequest} from '@/packages/myspace-runtime/src/protocol'
export default function NotesRuntime({appId,integrity,value,granted,onSave}:{appId:'notes'|'focus-board'|'api-inspector';integrity:string;value:string;granted:boolean;onSave:(value:string)=>Promise<void>}){
 const [artifact,setArtifact]=useState<string|null>(null);const[error,setError]=useState('')
 const frame=useRef<HTMLIFrameElement>(null)
 const[identity,setIdentity]=useState<{instanceId:string;nonce:string}|null>(null)
 const state=useRef({value,granted,onSave});state.current={value,granted,onSave}
 useEffect(()=>{let live=true;const controller=new AbortController();setArtifact(null);setError('');setIdentity({instanceId:crypto.randomUUID(),nonce:crypto.randomUUID()});fetch('/api/myspace/artifacts/'+appId+'?integrity='+encodeURIComponent(integrity),{signal:controller.signal}).then(async r=>{if(!r.ok)throw Error('Artifact unavailable');return r.json()}).then(async a=>{if(typeof a.html!=='string'||a.html.length>1000000||typeof a.integrity!=='string')throw Error('Invalid artifact');const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(a.html)))).map(v=>v.toString(16).padStart(2,'0')).join('');if(hash!==integrity||a.integrity!==integrity)throw Error('Artifact integrity mismatch');if(live)setArtifact(a.html)}).catch(e=>{if(live)setError(e.message)});return()=>{live=false;controller.abort()}},[appId,integrity])
 useEffect(()=>{
 if(!identity)return
 const seen=new Set<string>();let live=true
 const handler=async(e:MessageEvent)=>{
 if(e.source!==frame.current?.contentWindow)return
 const req=parseRequest(e.data,identity.instanceId,identity.nonce,appId);if(!req||seen.has(req.requestId)||seen.size>=1000)return
 seen.add(req.requestId);let result:unknown;let error:string|undefined
 try{if(req.operation==='NETWORK_REQUEST'){const response=await fetch('/api/myspace/network',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(req.payload),signal:AbortSignal.timeout(9000)});const data=await response.json();if(!response.ok)throw Error(data.error);result=data}else {if(!state.current.granted)throw Error('PERMISSION_DENIED');if(req.operation==='STORAGE_GET')result=state.current.value;else{await state.current.onSave(req.payload.value!);result=true}}}catch(e){error=e instanceof Error?e.message:'NETWORK_UNAVAILABLE'}
 if(live)frame.current?.contentWindow?.postMessage({...identity,protocol:'1.0',appId,requestId:req.requestId,result,error},'*')
 }
 window.addEventListener('message',handler);return()=>{live=false;window.removeEventListener('message',handler)}
 },[identity,appId])
 if(error)return <p role="alert">{error}</p>
 if(!identity||!artifact)return <p role="status">Opening application…</p>
 const html=artifact.replace('__MYSPACE_BOOTSTRAP__',JSON.stringify({...identity,appId}))
 return <iframe ref={frame} title={(appId==='notes'?'Notes':appId==='focus-board'?'Focus Board':'API Inspector')+' isolated workspace'} sandbox="allow-scripts" referrerPolicy="no-referrer" srcDoc={html} style={{width:'100%',height:'65dvh',border:0}}/>
}
