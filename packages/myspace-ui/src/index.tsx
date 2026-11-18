import React from 'react'
import type {ButtonHTMLAttributes,HTMLAttributes,InputHTMLAttributes,TextareaHTMLAttributes,SelectHTMLAttributes,ReactNode}from'react'
import './tokens.css'
export function AppShell(p:HTMLAttributes<HTMLElement>){return <main {...p} className={'ms-app '+(p.className||'')}/>}
export function Stack(p:HTMLAttributes<HTMLDivElement>){return <div {...p} className={'ms-stack '+(p.className||'')}/>}
export function Row(p:HTMLAttributes<HTMLDivElement>){return <div {...p} className={'ms-row '+(p.className||'')}/>}
export function Grid(p:HTMLAttributes<HTMLDivElement>){return <div {...p} className={'ms-grid '+(p.className||'')}/>}
export function Container(p:HTMLAttributes<HTMLDivElement>){return <div {...p} className={'ms-container '+(p.className||'')}/>}
export function Section(p:HTMLAttributes<HTMLElement>){return <section {...p}/>}
export function Divider(){return <hr/>}
export function ScrollArea(p:HTMLAttributes<HTMLDivElement>){return <div {...p} className={'ms-scroll '+(p.className||'')}/>}
export function Button(p:ButtonHTMLAttributes<HTMLButtonElement>){return <button type="button" {...p} className={'ms-button '+(p.className||'')}/>}
export function IconButton(p:ButtonHTMLAttributes<HTMLButtonElement>&{'aria-label':string}){return <Button {...p}/>}
export function TextField({label,...p}:InputHTMLAttributes<HTMLInputElement>&{label:string}){return <label className="ms-field"><span>{label}</span><input {...p}/></label>}
export function TextArea({label,...p}:TextareaHTMLAttributes<HTMLTextAreaElement>&{label:string}){return <label className="ms-field"><span>{label}</span><textarea {...p}/></label>}
export function SearchField(p:InputHTMLAttributes<HTMLInputElement>&{label:string}){return <TextField {...p} type="search"/>}
export function Select({label,...p}:SelectHTMLAttributes<HTMLSelectElement>&{label:string}){return <label className="ms-field"><span>{label}</span><select {...p}/></label>}
export function Checkbox({label,...p}:InputHTMLAttributes<HTMLInputElement>&{label:string}){return <label className="ms-row"><input {...p} type="checkbox"/><span>{label}</span></label>}
export function Toggle(p:InputHTMLAttributes<HTMLInputElement>&{label:string}){return <Checkbox {...p} role="switch"/>}
export function DatePicker(p:InputHTMLAttributes<HTMLInputElement>&{label:string}){return <TextField {...p} type="date"/>}
export function Slider(p:InputHTMLAttributes<HTMLInputElement>&{label:string}){return <TextField {...p} type="range"/>}
export function Card(p:HTMLAttributes<HTMLDivElement>){return <div {...p} className={'ms-card '+(p.className||'')}/>}
export function Badge({children}:{children:ReactNode}){return <span className="ms-badge">{children}</span>}
export function Alert({children}:{children:ReactNode}){return <div role="alert" className="ms-card">{children}</div>}
export function LoadingIndicator(){return <p role="status" aria-live="polite">Loading…</p>}
export function ProgressBar({value,label}:{value:number;label:string}){return <label>{label}<progress max={100} value={Math.max(0,Math.min(100,value))}/></label>}
export function EmptyState({title,children}:{title:string;children?:ReactNode}){return <section className="ms-empty"><h2>{title}</h2>{children}</section>}
export function ErrorState({message}:{message:string}){return <Alert>{message}</Alert>}
export function CodeBlock({code}:{code:string}){return <pre><code>{code}</code></pre>}
export function JSONViewer({value}:{value:unknown}){return <CodeBlock code={JSON.stringify(value,null,2)}/>}
export function StatusIndicator({children}:{children:ReactNode}){return <p role="status" aria-live="polite">{children}</p>}
