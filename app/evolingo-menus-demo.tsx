"use client"

import { useState, type ReactNode } from "react"
import {
  Accessibility, AlertCircle, ArrowRight, Bell, BookOpen, CalendarDays,
  Camera, Check, CheckCircle2, ChevronDown, ChevronRight, ChevronUp, Circle,
  CircleDot, Clock3, Cloud, Code2, Copy, Download, Ear, Eye, EyeOff,
  FileText, Fingerprint, Folder, Globe, HardDrive, Image, Info, KeyRound,
  Languages, LayoutGrid, Link2, List, LoaderCircle, LockKeyhole, LogOut,
  MapPin, MessageCircle, Mic, Minus, Moon, MoreHorizontal, Music2,
  Palette, PersonStanding, Plus, RefreshCw, RotateCcw, Search,
  Settings, ShieldCheck, Smartphone, SlidersHorizontal, Sparkles,
  Sun, ToggleRight, Trash2, UserRound, Volume2, WifiOff, X,
  type LucideIcon,
} from "lucide-react"
import "./evolingo-menus-demo.css"
import { UISettingsGroup, UISettingsRow, UISettingsSwitchRow } from "./evo-ui-kit"

const categories = [
  "All", "Settings Rows", "Switches", "Selection", "Sliders",
  "Accessibility", "Permissions", "Account", "Advanced", "States",
] as const
type Category = typeof categories[number]
type SwitchMap = Record<string, boolean>

type SettingRowProps = {
  title: string
  description?: string
  Icon?: LucideIcon
  trailing?: ReactNode
  destructive?: boolean
  disabled?: boolean
  compact?: boolean
  variant?: string
  avatar?: boolean
}
function SettingRow({ title, description, Icon, trailing, destructive, disabled, compact, variant, avatar }: SettingRowProps) {
  return (
    <div className={[
      "evo-menus__row",
      compact ? "evo-menus__row--compact" : "",
      destructive ? "evo-menus__row--destructive" : "",
      disabled ? "evo-menus__row--disabled" : "",
    ].filter(Boolean).join(" ")}>
      {avatar ? <div className="evo-menus__avatar" aria-hidden="true"><UserRound size={19} /></div> :
        Icon && <Icon size={19} strokeWidth={1.75} className="evo-menus__row-icon" aria-hidden="true" />}
      <div className="evo-menus__row-copy">
        <span className="evo-menus__row-title">{title}</span>
        {description && <span className="evo-menus__row-description">{description}</span>}
      </div>
      {variant && <span className="evo-menus__row-variant">{variant}</span>}
      {trailing && <span className="evo-menus__row-trailing">{trailing}</span>}
    </div>
  )
}

function DemoSwitch({ checked, onChange, label, disabled = false }: {
  checked: boolean
  onChange: (value: boolean) => void
  label: string
  disabled?: boolean
}) {
  return (
    <button
      type="button" role="switch" aria-label={label} aria-checked={checked}
      className="evo-menus__switch"
      disabled={disabled} onClick={() => onChange(!checked)}
    ><span className="evo-menus__switch-thumb" /></button>
  )
}

function SectionHeader({ index, title, summary, count }: {
  index: string
  title: string
  summary: string
  count: string
}) {
  return (
    <header className="evo-menus__section-head">
      <div className="evo-menus__section-index">{index} / COMPONENTS <span>{count}</span></div>
      <h3>{title}</h3>
      <p>{summary}</p>
    </header>
  )
}

function Subheading({ label, hint }: { label: string; hint?: string }) {
  return <div className="evo-menus__subheading"><strong>{label}</strong>{hint && <span>{hint}</span>}</div>
}

function CheckMark({ active }: { active: boolean }) {
  return active ? <Check size={18} strokeWidth={2.1} color="#202124" aria-hidden="true" /> : null
}

