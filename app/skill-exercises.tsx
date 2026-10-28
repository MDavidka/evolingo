"use client"

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react"
import {
  ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle2, ChevronLeft, ChevronRight,
  FilePenLine, Lightbulb, LoaderCircle, Mic, MicOff, MessageCircle, RotateCcw,
  Sparkles, Star, Volume2, X,
} from "lucide-react"
import "./skill-exercises.css"

export type SkillMode = "conversation" | "vocabulary" | "essay"
export type SkillLesson = {
  id: number
  title: string
  summary: string
  level: string
  examples: string[]
}
type Props = {
  mode: SkillMode
  lesson: SkillLesson
  alreadyCompleted: boolean
  onExit: () => void
  onComplete: () => void
}
type VocabularyCard = { english: string; hungarian: string; example: string }
type EssayTopic = { title: string; prompt: string; tips: string[]; minWords: number; recommendedWords: number }
type ConversationFeedback = { accepted: boolean; feedback: string; suggestedAnswer: string }
type EssayFeedback = { score: number; accepted: boolean; feedback: string; strengths: string[]; improvements: string[]; wordCount: number }

type SpeechRecognitionResult = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>
}
type SpeechRecognitionClient = {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: SpeechRecognitionResult) => void) | null
  onerror: ((event: { error?: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}
type SpeechWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognitionClient
  webkitSpeechRecognition?: new () => SpeechRecognitionClient
}

const labels: Record<SkillMode, { title: string; subtitle: string }> = {
  conversation: { title: "Beszélgetés", subtitle: "Beszélj angolul" },
  vocabulary: { title: "Szókártyák", subtitle: "Ismered ezt a szót?" },
  essay: { title: "Fogalmazás", subtitle: "B2 · Íráskészség" },
}

async function askAI<T>(action: string, fields: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
  const response = await fetch("/api/skill-ai", {
    method: "POST", credentials: "same-origin", cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...fields }),
    signal,
  })
  const payload = await response.json().catch(() => ({})) as { error?: string }
  if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "Nem sikerült kapcsolódni az AI-hoz.")
  return payload as T
}
function wordsIn(text: string) {
  return text.trim() ? text.trim().split(/\s+/u).filter(Boolean).length : 0
}

function SkillHeader({ mode, lesson, progress, onExit }: { mode: SkillMode; lesson: SkillLesson; progress: number; onExit: () => void }) {
  return <header className="skill-header">
    <div className="skill-header-top">
      <button type="button" className="skill-close" onClick={onExit} aria-label="Kilépés a gyakorlásból">
        <X size={22} strokeWidth={1.8} />
      </button>
      <div className="skill-header-title"><span>{labels[mode].subtitle}</span><strong>{labels[mode].title}</strong></div>
      <span className="skill-header-level">{mode === "essay" ? "B2" : lesson.level}</span>
    </div>
    <div className="skill-progress" role="progressbar" aria-label="Feladat előrehaladás" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}>
      <span style={{ width: Math.max(0, Math.min(100, progress)) + "%" }} />
    </div>
  </header>
}
function LoadingPanel({ caption }: { caption: string }) {
  return <div className="skill-loading" role="status">
    <LoaderCircle size={30} className="skill-spin" aria-hidden="true" />
    <strong>{caption}</strong>
    <p>Az aktuális lecke alapján készül a gyakorlás.</p>
  </div>
}
function ErrorPanel({ message, retry, onExit }: { message: string; retry: () => void; onExit: () => void }) {
  return <div className="skill-error" role="alert">
    <span className="skill-error-icon"><RotateCcw size={24} /></span>
    <h2>Most nem sikerült</h2>
    <p>{message}</p>
    <button type="button" className="skill-button-primary" onClick={retry}>Újrapróbálom</button>
    <button type="button" className="skill-button-text" onClick={onExit}>Vissza az útvonalra</button>
  </div>
}
function CompletePanel({ mode, onExit, alreadyCompleted }: { mode: SkillMode; onExit: () => void; alreadyCompleted: boolean }) {
  return <div className="skill-complete" role="status">
    <span className="skill-complete-medal"><CheckCircle2 size={47} strokeWidth={1.5} /></span>
    <h2>Gyakorlás kész!</h2>
    <p>{mode === "conversation" ? "Mindhárom kérdésre megfelelően válaszoltál." : mode === "vocabulary" ? "Végignézted a szókártyákat. A bizonytalan szavakat érdemes ismételni." : "Sikeres B2 fogalmazás!"}</p>
    <div className="skill-complete-points"><Star size={17} fill="currentColor" />{alreadyCompleted ? "Már teljesítetted · gyakorló kör" : "+2 csillag · +10 XP"}</div>
    <button type="button" className="skill-button-primary" onClick={onExit}>Vissza az útvonalra <ArrowRight size={18} /></button>
  </div>
}

