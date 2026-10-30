"use client"

import { useEffect, useId, useRef, useState, type TouchEvent } from "react"
import { ArrowLeft, ArrowRight, Check, RotateCcw, Volume2, Lightbulb, BookOpen, Languages, CheckCircle2 } from "lucide-react"
import type { IntelligentBlock, IntelligentUI, GrammarRuleBlock, QuizChoiceBlock, PublicQuizChoiceBlock, VocabularyFlashcardBlock, ComparisonTableBlock, TenseTimelineBlock, StudyPlanBlock, ConceptCardBlock, ProgressBarsBlock } from "./schema"
import { validateIntelligentUI } from "./schema"
import ChartCard from "./chart-card"
import StudyCalculator from "./study-calculator"

function GrammarCard({ block }: { block: GrammarRuleBlock }) {
  const label = useId()
  return <section className="evo-iui-block" aria-labelledby={label}>
    <p className="evo-iui-kicker">Nyelvtani szabály</p>
    <h3 id={label}>{block.props.title}</h3>
    <p className="evo-iui-rule">{block.props.rule}</p>
    <div className="evo-iui-examples">{block.props.examples.map((value, i) => <p key={i}>{value}</p>)}</div>
  </section>
}

function QuizCard({ block, storageKey }: { block: QuizChoiceBlock | PublicQuizChoiceBlock; storageKey: string }) {
  const isServerGraded = "ticket" in block.props
  const [selected, setSelected] = useState<number | null>(null)
  const [result, setResult] = useState<{ correctIndex: number; correct: boolean; explanation: string } | null>(null)
  const [attempts, setAttempts] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const label = useId()
  const checked = result !== null
  const solutionIndex = result?.correctIndex ?? (!isServerGraded ? block.props.correctIndex : null)

  useEffect(() => {
    setSelected(null)
    setResult(null)
    setError("")
    try {
      const raw = localStorage.getItem(storageKey)
      const previous: unknown = raw ? JSON.parse(raw) : null
      if (!previous || typeof previous !== "object" || Array.isArray(previous)) return
      const state = previous as { selected?: unknown; attempts?: unknown; result?: unknown }
      if (Number.isInteger(state.selected) && typeof state.selected === "number" &&
          state.selected >= 0 && state.selected < block.props.choices.length) setSelected(state.selected)
      if (typeof state.attempts === "number" && Number.isInteger(state.attempts) &&
          state.attempts >= 0 && state.attempts <= 9999) setAttempts(state.attempts)
      if (state.result && typeof state.result === "object") {
        const saved = state.result as { correctIndex?: unknown; correct?: unknown; explanation?: unknown }
        if (typeof saved.correctIndex === "number" && Number.isInteger(saved.correctIndex) &&
            saved.correctIndex >= 0 && saved.correctIndex < block.props.choices.length &&
            typeof saved.correct === "boolean" && typeof saved.explanation === "string" &&
            saved.explanation.length < 500) {
          setResult({ correctIndex: saved.correctIndex, correct: saved.correct, explanation: saved.explanation })
        }
      }
    } catch { /* Missing storage must not block practice. */ }
  }, [storageKey, block.props.choices.length])

  const verify = async () => {
    if (selected === null || checked || submitting) return
    setSubmitting(true)
    setError("")
    try {
      let verified: { correctIndex: number; correct: boolean; explanation: string }
      if (isServerGraded) {
        const response = await fetch("/api/chat/quiz", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticket: block.props.ticket, selectedIndex: selected }),
          cache: "no-store",
          credentials: "same-origin",
        })
        const data = await response.json() as { correctIndex?: unknown; correct?: unknown; explanation?: unknown; error?: string }
        if (!response.ok || typeof data.correctIndex !== "number" || typeof data.correct !== "boolean" ||
            typeof data.explanation !== "string" || data.correctIndex < 0 ||
            data.correctIndex >= block.props.choices.length)
          throw new Error(data.error || "A válasz ellenőrzése sikertelen.")
        verified = { correctIndex: data.correctIndex, correct: data.correct, explanation: data.explanation }
      } else {
        verified = {
          correctIndex: block.props.correctIndex,
          correct: selected === block.props.correctIndex,
          explanation: block.props.explanation,
        }
      }
      const nextAttempts = attempts + 1
      setAttempts(nextAttempts)
      setResult(verified)
      try { localStorage.setItem(storageKey, JSON.stringify({ selected, attempts: nextAttempts, result: verified })) } catch {}
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "A válasz ellenőrzése nem sikerült.")
    } finally {
      setSubmitting(false)
    }
  }
  const retry = () => {
    setSelected(null)
    setResult(null)
    setError("")
    try { localStorage.setItem(storageKey, JSON.stringify({ selected: null, attempts })) } catch {}
  }

  return <section className="evo-iui-block evo-iui-quiz" aria-labelledby={label}>
    <div className="evo-iui-flex-heading">
      <div><p className="evo-iui-kicker">Gyakorlókérdés</p><h3 id={label}>{block.props.question}</h3></div>
      <span className="evo-iui-count">{attempts ? attempts + ". próbálkozás" : "1 kérdés"}</span>
    </div>
    <div className="evo-iui-choices" role="group" aria-label="Válaszlehetőségek">
      {block.props.choices.map((choice, i) => <button key={i} type="button"
        aria-pressed={selected === i} disabled={checked || submitting}
        className={checked ? (i === solutionIndex ? "is-correct" : selected === i ? "is-incorrect" : "") : selected === i ? "is-selected" : ""}
        onClick={() => setSelected(i)}>
        <span>{String.fromCharCode(65 + i)}</span>{choice}
        {checked && i === solutionIndex && <Check size={17} aria-hidden="true" />}
      </button>)}
    </div>
    {!checked && <button className="evo-iui-check-answer" type="button" disabled={selected === null || submitting}
      onClick={() => void verify()}>{submitting ? "Ellenőrzés…" : "Válasz ellenőrzése"}</button>}
    {error && <p className="evo-iui-quiz-error" role="alert">{error}</p>}
    {result && <div className="evo-iui-feedback" role="status">
      <strong>{result.correct ? "Helyes válasz!" : "Nem ez a helyes válasz."}</strong>
      <p>{result.explanation}</p>
      <button type="button" onClick={retry}><RotateCcw size={15} /> Újrapróbálás</button>
    </div>}
    {isServerGraded && <p className="evo-iui-quiz-note">A helyes válasz ellenőrzése a szerveren történik. Ez gyakorlás, nem hivatalos leckepont.</p>}
  </section>
}

