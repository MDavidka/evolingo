"use client"
import { useState } from "react"
import { ArrowLeft, ArrowRight, ArrowUp, Check, ChevronDown, ChevronLeft, ChevronRight, CircleAlert, Copy, Download, Ellipsis, FilePlus2, FolderPlus, Heart, LayoutGrid, List, ListFilter, LoaderCircle, Mic, MoreHorizontal, Pause, Play, Plus, RefreshCw, Search, Share2, ShieldCheck, SlidersHorizontal, Sparkles, SquarePen, Trash2, Upload, Volume2, X } from "lucide-react"
import { UIButton } from "./evo-ui-kit/button"
import "./evolingo-buttons-v2.css"

const core = [
  { label:"Primary action", variant:"primary" as const },
  { label:"Secondary action", variant:"secondary" as const },
  { label:"Tertiary action", variant:"tertiary" as const },
  { label:"Plain action", variant:"ghost" as const },
  { label:"Destructive action", variant:"danger" as const },
  { label:"Disabled action", variant:"primary" as const, disabled:true }
]
const iconSet = [
  {label:"Add",Icon:Plus,variant:"secondary" as const},
  {label:"More",Icon:Ellipsis,variant:"glass" as const},
  {label:"Filter",Icon:SlidersHorizontal,variant:"tertiary" as const},
  {label:"Send",Icon:ArrowUp,variant:"primary" as const},
  {label:"Delete",Icon:Trash2,variant:"danger" as const}
]
const compositions = [
  {label:"Create",Icon:Plus,variant:"primary" as const},
  {label:"Upload",Icon:Upload,variant:"tertiary" as const},
  {label:"Customize",Icon:SlidersHorizontal,variant:"secondary" as const},
  {label:"Retry",Icon:RefreshCw,variant:"secondary" as const},
  {label:"Confirm",Icon:Check,variant:"primary" as const},
  {label:"Share",Icon:Share2,variant:"tertiary" as const},
  {label:"Download",Icon:Download,variant:"secondary" as const},
  {label:"Ask AI",Icon:Sparkles,variant:"tertiary" as const}
]
const special = [
  {label:"Hold to speak",Icon:Mic,detail:"Voice / press and hold"},
  {label:"Upload document",Icon:Upload,detail:"File picker"},
  {label:"Retry operation",Icon:RefreshCw,detail:"Recoverable failure"},
  {label:"Secure confirmation",Icon:ShieldCheck,detail:"Sensitive action"},
  {label:"Copy",Icon:Copy,detail:"Clipboard feedback"},
  {label:"Play audio",Icon:Volume2,detail:"Media control"}
]
const taxonomy = [
  ["Core actions","Primary, secondary, tertiary, plain, destructive"],
  ["Filled & outlined","Graphite, white outline, soft gray, elevated white"],
  ["Icon only","Add, overflow, send, remove, close"],
  ["Icon & label","Leading, trailing, paired, text-only"],
  ["Floating actions","Raised capsule, raised circle, toolbar"],
  ["Chat controls","Attach, tools, send, voice"],
  ["Segments","Three-way, two-way, icon + label"],
  ["Selection chips","Single, multiple, disabled"],
  ["Filters & toggles","Filter, favorite, bookmark"],
  ["Split buttons","Action + menu, separated actions"],
  ["Navigation","Back, next, expand, collapse"],
  ["Grouped actions","Cancel/save, grouped menu rows"],
  ["Async & feedback","Loading, success, retry, error"],
  ["Voice & media","Record, listen, pause, play"],
  ["File actions","Upload, download, preview, share"],
  ["AI actions","Generate, regenerate, accept, reject"],
  ["Destructive","Delete, disconnect, reset"],
  ["Accessibility","Focus, reduced motion, disabled"]
]
function Section({number,title,note,children}:{number:number,title:string,note:string,children:React.ReactNode}) {
 return <section className="evo-b2-section"><div className="evo-b2-heading"><span>{String(number).padStart(2,"0")} — {title}</span><small>{note}</small></div>{children}</section>
}
export default function ButtonsV2Showcase(){
 const [segment,setSegment]=useState("All")
 const [view,setView]=useState("List")
 const [chip,setChip]=useState("Selected")
 const [favorites,setFavorites]=useState(false)
 const [feedback,setFeedback]=useState<"idle"|"loading"|"success">("idle")
 const [menu,setMenu]=useState(false)
 const [notice,setNotice]=useState("")
 const flash=(message:string)=>setNotice(message)
 return <div className="evo-b2" aria-label="Buttons 2.0 Soft Monochrome UI Library">
   <p className="evo-b2-intro">Soft Monochrome · Apple-inspired button specimens · All examples are local to this library.</p>
   <Section number={1} title="Core actions" note="50px · full width">
     <div className="evo-b2-stack">{core.map(item=><UIButton key={item.label} variant={item.variant} fullWidth disabled={item.disabled}>{item.label}</UIButton>)}</div>
   </Section>
   <Section number={2} title="Filled & surface" note="One shared palette">
     <div className="evo-b2-grid">{["Graphite","Soft gray","White outline","Elevated white","Dark muted","Pressed gray","Disabled","Destructive"].map((label,i)=><button type="button" key={label} className={"evo-b2-swatch evo-b2-swatch--"+i} disabled={i===6} onClick={()=>flash(label)}>{label}</button>)}</div>
   </Section>
   <Section number={3} title="Circular & icon" note="44px targets">
     <div className="evo-b2-icons">{iconSet.map(({label,Icon,variant})=><UIButton key={label} variant={variant} size="icon" aria-label={label} onClick={()=>flash(label)}><Icon aria-hidden="true" /></UIButton>)}</div>
   </Section>
   <Section number={4} title="Icon + label" note="Responsive two-column">
     <div className="evo-b2-grid">{compositions.map(({label,Icon,variant})=><UIButton key={label} variant={variant} size="compact" onClick={()=>flash(label)}><Icon aria-hidden="true"/>{label}</UIButton>)}</div>
   </Section>
   <Section number={5} title="Floating toolbar" note="White elevated controls">
     <div className="evo-b2-floating"><UIButton variant="glass" size="compact" onClick={()=>flash("Customize")}><SlidersHorizontal/>Customize</UIButton><UIButton variant="glass" size="icon" aria-label="More" onClick={()=>setMenu(!menu)}><MoreHorizontal/></UIButton><UIButton variant="primary" size="icon" aria-label="New item" onClick={()=>flash("New item")}><Plus/></UIButton></div>
     {menu&&<div className="evo-b2-inline-menu"><button onClick={()=>{flash("Edit");setMenu(false)}}><SquarePen/>Edit</button><button onClick={()=>{flash("Share");setMenu(false)}}><Share2/>Share</button></div>}
   </Section>
   <Section number={6} title="Chat controls" note="Compact · 44px">
     <div className="evo-b2-chat"><UIButton variant="tertiary" size="compact" onClick={()=>flash("Add files")}><Plus/>Add files</UIButton><UIButton variant="tertiary" size="compact" onClick={()=>flash("Tools")}><SlidersHorizontal/>Tools</UIButton><UIButton variant="primary" size="icon" aria-label="Send" onClick={()=>flash("Send")}><ArrowUp/></UIButton></div>
   </Section>
   <Section number={7} title="Segments" note="Readable foreground">
     <div className="evo-b2-segment" role="group" aria-label="Status filter">{["All","Active","Done"].map(s=><button key={s} type="button" aria-pressed={segment===s} onClick={()=>setSegment(s)}>{s}</button>)}</div>
     <div className="evo-b2-segment evo-b2-segment--dark" role="group" aria-label="View mode">{["List","Grid"].map(s=><button key={s} type="button" aria-pressed={view===s} onClick={()=>setView(s)}>{s==="List"?<List/>:<LayoutGrid/>}{s}</button>)}</div>
   </Section>
   <Section number={8} title="Selection & filters" note="Pills and toggles">
     <div className="evo-b2-wrap">{["Selected","Unselected"].map(s=><button key={s} type="button" className="evo-b2-chip" aria-pressed={chip===s} onClick={()=>setChip(s)}>{chip===s&&<Check/>}{s}</button>)}<button type="button" className="evo-b2-chip" disabled>Disabled</button><button type="button" className="evo-b2-chip" aria-pressed={favorites} onClick={()=>setFavorites(!favorites)}><Heart/>Favorite</button><button type="button" className="evo-b2-chip" onClick={()=>flash("Filter")}><ListFilter/>Filter</button></div>
   </Section>
   <Section number={9} title="Split & compound" note="Two independent actions">
     <div className="evo-b2-split"><button type="button" onClick={()=>flash("Create task")}>Create task</button><button type="button" aria-label="Choose creation type" onClick={()=>setMenu(!menu)}><ChevronDown/></button></div>
     <div className="evo-b2-pair"><UIButton variant="secondary" onClick={()=>flash("Cancel")}>Cancel</UIButton><UIButton onClick={()=>flash("Save")}>Save</UIButton></div>
   </Section>
   <Section number={10} title="Navigation" note="Directional actions">
     <div className="evo-b2-pair"><UIButton variant="tertiary" onClick={()=>flash("Back")}><ChevronLeft/>Back</UIButton><UIButton onClick={()=>flash("Next")}>Next<ChevronRight/></UIButton></div>
     <div className="evo-b2-icons"><UIButton variant="secondary" size="icon" aria-label="Back" onClick={()=>flash("Back")}><ArrowLeft/></UIButton><UIButton variant="secondary" size="icon" aria-label="Search" onClick={()=>flash("Search")}><Search/></UIButton><UIButton variant="secondary" size="icon" aria-label="Close" onClick={()=>flash("Close")}><X/></UIButton><UIButton variant="primary" size="icon" aria-label="Next" onClick={()=>flash("Next")}><ArrowRight/></UIButton></div>
   </Section>
   <Section number={11} title="Async & feedback" note="Stable button width">
     <div className="evo-b2-grid"><UIButton disabled variant="primary"><LoaderCircle/>Loading…</UIButton><UIButton variant="primary" onClick={()=>setFeedback("success")}><Check/>Success</UIButton><UIButton variant="secondary" onClick={()=>setFeedback("idle")}><RefreshCw/>Retry</UIButton><UIButton variant="tertiary" onClick={()=>flash("Error state")}><CircleAlert/>Error</UIButton><UIButton variant="tertiary" onClick={()=>flash("Paused")}><Pause/>Paused</UIButton><UIButton variant="primary" onClick={()=>setFeedback("loading")}><Mic/>Recording</UIButton></div>
     <UIButton fullWidth onClick={()=>setFeedback(feedback==="idle"?"loading":feedback==="loading"?"success":"idle")} disabled={false}>{feedback==="loading"?<><LoaderCircle/>Processing…</>:feedback==="success"?<><Check/>Completed</>:<>Try feedback states<ArrowRight/></>}</UIButton>
   </Section>
   <Section number={12} title="Special actions" note="Behavior-specific">
     <div className="evo-b2-action-list">{special.map(({label,Icon,detail})=><button type="button" key={label} onClick={()=>flash(label)}><span className="evo-b2-action-icon"><Icon/></span><span><strong>{label}</strong><small>{detail}</small></span><ChevronRight/></button>)}</div>
   </Section>
   <Section number={13} title="Media, files & AI" note="Reusable compositions">
     <div className="evo-b2-grid">{[{label:"Play",Icon:Play},{label:"Pause",Icon:Pause},{label:"New folder",Icon:FolderPlus},{label:"Add file",Icon:FilePlus2},{label:"Generate",Icon:Sparkles},{label:"Regenerate",Icon:RefreshCw},{label:"Accept",Icon:Check},{label:"Remove",Icon:Trash2}].map(({label,Icon})=><UIButton key={label} size="compact" variant={label==="Remove"?"danger":"tertiary"} onClick={()=>flash(label)}><Icon/>{label}</UIButton>)}</div>
   </Section>
   <Section number={14} title="Size scale" note="No random dimensions">
     <div className="evo-b2-size-list"><div className="evo-b2-size evo-b2-size--large">Large · 52px</div><div className="evo-b2-size evo-b2-size--regular">Regular · 48px</div><div className="evo-b2-size evo-b2-size--compact">Compact · 44px</div><div className="evo-b2-size evo-b2-size--small">Small · 36px visual</div></div>
   </Section>
   <Section number={15} title="All component families" note="18 documented groups">
     <div className="evo-b2-taxonomy">{taxonomy.map(([name,description],i)=><div key={name}><span>{String(i+1).padStart(2,"0")}</span><div><strong>{name}</strong><small>{description}</small></div></div>)}</div>
   </Section>
   {notice&&<p className="evo-b2-feedback" role="status">{notice} · Demo only</p>}
 </div>
}