export default function SkillExercise({ mode, lesson, alreadyCompleted, onExit, onComplete }: Props) {
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [questions, setQuestions] = useState<string[]>([])
  const [cards, setCards] = useState<VocabularyCard[]>([])
  const [topic, setTopic] = useState<EssayTopic | null>(null)
  const [generation, setGeneration] = useState(0)
  const [finished, setFinished] = useState(false)
  const finishedRef = useRef(false)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [answer, setAnswer] = useState("")
  const [grading, setGrading] = useState(false)
  const [answerFeedback, setAnswerFeedback] = useState<ConversationFeedback | null>(null)
  const [speechError, setSpeechError] = useState("")
  const [listening, setListening] = useState(false)
  const recognizerRef = useRef<SpeechRecognitionClient | null>(null)
  const [wordIndex, setWordIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [knownCount, setKnownCount] = useState(0)
  const [swipeDelta, setSwipeDelta] = useState(0)
  const startPointer = useRef<number | null>(null)
  const swallowClick = useRef(false)
  const [essay, setEssay] = useState("")
  const [essayFeedback, setEssayFeedback] = useState<EssayFeedback | null>(null)
  const [essayError, setEssayError] = useState("")
  const cardCount = useRef(10 + Math.floor(Math.random() * 21))
  const completion = useRef(onComplete)
  completion.current = onComplete

  const finish = () => {
    if (finishedRef.current) return
    finishedRef.current = true
    setFinished(true)
    completion.current()
  }

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setLoadError("")
    if (mode === "conversation") {
      void askAI<{ questions: string[] }>("conversation-pack", { lesson }, controller.signal)
        .then(result => { if (!controller.signal.aborted) { setQuestions(result.questions.slice(0, 3)); setQuestionIndex(0) } })
        .catch(error => { if (!controller.signal.aborted) setLoadError(error instanceof Error ? error.message : "Nincs válasz.") })
        .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    } else if (mode === "vocabulary") {
      void askAI<{ cards: VocabularyCard[] }>("vocabulary-pack", { lesson, count: cardCount.current }, controller.signal)
        .then(result => { if (!controller.signal.aborted) { setCards(result.cards.slice(0, 30)); setWordIndex(0) } })
        .catch(error => { if (!controller.signal.aborted) setLoadError(error instanceof Error ? error.message : "Nincs szókártya.") })
        .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    } else {
      void askAI<EssayTopic>("essay-topic", { lesson }, controller.signal)
        .then(result => { if (!controller.signal.aborted) setTopic(result) })
        .catch(error => { if (!controller.signal.aborted) setLoadError(error instanceof Error ? error.message : "Nincs téma.") })
        .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    }
    return () => controller.abort()
  }, [mode, lesson.id, generation])

  useEffect(() => () => {
    if (recognizerRef.current) {
      recognizerRef.current.onend = null
      recognizerRef.current.abort()
      recognizerRef.current = null
    }
  }, [])

  const toggleMic = () => {
    if (recognizerRef.current && listening) {
      recognizerRef.current.stop()
      return
    }
    const speechWindow = window as SpeechWindow
    const Constructor = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition
    if (!Constructor) {
      setSpeechError("A beszédfelismerés ezen az eszközön nem támogatott. Alul beírhatod a válaszod.")
      return
    }
    try {
      setSpeechError("")
      const recognition = new Constructor()
      recognizerRef.current = recognition
      recognition.lang = "en-US"
      recognition.continuous = false
      recognition.interimResults = false
      recognition.onresult = event => {
        const transcript = Array.from(event.results).map(group => group[0]?.transcript || "").join(" ").trim()
        if (transcript) { setAnswer(transcript); setAnswerFeedback(null) }
      }
      recognition.onerror = event => {
        setSpeechError(event.error === "not-allowed"
          ? "Engedélyezd a mikrofont a Safariban, vagy írd be a válaszodat."
          : "Nem sikerült felismerni a beszédet. Próbáld újra, vagy gépelj.")
        setListening(false)
      }
      recognition.onend = () => { setListening(false); recognizerRef.current = null }
      recognition.start()
      setListening(true)
    } catch {
      setListening(false)
      setSpeechError("Nem tudtam elindítani a mikrofont. A szöveges válasz továbbra is működik.")
    }
  }

  const gradeConversation = async () => {
    if (!answer.trim() || grading || answerFeedback?.accepted) return
    setGrading(true)
    setSpeechError("")
    try {
      const result = await askAI<ConversationFeedback>("conversation-check", {
        question: questions[questionIndex], answer, lessonTitle: lesson.title,
      })
      setAnswerFeedback(result)
    } catch (error) {
      setSpeechError(error instanceof Error ? error.message : "Nem sikerült az értékelés.")
    } finally { setGrading(false) }
  }

  const advanceQuestion = () => {
    if (questionIndex >= questions.length - 1) {
      finish()
      return
    }
    if (recognizerRef.current) { recognizerRef.current.abort(); recognizerRef.current = null; setListening(false) }
    setQuestionIndex(index => index + 1)
    setAnswer("")
    setAnswerFeedback(null)
    setSpeechError("")
  }

  const chooseWord = (known: boolean) => {
    if (!cards.length || wordIndex >= cards.length || finishedRef.current) return
    if (known) setKnownCount(prev => prev + 1)
    setSwipeDelta(0)
    setRevealed(false)
    if (wordIndex === cards.length - 1) finish()
    else setWordIndex(prev => prev + 1)
  }
  const pointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    startPointer.current = event.clientX
    swallowClick.current = false
    try { event.currentTarget.setPointerCapture(event.pointerId) } catch { /* Older WebKit may not support capture. */ }
  }
  const pointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (startPointer.current !== null) setSwipeDelta(Math.max(-120, Math.min(120, event.clientX - startPointer.current)))
  }
  const pointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (startPointer.current === null) return
    const moved = event.clientX - startPointer.current
    startPointer.current = null
    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    } catch { /* Pointer capture can end when the browser begins scrolling. */ }
    if (Math.abs(moved) > 65) {
      swallowClick.current = true
      chooseWord(moved > 0)
    } else setSwipeDelta(0)
  }

  const gradeEssay = async () => {
    if (!topic || grading || wordsIn(essay) < 120) return
    setGrading(true)
    setEssayError("")
    setEssayFeedback(null)
    try {
      const result = await askAI<EssayFeedback>("essay-check", { title: topic.title, prompt: topic.prompt, essay })
      setEssayFeedback(result)
    } catch (error) {
      setEssayError(error instanceof Error ? error.message : "Az esszé nem értékelhető.")
    } finally { setGrading(false) }
  }

  const progress = finished ? 100
    : mode === "conversation" ? (questions.length ? questionIndex / questions.length * 100 : 0)
    : mode === "vocabulary" ? (cards.length ? wordIndex / cards.length * 100 : 0)
    : essayFeedback ? Math.max(0, essayFeedback.score) : 0

  return <div className={"skill-exercise skill-" + mode}>
    <SkillHeader lesson={lesson} mode={mode} progress={progress} onExit={onExit} />
    {finished ? <CompletePanel mode={mode} onExit={onExit} alreadyCompleted={alreadyCompleted} />
      : loading ? <LoadingPanel caption={mode === "conversation" ? "Kérdéseket készítünk…" : mode === "vocabulary" ? "Szavakat válogatunk…" : "B2 témát keresünk…"} />
      : loadError ? <ErrorPanel message={loadError} retry={() => setGeneration(value => value + 1)} onExit={onExit} />
      : mode === "conversation" ? <div className="skill-body">
        <div className="skill-eyebrow"><MessageCircle size={17} /><span>KÉRDÉS {questionIndex + 1} / {questions.length}</span></div>
        <h1 className="skill-conversation-question">{questions[questionIndex]}</h1>
        <p className="skill-helper">Válaszolj angolul. A kisebb nyelvtani hibák nem számítanak, ha érthető a válaszod.</p>

        <div className="skill-microphone-area">
          <button type="button" className={"skill-mic " + (listening ? "is-listening" : "")} onClick={toggleMic} aria-pressed={listening} aria-label={listening ? "Felvétel leállítása" : "Beszédfelismerés indítása"}>
            {listening ? <MicOff size={32} strokeWidth={1.9} /> : <Mic size={32} strokeWidth={1.9} />}
          </button>
          <strong>{listening ? "Beszélj most…" : "Koppints, majd beszélj"}</strong>
          <small>A hangot a böngésző alakítja szöveggé.</small>
        </div>

        <label className="skill-field-label" htmlFor="skill-answer">Felismert vagy beírt válasz</label>
        <textarea id="skill-answer" rows={3} maxLength={800} value={answer} onChange={event => { setAnswer(event.target.value); setAnswerFeedback(null) }} placeholder="I usually… / In my opinion…" className="skill-answer-field" />
        {speechError && <p className="skill-inline-error" role="alert">{speechError}</p>}
        {answerFeedback && <div className={"skill-feedback " + (answerFeedback.accepted ? "is-pass" : "is-retry")} role="status">
          {answerFeedback.accepted ? <CheckCircle2 size={21} /> : <Lightbulb size={21} />}
          <div><strong>{answerFeedback.accepted ? "Elfogadva" : "Próbáld újra"}</strong><p>{answerFeedback.feedback}</p>
            {!answerFeedback.accepted && answerFeedback.suggestedAnswer && <small>Példa: {answerFeedback.suggestedAnswer}</small>}</div>
        </div>}
        <div className="skill-footer">
          {answerFeedback?.accepted
            ? <button type="button" className="skill-button-primary" onClick={advanceQuestion}>{questionIndex === questions.length - 1 ? "Befejezés" : "Következő kérdés"} <ChevronRight size={19} /></button>
            : <button type="button" className="skill-button-primary" disabled={!answer.trim() || grading || listening} onClick={() => { void gradeConversation() }}>{grading ? <LoaderCircle className="skill-spin" size={19} /> : <Check size={19} />}{grading ? "Ellenőrzés…" : "Válasz ellenőrzése"}</button>}
        </div>
      </div>
      : mode === "vocabulary" ? <div className="skill-body">
        <div className="skill-eyebrow"><BookOpen size={17} /><span>SZÓKÁRTYA {wordIndex + 1} / {cards.length}</span></div>
        <h1 className="skill-vocab-title">Ismered ezt a szót?</h1>
        <p className="skill-helper">Koppints a kártyára a fordításhoz. Húzd balra, ha még nem tudtad, jobbra, ha igen.</p>
        <div className="skill-swipe-rail"><span><ArrowLeft size={17} /> Nem tudtam</span><span>Tudtam <ArrowRight size={17} /></span></div>
        <button
          type="button"
          className={"skill-flashcard " + (revealed ? "is-revealed" : "")}
          style={{ transform: "translateX(" + swipeDelta + "px) rotate(" + swipeDelta / 18 + "deg)" }}
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={pointerUp}
          onPointerCancel={() => { startPointer.current = null; setSwipeDelta(0) }}
          onClick={() => { if (swallowClick.current) { swallowClick.current = false; return } setRevealed(v => !v) }}
          onKeyDown={event => { if (event.key === "ArrowLeft") { event.preventDefault(); chooseWord(false) } else if (event.key === "ArrowRight") { event.preventDefault(); chooseWord(true) } }}
          aria-label={revealed ? "Magyarul: " + cards[wordIndex]?.hungarian + ". Koppints a visszafordításhoz." : cards[wordIndex]?.english + ". Koppints a fordításhoz; balra nem tudtam, jobbra tudtam."}
        >
          <span className="skill-flashcard-symbol"><Sparkles size={21} strokeWidth={1.8} /></span>
          <span className="skill-flashcard-language">{revealed ? "MAGYARUL" : "ANGOLUL"}</span>
          <strong>{revealed ? cards[wordIndex]?.hungarian : cards[wordIndex]?.english}</strong>
          {revealed && cards[wordIndex]?.example && <small>{cards[wordIndex].example}</small>}
          <span className="skill-flashcard-hint">{revealed ? "Koppints a visszafordításhoz" : "Koppints a fordításhoz"}</span>
        </button>
        <div className="skill-vocab-score"><CheckCircle2 size={16} /> Ismert: {knownCount} · Hátralévő: {cards.length - wordIndex}</div>
        <div className="skill-footer skill-vocab-buttons">
          <button type="button" className="skill-button-outline" onClick={() => chooseWord(false)}><X size={18} /> Még nem</button>
          <button type="button" className="skill-button-primary" onClick={() => chooseWord(true)}><Check size={18} /> Tudtam</button>
        </div>
      </div>
      : <div className="skill-body skill-essay-body">
        <div className="skill-eyebrow"><FilePenLine size={17} /><span>B2 SZINT · 120–220 SZÓ</span></div>
        <h1 className="skill-essay-heading">Írj egy esszét!</h1>
        <div className="skill-essay-topic">
          <span>AZ ESSZÉ TÉMÁJA</span>
          <h2>{topic?.title}</h2>
          <p>{topic?.prompt}</p>
          {!!topic?.tips?.length && <div className="skill-essay-tips"><Lightbulb size={17} /><div>{topic.tips.map((tip,i) => <p key={i}>{tip}</p>)}</div></div>}
        </div>
        <div className="skill-essay-label"><label htmlFor="skill-essay-input">A fogalmazásod</label><span>{wordsIn(essay)} szó</span></div>
        <textarea id="skill-essay-input" className="skill-essay-input" rows={10} maxLength={8500} spellCheck lang="en" placeholder="Start writing your essay in English…" value={essay} onChange={event => { setEssay(event.target.value); setEssayFeedback(null); setEssayError("") }} />
        <div className="skill-essay-progress"><span style={{ width: Math.min(100, wordsIn(essay) / 120 * 100) + "%" }} /></div>
        {wordsIn(essay) < 120 && <p className="skill-helper">Még {120 - wordsIn(essay)} szó kell a minimumhoz.</p>}
        {essayError && <p className="skill-inline-error" role="alert">{essayError}</p>}
        {essayFeedback && <div className={"skill-feedback skill-essay-feedback " + (essayFeedback.accepted ? "is-pass" : "is-retry")} role="status">
          <div className="skill-score">{essayFeedback.score}<small>/100</small></div>
          <div><strong>{essayFeedback.accepted ? "B2 szint teljesítve" : "Érdemes átdolgozni"}</strong><p>{essayFeedback.feedback}</p>
            {essayFeedback.strengths?.length > 0 && <p><b>Erősség:</b> {essayFeedback.strengths.join(" · ")}</p>}
            {essayFeedback.improvements?.length > 0 && <p><b>Javaslat:</b> {essayFeedback.improvements.join(" · ")}</p>}</div>
        </div>}
        <div className="skill-footer">
          {essayFeedback?.accepted
            ? <button type="button" className="skill-button-primary" onClick={finish}><CheckCircle2 size={19} /> Feladat befejezése</button>
            : <button type="button" className="skill-button-primary" disabled={wordsIn(essay) < 120 || grading} onClick={() => { void gradeEssay() }}>{grading ? <LoaderCircle className="skill-spin" size={19} /> : <Sparkles size={19} />}{grading ? "AI értékelés…" : essayFeedback ? "Újraértékelés" : "Esszé értékelése"}</button>}
        </div>
      </div>}
  </div>
}
