"use client"

import {
  Bell,
  ChevronRight,
  Ellipsis,
  Folder,
  Layers,
  Palette,
  Plus,
  UserRound,
} from "lucide-react"
import "./evolingo-design-system-demo.css"

const palettes = [
  {
    id: "apple",
    title: "Apple System",
    description: "Native iOS neutral",
    swatches: [
      { role: "Canvas", color: "#FFFFFF" },
      { role: "Surface", color: "#F2F2F7" },
      { role: "Border", color: "#E5E5EA" },
      { role: "Text", color: "#1C1C1E" },
      { role: "Accent", color: "#007AFF" },
    ],
  },
  {
    id: "chatgpt",
    title: "ChatGPT Neutral",
    description: "Soft, content-first",
    swatches: [
      { role: "Canvas", color: "#FFFFFF" },
      { role: "Surface", color: "#F7F7F8" },
      { role: "Border", color: "#E8E8EB" },
      { role: "Text", color: "#202124" },
      { role: "Accent", color: "#202124" },
    ],
  },
  {
    id: "graphite",
    title: "Apple Graphite",
    description: "Premium monochrome",
    swatches: [
      { role: "Canvas", color: "#FFFFFF" },
      { role: "Surface", color: "#F5F5F5" },
      { role: "Border", color: "#D1D1D6" },
      { role: "Text", color: "#1C1C1E" },
      { role: "Accent", color: "#636366" },
    ],
  },
  {
    id: "dark",
    title: "Apple Dark",
    description: "Dark system appearance",
    swatches: [
      { role: "Canvas", color: "#000000" },
      { role: "Surface", color: "#1C1C1E" },
      { role: "Border", color: "#38383A" },
      { role: "Text", color: "#F5F5F7" },
      { role: "Accent", color: "#0A84FF" },
    ],
  },
] as const

const typeScale = [
  { name: "Large title", token: "largeTitle", size: 34, weight: 700, line: 41, sample: "Your workspace" },
  { name: "Title 1", token: "title1", size: 28, weight: 700, line: 34, sample: "Learning overview" },
  { name: "Title 2", token: "title2", size: 22, weight: 600, line: 28, sample: "Your progress" },
  { name: "Title 3", token: "title3", size: 20, weight: 600, line: 26, sample: "Recent activity" },
  { name: "Headline", token: "headline", size: 17, weight: 600, line: 23, sample: "Continue your lesson" },
  { name: "Body", token: "body", size: 16, weight: 400, line: 23, sample: "Learn something new today." },
  { name: "Callout", token: "callout", size: 15, weight: 400, line: 21, sample: "Build your daily learning habit." },
  { name: "Subheadline", token: "subheadline", size: 14, weight: 500, line: 20, sample: "12 completed lessons" },
  { name: "Footnote", token: "footnote", size: 13, weight: 400, line: 18, sample: "Updated a few minutes ago" },
  { name: "Caption", token: "caption", size: 12, weight: 400, line: 17, sample: "SECONDARY INFORMATION" },
] as const

const fontPresets = [
  { name: "Apple System", info: "SF Pro on Apple devices", className: "evo-design-demo__font--system", sample: "Learn better, every day." },
  { name: "Inter", info: "Consistent modern fallback", className: "evo-design-demo__font--inter", sample: "Learn better, every day." },
  { name: "Rounded System", info: "Friendly accent style", className: "evo-design-demo__font--rounded", sample: "Learn better, every day." },
] as const

const spacing = [4, 8, 12, 16, 20, 24, 32] as const
const paddingPresets = [
  { name: "Screen", value: "16px horizontal" },
  { name: "Card", value: "12–16px" },
  { name: "Menu row", value: "12–16px" },
  { name: "Composer", value: "12px" },
  { name: "Toolbar", value: "8–12px" },
  { name: "Modal", value: "20–24px" },
] as const

const radii = [
  { name: "Small", px: "8px" },
  { name: "Medium", px: "12px" },
  { name: "Large", px: "18px" },
  { name: "Capsule", px: "999px" },
] as const

function DemoHeading({ id, number, title, subtitle }: { id: string; number: string; title: string; subtitle: string }) {
  return (
    <header className="evo-design-demo__heading">
      <span className="evo-design-demo__eyebrow">{number}</span>
      <h3 id={id}>{title}</h3>
      <p>{subtitle}</p>
    </header>
  )
}