const rowVariants: Array<SettingRowProps> = [
  { title: "General", Icon: Settings, trailing: <ChevronRight size={17} />, variant: "Basic" },
  { title: "Appearance", description: "Display, typography and theme", Icon: Palette, trailing: <ChevronRight size={17} />, variant: "Subtitle" },
  { title: "App language", Icon: Languages, trailing: <><small>English</small><ChevronRight size={17} /></>, variant: "Value" },
  { title: "Cloud sync", Icon: Cloud, trailing: <><span className="evo-menus__status-dot" /> <small>Connected</small></>, variant: "Status" },
  { title: "Messages", Icon: MessageCircle, trailing: <><span className="evo-menus__counter">3</span><ChevronRight size={17} /></>, variant: "Badge" },
  { title: "Example account", description: "Free plan · Demo", avatar: true, trailing: <ChevronRight size={17} />, variant: "Avatar" },
  { title: "Terms of service", trailing: <ChevronRight size={17} />, variant: "Iconless" },
  { title: "Background activity", description: "Allows the app to continue showing progress when you return to it.", Icon: Clock3, trailing: <ChevronRight size={17} />, variant: "Multiline" },
  { title: "Storage usage", Icon: HardDrive, trailing: <><div className="evo-menus__mini-progress"><span /></div><small>64%</small></>, variant: "Progress" },
  { title: "Checking for updates", Icon: RefreshCw, trailing: <LoaderCircle size={17} className="evo-menus__spinner" />, variant: "Loading" },
  { title: "Premium tools", description: "Requires an eligible plan", Icon: LockKeyhole, trailing: <LockKeyhole size={17} />, variant: "Locked" },
  { title: "Unavailable option", description: "Disabled by a parent preference", Icon: EyeOff, trailing: <ChevronRight size={17} />, variant: "Disabled", disabled: true },
  { title: "Clear local cache", Icon: Trash2, trailing: <ChevronRight size={17} />, variant: "Destructive", destructive: true },
  { title: "Keyboard shortcuts", Icon: List, trailing: <><kbd>⌘ K</kbd><ChevronRight size={17} /></>, variant: "Shortcut" },
  { title: "Advanced", description: "Additional configuration", Icon: SlidersHorizontal, trailing: <ChevronDown size={17} />, variant: "Disclosure" },
]

const switchVariants = [
  { id: "master", title: "Standard switch", description: "Default on/off preference", default: true },
  { id: "subtitle", title: "Switch with subtitle", description: "Show an explanation under the setting", default: false },
  { id: "labels", title: "Switch with labels", description: "Text status remains visible", default: true, labeled: true },
  { id: "contrast", title: "Increase contrast", description: "Accessibility preference", default: false },
  { id: "motion", title: "Reduce motion", description: "Reduce nonessential animations", default: false },
  { id: "haptics", title: "Haptic feedback", description: "Use vibration on supported devices", default: true },
  { id: "dependent", title: "Play notification sound", description: "Requires Standard switch enabled", default: false, dependsOn: "master" },
  { id: "disabled", title: "Disabled switch", description: "Not currently available", default: false, disabled: true },
  { id: "managed", title: "System-managed switch", description: "Controlled by operating system settings", default: true, disabled: true, managed: true },
  { id: "saving", title: "Pending / saving switch", description: "Specimen of an asynchronous setting", default: true, disabled: true, pending: true },
] as const

const accessibilityGroups = [
  { title: "Vision", Icon: Eye, items: [
    { id: "larger-text", title: "Larger text", description: "Scale supported app text", kind: "chevron" },
    { id: "bold-text", title: "Bold text", description: "Use stronger text weights", kind: "switch" },
    { id: "increase-contrast", title: "Increase contrast", description: "Strengthen text and controls", kind: "switch" },
    { id: "reduce-transparency", title: "Reduce transparency", description: "Prefer opaque surfaces", kind: "switch" },
    { id: "without-color", title: "Differentiate without color", description: "Show additional labels and shapes", kind: "switch" },
    { id: "color-filters", title: "Color filters", description: "Preview color adaptation settings", kind: "chevron" },
    { id: "button-shapes", title: "Button shapes", description: "Make tappable elements clearer", kind: "switch" },
    { id: "focus-highlights", title: "Focus highlights", description: "Show prominent keyboard focus", kind: "switch" },
  ] },
  { title: "Motion & Interaction", Icon: PersonStanding, items: [
    { id: "reduce-motion", title: "Reduce motion", description: "Minimize decorative movement", kind: "switch" },
    { id: "crossfade", title: "Prefer cross-fades", description: "Replace sliding animations", kind: "switch" },
    { id: "animated-images", title: "Autoplay animated images", description: "Control animated media", kind: "switch" },
    { id: "interaction-haptics", title: "Haptic feedback", description: "Feedback on supported devices", kind: "switch" },
    { id: "confirm-destructive", title: "Confirm destructive actions", description: "Show confirmation before deletion", kind: "switch" },
    { id: "large-targets", title: "Larger touch targets", description: "Extra room around interactive items", kind: "switch" },
    { id: "hold-duration", title: "Touch hold duration", description: "Configure long-press interactions", kind: "chevron" },
    { id: "swipe-gestures", title: "Swipe gestures", description: "Enable optional swipe actions", kind: "switch" },
  ] },
  { title: "Hearing & Speech", Icon: Ear, items: [
    { id: "captions", title: "Always show captions", description: "When caption text is available", kind: "switch" },
    { id: "transcripts", title: "Live transcription", description: "Display supported audio as text", kind: "switch" },
    { id: "visual-alerts", title: "Visual sound alerts", description: "Use non-audio status cues", kind: "switch" },
    { id: "speak-text", title: "Speak selected text", description: "Show text-to-speech controls", kind: "switch" },
    { id: "voice-rate", title: "Speech rate", description: "Example: 1.0×", kind: "chevron" },
    { id: "audio-balance", title: "Audio balance", description: "Example settings layout", kind: "chevron" },
  ] },
] as const

