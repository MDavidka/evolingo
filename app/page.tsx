"use client"

import { useState } from "react"
import { BarChart3, BookOpen, ChevronRight, Crown, Flame, Globe2, Heart, Lock, Medal, Shield, Trophy, UserRound, Users, Zap } from "lucide-react"

const foxIcon = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Image-D15751D4-6Ne8AGNrryN8wlvyBepC8VDGQkHTw4.jpeg"

type Screen = "home" | "worlds" | "leaderboard" | "profile"
type World = { name: string; subtitle: string; color: string; icon: string; progress: number; lessons: number }

const worlds: World[] = [
  { name: "English", subtitle: "Everyday English", color: "#ff7900", icon: "EN", progress: 32, lessons: 24 },
  { name: "Magyar", subtitle: "Kezdő magyar", color: "#e94f64", icon: "HU", progress: 12, lessons: 18 },
  { name: "Español", subtitle: "Spanish basics", color: "#4b8fe8", icon: "ES", progress: 0, lessons: 20 },
]
const ranks = [
  { name: "Sofia K.", xp: "2,480 XP", place: 1, color: "#f5ba33" },
  { name: "Márton D.", xp: "2,210 XP", place: 2, color: "#a6b3bd" },
  { name: "Liam R.", xp: "1,960 XP", place: 3, color: "#c88752" },
  { name: "You", xp: "1,420 XP", place: 8, color: "#ff7900" },
]

export default function App() {
  const [screen, setScreen] = useState<Screen>("home")
  const [selectedWorld, setSelectedWorld] = useState(worlds[0])
  const [lives] = useState(5)

  return (
    <main className="app-shell">
      <section className="screen-content">
        {screen === "home" && <Home lives={lives} onWorlds={() => setScreen("worlds")} />}
        {screen === "worlds" && <Worlds selected={selectedWorld} setSelected={setSelectedWorld} />}
        {screen === "leaderboard" && <Leaderboard />}
        {screen === "profile" && <Profile />}
      </section>
      <Nav screen={screen} setScreen={setScreen} />
    </main>
  )
}

function Brand({ compact = false }: { compact?: boolean }) {
  return <div className={`brand ${compact ? "compact" : ""}`}><img src={foxIcon} alt="Evölingo fox mascot" /><div><h1>Evölingo</h1><p>By MDávid</p></div></div>
}

function Home({ lives, onWorlds }: { lives: number; onWorlds: () => void }) {
  return <>
    <header className="app-header"><Brand /><div className="lives"><Heart fill="currentColor" /><strong>{lives}</strong></div></header>
    <section className="welcome-card"><div><p className="eyebrow">GOOD MORNING, MÁRTON</p><h2>Ready to learn?</h2><p>Keep your streak alive with a quick lesson.</p></div><div className="streak"><Flame fill="currentColor" size={22} /><strong>7</strong><span>day streak</span></div></section>
    <div className="section-heading"><div><p className="eyebrow">YOUR PATH</p><h2>English course</h2></div><button className="link-button" onClick={onWorlds}>All worlds <ChevronRight size={18} /></button></div>
    <div className="lesson-card active-lesson"><div className="lesson-orb"><BookOpen size={30} /></div><div className="lesson-copy"><span className="pill">LESSON 8</span><h3>Daily routines</h3><p>Talk about your everyday life</p><div className="progress-track"><span style={{ width: "48%" }} /></div></div><button className="round-arrow" aria-label="Start lesson"><ChevronRight /></button></div>
    <div className="section-heading compact-heading"><h2>Continue learning</h2><span className="muted">3 lessons left</span></div>
    <div className="mini-path"><PathNode title="Present simple" done /><PathNode title="Food & drinks" active /><PathNode title="At home" locked /></div>
    <div className="tip-card"><Zap fill="currentColor" size={20} /><div><strong>Daily goal</strong><p>Complete one lesson to earn 20 XP.</p></div></div>
  </>
}

