"use client"
import { useState } from "react"
import dynamic from "next/dynamic"
import { ArrowUp, ChevronDown, ChevronLeft, ChevronRight, Eye, EyeOff, Plus, Search, SlidersHorizontal } from "lucide-react"
import "./evolingo-button-demo.css"
import "./evo-ui-kit/library-normalize.css"

// UI Library is never loaded during regular Chat/Cowork/Library/Tools/Schedule startup.
// Each showcase loads only after selecting its category.
const BottomSheetShowcase = dynamic(() => import("./evo-ui-kit/bottom-sheet-demo"), { ssr: false })
const CardsShowcase = dynamic(() => import("./evolingo-cards-demo"), { ssr: false })
const ButtonsV2Showcase = dynamic(() => import("./evolingo-buttons-v2"), { ssr: false })
const DesignSystemShowcase = dynamic(() => import("./evolingo-design-system-demo"), { ssr: false })
const IconsShowcase = dynamic(() => import("./evolingo-icons-demo"), { ssr: false })
const AIComponentsShowcase = dynamic(() => import("./evolingo-ai-components-demo"), { ssr: false })
const MenusShowcase = dynamic(() => import("./evolingo-menus-demo"), { ssr: false })

function InputsShowcase() {
  const [displayName, setDisplayName] = useState("Mdavid")
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [search, setSearch] = useState("")
  const [compactSearch, setCompactSearch] = useState("")
  const [email, setEmail] = useState("hello@example.com")
  const [focusValue, setFocusValue] = useState("Evolingo")
  const [otp, setOtp] = useState("")
  return <div className="evo-inputs-demo">
    <section className="evo-inputs-demo__item"><span className="evo-inputs-demo__eyebrow">01 — Soft system field</span><input className="evo-inputs-demo__field" aria-label="Your name" placeholder="Your name" /><small>Quiet surface · 54px · 18px radius</small></section>
    <section className="evo-inputs-demo__item"><span className="evo-inputs-demo__eyebrow">02 — Minimal outline</span><input className="evo-inputs-demo__field evo-inputs-demo__field--outline" aria-label="Email address" placeholder="Email address" type="email" autoComplete="email" /></section>
    <section className="evo-inputs-demo__item"><span className="evo-inputs-demo__eyebrow">03 — Apple search capsule</span><label className="evo-inputs-demo__search"><Search size={19} aria-hidden="true" /><input aria-label="Search anything" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search anything" /></label></section>
    <section className="evo-inputs-demo__item"><span className="evo-inputs-demo__eyebrow">04 — Inline editable field</span><label className="evo-inputs-demo__inline"><span>Display name</span><input aria-label="Display name" value={displayName} onChange={event => setDisplayName(event.target.value)} /><ChevronRight size={17} aria-hidden="true" /></label><small>Native Settings-style editing · no surrounding box</small></section>
    <section className="evo-inputs-demo__item"><span className="evo-inputs-demo__eyebrow">05 — Floating label</span><label className="evo-inputs-demo__floating"><span>Email</span><input aria-label="Email" type="email" value={email} onChange={event => setEmail(event.target.value)} /></label></section>
    <section className="evo-inputs-demo__item"><span className="evo-inputs-demo__eyebrow">06 — Compact search / filter</span><div className="evo-inputs-demo__compact"><label className="evo-inputs-demo__search"><Search size={18} aria-hidden="true" /><input type="search" aria-label="Search files" value={compactSearch} onChange={event => setCompactSearch(event.target.value)} placeholder="Search files" /></label><button type="button" aria-label="Filter options" title="Filter options"><SlidersHorizontal size={19} /></button></div></section>
    <section className="evo-inputs-demo__item"><span className="evo-inputs-demo__eyebrow">07 — ChatGPT composer</span><div className="evo-inputs-demo__composer"><textarea aria-label="Ask anything" rows={2} placeholder="Ask anything" /><div className="evo-inputs-demo__composer-actions"><div><button type="button" aria-label="Add attachment"><Plus size={21} /></button><button type="button">Tools <ChevronDown size={15} /></button></div><button type="button" className="evo-inputs-demo__send" aria-label="Send message"><ArrowUp size={20} /></button></div></div><small>One quiet surface · no nested cards</small></section>
    <section className="evo-inputs-demo__item"><span className="evo-inputs-demo__eyebrow">08 — Multiline writing</span><textarea className="evo-inputs-demo__multiline" aria-label="Write your response" rows={4} placeholder="Write your response..." /></section>
    <section className="evo-inputs-demo__item"><span className="evo-inputs-demo__eyebrow">09 — OTP / verification</span><div className="evo-inputs-demo__otp"><input aria-label="Six digit verification code" autoComplete="one-time-code" inputMode="numeric" maxLength={6} pattern="[0-9]*" value={otp} onChange={event => setOtp(event.target.value.replace(/\\D/g, "").slice(0, 6))} /><div aria-hidden="true">{Array.from({ length: 6 }, (_, i) => <span key={i}>{otp[i] ?? "·"}</span>)}</div></div></section>
    <section className="evo-inputs-demo__item"><span className="evo-inputs-demo__eyebrow">10 — Focused field</span><input className="evo-inputs-demo__field evo-inputs-demo__field--focus" aria-label="Focused example" value={focusValue} onChange={event => setFocusValue(event.target.value)} /><small>Subtle graphite focus · no blue glow</small></section>
    <section className="evo-inputs-demo__item"><span className="evo-inputs-demo__eyebrow">11 — Password visibility</span><div className="evo-inputs-demo__password"><input aria-label="Password" placeholder="Password" type={passwordVisible ? "text" : "password"} autoComplete="current-password" /><button type="button" aria-label={passwordVisible ? "Hide password" : "Show password"} onClick={() => setPasswordVisible(!passwordVisible)}>{passwordVisible ? <EyeOff size={19} /> : <Eye size={19} />}</button></div></section>
  </div>
}

