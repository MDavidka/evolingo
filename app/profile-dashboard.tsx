"use client"

import { useEffect, useMemo, useState } from "react"
import { ActionSwap } from "../components/arc/action-swap/action-swap"
import { Button } from "../components/ui/button"
import { Separator } from "../components/ui/separator"
import {
  BookOpen, Check, ChevronDown, ChevronRight, Clock3, Compass, Crown, Flame,
  Flag, Gem, Heart, LayoutGrid, LockKeyhole, Medal, Pencil, Settings, Share, Sparkles, Star, Target,
  Trophy, Users, X, Zap, type LucideIcon,
} from "lucide-react"

type BadgeDefinition = {
  id: string
  label: string
  description: string
  icon: LucideIcon
  current: number
  target: number
  unit: string
}
type Badge = BadgeDefinition & { earned: boolean; inProgress: boolean; percent: number }

type Props = {
  userName: string
  avatar: string
  avatarImage: string
  fallbackAvatar: string
  joinedAt?: string | null
  xp: number
  stars: number
  streak: number
  lastStudyDate: string
  readCount: number
  completedCount: number
  completedTaskCount: number
  weeklyStudySeconds: Record<string, number>
  onEdit: () => void
  onStreakSettings: () => void
  onFriendsClick: () => void
}

const BADGE_STORAGE = "evolingo.badges-earned.v1"
const formatNumber = (value: number) =>
  Math.max(0, Math.floor(value)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u202F")

function localDayKey(date: Date) {
  return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0")
}

function shortJoinDate(value?: string | null) {
  if (!value) return null
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return null
  const months = ["jan.", "feb.", "márc.", "ápr.", "máj.", "jún.", "júl.", "aug.", "szept.", "okt.", "nov.", "dec."]
  return date.getFullYear() + " " + months[date.getMonth()]
}

function BottomSheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = previous
    }
  }, [onClose])

  return <div className="evo-sheet-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <section className="evo-sheet" role="dialog" aria-modal="true" aria-label={title}>
      <span className="evo-sheet-grabber" aria-hidden="true" />
      <div className="evo-sheet-head">
        <h2>{title}</h2>
        <button type="button" onClick={onClose} aria-label="Bezárás"><X size={22} strokeWidth={1.7} /></button>
      </div>
      {children}
    </section>
  </div>
}

function BadgeTile({ badge, onClick, fresh = false, compact = false }: {
  badge: Badge
  onClick?: () => void
  fresh?: boolean
  compact?: boolean
}) {
  const Icon = badge.icon
  const state = badge.earned ? "earned" : badge.inProgress ? "progress" : "locked"
  const amount = badge.current + "/" + badge.target + " " + badge.unit
  const className = "evo-profile-badge " + (compact ? "is-compact " : "") + (fresh ? "is-newly-earned" : "")
  const contents = <>
    <span className={"evo-badge-art is-" + state}>
      {badge.inProgress && <svg className="evo-badge-ring" viewBox="0 0 72 72" aria-hidden="true">
        <circle cx="36" cy="36" r="34" />
        <circle className="evo-badge-ring-progress" cx="36" cy="36" r="34" style={{ strokeDasharray: (badge.percent / 100 * 213.63) + " 213.63" }} />
      </svg>}
      <Icon size={32} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" />
      {!badge.earned && !badge.inProgress && <LockKeyhole className="evo-badge-mini-lock" size={12} strokeWidth={1.7} aria-hidden="true" />}
    </span>
    <span className="evo-profile-badge-label">{badge.label}</span>
  </>
  if (!onClick) return <div className={className}>{contents}</div>
  return <button
    type="button"
    className={className}
    onClick={onClick}
    aria-label={badge.label + ", " + (badge.earned ? "megszerezve" : badge.inProgress ? "folyamatban, " + amount : "zárolva, " + amount)}
  >{contents}</button>
}

