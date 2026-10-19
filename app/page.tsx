"use client"

import { useState } from "react"
import {
  ArrowRight, BarChart3, BookOpen, Check, CheckCircle2, ChevronRight, Flame,
  Globe2, Heart, Lightbulb, LockKeyhole, Medal, RotateCcw, Trophy, UserRound,
  X, Zap,
} from "lucide-react"

const foxIcon = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Image-D15751D4-6Ne8AGNrryN8wlvyBepC8VDGQkHTw4.jpeg"
type Screen = "home" | "lessonIntro" | "lesson" | "worlds" | "leaderboard" | "profile"
type World = { name: string; color: string; icon: string; progress: number }
const worlds: World[] = [
  { name: "English", color: "#ff7900", icon: "EN", progress: 32 },
  { name: "Magyar", color: "#e94f64", icon: "HU", progress: 12 },
  { name: "Español", color: "#4b8fe8", icon: "ES", progress: 0 },
]
const TASK_LIMIT = 100
const taskNames = ["Present Simple", "Present Continuous", "Past Simple", "Past Continuous", "Future Simple", "Future Perfect", "Some and Any", "Much and Many", "Comparatives and Superlatives", "Conditionals"]
const tasks = Array.from({ length: TASK_LIMIT }, (_, index) => ({ number: index + 1, title: taskNames[index] ?? `Task ${index + 1}`, inDevelopment: index >= taskNames.length }))
const ranks = [
  { name: "Sofia K.", xp: "2,480 XP", place: 1, color: "#f5ba33" },
  { name: "Márton D.", xp: "2,210 XP", place: 2, color: "#a6b3bd" },
  { name: "Liam R.", xp: "1,960 XP", place: 3, color: "#c88752" },
  { name: "You", xp: "1,420 XP", place: 8, color: "#ff7900" },
]

type Question = {
  type: "choice" | "text" | "arrange"
  instruction: string
  prompt: string
  options?: string[]
  answer: string
  accepted?: string[]
  words?: string[]
  explanation: string
  tip: string
}
const presentSimpleQuestions: Question[] = [
  {
    type: "choice",
    instruction: "Choose the correct answer",
    prompt: "My sister _____ coffee every morning.",
    options: ["drink", "drinks", "is drinking", "drinking"],
    answer: "drinks",
    explanation: "With he, she, or it, we usually add -s or -es to the verb in the Present Simple.",
    tip: "He / She / It → verb + s",
  },
  {
    type: "text",
    instruction: "Complete the sentence",
    prompt: "I _____ breakfast at 7 a.m.",
    answer: "eat",
    accepted: ["have"],
    explanation: "Use the base form of the verb with I, you, we, and they.",
    tip: "I / You / We / They → base verb",
  },
  {
    type: "arrange",
    instruction: "Build the sentence",
    prompt: "Ő általában gyalog jár iskolába.",
    words: ["school.", "usually", "walks", "He", "to"],
    answer: "He usually walks to school.",
    explanation: "In a normal English sentence, the subject comes before the verb: He + usually + walks.",
    tip: "Subject + frequency word + verb + rest",
  },
  {
    type: "choice",
    instruction: "Select the correct sentence",
    prompt: "Which sentence is correct?",
    options: ["She like music.", "She likes music.", "She liking music.", "She is like music."],
    answer: "She likes music.",
    explanation: "The subject 'she' is third-person singular, so 'like' becomes 'likes'.",
    tip: "Check who is doing the action.",
  },
  {
    type: "text",
    instruction: "Fill in the missing word",
    prompt: "The sun _____ in the east.",
    answer: "rises",
    explanation: "We use the Present Simple for facts and things that are generally true.",
    tip: "A fact that is always true → Present Simple",
  },
]

const normalizeAnswer = (value: string) => value.toLowerCase().trim().replace(/[.!?]+$/g, "").replace(/\s+/g, " ")