function PathNode({ title, done, active, locked }: { title: string; done?: boolean; active?: boolean; locked?: boolean }) {
  return <div className={`path-node ${active ? "current" : ""}`}><div className="path-dot">{done ? "✓" : locked ? <Lock size={17} /> : <span />}</div><div><strong>{title}</strong><span>{done ? "Completed" : active ? "Continue lesson" : "Locked"}</span></div><ChevronRight size={18} /></div>
}

function Worlds({ selected, setSelected }: { selected: World; setSelected: (world: World) => void }) {
  return <><PageHeader eyebrow="EXPLORE" title="Worlds" subtitle="Choose a language and build your path." />
    <div className="world-list">{worlds.map((world) => <button key={world.name} className={`world-card ${selected.name === world.name ? "selected" : ""}`} onClick={() => setSelected(world)}><div className="world-icon" style={{ background: world.color }}>{world.icon}</div><div className="world-info"><strong>{world.name}</strong><span>{world.subtitle}</span><div className="progress-track"><span style={{ width: `${world.progress}%`, background: world.color }} /></div><small>{world.progress}% complete · {world.lessons} lessons</small></div><ChevronRight /></button>)}</div>
    <div className="world-banner"><Globe2 size={28} /><div><strong>More worlds are coming</strong><p>Keep learning to unlock new adventures.</p></div></div>
  </>
}

function Leaderboard() {
  return <><PageHeader eyebrow="THIS WEEK" title="Leaderboard" subtitle="Compete with learners around you." /><div className="league-card"><div className="league-top"><div className="league-badge"><Trophy size={28} /></div><div><span className="eyebrow">CURRENT LEAGUE</span><h3>Bronze League</h3><p>Ends in 2 days</p></div><ChevronRight /></div><div className="league-progress"><span style={{ width: "68%" }} /></div><small>680 XP to Silver League</small></div><div className="rank-list">{ranks.map((rank) => <div className={`rank-row ${rank.name === "You" ? "you" : ""}`} key={rank.name}><div className="rank-number" style={{ color: rank.color }}>{rank.place <= 3 ? <Medal size={21} /> : rank.place}</div><div className="rank-avatar">{rank.name.charAt(0)}</div><div className="rank-name"><strong>{rank.name}</strong><span>{rank.name === "You" ? "Keep going!" : "Learning English"}</span></div><strong className="rank-xp">{rank.xp}</strong></div>)}</div><div className="leader-tip"><Crown size={22} /><span>Earn XP by completing lessons and climb the board.</span></div></>
}

function Profile() {
  return <><PageHeader eyebrow="YOUR SPACE" title="Profile" subtitle="Your learning journey so far." /><div className="profile-card"><div className="large-avatar"><img src={foxIcon} alt="Evölingo fox avatar" /></div><div><h2>Márton Dávid</h2><p>Learning since October 2026</p></div><button className="icon-button" aria-label="Edit profile"><UserRound size={18} /></button></div><div className="profile-stats"><div><Flame /><strong>7</strong><span>day streak</span></div><div><Zap /><strong>1,420</strong><span>total XP</span></div><div><BookOpen /><strong>12</strong><span>lessons</span></div></div><h2 className="subheading">Achievements</h2><div className="achievement-grid"><Achievement icon={<Flame />} title="On fire" text="7 day streak" /><Achievement icon={<Trophy />} title="First steps" text="Complete 10 lessons" /><Achievement icon={<Shield />} title="Perfect" text="No mistakes" /></div></>
}

function Achievement({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) { return <div className="achievement"><div>{icon}</div><strong>{title}</strong><span>{text}</span></div> }
function PageHeader({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) { return <header className="page-header"><Brand compact /><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="page-subtitle">{subtitle}</p></header> }
function Nav({ screen, setScreen }: { screen: Screen; setScreen: (screen: Screen) => void }) { const items: [Screen, string, React.ElementType][] = [["home", "Home", BookOpen], ["worlds", "Worlds", Globe2], ["leaderboard", "Ranks", BarChart3], ["profile", "Profile", UserRound]]; return <nav className="bottom-nav">{items.map(([id, label, Icon]) => <button key={id} className={screen === id ? "active" : ""} onClick={() => setScreen(id)} aria-current={screen === id ? "page" : undefined}><Icon size={24} /><span>{label}</span></button>)}</nav> }
