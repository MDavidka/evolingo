"use client"

import { useEffect, useId, useState } from "react"
import { ArrowLeft, ArrowRight, Check, RotateCcw, Lightbulb, BookOpen, Languages, CheckCircle2 } from "lucide-react"
import type { IntelligentBlock, IntelligentUI, GrammarRuleBlock, QuizChoiceBlock, VocabularyFlashcardBlock, ComparisonTableBlock, TenseTimelineBlock, StudyPlanBlock, ConceptCardBlock, ProgressBarsBlock } from "./schema"
import { validateIntelligentUI } from "./schema"
import ChartCard from "./chart-card"

function GrammarCard({ block }: { block: GrammarRuleBlock }) {
  const label = useId()
  return <section className="evo-iui-block" aria-labelledby={label}>
    <p className="evo-iui-kicker">Nyelvtani szabály</p>
    <h3 id={label}>{block.props.title}</h3>
    <p className="evo-iui-rule">{block.props.rule}</p>
    <div className="evo-iui-examples">{block.props.examples.map((value, i) => <p key={i}>{value}</p>)}</div>
  </section>
}

function QuizCard({ block, storageKey }: { block: QuizChoiceBlock; storageKey: string }) {
  const [selected, setSelected] = useState<number | null>(null)
  const [checked, setChecked] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const label = useId()
  const correct = selected === block.props.correctIndex

  useEffect(() => {
    setSelected(null)
    setChecked(false)
    try {
      const raw = localStorage.getItem(storageKey)
      const previous: unknown = raw ? JSON.parse(raw) : null
      if (!previous || typeof previous !== "object") return
      const progress = previous as { selected?: unknown; checked?: unknown; attempts?: unknown }
      if (typeof progress.selected === "number" && Number.isInteger(progress.selected) &&
          progress.selected >= 0 && progress.selected < block.props.choices.length) {
        setSelected(progress.selected)
        setChecked(progress.checked === true)
      }
      if (typeof progress.attempts === "number" && Number.isInteger(progress.attempts) &&
          progress.attempts >= 0 && progress.attempts < 10000) setAttempts(progress.attempts)
    } catch {}
  }, [storageKey, block.props.choices.length])

  const verify = () => {
    if (selected === null || checked) return
    const nextAttempts = attempts + 1
    setChecked(true)
    setAttempts(nextAttempts)
    try { localStorage.setItem(storageKey, JSON.stringify({ selected, checked: true, attempts: nextAttempts })) } catch {}
  }
  const retry = () => {
    setSelected(null)
    setChecked(false)
    try { localStorage.setItem(storageKey, JSON.stringify({ selected: null, checked: false, attempts })) } catch {}
  }
  const choose = (index: number) => {
    if (checked) return
    setSelected(index)
  }

  return <section className="evo-iui-block evo-iui-quiz" aria-labelledby={label}>
    <div className="evo-iui-flex-heading">
      <div><p className="evo-iui-kicker">Gyakorlókérdés</p><h3 id={label}>{block.props.question}</h3></div>
      <span className="evo-iui-count">{attempts ? attempts + ". próbálkozás" : "1 kérdés"}</span>
    </div>
    <div className="evo-iui-choices" role="group" aria-label="Válaszlehetőségek">
      {block.props.choices.map((choice, i) => <button key={i} type="button"
        aria-pressed={selected === i}
        disabled={checked}
        className={checked ? (i === block.props.correctIndex ? "is-correct" : selected === i ? "is-incorrect" : "") : selected === i ? "is-selected" : ""}
        onClick={() => choose(i)}>
        <span>{String.fromCharCode(65 + i)}</span>{choice}
        {checked && i === block.props.correctIndex && <Check size={17} aria-hidden="true" />}
      </button>)}
    </div>
    {!checked && <button className="evo-iui-check-answer" type="button" disabled={selected === null} onClick={verify}>Válasz ellenőrzése</button>}
    {checked && <div className="evo-iui-feedback" role="status">
      <strong>{correct ? "Helyes válasz!" : "Nem ez a helyes válasz."}</strong>
      <p>{block.props.explanation}</p>
      <button type="button" onClick={retry}><RotateCcw size={15} /> Újrapróbálás</button>
    </div>}
  </section>
}

function Flashcard({ block }: { block: VocabularyFlashcardBlock }) {
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const label = useId()
  const cards = block.props.cards
  const current = cards[index]
  const go = (next: number) => { setIndex(next); setFlipped(false) }
  return <section className="evo-iui-block" aria-labelledby={label}>
    <div className="evo-iui-flex-heading"><div><p className="evo-iui-kicker">Tanulókártyák</p><h3 id={label}>{block.props.title}</h3></div><span className="evo-iui-count">{index + 1} / {cards.length}</span></div>
    <button type="button" className="evo-iui-flashcard" aria-label={flipped ? "Vissza a szóhoz" : "Jelentés megjelenítése"} onClick={() => setFlipped(v => !v)}>
      <small>{flipped ? "Jelentés" : "Kifejezés"}</small>
      <strong>{flipped ? current.back : current.front}</strong>
      {flipped && current.example && <span>{current.example}</span>}
      <em>Érintsd meg a megfordításhoz</em>
    </button>
    <div className="evo-iui-pager">
      <button type="button" disabled={index === 0} aria-label="Előző kártya" onClick={() => go(index - 1)}><ArrowLeft size={19} /></button>
      <span>{index + 1}. kártya</span>
      <button type="button" disabled={index === cards.length - 1} aria-label="Következő kártya" onClick={() => go(index + 1)}><ArrowRight size={19} /></button>
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
    case "vocabulary_flashcard": return <Flashcard block={block} />
    case "comparison_table": return <Comparison block={block} />
    case "tense_timeline": return <Timeline block={block} />
    case "study_plan": return <StudyPlan block={block} storageKey={storageKey} />
    case "concept_card": return <Concept block={block} />
    case "progress_bars": return <Progress block={block} />
    case "chart_card": return <ChartCard block={block} storageKey={storageKey} />
    default: return null
  }
}

/** Safe by construction: only validated descriptors map to prebuilt components. */
export default function IntelligentResponse({ ui, messageId, verifiedData = false }: { ui: IntelligentUI; messageId?: string; verifiedData?: boolean }) {
  const validated = validateIntelligentUI(ui, { allowVerifiedCharts: verifiedData, allowUserProgress: verifiedData })
  if (!validated || !validated.blocks.length) return null
  return <div className="evo-iui-response">
    {validated.blocks.map(block => <Block key={block.id} block={block} storageKey={"evolingo.study-plan.v1." + (messageId || "session") + "." + block.id} />)}
  </div>
}