export default function App() {
  const [screen, setScreen] = useState<Screen>("home")
  const [selectedWorld, setSelectedWorld] = useState(worlds[0])
  const [completedTasks, setCompletedTasks] = useState<number[]>([])
  const [notice, setNotice] = useState("")
  const finishLesson = () => {
    setCompletedTasks((previous) => previous.includes(1) ? previous : [...previous, 1])
    setScreen("home")
  }
  return <main className={`app-shell ${(screen === "lesson" || screen === "lessonIntro") ? "lesson-open" : ""}`}>
    <section className={`screen-content ${(screen === "lesson" || screen === "lessonIntro") ? "lesson-page" : ""}`}>
      {screen === "home" && <Home completedTasks={completedTasks} onStart={(number) => {
        if (number === 1) setScreen("lessonIntro")
        else setNotice("This lesson is being prepared. Present Simple is ready to practise!")
      }} notice={notice} clearNotice={() => setNotice("")} />}
      {screen === "lessonIntro" && <LessonIntro onExit={() => setScreen("home")} onStart={() => setScreen("lesson")} />}
      {screen === "lesson" && <Lesson onExit={() => setScreen("lessonIntro")} onComplete={finishLesson} />}
      {screen === "worlds" && <Worlds selected={selectedWorld} setSelected={setSelectedWorld} />}
      {screen === "leaderboard" && <Leaderboard />}
      {screen === "profile" && <Profile completedCount={completedTasks.length} />}
    </section>
    {screen !== "lesson" && screen !== "lessonIntro" && <Nav screen={screen} setScreen={setScreen} />}
  </main>
}

function Brand() { return <div className="brand"><img src={foxIcon} alt="Evölingo fox mascot" /><div><h1>Evölingo</h1></div></div> }

function Home({ completedTasks, onStart, notice, clearNotice }: { completedTasks: number[]; onStart: (number: number) => void; notice: string; clearNotice: () => void }) {
  const nextUnlocked = completedTasks.includes(1) ? 2 : 1
  return <>
    <header className="app-header home-header"><Brand /><div className="health"><Heart fill="currentColor" size={20} /><strong>5</strong></div></header>
    <div className="section-heading home-heading"><div><p className="eyebrow">ENGLISH</p><h2>Your learning path</h2></div></div>
    {notice && <button className="inline-notice" onClick={clearNotice}><span>{notice}</span><X size={16} /></button>}
    <div className="task-path">{tasks.map((task) => {
      const completed = completedTasks.includes(task.number)
      const unlocked = !task.inDevelopment && (task.number === 1 || task.number === nextUnlocked)
      return <TaskNode key={task.number} number={task.number} title={task.title} inDevelopment={task.inDevelopment} unlocked={unlocked || completed} completed={completed} onClick={() => onStart(task.number)} />
    })}</div>
  </>
}

function TaskNode({ number, title, unlocked, completed, inDevelopment, onClick }: { number: number; title: string; unlocked: boolean; completed: boolean; inDevelopment: boolean; onClick: () => void }) {
  const Icon = completed ? Check : unlocked ? BookOpen : LockKeyhole
  return <button className={`task-node ${unlocked ? "unlocked" : "locked"} ${completed ? "completed" : ""}`} disabled={!unlocked} onClick={onClick} aria-label={inDevelopment ? `${title}, Kidolgozás alatt` : title}>
    <span className="task-dot"><Icon size={24} strokeWidth={2.25} /></span>
    <span className="task-labels"><span className="task-name">{title}</span>{inDevelopment && <span className="task-status">Kidolgozás alatt</span>}</span>
  </button>
}