export default function DemoLibrary({ onBack }: { onBack: () => void }) {
  const [activeCategory, setActiveCategory] = useState("buttons")
  const categories = [
    { id: "buttons", title: "Buttons", content: <ButtonsV2Showcase /> },
    { id: "inputs", title: "Inputs", content: <InputsShowcase /> },
    { id: "cards", title: "Cards", content: <CardsShowcase /> },
    { id: "design-system", title: "Design System", content: <DesignSystemShowcase /> },
    { id: "overlays", title: "Bottom Sheets & Forms", content: <BottomSheetShowcase /> },
    { id: "settings", title: "Menus & Settings", content: <MenusShowcase /> },
    { id: "icons", title: "Icons", content: <IconsShowcase /> },
    { id: "ai-components", title: "AI Components", content: <AIComponentsShowcase /> },
    { id: "typography", title: "Typography", content: <div className="evo-demo-preview"><h2>Címsor</h2><p>Normál szöveg a jelenlegi globális betűstílussal.</p><small>Másodlagos szöveg</small></div> },
  ]
  const active = categories.find(category => category.id === activeCategory) ?? categories[0]
  return <div className="ref-profile evo-demo-library evo-demo-library--segmented">
    <button type="button" className="evo-demo-back" onClick={onBack}><ChevronLeft size={20} /> Vissza a profilhoz</button>
    <h1>UI Library</h1>
    <p className="evo-demo-description">iOS és ChatGPT stílusú UI-elemek. Válassz kategóriát a navigációban; a bemutató nem módosítja a globális stílusokat.</p>
    <nav className="evo-demo-breadcrumb" aria-label="UI-elemek kategóriái">
      <span className="evo-demo-breadcrumb__root">Components</span>
      <ChevronRight size={15} aria-hidden="true" />
      <span className="evo-demo-breadcrumb__current">{active.title}</span>
    </nav>
    <div className="evo-demo-category-tabs" role="group" aria-label="UI elem típusa">
      {categories.map(category => <button key={category.id} type="button" aria-pressed={activeCategory === category.id} onClick={() => setActiveCategory(category.id)}>{category.title}</button>)}
    </div>
    <section className="evo-demo-active-content" aria-label={active.title}>
      <h2>{active.title}</h2>
      {active.content}
    </section>
  </div>
}

