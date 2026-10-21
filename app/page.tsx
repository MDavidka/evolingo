"use client"

import { useState } from "react"
import { BarChart3, BookOpen, Users, UserRound } from "lucide-react"

const lessons = ["I am", "You are", "He is", "Questions"]

export default function HomePage() {
  const [activeTab, setActiveTab] = useState("Tanulás")
  const [selectedLesson, setSelectedLesson] = useState<string | null>(null)

  return (
    <main className="app-shell">
      <header className="home-header">
        <div className="brand">
          <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Image-D15751D4-6Ne8AGNrryN8wlvyBepC8VDGQkHTw4.jpeg" alt="Evölingo fox" />
          <h1>Evölingo</h1>
        </div>
        <button className="profile-avatar" aria-label="Profil megnyitása" onClick={() => setActiveTab("Profil")}>
          <UserRound size={26} strokeWidth={1.8} />
        </button>
      </header>

      <section className="learning-sheet" aria-label="Tanulási útvonal">
        <div className="sheet-handle" />
        <div className="lesson-heading">
          <h2>Present simple</h2>
          <p>Ebben a fejezetben a jelen<br />időt tanulod</p>
        </div>
        <div className="lesson-carousel" role="list" aria-label="Leckék">
          {lessons.map((lesson) => (
            <button
              className={`lesson-card ${selectedLesson === lesson ? "is-selected" : ""}`}
              key={lesson}
              role="listitem"
              onClick={() => setSelectedLesson(lesson)}
              aria-label={`${lesson} megnyitása`}
            >
              <span className="lesson-icon"><BookOpen size={32} strokeWidth={2.2} /></span>
              <strong>{lesson}</strong>
            </button>
          ))}
        </div>
      </section>

      <nav className="bottom-nav" aria-label="Fő navigáció">
        {[
          ["Tanulás", BookOpen],
          ["Barátok", Users],
          ["Tanterem", BarChart3],
          ["Profil", UserRound],
        ].map(([label, Icon]) => (
          <button className={`nav-item ${activeTab === label ? "active" : ""}`} key={label as string} onClick={() => setActiveTab(label as string)}>
            <Icon size={31} strokeWidth={1.9} />
            <span>{label as string}</span>
          </button>
        ))}
      </nav>
    </main>
  )
}