function Flashcard({ block, storageKey }: { block: VocabularyFlashcardBlock; storageKey: string }) {
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [mastery, setMastery] = useState<Record<number, boolean>>({})
  const label = useId()
  const swipeOrigin = useRef<{ x: number; y: number } | null>(null)
  const swiped = useRef(false)
  const cards = block.props.cards
  const current = cards[index]
  const known = Object.values(mastery).filter(Boolean).length
  const go = (next: number) => {
    if (next < 0 || next >= cards.length) return
    setIndex(next)
    setFlipped(false)
  }
  useEffect(() => {
    setIndex(0)
    setFlipped(false)
    try {
      const raw = localStorage.getItem(storageKey)
      const previous: unknown = raw ? JSON.parse(raw) : null
      if (previous && typeof previous === "object" && !Array.isArray(previous)) {
        const safe: Record<number, boolean> = {}
        for (const [key, value] of Object.entries(previous)) {
          const id = Number(key)
          if (Number.isInteger(id) && id >= 0 && id < cards.length && typeof value === "boolean") safe[id] = value
        }
        setMastery(safe)
      }
    } catch {}
  }, [storageKey, cards.length])
  const mark = (value: boolean) => {
    const next = { ...mastery, [index]: value }
    setMastery(next)
    try { localStorage.setItem(storageKey, JSON.stringify(next)) } catch {}
    if (index < cards.length - 1) go(index + 1)
  }
  const pronounce = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) return
    window.speechSynthesis.cancel()
    const message = new SpeechSynthesisUtterance(current.front)
    message.lang = "en-GB"
    message.rate = 0.9
    window.speechSynthesis.speak(message)
  }
  const touchEnd = (event: TouchEvent<HTMLButtonElement>) => {
    const first = swipeOrigin.current
    swipeOrigin.current = null
    if (!first) return
    const last = event.changedTouches[0]
    if (!last) return
    const dx = last.clientX - first.x
    const dy = last.clientY - first.y
    if (Math.abs(dx) > 52 && Math.abs(dx) > Math.abs(dy) * 1.3) {
      swiped.current = true
      go(index + (dx < 0 ? 1 : -1))
    }
  }

  return <section className="evo-iui-block evo-iui-vocabulary" aria-labelledby={label}>
    <div className="evo-iui-flex-heading"><div><p className="evo-iui-kicker">Tanulókártyák</p><h3 id={label}>{block.props.title}</h3></div><span className="evo-iui-count">{index + 1} / {cards.length}</span></div>
    <button type="button" className="evo-iui-flashcard" aria-label={flipped ? "Vissza a szóhoz" : "Jelentés megjelenítése"}
      onClick={() => { if (swiped.current) { swiped.current = false; return } setFlipped(v => !v) }}
      onTouchStart={event => { const touch = event.touches[0]; if (touch) swipeOrigin.current = { x: touch.clientX, y: touch.clientY } }}
      onTouchEnd={touchEnd}>
      <small>{flipped ? "Jelentés" : "Kifejezés"}</small>
      <strong>{flipped ? current.back : current.front}</strong>
      {flipped && current.example && <span>{current.example}</span>}
      <em>Érintsd meg a megfordításhoz · Húzd oldalra a váltáshoz</em>
    </button>
    <div className="evo-iui-pager">
      <button type="button" disabled={index === 0} aria-label="Előző kártya" onClick={() => go(index - 1)}><ArrowLeft size={19} /></button>
      <button type="button" className="evo-iui-pronounce" aria-label="Angol kiejtés meghallgatása" onClick={pronounce}><Volume2 size={18} /> Kiejtés</button>
      <button type="button" disabled={index === cards.length - 1} aria-label="Következő kártya" onClick={() => go(index + 1)}><ArrowRight size={19} /></button>
    </div>
    <div className="evo-iui-mastery">
      <div className="evo-iui-mastery-heading"><span>Ismert kifejezések</span><strong>{known} / {cards.length}</strong></div>
      <progress max={cards.length} value={known} aria-label="Elsajátított kifejezések" />
      <div className="evo-iui-mastery-actions">
        <button type="button" onClick={() => mark(false)}>Ismétlem</button>
        <button type="button" onClick={() => mark(true)}><Check size={16} /> Tudom</button>
      </div>
      <p>A kártyák értékelése ezen az eszközön marad; nem módosítja a leckepontokat.</p>
    </div>
  </section>
}