export default function DesignSystemShowcase() {
  return (
    <div className="evo-design-demo">
      <div className="evo-design-demo__intro">
        <span className="evo-design-demo__eyebrow">DESIGN SYSTEM · UI LIBRARY</span>
        <div className="evo-design-demo__intro-title">
          <h2>Apple Neutral</h2>
          <span className="evo-design-demo__intro-symbol"><Palette size={19} strokeWidth={1.75} aria-hidden="true" /></span>
        </div>
        <p>Apple-style precision with ChatGPT-inspired restraint. A reference gallery only; existing screens remain unchanged.</p>
        <div className="evo-design-demo__hero-colors" aria-label="Apple Neutral color scale">
          {palettes[0].swatches.map((swatch) => (
            <span key={swatch.role} style={{ backgroundColor: swatch.color }} title={swatch.role + " " + swatch.color} />
          ))}
        </div>
      </div>

      <section className="evo-design-demo__section" aria-labelledby="evo-design-colors">
        <DemoHeading id="evo-design-colors" number="01 / COLORS" title="Color presets" subtitle="Four ready-to-use palettes, each with five semantic roles." />
        <div className="evo-design-demo__palette-grid">
          {palettes.map((palette) => (
            <article className="evo-design-demo__palette" key={palette.id}>
              <div className="evo-design-demo__palette-title">
                <div><h4>{palette.title}</h4><p>{palette.description}</p></div>
                {palette.id === "apple" && <span className="evo-design-demo__default-tag">Default</span>}
              </div>
              <div className="evo-design-demo__swatches">
                {palette.swatches.map((swatch) => (
                  <div className="evo-design-demo__swatch" key={swatch.role}>
                    <span className="evo-design-demo__swatch-color" style={{ backgroundColor: swatch.color }} />
                    <span className="evo-design-demo__swatch-role">{swatch.role}</span>
                    <span className="evo-design-demo__swatch-hex">{swatch.color}</span>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="evo-design-demo__section" aria-labelledby="evo-design-type">
        <DemoHeading id="evo-design-type" number="02 / TYPOGRAPHY" title="Font styles" subtitle="A consistent native-feeling hierarchy with reusable text tokens." />
        <div className="evo-design-demo__font-grid">
          {fontPresets.map((font) => (
            <article className="evo-design-demo__font-card" key={font.name}>
              <div className="evo-design-demo__font-card-head"><strong>{font.name}</strong><small>{font.info}</small></div>
              <p className={font.className}>{font.sample}</p>
            </article>
          ))}
        </div>
        <div className="evo-design-demo__type-scale">
          {typeScale.map((type) => (
            <div className="evo-design-demo__type-row" key={type.token}>
              <div className="evo-design-demo__type-meta">
                <span>{type.name}</span>
                <code>{type.token} · {type.size}/{type.line} · {type.weight}</code>
              </div>
              <p style={{ fontSize: type.size, fontWeight: type.weight, lineHeight: type.line + "px" }}>{type.sample}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="evo-design-demo__section" aria-labelledby="evo-design-spacing">
        <DemoHeading id="evo-design-spacing" number="03 / SPACING" title="Spacing & padding" subtitle="4px increments, with 8px as the default rhythm." />
        <div className="evo-design-demo__spacing-list">
          {spacing.map((px) => (
            <div className="evo-design-demo__spacing-row" key={px}>
              <span>{px}px</span>
              <div><span style={{ width: (px / 32) * 100 + "%" }} /></div>
            </div>
          ))}
        </div>
        <div className="evo-design-demo__padding-grid">
          {paddingPresets.map((item) => (
            <div className="evo-design-demo__padding-item" key={item.name}><span>{item.name}</span><strong>{item.value}</strong></div>
          ))}
        </div>
      </section>

      <section className="evo-design-demo__section" aria-labelledby="evo-design-layers">
        <DemoHeading id="evo-design-layers" number="04 / LAYERS" title="Surfaces & elevation" subtitle="Depth through neutral surfaces and borders—not heavy effects." />
        <div className="evo-design-demo__layers">
          <div className="evo-design-demo__layer evo-design-demo__layer--canvas">
            <div><strong>Layer 0 · Canvas</strong><small>White · Main page background</small></div>
            <span>#FFFFFF</span>
          </div>
          <div className="evo-design-demo__layer evo-design-demo__layer--group">
            <div><strong>Layer 1 · Grouped</strong><small>Settings, folders, secondary cards</small></div>
            <span>#F2F2F7</span>
          </div>
          <div className="evo-design-demo__layer evo-design-demo__layer--elevated">
            <div><strong>Layer 2 · Elevated</strong><small>Menus, popovers and sheets</small></div>
            <Layers size={19} strokeWidth={1.75} aria-hidden="true" />
          </div>
          <div className="evo-design-demo__layer evo-design-demo__layer--emphasis">
            <div><strong>Layer 3 · Emphasis</strong><small>Primary action and focus</small></div>
            <span>#1C1C1E</span>
          </div>
        </div>
      </section>

      <section className="evo-design-demo__section" aria-labelledby="evo-design-radius">
        <DemoHeading id="evo-design-radius" number="05 / SHAPE" title="Corner radii" subtitle="Compact controls, soft content cards and capsule actions." />
        <div className="evo-design-demo__radii">
          {radii.map((radius) => (
            <div className="evo-design-demo__radius" key={radius.name}>
              <span style={{ borderRadius: radius.px }} />
              <strong>{radius.name}</strong>
              <small>{radius.px}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="evo-design-demo__section" aria-labelledby="evo-design-presets">
        <DemoHeading id="evo-design-presets" number="06 / PRESETS" title="Component presets" subtitle="Static examples that combine tokens into finished interface patterns." />
        <div className="evo-design-demo__specimens">
          <article className="evo-design-demo__specimen">
            <h4>Apple grouped</h4>
            <div className="evo-design-demo__menu">
              {[
                { title: "Account", icon: UserRound },
                { title: "Notifications", icon: Bell },
                { title: "Appearance", icon: Palette },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <div className="evo-design-demo__menu-row" key={item.title}>
                    <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
                    <span>{item.title}</span>
                    <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
                  </div>
                )
              })}
            </div>
          </article>

          <article className="evo-design-demo__specimen">
            <h4>ChatGPT minimal</h4>
            <div className="evo-design-demo__actions">
              <div className="evo-design-demo__primary-action">Continue</div>
              <div className="evo-design-demo__secondary-action"><Plus size={20} strokeWidth={1.75} aria-hidden="true" /></div>
            </div>
          </article>

          <article className="evo-design-demo__specimen">
            <h4>Apple content card</h4>
            <div className="evo-design-demo__content-card">
              <div className="evo-design-demo__content-icon"><Folder size={21} strokeWidth={1.75} aria-hidden="true" /></div>
              <div><strong>My documents</strong><small>12 files</small></div>
              <Ellipsis size={20} className="evo-design-demo__muted" aria-hidden="true" />
            </div>
          </article>
        </div>
      </section>

      <section className="evo-design-demo__section evo-design-demo__section--last" aria-labelledby="evo-design-tokens">
        <DemoHeading id="evo-design-tokens" number="07 / BASE TOKENS" title="Recommended defaults" subtitle="Starting values for future Evolingo components." />
        <div className="evo-design-demo__tokens">
          {[
            { label: "Primary text & buttons", token: "#1C1C1E", color: "#1C1C1E" },
            { label: "System accent", token: "#007AFF", color: "#007AFF" },
            { label: "Grouped surface", token: "#F2F2F7", color: "#F2F2F7" },
            { label: "Hairline border", token: "#E5E5EA", color: "#E5E5EA" },
          ].map((entry) => (
            <div className="evo-design-demo__token" key={entry.label}>
              <span>{entry.label}</span>
              <div><i style={{ backgroundColor: entry.color }} /><code>{entry.token}</code></div>
            </div>
          ))}
          <div className="evo-design-demo__token"><span>Font stack</span><code>SF Pro / System UI / Inter</code></div>
          <div className="evo-design-demo__token"><span>Spacing scale</span><code>4 / 8 / 12 / 16 / 24 / 32</code></div>
        </div>
      </section>
    </div>
  )
}