const permissions = [
  { Icon: Mic, name: "Microphone", status: "Allowed", description: "Used for voice features", state: "ok" },
  { Icon: Camera, name: "Camera", status: "Not granted", description: "Used for photo capture", state: "muted" },
  { Icon: Bell, name: "Notifications", status: "System controlled", description: "Managed by your device", state: "muted" },
  { Icon: Image, name: "Photos", status: "Selected items", description: "App-visible image selection", state: "muted" },
  { Icon: Copy, name: "Clipboard", status: "Ask to paste", description: "Paste requires user action", state: "muted" },
  { Icon: Folder, name: "Files", status: "Selected files", description: "Files you choose to open", state: "muted" },
  { Icon: MapPin, name: "Location", status: "Ask when needed", description: "Example permission state", state: "muted" },
  { Icon: Volume2, name: "Speech recognition", status: "Not requested", description: "Voice transcript availability", state: "muted" },
] as const

const accountRows: Array<SettingRowProps> = [
  { title: "Subscription", description: "Free · Example plan", Icon: Sparkles, trailing: <><small>Free</small><ChevronRight size={17} /></> },
  { title: "Connected accounts", description: "Example linked services", Icon: Link2, trailing: <><small>2</small><ChevronRight size={17} /></> },
  { title: "Password and security", Icon: KeyRound, trailing: <ChevronRight size={17} /> },
  { title: "Passkeys", Icon: Fingerprint, trailing: <><small>Not configured</small><ChevronRight size={17} /></> },
  { title: "Two-factor authentication", Icon: ShieldCheck, trailing: <><small>Off</small><ChevronRight size={17} /></> },
  { title: "Active sessions", Icon: Smartphone, trailing: <><small>1 device</small><ChevronRight size={17} /></> },
  { title: "Data & privacy", Icon: LockKeyhole, trailing: <ChevronRight size={17} /> },
  { title: "Export my data", Icon: Download, trailing: <ChevronRight size={17} /> },
  { title: "Sign out", Icon: LogOut, trailing: <ChevronRight size={17} /> },
  { title: "Delete account", Icon: Trash2, trailing: <ChevronRight size={17} />, destructive: true },
]

const states: Array<{ name: string; description: string; Icon: LucideIcon; className?: string }> = [
  { name: "Default", description: "Standard resting state", Icon: Circle },
  { name: "Pressed", description: "Subtle highlight", Icon: CircleDot, className: "pressed" },
  { name: "Selected", description: "Checkmark / active indicator", Icon: CheckCircle2, className: "selected" },
  { name: "Focused", description: "Visible focus outline", Icon: Search, className: "focused" },
  { name: "Disabled", description: "Not available", Icon: EyeOff, className: "disabled" },
  { name: "Loading", description: "Processing action", Icon: LoaderCircle },
  { name: "Saving", description: "Waiting for confirmation", Icon: Cloud },
  { name: "Saved", description: "Operation confirmed", Icon: Check },
  { name: "Error", description: "Explain what failed", Icon: AlertCircle, className: "error" },
  { name: "Locked", description: "Restriction explained", Icon: LockKeyhole },
  { name: "System-managed", description: "Read-only information", Icon: Smartphone },
  { name: "Destructive", description: "Requires confirmation", Icon: Trash2, className: "error" },
  { name: "Expanded", description: "Nested options visible", Icon: ChevronUp },
  { name: "Offline", description: "Connectivity unavailable", Icon: WifiOff },
]