export default function ProfileDashboard({
  userName, avatar, avatarImage, fallbackAvatar, joinedAt, xp, stars, streak,
  lastStudyDate, readCount, completedCount, completedTaskCount, weeklyStudySeconds,
  onEdit, onStreakSettings, onFriendsClick,
}: Props) {
  const [courseOpen, setCourseOpen] = useState(false)
  const [badgeView, setBadgeView] = useState<"featured" | "all">("featured")
  const [selectedBadgeId, setSelectedBadgeId] = useState<string | null>(null)
  const [friendCount, setFriendCount] = useState(0)
  const [shareNotice, setShareNotice] = useState("")
  const [collapsed, setCollapsed] = useState(false)
  const [badgeDates, setBadgeDates] = useState<Record<string, string>>({})
  const [justEarnedId, setJustEarnedId] = useState<string | null>(null)

  const name = userName.trim() || "Tanuló"
  const handle = name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 20) || "tanulo"
  const joinDate = shortJoinDate(joinedAt)
  const hasStudiedToday = lastStudyDate === localDayKey(new Date())
  const avatarImageSrc = avatarImage || (avatar === "fox" ? fallbackAvatar : "")

  useEffect(() => {
    const onScroll = () => setCollapsed(window.scrollY > 84)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    let cancelled = false
    async function loadFriends() {
      let friendIds: string[] = []
      try {
        const response = await fetch("/api/state", { credentials: "same-origin", cache: "no-store" })
        if (response.ok) {
          const result = await response.json() as { state?: { friends?: unknown } }
          if (Array.isArray(result.state?.friends)) friendIds = result.state.friends.filter((id): id is string => typeof id === "string")
        }
      } catch { /* Local cache fallback. */ }

      if (friendIds.length === 0) {
        try {
          const raw = localStorage.getItem("evolingo.friends.v1")
          const result = raw ? JSON.parse(raw) as { friends?: unknown } : null
          if (Array.isArray(result?.friends)) friendIds = result.friends.filter((id): id is string => typeof id === "string")
        } catch { /* No cached friends. */ }
      }
      if (cancelled) return
      setFriendCount(friendIds.length)
    }
    void loadFriends()
    return () => { cancelled = true }
  }, [])

  const weekly = useMemo(() => {
    const today = new Date()
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 6) % 7))
    const labels = ["H", "K", "Sze", "Cs", "P", "Szo", "V"]
    const days = labels.map((label, index) => {
      const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index)
      const seconds = Math.max(0, weeklyStudySeconds[localDayKey(day)] || 0)
      return { label, seconds, isToday: localDayKey(day) === localDayKey(today) }
    })
    const total = days.reduce((sum, day) => sum + day.seconds, 0)
    const max = Math.max(1, ...days.map(day => day.seconds))
    return {
      days: days.map(day => ({ ...day, height: day.seconds ? Math.max(4, Math.round(day.seconds / max * 64)) : 4 })),
      minutes: Math.floor(total / 60),
    }
  }, [weeklyStudySeconds])

  const badges = useMemo(() => {
    const specs: BadgeDefinition[] = [
      { id: "streak", label: "Napi sorozat", description: "Tanulj három egymást követő napon.", icon: Flame, current: streak, target: 3, unit: "nap" },
      { id: "complete", label: "Teljesítés", description: "Teljesíts egy leckét.", icon: Trophy, current: completedCount, target: 1, unit: "lecke" },
      { id: "points", label: "2 pont", description: "Gyűjts össze legalább két csillagot.", icon: Star, current: stars, target: 2, unit: "csillag" },
      { id: "double", label: "Dupla pont", description: "Oldj meg húsz feladatot.", icon: Zap, current: completedTaskCount, target: 20, unit: "feladat" },
      { id: "milestone", label: "Mérföldkő", description: "Teljesíts öt leckét.", icon: Flag, current: completedCount, target: 5, unit: "lecke" },
      { id: "favorite", label: "Kedvenc", description: "Szerezz legalább három tanulótársat.", icon: Heart, current: friendCount, target: 3, unit: "barát" },
      { id: "special", label: "Különleges", description: "Teljesíts tíz leckét.", icon: Gem, current: completedCount, target: 10, unit: "lecke" },
      { id: "persistent", label: "Kitartás", description: "Tanulj hét egymást követő napon.", icon: Clock3, current: streak, target: 7, unit: "nap" },
      { id: "explorer", label: "Felfedező", description: "Olvass el öt leckét.", icon: Compass, current: readCount, target: 5, unit: "lecke" },
      { id: "vocabulary", label: "Szókincs", description: "Gyűjts ötszáz tapasztalati pontot.", icon: BookOpen, current: xp, target: 500, unit: "pont" },
      { id: "challenge", label: "Kihívás", description: "Oldj meg ötven feladatot.", icon: Target, current: completedTaskCount, target: 50, unit: "feladat" },
      { id: "legend", label: "Legenda", description: "Tanulj harminc egymást követő napon.", icon: Crown, current: streak, target: 30, unit: "nap" },
    ]
    return specs.map(item => ({
      ...item,
      earned: item.current >= item.target,
      inProgress: item.current > 0 && item.current < item.target,
      percent: Math.min(100, Math.round(item.current / item.target * 100)),
    }))
  }, [streak, completedCount, stars, completedTaskCount, friendCount, readCount, xp])

  useEffect(() => {
    const unlocked = badges.filter(badge => badge.earned).map(badge => badge.id)
    try {
      const raw = localStorage.getItem(BADGE_STORAGE)
      if (!raw) {
        // Pre-existing achievements cannot be assigned invented historical dates.
        localStorage.setItem(BADGE_STORAGE, JSON.stringify({ unlocked, dates: {} }))
        return
      }
      const previous = JSON.parse(raw) as { unlocked?: string[]; dates?: Record<string, string> }
      const dates = previous.dates || {}
      const newlyUnlocked = unlocked.filter(id => !(previous.unlocked || []).includes(id))
      if (newlyUnlocked.length) {
        const nextDates = { ...dates }
        for (const id of newlyUnlocked) nextDates[id] = new Date().toISOString()
        setBadgeDates(nextDates)
        setJustEarnedId(newlyUnlocked[0])
        if (typeof navigator.vibrate === "function") navigator.vibrate(12)
        localStorage.setItem(BADGE_STORAGE, JSON.stringify({ unlocked, dates: nextDates }))
      } else {
        setBadgeDates(dates)
        localStorage.setItem(BADGE_STORAGE, JSON.stringify({ unlocked, dates }))
      }
    } catch { /* Achievements still render if storage is unavailable. */ }
  }, [badges])

  const earnedCount = badges.filter(badge => badge.earned).length
  const orderedBadges = [...badges].sort((a, b) =>
    Number(b.earned) - Number(a.earned) || Number(b.inProgress) - Number(a.inProgress)
  )
  const selectedBadge = badges.find(badge => badge.id === selectedBadgeId) || null
  const shareProfile = async () => {
    const url = window.location.origin
    try {
      if (navigator.share) {
        await navigator.share({ title: name + " · Evölingo", text: "Tanulj velem az Evölingón!", url })
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url)
        setShareNotice("A hivatkozás másolva.")
      } else {
        setShareNotice("A megosztás nem érhető el.")
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return
      setShareNotice("A megosztás nem sikerült.")
    }
  }

  return <div className="evo-profile-dashboard">
    <header className="evo-profile-topbar" aria-label="Profil navigáció">
      <span className="evo-profile-wordmark" aria-label="Evölingo">evölingo</span>
      <span className={"evo-profile-collapsed-title" + (collapsed ? " is-visible" : "")} aria-hidden="true">Profil</span>
      <Button variant="ghost" size="icon" className="evo-profile-settings" aria-label="Profilbeállítások" onClick={onEdit}>
        <Settings size={20} strokeWidth={1.8} aria-hidden="true" />
      </Button>
    </header>

    <div className="evo-profile-heading">
      <h1>Profil</h1>
      <button type="button" className="evo-profile-course" aria-label="Tanfolyamválasztás: erasmus" onClick={() => setCourseOpen(true)}>
        <img src="https://flagcdn.com/w80/gb.png" alt="" width={21} height={21} />
        <span>erasmus</span><ChevronDown size={14} strokeWidth={1.7} aria-hidden="true" />
      </button>
    </div>

    <section className="evo-profile-intro" aria-label="Saját profil">
      <div className="evo-profile-identity">
        <h2>{name}</h2>
        <p className="evo-profile-meta">
          <span>@{handle}</span>
          {joinDate && <span className="evo-profile-joined">Csatlakozott: {joinDate}</span>}
        </p>
      </div>
      <div className="evo-profile-avatar-ring" aria-label="Profilkép">
        <span className="evo-profile-avatar-inner">
          {avatarImageSrc ? <img src={avatarImageSrc} alt="" /> : avatar === "book" ? <BookOpen size={29} strokeWidth={1.7} /> : avatar === "star" ? <Star size={29} strokeWidth={1.7} /> : <Sparkles size={29} strokeWidth={1.7} />}
        </span>
      </div>
    </section>

    <div className="evo-profile-actions">
      <Button variant="default" className="evo-profile-edit" onClick={onEdit}>
        <Pencil size={17} strokeWidth={1.8} aria-hidden="true" />
        <span>Profil szerkesztése</span>
      </Button>
      <Button variant="outline" size="icon" className="evo-profile-share" onClick={() => { void shareProfile() }} aria-label="Profil megosztása" title="Profil megosztása">
        <Share size={20} strokeWidth={1.8} aria-hidden="true" />
      </Button>
    </div>
    {shareNotice && <p className="evo-profile-share-status" role="status">{shareNotice}</p>}

    <Separator className="evo-profile-section-divider" />
    <section className="evo-profile-stats" aria-label="Profilstatisztikák">
      <button type="button" className={"evo-profile-stat" + (hasStudiedToday && streak > 0 ? " is-active" : "")} onClick={onStreakSettings} aria-label={streak + " nap sorozat. Napi cél beállításai."}>
        <strong>{formatNumber(streak)}</strong>
        <span><Flame size={14} strokeWidth={1.7} aria-hidden="true" /> Nap sorozat</span>
      </button>
      <div className="evo-profile-stat">
        <strong>{formatNumber(stars)}</strong>
        <span><Star size={14} strokeWidth={1.7} aria-hidden="true" /> Csillag</span>
      </div>
      <div className="evo-profile-stat">
        <strong>{formatNumber(completedCount)}</strong>
        <span><BookOpen size={14} strokeWidth={1.7} aria-hidden="true" /> Lecke</span>
      </div>
    </section>

    <div className="evo-profile-secondary-stats">
      <span>{formatNumber(xp)} XP összesen</span>
      <button type="button" onClick={onFriendsClick} aria-label={friendCount + " barát. Barátok megnyitása."}>
        <Users size={16} strokeWidth={1.7} aria-hidden="true" />
        {formatNumber(friendCount)} barát
        <ChevronRight size={15} strokeWidth={1.7} aria-hidden="true" />
      </button>
    </div>

    <section className="evo-profile-learning" aria-labelledby="evo-profile-learning-heading">
      <h2 id="evo-profile-learning-heading">Tanulási haladás</h2>
      <div className="evo-profile-learning-rows">
        <div><span>Elolvasott leckék</span><strong>{formatNumber(readCount)}</strong></div>
        <div><span>Megoldott feladatok</span><strong>{formatNumber(completedTaskCount)}</strong></div>
      </div>
    </section>

    <section className="evo-profile-badges" aria-labelledby="evo-profile-badges-heading">
      <div className="evo-profile-section-heading">
        <div className="evo-profile-badges-heading"><h2 id="evo-profile-badges-heading">Eredmények</h2><span>{earnedCount}/12</span></div>
        <ActionSwap
          className="evo-profile-badge-swap"
          size="sm"
          value={badgeView}
          states={[
            { id: "featured", label: "Kiemelt", icon: <Medal size={16} strokeWidth={1.8} />, tone: "quiet" },
            { id: "all", label: "Összes", icon: <LayoutGrid size={16} strokeWidth={1.8} />, tone: "neutral" },
          ]}
          onValueChange={id => setBadgeView(id === "all" ? "all" : "featured")}
          aria-label={badgeView === "all" ? "Váltás a kiemelt jelvényekre" : "Összes jelvény megjelenítése"}
        />
      </div>
      <div className="evo-profile-badges-viewport">
        <div className={badgeView === "all" ? "evo-profile-badges-all" : "evo-profile-badges-rail"} role="group" aria-label={badgeView === "all" ? "Összes jelvény" : "Kiemelt jelvények"}>
          {(badgeView === "all" ? orderedBadges : orderedBadges.slice(0, 5)).map(badge => <BadgeTile key={badge.id} badge={badge} fresh={badge.id === justEarnedId} onClick={() => setSelectedBadgeId(badge.id)} />)}
        </div>
      </div>
    </section>

    <section className="evo-profile-weekly" aria-labelledby="evo-profile-weekly-heading">
      <div className="evo-profile-weekly-heading">
        <h2 id="evo-profile-weekly-heading">Heti aktivitás</h2><span>{formatNumber(weekly.minutes)} perc</span>
      </div>
      <div className="evo-profile-week-chart" role="img" aria-label={"Heti tanulási idő: " + weekly.minutes + " perc"}>
        {weekly.days.map((day, index) => <div className={"evo-profile-day " + (day.isToday ? "is-today" : "")} key={index}>
          <div className="evo-profile-bar-track"><span className="evo-profile-bar" style={{ height: day.height + "px" }} /></div>
          <span className="evo-profile-day-name">{day.label}</span>
        </div>)}
      </div>
    </section>

    {courseOpen && <BottomSheet title="Tanfolyamválasztás" onClose={() => setCourseOpen(false)}>
      <button className="evo-course-option" type="button" onClick={() => setCourseOpen(false)}>
        <img src="https://flagcdn.com/w80/gb.png" alt="" width={24} height={24} /><span><strong>erasmus</strong><small>Angol · jelenlegi tanfolyam</small></span><Check size={20} strokeWidth={1.7} aria-hidden="true" />
      </button>
    </BottomSheet>}

    {selectedBadge && <BottomSheet title="Jelvény részletei" onClose={() => setSelectedBadgeId(null)}>
      <div className="evo-badge-detail">
        <BadgeTile badge={selectedBadge}  />
        <h3>{selectedBadge.label}</h3>
        <p>{selectedBadge.description}</p>
        <strong>{selectedBadge.earned ? "Megszerzett jelvény" : formatNumber(Math.min(selectedBadge.current, selectedBadge.target)) + "/" + selectedBadge.target + " " + selectedBadge.unit}</strong>
        {!selectedBadge.earned && <div className="evo-badge-detail-track"><span style={{ width: selectedBadge.percent + "%" }} /></div>}
        {selectedBadge.earned && <span className="evo-badge-date">
          {badgeDates[selectedBadge.id]
            ? "Megszerzés: " + new Date(badgeDates[selectedBadge.id]).toLocaleDateString("hu-HU")
            : "A megszerzés dátuma nincs rögzítve."}
        </span>}
      </div>
    </BottomSheet>}
  </div>
}