function LessonIntro({ onExit, onStart }: { onExit: () => void; onStart: () => void }) {
  return <div className="lesson-layout lesson-intro-layout">
    <header className="lesson-topbar">
      <button className="exit-lesson" onClick={onExit} aria-label="Vissza a tanulási útvonalhoz"><X size={27} /></button>
      <div className="intro-top-title"><span>1. LECKE</span><strong>Present Simple</strong></div>
      <span className="intro-book-icon"><BookOpen size={25} /></span>
    </header>
    <div className="intro-scroll-content">
      <div className="intro-hero">
        <div className="intro-hero-mascot"><img src={foxIcon} alt="Evölingo róka" /></div>
        <span className="intro-eyebrow">ANGOL NYELVTAN · A1</span>
        <h1>Present Simple</h1>
        <p>Beszélj a szokásaidról, a mindennapi tevékenységeidről és az általános igazságokról.</p>
        <div className="intro-meta"><span><BookOpen size={15} /> 4 perc tanulás</span><span><Zap size={15} /> +50 XP gyakorlásért</span></div>
      </div>
      <figure className="lesson-illustration"><img src="https://undraw.co/illustrations/education_3vwh.svg" alt="Illusztráció a tanulásról" /><figcaption>A mindennapi tevékenységek és szokások leírása</figcaption></figure>
      <article className="lesson-note"><span className="note-number">01</span><div><h2>Mikor használjuk?</h2><p>A <strong>Present Simple</strong> igeidőt rendszeresen ismétlődő cselekvésekhez, szokásokhoz és általános tényekhez használjuk.</p></div></article>
      <section className="lesson-note-block">
        <h2>1. Állító mondatok</h2><p>Az alany után az ige alapformáját használjuk. <strong>He, she, it</strong> esetén általában <strong>-s</strong> vagy <strong>-es</strong> kerül az ige végére.</p>
        <div className="grammar-table"><div><span>I / You / We / They</span><strong>play</strong></div><div><span>He / She / It</span><strong>plays</strong></div></div>
        <div className="example-card"><span className="example-label">PÉLDA</span><p>I play football every Saturday.</p><small>Szombatonként focizom.</small></div>
        <div className="example-card"><span className="example-label">PÉLDA</span><p>She <strong>likes</strong> music.</p><small>Szereti a zenét.</small></div>
      </section>
      <section className="lesson-note-block">
        <h2>2. Tagadás</h2><p>Használd a <strong>don't</strong> vagy <strong>doesn't</strong> segédigét. A segédige után az ige mindig alapformában áll.</p>
        <div className="example-card"><p>I <strong>don't eat</strong> meat.</p><small>Nem eszem húst.</small></div>
        <div className="example-card"><p>He <strong>doesn't eat</strong> meat.</p><small>Ő nem eszik húst.</small></div>
        <div className="lesson-callout"><Lightbulb size={19} /><p>Figyelj! Nem „doesn't eats”, hanem <strong>doesn't eat</strong>.</p></div>
      </section>
      <section className="lesson-note-block">
        <h2>3. Kérdések</h2><p>A mondat elejére a <strong>Do</strong> vagy <strong>Does</strong> kerül.</p>
        <div className="grammar-table"><div><span>Do</span><strong>I / you / we / they</strong></div><div><span>Does</span><strong>he / she / it</strong></div></div>
        <div className="example-card"><p><strong>Do</strong> you like pizza?</p><small>Szereted a pizzát?</small></div>
        <div className="example-card"><p><strong>Does</strong> she speak English?</p><small>Beszél angolul?</small></div>
      </section>
      <section className="lesson-note-block"><h2>4. Gyakori időhatározók</h2><p>Ezek gyakran jelzik, hogy Present Simple-t használunk:</p><div className="vocab-chips"><span>always – mindig</span><span>usually – általában</span><span>often – gyakran</span><span>sometimes – néha</span><span>never – soha</span><span>every day – minden nap</span></div></section>
      <section className="lesson-note-block"><h2>Gyors összefoglaló</h2><ul className="lesson-summary-list"><li>Szokás vagy tény → Present Simple</li><li>He / She / It → az állító ige általában -s végződést kap</li><li>Tagadás → don't / doesn't + alapige</li><li>Kérdés → Do / Does + alany + alapige?</li></ul></section>
      <section className="future-media-card"><span><Lightbulb size={21} /></span><div><strong>Videók és illusztrációk</strong><p>Később ide kerülhetnek rövid magyarázó videók, nyelvtani ábrák és példamondat-illusztrációk.</p><small>Multimédiás tananyag előkészítve</small></div></section>
      <div className="intro-practice-note"><CheckCircle2 size={19} /><span>Ha átolvastad az anyagot, jöhet az 5 gyakorlófeladat.</span></div>
    </div>
    <footer className="lesson-action-bar intro-action-bar"><button className="primary-action" onClick={onStart}>Gyakorlás indítása <ArrowRight size={20} /></button></footer>
  </div>
}