const sliders = [
  { id: "text", title: "Text size", description: "Accessible text scale", min: 80, max: 160, step: 5, initial: 110, suffix: "%" },
  { id: "speech", title: "Speech speed", description: "Voice playback rate", min: 0.5, max: 2, step: 0.25, initial: 1, suffix: "×" },
  { id: "volume", title: "Audio volume", description: "Lesson audio playback", min: 0, max: 100, step: 5, initial: 65, suffix: "%" },
  { id: "opacity", title: "Preview opacity", description: "Visual transparency preview", min: 40, max: 100, step: 5, initial: 85, suffix: "%" },
  { id: "spacing", title: "Line spacing", description: "Reading accessibility", min: 1, max: 2, step: 0.1, initial: 1.4, suffix: "×" },
  { id: "animation", title: "Animation duration", description: "Illustrative timing control", min: 0, max: 500, step: 50, initial: 200, suffix: "ms" },
  { id: "haptic", title: "Haptic intensity", description: "Appearance-only demo", min: 0, max: 100, step: 25, initial: 50, suffix: "%" },
  { id: "ticks", title: "Discrete slider", description: "Snaps to numbered steps", min: 0, max: 5, step: 1, initial: 3, suffix: "/5" },
] as const

const tinyIconSize = 18
const chev = <ChevronRight size={17} strokeWidth={1.75} aria-hidden="true" />

