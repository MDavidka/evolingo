import React,{useEffect,useState}from'react'
import{AppShell,Stack,TextArea,Button,StatusIndicator,ErrorState}from'../../myspace-ui/src/index'
export type StorageAPI={get:()=>Promise<string>;set:(value:string)=>Promise<void>}
export function Notes({storage}:{storage:StorageAPI}){
 const[text,setText]=useState('');const[ready,setReady]=useState(false);const[status,setStatus]=useState('Loading…');const[busy,setBusy]=useState(false)
 useEffect(()=>{let live=true;storage.get().then(value=>{if(live){setText(value);setReady(true);setStatus('Ready')}}).catch(e=>{if(live)setStatus('Unable to load: '+e.message)});return()=>{live=false}},[storage])
 async function save(){setBusy(true);setStatus('Saving…');try{await storage.set(text);setStatus('Saved')}catch(e){setStatus('Not saved: '+(e instanceof Error?e.message:'Storage unavailable'))}finally{setBusy(false)}}
 return <AppShell><Stack><h1>Notes</h1><TextArea label="Your notes" value={text} disabled={!ready} maxLength={16000} onChange={e=>{setText(e.target.value);setStatus('Unsaved changes')}}/><Button disabled={!ready||busy} onClick={save}>Save notes</Button><StatusIndicator>{status}</StatusIndicator>{!ready&&status.startsWith('Unable')&&<ErrorState message="Close and reopen the app to retry. Your stored notes have not been changed."/>}</Stack></AppShell>
}
