"use client"

import { useState, type ReactNode } from "react"
import { BarChart3, BookOpen, ChevronRight, Flame, Globe2, Heart, Medal, Trophy, UserRound, Zap } from "lucide-react"

const foxIcon = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Image-D15751D4-6Ne8AGNrryN8wlvyBepC8VDGQkHTw4.jpeg"
type Screen = "home" | "worlds" | "leaderboard" | "profile"
type World = { name: string; color: string; icon: string; progress: number }
const worlds: World[] = [
  { name: "English", color: "#ff7900", icon: "EN", progress: 32 },
  { name: "Magyar", color: "#e94f64", icon: "HU", progress: 12 },
  { name: "Español", color: "#4b8fe8", icon: "ES", progress: 0 },
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
  return <main className="app-shell"><section className="screen-content">
    {screen === "home" && <Home onWorlds={() => setScreen("worlds")} />}
    {screen === "worlds" && <Worlds selected={selectedWorld} setSelected={setSelectedWorld} />}
    {screen === "leaderboard" && <Leaderboard />}
    {screen === "profile" && <Profile />}
  </section><Nav screen={screen} setScreen={setScreen} /></main>
}

function Brand() { return <div className="brand"><img src={foxIcon} alt="Evölingo fox mascot" /><div><h1>Evölingo</h1></div></div> }
function Home({ onWorlds }: { onWorlds: () => void }) { return <>
  <header className="app-header home-header"><Brand /><div className="health"><Heart fill="currentColor" size={20} /><strong>5</strong></div></header>
  <div className="section-heading home-heading"><div><p className="eyebrow">ENGLISH</p><h2>Your learning path</h2></div><button className="link-button" onClick={onWorlds}>Worlds <ChevronRight size={17} /></button></div>
  <div className="task-path">
    <TaskNode title="Present simple" icon={<BookOpen />} done />
    <TaskNode title="Daily routines" icon={<Flame />} active />
    <TaskNode title="Food & drinks" icon={<Zap />} locked />
    <TaskNode title="At home" icon={<Globe2 />} locked />
    <TaskNode title="Travel" icon={<ChevronRight />} locked />
  </div>
</> }
function TaskNode({ title, icon, done, active, locked }: { title: string; icon: ReactNode; done?: boolean; active?: boolean; locked?: boolean }) { return <button className={`task-node ${active ? "active" : ""} ${locked ? "locked" : ""}`} disabled={locked && !active}><span className="task-dot">{done ? "✓" : icon}</span><span className="task-name">{title}</span></button> }
function Worlds({ selected, setSelected }: { selected: World; setSelected: (world: World) => void }) { return <><PageHeader title="Worlds" /><div className="world-list">{worlds.map((world) => <button key={world.name} className={`world-card ${selected.name === world.name ? "selected" : ""}`} onClick={() => setSelected(world)}><div className="world-icon" style={{ background: world.color }}>{world.icon}</div><div className="world-info"><strong>{world.name}</strong><div className="progress-track"><span style={{ width: `${world.progress}%`, background: world.color }} /></div><small>{world.progress}% complete</small></div><ChevronRight /></button>)}</div></> }
function Leaderboard() { return <><PageHeader title="Leaderboard" /><div className="league-card"><div className="league-top"><div className="league-badge"><Trophy size={26} /></div><div><h3>Bronze League</h3><p>Ends in 2 days</p></div></div><div className="league-progress"><span style={{ width: "68%" }} /></div></div><div className="rank-list">{ranks.map((rank) => <div className={`rank-row ${rank.name === "You" ? "you" : ""}`} key={rank.name}><div className="rank-number" style={{ color: rank.color }}>{rank.place <= 3 ? <Medal size={21} /> : rank.place}</div><div className="rank-avatar">{rank.name.charAt(0)}</div><div className="rank-name"><strong>{rank.name}</strong><span>{rank.name === "You" ? "Keep going" : "Learning English"}</span></div><strong className="rank-xp">{rank.xp}</strong></div>)}</div></> }
function Profile() { return <><PageHeader title="Profile" /><div className="profile-card"><div className="large-avatar"><img src={foxIcon} alt="Evölingo fox avatar" /></div><div><h2>Márton Dávid</h2><p>Learning since October 2026</p></div></div><div className="profile-stats"><div><Flame /><strong>7</strong><span>streak</span></div><div><Zap /><strong>1,420</strong><span>XP</span></div><div><BookOpen /><strong>12</strong><span>lessons</span></div></div></> }
function PageHeader({ title }: { title: string }) { return <header className="page-header"><div className="brand compact"><img src={foxIcon} alt="Evölingo fox mascot" /><div><h1>Evölingo</h1></div></div><h1>{title}</h1></header> }
function Nav({ screen, setScreen }: { screen: Screen; setScreen: (screen: Screen) => void }) { const items: [Screen, string, React.ElementType][] = [["home", "Home", BookOpen], ["worlds", "Worlds", Globe2], ["leaderboard", "Ranks", BarChart3], ["profile", "Profile", UserRound]]; return <nav className="bottom-nav">{items.map(([id, label, Icon]) => <button key={id} className={screen === id ? "active" : ""} onClick={() => setScreen(id)} aria-current={screen === id ? "page" : undefined}><Icon size={23} /><span>{label}</span></button>)}</nav> }