export default function MenusShowcase() {
  const [category, setCategory] = useState<Category>("All")
  const [switchValues, setSwitchValues] = useState<SwitchMap>({
    master: true, labels: true, haptics: true, managed: true, saving: true,
    "confirm-destructive": true, "animated-images": true,
  })
  const [radioChoice, setRadioChoice] = useState("system")
  const [checkChoice, setCheckChoice] = useState("english")
  const [multiChoices, setMultiChoices] = useState<string[]>(["grammar", "speaking"])
  const [density, setDensity] = useState("comfortable")
  const [themeChoice, setThemeChoice] = useState("light")
  const [dropdown, setDropdown] = useState("hu")
  const [iconChoice, setIconChoice] = useState("day")
  const [compactChoice, setCompactChoice] = useState("standard")
  const [sliderValues, setSliderValues] = useState<Record<string, number>>({})
  const [stepper, setStepper] = useState(3)
  const [expanded, setExpanded] = useState(false)
  const [subMenu, setSubMenu] = useState(false)
  const [advancedChoice, setAdvancedChoice] = useState("default")
  const [backupChoice, setBackupChoice] = useState("weekly")
  const [showResetNotice, setShowResetNotice] = useState(false)
  const [kitPreviewMessage, setKitPreviewMessage] = useState("")

  const enabled = (id: string, fallback = false) => switchValues[id] ?? fallback
  const toggle = (id: string, value: boolean) => setSwitchValues(old => ({ ...old, [id]: value }))
  const show = (name: Category) => category === "All" || category === name
  const setSlider = (id: string, value: number) => setSliderValues(old => ({ ...old, [id]: value }))
  const formatSlider = (value: number, suffix: string) => (
    suffix === "×" ? value.toFixed(2).replace(/0$/, "").replace(/\.0$/, "") + suffix : value + suffix
  )
  const resetPreview = () => {
    setSliderValues({})
    setStepper(3)
    setRadioChoice("system")
    setDensity("comfortable")
    setSwitchValues({ master: true, labels: true, haptics: true, managed: true, saving: true, "confirm-destructive": true, "animated-images": true })
    setShowResetNotice(true)
  }

  return (
    <div className="evo-menus">
      <header className="evo-menus__intro">
        <span className="evo-menus__eyebrow">APPLE NEUTRAL · SETTINGS COMPONENTS</span>
        <div className="evo-menus__intro-title"><h2>Menus & Settings</h2><Settings size={20} strokeWidth={1.75} aria-hidden="true" /></div>
        <p>Comprehensive iOS-style settings patterns: rows, switches, selection, accessibility, permissions, account, advanced preferences and states.</p>
        <span className="evo-menus__demo-label"><Info size={14} /> Interactive local previews · No real settings or permissions are changed</span>
      </header>

      <nav className="evo-menus__filters" aria-label="Settings component sections">
        {categories.map(item => <button type="button" key={item} aria-pressed={category === item}
          onClick={() => setCategory(item)}>{item}</button>)}
      </nav>

      {show("Settings Rows") && <section className="evo-menus__section">
        <SectionHeader index="01" title="Settings rows" summary="15 row anatomies using the same alignment, dividers, icons and trailing slots." count="15 variants" />
        <Subheading label="Production component · Borderless profile rows" hint="UI Kit reusable primitives"/>
        <div className="evo-ui-scope evo-menus__kit-example">
          <UISettingsGroup title="Fiók">
            <UISettingsRow icon={UserRound} title="Személyes adatok" onClick={() => setKitPreviewMessage("Personal details opened in preview only.")}/>
            <UISettingsRow icon={ShieldCheck} title="Biztonság" onClick={() => setKitPreviewMessage("Security opened in preview only.")}/>
          </UISettingsGroup>
          <UISettingsGroup title="Beállítások">
            <UISettingsSwitchRow icon={Bell} title="Értesítések" checked={enabled("kit-notifications",false)} onChange={value => toggle("kit-notifications",value)} />
            <UISettingsRow icon={Palette} title="Megjelenés" value="Világos" showChevron={false}/>
          </UISettingsGroup>
          <p className="evo-menus__helper">Shared UISettingsGroup, UISettingsRow and UISwitch components. The preview doesn't change profile settings.</p>
          {kitPreviewMessage && <p className="evo-menus__helper" role="status">{kitPreviewMessage}</p>}
        </div>
        <Subheading label="Settings row anatomy" hint="15 variants"/>
        <div className="evo-menus__group">{rowVariants.map(row => <SettingRow key={row.title} {...row} />)}</div>
        <Subheading label="Group presentations" hint="3 layouts" />
        <div className="evo-menus__presentations">
          <div><span>Inset grouped</span><div className="evo-menus__presentation-card"><List size={18} /> General {chev}</div></div>
          <div><span>Plain list</span><div className="evo-menus__presentation-plain"><Palette size={18} /> Appearance {chev}</div></div>
          <div><span>Compact</span><div className="evo-menus__presentation-compact"><Globe size={17} /> Language {chev}</div></div>
        </div>
      </section>}

      {show("Switches") && <section className="evo-menus__section">
        <SectionHeader index="02" title="Switches & toggles" summary="10 styles including labeled, disabled, dependent, system-managed and pending." count="10 variants" />
        <div className="evo-menus__group">
          {switchVariants.map(item => {
            const blocked = ("disabled" in item && item.disabled) || ("dependsOn" in item && Boolean(item.dependsOn) && !enabled("master", true))
            return <SettingRow key={item.id} title={item.title} description={item.description}
              trailing={<div className="evo-menus__toggle-trail">
                {"labeled" in item && <span className="evo-menus__value">{enabled(item.id, item.default) ? "On" : "Off"}</span>}
                {"managed" in item && <LockKeyhole size={15} />}
                {"pending" in item && <LoaderCircle size={15} className="evo-menus__spinner" />}
                <DemoSwitch checked={enabled(item.id, item.default)}
                  disabled={blocked} label={item.title}
                  onChange={value => toggle(item.id, value)} />
              </div>}
            />
          })}
        </div>
        <p className="evo-menus__helper">Disabled and managed switches are intentionally not editable. The pending variant is only a visual specimen.</p>
      </section>}

      {show("Selection") && <section className="evo-menus__section">
        <SectionHeader index="03" title="Radio & selection" summary="8 selection patterns with single choice, multiple choice, visual cards and segmented alternatives." count="8 variants" />

        <Subheading label="01 · Radio list" hint="Single choice" />
        <div className="evo-menus__group">
          {[{ id: "system", title: "System default", desc: "Follow device appearance" }, { id: "light", title: "Light", desc: "Always use light colors" }, { id: "dark", title: "Dark", desc: "Use dark preview colors" }].map(item =>
            <label key={item.id} className="evo-menus__choice-row">
              <span><strong>{item.title}</strong><small>{item.desc}</small></span>
              <input type="radio" name="evo-menu-appearance" value={item.id} checked={radioChoice === item.id} onChange={() => setRadioChoice(item.id)} />
            </label>)}
        </div>

        <Subheading label="02 · Checkmark list" hint="Single choice" />
        <div className="evo-menus__group">
          {[["english", "English"], ["hungarian", "Magyar"], ["romanian", "Română"]].map(([id, label]) =>
            <button key={id} className="evo-menus__choice-button" type="button" aria-pressed={checkChoice === id}
              onClick={() => setCheckChoice(id)}><span>{label}</span><CheckMark active={checkChoice === id} /></button>)}
        </div>

        <Subheading label="03 · Checkbox list" hint="Multiple choice" />
        <div className="evo-menus__group">
          {[["grammar", "Grammar practice"], ["speaking", "Speaking"], ["writing", "Writing"], ["listening", "Listening"]].map(([id, label]) =>
            <label key={id} className="evo-menus__choice-row evo-menus__choice-row--single">
              <span><strong>{label}</strong></span>
              <input type="checkbox" checked={multiChoices.includes(id)}
                onChange={event => setMultiChoices(old => event.target.checked ? [...old, id] : old.filter(item => item !== id))} />
            </label>)}
        </div>

        <Subheading label="04 · Segmented control" hint="2–4 choices" />
        <div className="evo-menus__segmented" role="group" aria-label="Interface density">
          {[["compact", "Compact"], ["comfortable", "Comfortable"], ["spacious", "Spacious"]].map(([value, label]) =>
            <button type="button" key={value} aria-pressed={density === value}
              onClick={() => setDensity(value)}>{label}</button>)}
        </div>

        <Subheading label="05 · Appearance tiles" hint="Visual single select" />
        <div className="evo-menus__appearance-tiles" role="group" aria-label="Appearance style preview">
          {[{ id: "light", title: "Light", Icon: Sun }, { id: "dark", title: "Dark", Icon: Moon }, { id: "system", title: "System", Icon: Smartphone }].map(({ id, title, Icon }) =>
            <button key={id} type="button" aria-pressed={themeChoice === id}
              className={themeChoice === id ? "evo-menus__appearance-tile evo-menus__appearance-tile--active" : "evo-menus__appearance-tile"}
              onClick={() => setThemeChoice(id)}>
              <span className={"evo-menus__appearance-preview evo-menus__appearance-preview--" + id}><Icon size={20} /></span>
              <span>{title}</span>
            </button>)}
        </div>

        <Subheading label="06 · Dropdown selector" hint="Native select" />
        <div className="evo-menus__select-row"><span>App language</span>
          <select aria-label="Demo language" value={dropdown} onChange={event => setDropdown(event.target.value)}>
            <option value="hu">Magyar</option><option value="en">English</option><option value="ro">Română</option>
          </select>
        </div>

        <Subheading label="07 · Icon choice" hint="Visual navigation" />
        <div className="evo-menus__icon-choices" role="group" aria-label="Preview calendar mode">
          {[{ id: "day", title: "Day", Icon: CalendarDays }, { id: "week", title: "Week", Icon: LayoutGrid }, { id: "agenda", title: "Agenda", Icon: List }].map(({ id, title, Icon }) =>
            <button type="button" key={id} aria-pressed={iconChoice === id} onClick={() => setIconChoice(id)}>
              <Icon size={19} /><span>{title}</span>
            </button>)}
        </div>

        <Subheading label="08 · Compact pills" hint="Inline choice" />
        <div className="evo-menus__pill-choices" role="group" aria-label="Text display mode">
          {[["standard", "Standard"], ["large", "Large"], ["extra", "Extra large"]].map(([id, title]) =>
            <button type="button" key={id} aria-pressed={compactChoice === id} onClick={() => setCompactChoice(id)}>{title}</button>)}
        </div>
      </section>}

      {show("Sliders") && <section className="evo-menus__section">
        <SectionHeader index="04" title="Sliders & steppers" summary="8 adjustable sliders, a bounded stepper, and a resettable value pattern." count="10 variants" />
        <div className="evo-menus__slider-group">
          {sliders.map(item => {
            const value = sliderValues[item.id] ?? item.initial
            return <div className="evo-menus__slider-item" key={item.id}>
              <div className="evo-menus__slider-top">
                <span><strong>{item.title}</strong><small>{item.description}</small></span>
                <output>{formatSlider(value, item.suffix)}</output>
              </div>
              <input type="range" aria-label={item.title} min={item.min} max={item.max} step={item.step} value={value}
                onChange={event => setSlider(item.id, Number(event.target.value))} />
              {item.id === "ticks" && <div className="evo-menus__ticks"><span>0</span><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span></div>}
              {item.id === "text" && <div className="evo-menus__text-preview" style={{ fontSize: Math.min(20, 13 * value / 100) + "px" }}>Sample text preview</div>}
            </div>
          })}
          <div className="evo-menus__slider-item evo-menus__stepper-row">
            <span><strong>Daily reminders</strong><small>Bounded stepper · 0 to 10</small></span>
            <div className="evo-menus__stepper">
              <button type="button" aria-label="Decrease reminders" disabled={stepper <= 0} onClick={() => setStepper(v => Math.max(0, v - 1))}><Minus size={17} /></button>
              <output aria-live="polite">{stepper}</output>
              <button type="button" aria-label="Increase reminders" disabled={stepper >= 10} onClick={() => setStepper(v => Math.min(10, v + 1))}><Plus size={17} /></button>
            </div>
          </div>
          <div className="evo-menus__slider-item evo-menus__stepper-row">
            <span><strong>Resettable slider</strong><small>Restore the original preview value</small></span>
            <button type="button" className="evo-menus__minor-button" onClick={() => setSlider("volume", 65)}><RotateCcw size={16} /> Reset volume</button>
          </div>
        </div>
      </section>}

      {show("Accessibility") && <section className="evo-menus__section">
        <SectionHeader index="05" title="Accessibility settings" summary="22 app-preference examples across vision, motion, interaction, hearing and speech." count="22 settings" />
        {accessibilityGroups.map(({ title, Icon, items }) => <div className="evo-menus__access-group" key={title}>
          <Subheading label={title} hint={items.length + " options"} />
          <div className="evo-menus__group">
            {items.map(item => <SettingRow key={item.id} title={item.title} description={item.description}
              Icon={Icon}
              trailing={item.kind === "switch" ?
                <DemoSwitch label={item.title} checked={enabled(item.id)} onChange={value => toggle(item.id, value)} /> :
                chev}
            />)}
          </div>
        </div>)}
        <p className="evo-menus__helper">Preview-only app controls. Production accessibility settings should honor operating system preferences and be implemented where the feature actually exists.</p>
      </section>}

      {show("Permissions") && <section className="evo-menus__section">
        <SectionHeader index="06" title="Privacy & permissions" summary="8 permission status rows, including not requested, limited and system-controlled states." count="8 variants" />
        <div className="evo-menus__group">
          {permissions.map(({ Icon, name, status, description, state }) =>
            <SettingRow key={name} Icon={Icon} title={name} description={description}
              trailing={<span className={"evo-menus__permission-status evo-menus__permission-status--" + state}>{status}</span>} />)}
        </div>
        <div className="evo-menus__notice"><Info size={17} /><span>These are illustrative labels, not detected device permissions. In a real PWA, access must be checked with supported browser APIs and user action.</span></div>
      </section>}

      {show("Account") && <section className="evo-menus__section">
        <SectionHeader index="07" title="Account & security" summary="Avatar identity, subscription, connected services, authentication, export and destructive actions." count="10 rows + profile" />
        <div className="evo-menus__account-card">
          <div className="evo-menus__avatar evo-menus__avatar--large"><UserRound size={24} /></div>
          <span><strong>Example account</strong><small>demo@example.com · Free plan</small></span>
          {chev}
        </div>
        <div className="evo-menus__group">
          {accountRows.map(row => <SettingRow key={row.title} {...row} />)}
        </div>
        <p className="evo-menus__helper">All account information is sample content. Security and destructive rows are static specimens and cannot change your account.</p>
      </section>}

      {show("Advanced") && <section className="evo-menus__section">
        <SectionHeader index="08" title="Advanced menu patterns" summary="Nested preferences, disclosure, selectors, diagnostic controls, reset and grouped actions." count="10 variants" />
        <Subheading label="01 · Expandable disclosure" />
        <div className="evo-menus__group">
          <button className="evo-menus__disclosure-button" type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
            <SlidersHorizontal size={19} /><span>Advanced preferences</span>{expanded ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
          </button>
          {expanded && <div className="evo-menus__nested-content">
            <SettingRow title="Verbose diagnostics" Icon={Code2} trailing={<DemoSwitch label="Verbose diagnostics" checked={enabled("diagnostics")} onChange={value => toggle("diagnostics", value)} />} />
            <SettingRow title="Developer indicators" Icon={Eye} trailing={<DemoSwitch label="Developer indicators" checked={enabled("developer")} onChange={value => toggle("developer", value)} />} />
          </div>}
        </div>

        <Subheading label="02 · Nested menu" />
        <div className="evo-menus__group">
          <button type="button" className="evo-menus__disclosure-button" aria-expanded={subMenu} onClick={() => setSubMenu(!subMenu)}>
            <Globe size={19} /><span>Region preferences</span>{subMenu ? <ChevronUp size={17} /> : <ChevronRight size={17} />}
          </button>
          {subMenu && <div className="evo-menus__nested-content"><SettingRow title="Country" description="Example: Romania" trailing={chev} /><SettingRow title="Time format" description="24-hour display" trailing={chev} /></div>}
        </div>

        <Subheading label="03 · Inline value & selector" />
        <div className="evo-menus__group">
          <SettingRow title="App version" Icon={Info} trailing={<span className="evo-menus__value">1.0.0 · Preview</span>} />
          <div className="evo-menus__select-row"><span>Processing mode</span><select aria-label="Processing mode preview" value={advancedChoice} onChange={e => setAdvancedChoice(e.target.value)}>
            <option value="default">Default</option><option value="fast">Fast</option><option value="thorough">Thorough</option>
          </select></div>
        </div>

        <Subheading label="04 · Scheduler, connection & data" />
        <div className="evo-menus__group">
          <div className="evo-menus__select-row"><span>Backup frequency</span><select aria-label="Backup frequency preview" value={backupChoice} onChange={e => setBackupChoice(e.target.value)}>
            <option value="never">Never</option><option value="weekly">Weekly</option><option value="daily">Daily</option>
          </select></div>
          <SettingRow title="Storage" description="Local data · Example: 128 MB" Icon={HardDrive} trailing={chev} />
          <SettingRow title="Network status" description="Online · Example status" Icon={Cloud} trailing={<span className="evo-menus__status-dot" />} />
          <SettingRow title="Export settings" Icon={Download} trailing={chev} />
        </div>

        <Subheading label="05 · Reset actions" />
        <div className="evo-menus__group">
          <SettingRow title="Reset demo preferences" description="Restore local gallery defaults" Icon={RotateCcw} trailing={
            <button type="button" className="evo-menus__minor-button" onClick={resetPreview}>Reset preview</button>
          } />
          <SettingRow title="Clear all application data" Icon={Trash2} destructive trailing={chev} />
        </div>
        {showResetNotice && <p className="evo-menus__reset-message" role="status"><CheckCircle2 size={16} /> Preview controls reset. Your actual app settings were not changed.</p>}
      </section>}

      {show("States") && <section className="evo-menus__section">
        <SectionHeader index="09" title="States & feedback" summary="A consistent set of visual states for every control type." count="14 states" />
        <div className="evo-menus__states">
          {states.map(({ name, description, Icon, className }) =>
            <div className={"evo-menus__state evo-menus__state--" + (className ?? "normal")} key={name}>
              <Icon size={20} strokeWidth={1.75} aria-hidden="true" /><strong>{name}</strong><small>{description}</small>
            </div>)}
        </div>
      </section>}

      <footer className="evo-menus__footer">
        <div><Check size={16} /> Apple Neutral · SF Pro / Inter · 20px icons · 1.75 stroke</div>
        <p>Scoped to the UI Library. Preview interactions are local and do not save to a profile, request device permissions, or make network requests. Recommended minimum touch targets: 44 × 44px.</p>
      </footer>
    </div>
  )
}