function Comparison({ block }: { block: ComparisonTableBlock }) {
  const label = useId()
  return <section className="evo-iui-block" aria-labelledby={label}>
    <p className="evo-iui-kicker">Összehasonlítás</p>
    <h3 id={label}>{block.props.title}</h3>
    <div className="evo-iui-comparison">
      <div className="evo-iui-comparison-head"><span></span><strong>{block.props.columns[0]}</strong><strong>{block.props.columns[1]}</strong></div>
      {block.props.rows.map((row, i) => <div className="evo-iui-comparison-row" key={i}><strong>{row.label}</strong><span>{row.left}</span><span>{row.right}</span></div>)}
    </div>
  </section>
}

function Timeline({ block }: { block: TenseTimelineBlock }) {
  const [active, setActive] = useState(0)
  const label = useId()
  const selected = block.props.steps[active]
  return <section className="evo-iui-block" aria-labelledby={label}>
    <p className="evo-iui-kicker">Idővonal</p>
    <h3 id={label}>{block.props.title}</h3>
    <div className="evo-iui-timeline-tabs" role="group" aria-label="Idővonal lépései">
      {block.props.steps.map((step, i) => <button key={i} type="button" className={active === i ? "is-active" : ""} aria-pressed={active === i} onClick={() => setActive(i)}>{step.label}</button>)}
    </div>
    <div className="evo-iui-timeline-description" role="status"><span>{selected.phase === "past" ? "Múlt" : selected.phase === "present" ? "Jelen" : "Jövő"}</span><p>{selected.detail}</p></div>
  </section>
}