function Lesson({ onExit, onComplete }: { onExit: () => void; onComplete: () => void }) {
  const [questionIndex, setQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState("")
  const [typedAnswer, setTypedAnswer] = useState("")
  const [selectedWords, setSelectedWords] = useState<string[]>([])
  const [checked, setChecked] = useState(false)
  const [answerCorrect, setAnswerCorrect] = useState(false)
  const [complete, setComplete] = useState(false)
  const question = presentSimpleQuestions[questionIndex]
  const currentAnswer = question.type === "choice" ? selectedAnswer : question.type === "text" ? typedAnswer : selectedWords.map((item) => item.split(":").slice(1).join(":")).join(" ")
  const canCheck = currentAnswer.trim().length > 0
  const acceptedAnswers = [question.answer, ...(question.accepted ?? [])]
  const progress = complete ? 100 : (questionIndex / presentSimpleQuestions.length) * 100
  const submitAnswer = () => {
    if (checked) {
      if (answerCorrect) {
        if (questionIndex === presentSimpleQuestions.length - 1) setComplete(true)
        else {
          setQuestionIndex((value) => value + 1)
          setSelectedAnswer("")
          setTypedAnswer("")
          setSelectedWords([])
          setChecked(false)
          setAnswerCorrect(false)
        }
      } else {
        setSelectedAnswer("")
        setTypedAnswer("")
        setSelectedWords([])
        setChecked(false)
        setAnswerCorrect(false)
      }
      return
    }
    const correct = acceptedAnswers.some((answer) => normalizeAnswer(answer) === normalizeAnswer(currentAnswer))
    setAnswerCorrect(correct)
    setChecked(true)
  }
  const toggleWord = (word: string, position: number) => {
    if (checked) return
    setSelectedWords((previous) => {
      if (previous.includes(`${position}:${word}`)) return previous.filter((item) => item !== `${position}:${word}`)
      return [...previous, `${position}:${word}`]
    })
  }
  const chosenWordText = selectedWords.map((item) => item.split(":").slice(1).join(":"))
  const nextActionText = checked ? (answerCorrect ? (questionIndex === presentSimpleQuestions.length - 1 ? "Lecke befejezése" : "Folytatás") : "Próbáld újra") : "Válasz ellenőrzése"

  if (complete) return <div className="lesson-completion">
    <div className="completion-confetti" aria-hidden="true"><span>✦</span><span>✦</span><span>✧</span><span>✦</span><span>✧</span></div>
    <div className="completion-mascot"><img src={foxIcon} alt="Evölingo fox celebrating" /></div>
    <span className="completion-tag"><CheckCircle2 size={16} /> LESSON COMPLETE</span>
    <h1>Remek munka!</h1>
    <p>Befejezted a <strong>Present Simple</strong> leckét. Minden lépés számít.</p>
    <div className="xp-reward"><span className="xp-bolt"><Zap size={24} fill="currentColor" /></span><div><strong>+50 XP</strong><span>Megszerezted a jutalmat</span></div><CheckCircle2 size={22} /></div>
    <div className="completion-stats"><div><strong>5/5</strong><span>Kérdés</span></div><div><strong>1</strong><span>Lecke kész</span></div><div><strong>+1</strong><span>Feloldott szint</span></div></div>
    <button className="primary-action completion-action" onClick={onComplete}>Tanulás folytatása <ArrowRight size={19} /></button>
  </div>

  return <div className="lesson-layout">
    <header className="lesson-topbar">
      <button className="exit-lesson" onClick={onExit} aria-label="Kilépés a leckéből"><X size={27} /></button>
      <div className="lesson-progress-wrap">
        <div className="lesson-progress-track"><span style={{ width: `${progress}%` }} /></div>
        <span className="lesson-progress-label">{questionIndex + 1} <span>/</span> {presentSimpleQuestions.length}</span>
      </div>
      <div className="lesson-hearts"><Heart fill="currentColor" size={27} /><strong>5</strong></div>
    </header>

        <div className="lesson-question-card">
      <div className="question-mascot"><img src={foxIcon} alt="Evölingo fox mascot" /></div>
      <div className="question-main">
        <span className="question-label">{question.type === "choice" ? "CHOOSE ONE" : question.type === "text" ? "TYPE YOUR ANSWER" : "WORD ORDER"}</span>
        <p className={question.type === "arrange" ? "question-prompt translation-prompt" : "question-prompt"}>{question.prompt}</p>
      </div>
    </div>

    {question.type === "choice" && <div className="answer-options" role="group" aria-label="Válaszlehetőségek">
      {question.options?.map((option, index) => {
        const selected = selectedAnswer === option
        const isRight = checked && option === question.answer
        const isWrongChoice = checked && selected && !answerCorrect
        return <button key={option} className={`answer-option ${selected ? "selected" : ""} ${isRight ? "correct" : ""} ${isWrongChoice ? "incorrect" : ""}`} disabled={checked && answerCorrect} onClick={() => !checked && setSelectedAnswer(option)}>
          <span className="option-letter">{String.fromCharCode(65 + index)}</span><span>{option}</span>{isRight && <Check size={19} />}
        </button>
      })}
    </div>}

    {question.type === "text" && <div className={`answer-input-wrap ${checked ? (answerCorrect ? "is-correct" : "is-incorrect") : ""}`}>
      <label htmlFor="typed-answer">Válaszod</label>
      <input id="typed-answer" autoComplete="off" autoCapitalize="none" placeholder="Írd be a hiányzó szót…" value={typedAnswer} disabled={checked && answerCorrect} onChange={(event) => setTypedAnswer(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && canCheck && !checked) submitAnswer() }} />
      {checked && answerCorrect && <CheckCircle2 size={20} />}
    </div>}

    {question.type === "arrange" && <div className="word-arrange-area">
      <div className={`word-answer-line ${checked ? (answerCorrect ? "is-correct" : "is-incorrect") : ""}`} aria-label="Your sentence">
        {chosenWordText.length ? chosenWordText.map((word, index) => <button key={`chosen-${index}-${word}`} onClick={() => !checked && setSelectedWords((previous) => previous.filter((_, itemIndex) => itemIndex !== index))} disabled={checked} className="chosen-word">{word}</button>) : <span className="word-placeholder">Koppints a szavakra a mondat összeállításához</span>}
      </div>
      <div className="word-bank">{question.words?.map((word, index) => {
        const token = `${index}:${word}`
        const used = selectedWords.includes(token)
        return <button key={token} className={`word-chip ${used ? "used" : ""}`} disabled={used || checked} onClick={() => toggleWord(word, index)}>{word}</button>
      })}</div>
    </div>}

    <div className="lesson-tip"><span><Lightbulb size={18} /></span><div><strong>Gyors tipp</strong><p>{question.tip}</p></div></div>

    {checked && <div className={`answer-feedback ${answerCorrect ? "feedback-correct" : "feedback-incorrect"}`} role="status">
      <span className="feedback-icon">{answerCorrect ? <CheckCircle2 size={23} /> : <RotateCcw size={22} />}</span>
      <div><strong>{answerCorrect ? "Helyes! Szép munka." : "Még nem jó — próbáld újra."}</strong><p>{question.explanation}</p></div>
    </div>}

    <footer className={`lesson-action-bar ${checked ? (answerCorrect ? "action-correct" : "action-incorrect") : ""}`}>
      {!checked && <span className="action-hint">{canCheck ? "Ellenőrizheted a válaszodat." : "Válassz vagy írj be egy választ a folytatáshoz."}</span>}
      <button className={`primary-action ${!checked && !canCheck ? "disabled" : ""} ${checked && !answerCorrect ? "retry-action" : ""}`} disabled={!checked && !canCheck} onClick={submitAnswer}>{nextActionText}{checked && answerCorrect ? <ArrowRight size={19} /> : checked && !answerCorrect ? <RotateCcw size={18} /> : null}</button>
    </footer>
  </div>
}

