"use client"

import {
  ArrowUpRight,
  BookOpen,
  BrainCircuit,
  CalendarDays,
  ChevronRight,
  Ellipsis,
  FileImage,
  FileSpreadsheet,
  FileText,
  Folder,
  FolderOpen,
} from "lucide-react"
import "./evolingo-cards-demo.css"

const imageCards = [
  {
    title: "Biology",
    subtitle: "12 lessons",
    alt: "Sunlight through a green forest",
    src: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=720&q=80",
  },
  {
    title: "English",
    subtitle: "8 lessons",
    alt: "London skyline and Big Ben",
    src: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=720&q=80",
  },
]

const iconCards = [
  { title: "Schedule", subtitle: "Manage your day", icon: CalendarDays, variant: "filled" },
  { title: "Learning", subtitle: "Explore lessons", icon: BookOpen, variant: "filled" },
  { title: "AI tools", subtitle: "", icon: BrainCircuit, variant: "outline" },
  { title: "Library", subtitle: "", icon: FolderOpen, variant: "outline" },
] as const

const files = [
  { name: "English notes.pdf", meta: "PDF · 2.4 MB", icon: FileText },
  { name: "Study plan.xlsx", meta: "Spreadsheet · 840 KB", icon: FileSpreadsheet },
  { name: "Biology diagram.png", meta: "Image · 1.2 MB", icon: FileImage },
]

const folders = [
  { name: "School", meta: "14 files" },
  { name: "Projects", meta: "6 files" },
  { name: "English", meta: "23 files" },
  { name: "Images", meta: "8 files" },
]

export default function CardsShowcase() {
  return (
    <div className="evo-cards-demo">
      <section className="evo-cards-demo__section" aria-labelledby="evo-cards-images-title">
        <div className="evo-cards-demo__section-header">
          <h3 id="evo-cards-images-title">01 — Image cards</h3>
          <p>Edge-to-edge imagery, compact text beneath.</p>
        </div>
        <div className="evo-cards-demo__grid">
          {imageCards.map((card) => (
            <article className="evo-cards-demo__image-card" key={card.title}>
              {/* Native img keeps the specimens independent of Next image-host configuration. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={card.src} alt={card.alt} loading="lazy" decoding="async" />
              <div className="evo-cards-demo__image-copy">
                <h4>{card.title}</h4>
                <p>{card.subtitle}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="evo-cards-demo__section" aria-labelledby="evo-cards-icons-title">
        <div className="evo-cards-demo__section-header">
          <h3 id="evo-cards-icons-title">02 — Icon cards</h3>
          <p>Filled and outlined variations, without icon backgrounds.</p>
        </div>
        <div className="evo-cards-demo__grid">
          {iconCards.map((card) => {
            const Icon = card.icon
            return (
              <article className={`evo-cards-demo__icon-card evo-cards-demo__icon-card--${card.variant}`} key={card.title}>
                <Icon size={24} strokeWidth={1.8} aria-hidden="true" />
                <div className="evo-cards-demo__icon-copy">
                  <h4>{card.title}</h4>
                  {card.subtitle && <p>{card.subtitle}</p>}
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <section className="evo-cards-demo__section" aria-labelledby="evo-cards-files-title">
        <div className="evo-cards-demo__section-header">
          <h3 id="evo-cards-files-title">03 — Files &amp; folders</h3>
          <p>Compact rows and a two-column folder grid.</p>
        </div>

        <div className="evo-cards-demo__subsection">
          <h4 className="evo-cards-demo__eyebrow">File list</h4>
          <div className="evo-cards-demo__file-list">
            {files.map((file) => {
              const Icon = file.icon
              return (
                <div className="evo-cards-demo__file-row" key={file.name}>
                  <span className="evo-cards-demo__file-icon"><Icon size={21} strokeWidth={1.8} aria-hidden="true" /></span>
                  <span className="evo-cards-demo__file-copy"><strong>{file.name}</strong><small>{file.meta}</small></span>
                  <Ellipsis className="evo-cards-demo__trailing" size={19} aria-hidden="true" />
                </div>
              )
            })}
          </div>
        </div>

        <div className="evo-cards-demo__subsection">
          <h4 className="evo-cards-demo__eyebrow">Folder grid</h4>
          <div className="evo-cards-demo__grid">
            {folders.map((folder) => (
              <article className="evo-cards-demo__folder-card" key={folder.name}>
                <div className="evo-cards-demo__folder-top">
                  <Folder size={24} strokeWidth={1.8} aria-hidden="true" />
                  <Ellipsis size={18} className="evo-cards-demo__trailing" aria-hidden="true" />
                </div>
                <div>
                  <h4>{folder.name}</h4>
                  <p>{folder.meta}</p>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="evo-cards-demo__subsection">
          <h4 className="evo-cards-demo__eyebrow">Folder row</h4>
          <div className="evo-cards-demo__folder-row">
            <Folder size={22} strokeWidth={1.8} aria-hidden="true" />
            <span className="evo-cards-demo__file-copy"><strong>My documents</strong><small>32 items</small></span>
            <ChevronRight size={17} className="evo-cards-demo__trailing" aria-hidden="true" />
          </div>
        </div>
      </section>

      <div className="evo-cards-demo__note">
        <ArrowUpRight size={14} aria-hidden="true" />
        Static UI specimens only — no files or folders are modified.
      </div>
    </div>
  )
}