function StudyPlan({ block, storageKey }: { block: StudyPlanBlock; storageKey: string }) {
  const [done, setDone] = useState<number[]>([])
  const [ready, setReady] = useState(false)
  const label = useId()
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(storageKey)
      const parsed: unknown = stored ? JSON.parse(stored) : null
      if (Array.isArray(parsed)) setDone(parsed.filter((n): n is number => Number.isInteger(n) && n >= 0 && n < block.props.days.length))
    } catch {}
    setReady(true)
  }, [storageKey, block.props.days.length])
  useEffect(() => {
    if (!ready) return
    try { sessionStorage.setItem(storageKey, JSON.stringify(done)) } catch {}
  }, [done, ready, storageKey])
  return <section className="evo-iui-block" aria-labelledby={label}>
    <div className="evo-iui-flex-heading"><div><p className="evo-iui-kicker">Tanulási terv</p><h3 id={label}>{block.props.title}</h3></div><span className="evo-iui-count">{done.length}/{block.props.days.length}</span></div>
    <div className="evo-iui-plan">
      {block.props.days.map((day, i) => <label key={i}>
        <input type="checkbox" checked={done.includes(i)} onChange={e => setDone(previous => e.target.checked ? [...previous, i] : previous.filter(n => n !== i))} />
        <span className="evo-iui-check" aria-hidden="true">{done.includes(i) && <Check size={14} />}</span>
        <span><strong>{day.day}</strong><small>{day.task}</small></span>
      </label>)}
    </div>
    <p className="evo-iui-hint">A jelölések ebben a beszélgetésben maradnak. A terv nem módosítja a leckéidet.</p>
  </section>
}

function Concept({ block }: { block: ConceptCardBlock }) {
  const label = useId()
  const iconMap = { idea: Lightbulb, book: BookOpen, language: Languages, check: CheckCircle2 }
  const Icon = iconMap[block.props.icon]
  return <section className="evo-iui-block evo-iui-concept" aria-labelledby={label}>
    <div className="evo-iui-concept-top"><span className="evo-iui-concept-icon"><Icon size={23} strokeWidth={1.75} aria-hidden="true" /></span>
    {block.props.badge && <span className="evo-iui-concept-badge">{block.props.badge}</span>}</div>
    <h3 id={label}>{block.props.title}</h3>
    <p>{block.props.description}</p>
  </section>
}

function Progress({ block }: { block: ProgressBarsBlock }) {
  const label = useId()
  return <section className="evo-iui-block" aria-labelledby={label}>
    <p className="evo-iui-kicker">Haladás</p><h3 id={label}>{block.props.title}</h3>
    <div className="evo-iui-progress">{block.props.items.map((item, i) => <div key={i}><div><strong>{item.label}</strong><span>{item.value} / {item.max}</span></div><progress value={item.value} max={item.max} aria-label={item.label} /></div>)}</div>
  </section>
}

function Block({ block, storageKey }: { block: IntelligentBlock; storageKey: string }) {
  switch (block.type) {
    case "grammar_rule": return <GrammarCard block={block} />
    case "quiz_choice": return <QuizCard block={block} storageKey={storageKey} />
    case "vocabulary_flashcard": return <Flashcard block={block} storageKey={storageKey} />
    case "comparison_table": return <Comparison block={block} />
    case "tense_timeline": return <Timeline block={block} />
    case "study_plan": return <StudyPlan block={block} storageKey={storageKey} />
    case "concept_card": return <Concept block={block} />
    case "progress_bars": return <Progress block={block} />
    case "chart_card": return <ChartCard block={block} storageKey={storageKey} />
    case "study_calculator": return <StudyCalculator block={block} storageKey={storageKey} />
    default: return null
  }
}

/** Safe by construction: only validated descriptors map to prebuilt components. */
export default function IntelligentResponse({ ui, messageId, verifiedData = false }: { ui: IntelligentUI; messageId?: string; verifiedData?: boolean }) {
  const validated = validateIntelligentUI(ui, { allowVerifiedCharts: verifiedData, allowUserProgress: verifiedData, allowPublicQuizzes: true })
  if (!validated || !validated.blocks.length) return null
  return <div className="evo-iui-response">
    {validated.blocks.map(block => <Block key={block.id} block={block} storageKey={"evolingo.study-plan.v1." + (messageId || "session") + "." + block.id} />)}
  </div>
}