function Worlds({ selected, setSelected }: { selected: World; setSelected: (world: World) => void }) { return <><PageHeader title="Worlds" /><div className="world-list">{worlds.map((world) => <button key={world.name} className={`world-card ${selected.name === world.name ? "selected" : ""}`} onClick={() => setSelected(world)}><div className="world-icon" style={{ background: world.color }}>{world.icon}</div><div className="world-info"><strong>{world.name}</strong><div className="progress-track"><span style={{ width: `${world.progress}%`, background: world.color }} /></div><small>{world.progress}% complete</small></div><ChevronRight /></button>)}</div></> }
function Leaderboard() { return <><PageHeader title="Leaderboard" /><div className="league-card"><div className="league-top"><div className="league-badge"><Trophy size={26} /></div><div><h3>Bronze League</h3><p>Ends in 2 days</p></div></div><div className="league-progress"><span style={{ width: "68%" }} /></div></div><div className="rank-list">{ranks.map((rank) => <div className={`rank-row ${rank.name === "You" ? "you" : ""}`} key={rank.name}><div className="rank-number" style={{ color: rank.color }}>{rank.place <= 3 ? <Medal size={21} /> : rank.place}</div><div className="rank-avatar">{rank.name.charAt(0)}</div><div className="rank-name"><strong>{rank.name}</strong><span>{rank.name === "You" ? "Keep going" : "Learning English"}</span></div><strong className="rank-xp">{rank.xp}</strong></div>)}</div></> }
function Profile({ completedCount }: { completedCount: number }) { return <><PageHeader title="Profile" /><div className="profile-card"><div className="large-avatar"><img src={foxIcon} alt="Evölingo fox avatar" /></div><div><h2>Márton Dávid</h2><p>Learning since October 2026</p></div></div><div className="profile-stats"><div><Flame /><strong>7</strong><span>streak</span></div><div><Zap /><strong>1,420</strong><span>XP</span></div><div><BookOpen /><strong>{12 + completedCount}</strong><span>lessons</span></div></div></> }
function PageHeader({ title }: { title: string }) { return <header className="page-header"><div className="brand compact"><img src={foxIcon} alt="Evölingo fox mascot" /><div><h1>Evölingo</h1></div></div><h1>{title}</h1></header> }
function Nav({ screen, setScreen }: { screen: Screen; setScreen: (screen: Screen) => void }) { const items: [Screen, string, React.ElementType][] = [["home", "Home", BookOpen], ["worlds", "Worlds", Globe2], ["leaderboard", "Ranks", BarChart3], ["profile", "Profile", UserRound]]; return <nav className="bottom-nav">{items.map(([id, label, Icon]) => <button key={id} className={screen === id ? "active" : ""} onClick={() => setScreen(id)} aria-current={screen === id ? "page" : undefined}><Icon size={23} /><span>{label}</span></button>)}</nav> }
