"use client"
import { useEffect, useState } from "react"
import { BarChart3, BookOpen, Check, Heart, Lock, UserRound } from "lucide-react"

const logo = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Image-7B983EEB-aj7EdA5EOsqfrv1pwmizAFHnzWEj71.jpeg"
const ADMIN = "dmarton336@gmail.com"
type Exercise={id:string;type:"multiple-choice"|"text";prompt:string;options?:string[];correctAnswer:string;acceptedAnswers?:string[]}
type Lesson={schemaVersion:1;id:string;title:string;description:string;level:string;vocabulary:{word:string;translation:string}[];exercises:Exercise[]}
const lessonsSeed:Lesson[]=[
{schemaVersion:1,id:"present-simple-1",title:"Present simple 1.",description:"Everyday habits and routines.",level:"A1",vocabulary:[{word:"usually",translation:"általában"},{word:"every day",translation:"minden nap"}],exercises:[{id:"q1",type:"multiple-choice",prompt:"She ___ to school every day.",options:["go","goes","going"],correctAnswer:"goes"},{id:"q2",type:"text",prompt:"I ___ coffee every morning.",correctAnswer:"drink",acceptedAnswers:["drink"]}]},
{schemaVersion:1,id:"present-simple-2",title:"Present simple 2.",description:"Talk about routines.",level:"A1",vocabulary:[{word:"often",translation:"gyakran"}],exercises:[{id:"q1",type:"multiple-choice",prompt:"They ___ at six.",options:["wake","wakes","waking"],correctAnswer:"wake"}]},
{schemaVersion:1,id:"daily-life",title:"Daily life.",description:"Build useful sentences.",level:"A1",vocabulary:[{word:"morning",translation:"reggel"}],exercises:[{id:"q1",type:"text",prompt:"Good ___.",correctAnswer:"morning",acceptedAnswers:["morning"]}]},
{schemaVersion:1,id:"free-time",title:"Free time.",description:"Describe your hobbies.",level:"A1",vocabulary:[{word:"read",translation:"olvasni"}],exercises:[{id:"q1",type:"multiple-choice",prompt:"I like to ___.",options:["read","reads"],correctAnswer:"read"}]},
{schemaVersion:1,id:"review",title:"Quick review.",description:"Review what you know.",level:"A1",vocabulary:[],exercises:[{id:"q1",type:"text",prompt:"Complete: hello ___.",correctAnswer:"there",acceptedAnswers:["there"]}]},]
type Screen="home"|"words"|"stats"|"profile"|"admin"
function readLessons(){try{const saved=JSON.parse(localStorage.getItem("evolingo-lessons")||"[]") as Lesson[];const map=new Map(lessonsSeed.map(l=>[l.id,l]));saved.forEach(l=>map.set(l.id,l));return [...map.values()]}catch{return lessonsSeed}}
function readLives(email:string){const key=`evolingo-lives-${email}`,date=new Date().toISOString().slice(0,10);try{const r=JSON.parse(localStorage.getItem(key)||"null");if(r?.date===date)return Math.max(0,Math.min(100,Number(r.lives)||0));localStorage.setItem(key,JSON.stringify({date,lives:100}));return 100}catch{return 100}}
export default function App(){const[session,setSession]=useState<{name:string;email:string}|null>(null);const[screen,setScreen]=useState<Screen>("home");const[name,setName]=useState("");const[email,setEmail]=useState("");const[lives,setLives]=useState(100);const[lessons,setLessons]=useState(lessonsSeed);const[active,setActive]=useState<Lesson|null>(null);const[index,setIndex]=useState(0);const[answer,setAnswer]=useState("");const[feedback,setFeedback]=useState("");const[progress,setProgress]=useState<Record<string,boolean>>({});const[json,setJson]=useState("");const[message,setMessage]=useState("");
useEffect(()=>{try{const s=JSON.parse(localStorage.getItem("evolingo-session")||"null");if(s?.email){setSession(s);setLives(readLives(s.email));setLessons(readLessons())}}catch{}},[])
function signIn(e:React.FormEvent){e.preventDefault();const s={name:name.trim()||"Learner",email:email.trim().toLowerCase()};if(!s.email.includes("@"))return;localStorage.setItem("evolingo-session",JSON.stringify(s));setSession(s);setLives(readLives(s.email));setLessons(readLessons())}
function check(){if(!active||feedback)return;const ex=active.exercises[index];const accepted=[ex.correctAnswer,...(ex.acceptedAnswers||[])].map(x=>x.toLowerCase().trim());const ok=accepted.includes(answer.toLowerCase().trim());if(!ok){const next=Math.max(0,lives-1);setLives(next);localStorage.setItem(`evolingo-lives-${session?.email}`,JSON.stringify({date:new Date().toISOString().slice(0,10),lives:next}))}setFeedback(ok?"Correct":`Not quite. The answer is ${ex.correctAnswer}.`)}
function next(){if(!active)return;if(index===active.exercises.length-1){setProgress(p=>({...p,[active.id]:true}));setActive(null)}else{setIndex(i=>i+1);setAnswer("");setFeedback("")}}
function save(){try{const l=JSON.parse(json) as Lesson;const errors=validate(l);if(errors){setMessage(errors);return}localStorage.setItem("evolingo-lessons",JSON.stringify([...lessons.filter(x=>x.id!==l.id),l]));setLessons(readLessons());setMessage("Lesson saved locally.");setJson("")}catch{setMessage("Invalid JSON syntax. Your pasted source was kept.")}}
if(!session)return <main className="auth-screen"><Brand large/><form className="auth-form" onSubmit={signIn}><h2>Start learning</h2><label>Name<input required value={name} onChange={e=>setName(e.target.value)} placeholder="Your name"/></label><label>Email<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label><button className="primary">Continue</button><p className="note">Demo sign-in only. This prototype does not provide secure authentication.</p></form></main>
if(active)return <LessonView lesson={active} index={index} answer={answer} setAnswer={setAnswer} feedback={feedback} check={check} next={next} back={()=>setActive(null)}/>
const words=lessons.flatMap(l=>l.vocabulary),admin=session.email===ADMIN;return <main className="app-shell"><section className="screen-content">{screen==="home"&&<Home lessons={lessons} lives={lives} progress={progress} open={l=>{setActive(l);setIndex(0);setAnswer("");setFeedback("")}}/>}{screen==="words"&&<Simple title="Words"><p className="screen-lede">Review vocabulary from your lessons.</p>{words.map((w,i)=><div className="word-row" key={i}><strong>{w.word}</strong><span>{w.translation}</span></div>)}</Simple>}{screen==="stats"&&<Simple title="Stats"><p className="screen-lede">Your local demo progress.</p><div className="stat-line"><strong>{Object.keys(progress).length}</strong><span>lessons completed of {lessons.length}</span></div>{!Object.keys(progress).length&&<p className="empty">Complete a lesson to see your progress here.</p>}</Simple>}{screen==="profile"&&<Simple title="Profile"><div className="profile-block"><div className="avatar"><UserRound/></div><strong>{session.name}</strong><span>{session.email}</span></div>{admin&&<><p className="admin-note">Demo admin session. Client-side access checks are not secure.</p><button className="secondary" onClick={()=>setScreen("admin")}>Open lesson editor</button></>}<button className="text-button" onClick={()=>{localStorage.removeItem("evolingo-session");setSession(null)}}>Sign out</button></Simple>}{screen==="admin"&&admin&&<Simple title="Lesson editor"><p className="screen-lede">Paste a version 1 lesson JSON object. It is stored only in this browser.</p><textarea value={json} onChange={e=>setJson(e.target.value)} placeholder={'{\n  "schemaVersion": 1,\n  "id": "my-lesson",\n  "title": "My lesson",\n  "exercises": []\n}'}/><button className="primary" onClick={save}>Validate and save</button>{message&&<p className="validation" role="status">{message}</p>}</Simple>}</section><Nav screen={screen==="admin"?"profile":screen} setScreen={setScreen}/></main>}
function Brand({large=false}:{large?:boolean}){return <div className={`brand ${large?"large":""}`}><img src={logo} alt="Evölingo logo"/><div><h1>Evölingo</h1><p>By MDávid</p></div></div>}
const TASK_LIMIT = 100
const taskNames = [
  "Present Simple",
  "Present Continuous",
  "Past Simple",
  "Past Continuous",
  "Future Simple",
  "Future Perfect",
  "Some and Any",
  "Much and Many",
  "Comparatives and Superlatives",
  "Conditionals"
]
function Home({lessons,lives,progress,open}:{lessons:Lesson[];lives:number;progress:Record<string,boolean>;open:(l:Lesson)=>void}) {
  const tasks = Array.from({length:Math.min(TASK_LIMIT, Math.max(TASK_LIMIT, lessons.length))}, (_, i) => ({
    id: i < taskNames.length ? (lessons[i]?.id ?? `task-${i+1}`) : `task-${i+1}`,
    title: i < taskNames.length ? taskNames[i] : `Task ${i+1}`,
    lesson: lessons[i],
    index: i
  }))
  return <>
    <header className="app-header"><Brand/><div className="lives"><Heart fill="currentColor"/><strong>{lives}</strong></div></header>
    <div className="task-count">Tasks <strong>{Math.min(tasks.length, TASK_LIMIT)}/100</strong></div>
    <div className="lesson-path">
      {tasks.map((task) => {
        const available = task.index === 0 && Boolean(task.lesson) && lives > 0
        const completed = Boolean(task.lesson && progress[task.lesson.id])
        return <button
          key={task.id}
          className={`lesson-node node-${task.index%2} ${available ? "available" : "locked"} ${task.index < 10 ? "named-task" : "unfinished-task"}`}
          disabled={!available}
          onClick={() => task.lesson && open(task.lesson)}
          aria-label={task.index < 10 ? `Task ${task.index+1}: ${task.title}` : `Task ${task.index+1}: Kidolgozás alatt`}
        >
          <span className="circle">{completed ? <Check/> : available ? <span className="task-number">{task.index+1}</span> : <Lock size={20}/>}</span>
          <span className="task-title">{task.title}</span>
          {task.index >= taskNames.length && <span className="task-status">Kidolgozás alatt</span>}
        </button>
      })}
    </div>
  </>
}
function Simple({title,children}:{title:string;children:React.ReactNode}){return <div className="simple-screen"><h2>{title}</h2>{children}</div>}
function LessonView({lesson,index,answer,setAnswer,feedback,check,next,back}:{lesson:Lesson;index:number;answer:string;setAnswer:(s:string)=>void;feedback:string;check:()=>void;next:()=>void;back:()=>void}){const ex=lesson.exercises[index];return <main className="lesson-screen"><button className="back-button" onClick={back}>Back</button><div className="lesson-progress"><span style={{width:`${(index+1)/lesson.exercises.length*100}%`}}/></div><p className="eyebrow">{lesson.level} · Lesson {index+1} of {lesson.exercises.length}</p><h1>{lesson.title}</h1><div className="exercise"><h2>{ex.prompt}</h2>{ex.type==="multiple-choice"?<div className="choices">{ex.options?.map(o=><button className={answer===o?"selected":""} key={o} onClick={()=>setAnswer(o)}>{o}</button>)}</div>:<input className="answer-input" value={answer} onChange={e=>setAnswer(e.target.value)} placeholder="Type your answer"/>}{feedback&&<p className={feedback==="Correct"?"feedback correct":"feedback incorrect"}>{feedback}</p>}<button className="primary exercise-action" onClick={feedback?next:check}>{feedback?(index===lesson.exercises.length-1?"Finish lesson":"Continue"):"Check answer"}</button></div></main>}
function Nav({screen,setScreen}:{screen:Screen;setScreen:(s:Screen)=>void}){const items:[Screen,string,any][]=[["home","Home",Home],["words","Words",BookOpen],["stats","Stats",BarChart3],["profile","Profile",UserRound]];return <nav className="bottom-nav">{items.map(([id,label,Icon])=><button key={id} className={screen===id?"active":""} onClick={()=>setScreen(id)} aria-label={label} aria-current={screen===id?"page":undefined}><Icon size={27}/><span>{label}</span></button>)}</nav>}
function validate(l:Lesson){if(l.schemaVersion!==1||!l.id||!l.title||!Array.isArray(l.exercises))return "Lesson needs schemaVersion 1, id, title, and exercises.";const ids=new Set();for(const e of l.exercises){if(ids.has(e.id))return `Duplicate exercise id: ${e.id}.`;ids.add(e.id);if(!["multiple-choice","text"].includes(e.type))return `Unsupported exercise type: ${e.type}.`;if(!e.prompt||!e.correctAnswer)return `Exercise ${e.id} needs a prompt and correctAnswer.`;if(e.type==="multiple-choice"&&!e.options?.includes(e.correctAnswer))return `Correct answer for ${e.id} must be one of its options.`}return ""}
