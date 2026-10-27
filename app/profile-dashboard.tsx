"use client"

import { useEffect, useMemo, useState, type CSSProperties } from "react"
import { ChevronDown, ChevronRight, Flame, LockKeyhole, Settings, Share2, Star, Trophy, Users, X } from "lucide-react"

type FriendPreview = { id: string; name: string; avatar: string; avatarImage?: string }
type Badge = { id: string; label: string; earned: boolean; progress: number }

type Props = {
  userName: string
  avatar: string
  avatarImage: string
  fallbackAvatar: string
  xp: number
  streak: number
  weeklyStudySeconds: Record<string, number>
  onEdit: () => void
  onStreakSettings: () => void
  onFriendsClick: () => void
}

const BADGE_LABELS = [
  "Napi sorozat", "Teljesítés", "2 pont", "Dupla pont",
  "Mérföldkő", "Kedvenc", "Különleges", "Kitartás",
  "Felfedező", "Szókincs", "Kihívás", "Legenda",
]

function localDayKey(date: Date): string {
  return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0")
}

function BadgeIllustration({ badge, compact = false }: { badge: Badge; compact?: boolean }) {
  return <span
    className={"evo-badge-art " + (badge.earned ? "is-earned" : "is-locked") + " evo-badge-art--" + badge.id}
    style={badge.earned ? undefined : { "--badge-progress": badge.progress + "%" } as CSSProperties}
    aria-hidden="true"
  >
    {badge.earned ? (
      badge.id === "streak"
        ? <span className="evo-badge-symbol"><Flame size={compact ? 25 : 32} strokeWidth={2.5} fill="currentColor" /></span>
        : <span className="evo-badge-symbol"><Trophy size={compact ? 25 : 32} strokeWidth={2.2} fill="currentColor" /></span>
    ) : <span className="evo-badge-lock"><LockKeyhole size={compact ? 19 : 24} strokeWidth={2.6} fill="currentColor" /></span>}
  </span>
}

export default function ProfileDashboard({
  userName, avatar, avatarImage, fallbackAvatar, xp, streak,
  weeklyStudySeconds, onEdit, onStreakSettings, onFriendsClick,
}: Props) {
  const [courseOpen, setCourseOpen] = useState(false)
  const [allBadgesOpen, setAllBadgesOpen] = useState(false)
  const [friendCount, setFriendCount] = useState(0)
  const [friendPreview, setFriendPreview] = useState<FriendPreview[]>([])
  const [shareNotice, setShareNotice] = useState("")
  const name = userName.trim() || "Mdavid"
  const handle = name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 20) || "mdavid"
  const profilePhoto = avatarImage || (avatar === "fox" ? fallbackAvatar : "")

  useEffect(() => {
    let cancelled = false
    async function loadFriends() {
      let friendIds: string[] = []
      try {
        const stateResponse = await fetch("/api/state", { credentials: "same-origin", cache: "no-store" })
        if (stateResponse.ok) {
          const response = await stateResponse.json() as { state?: { friends?: unknown } }
          if (Array.isArray(response.state?.friends)) {
            friendIds = response.state.friends.filter((id): id is string => typeof id === "string")
          }
        }
      } catch {
        // Fall back to the local list if offline.
      }

      if (friendIds.length === 0) {
        try {
          const raw = window.localStorage.getItem("evolingo.friends.v1")
          if (raw) {
            const data = JSON.parse(raw) as { friends?: unknown }
            if (Array.isArray(data.friends)) friendIds = data.friends.filter((id): id is string => typeof id === "string")
          }
        } catch {
          // Empty lists are fine for new users.
        }
      }
      if (!cancelled) setFriendCount(friendIds.length)
      if (!friendIds.length) return

      try {
        const response = await fetch("/api/friends/suggestions", { credentials: "same-origin", cache: "no-store" })
        if (!response.ok) return
        const data = await response.json() as { profiles?: FriendPreview[] }
        if (cancelled || !Array.isArray(data.profiles)) return
        const profiles = data.profiles.filter(profile => friendIds.includes(profile.id)).slice(0, 5)
        setFriendPreview(profiles)
      } catch {
        // Existing friends remain counted even if their avatars are offline.
      }
    }
    void loadFriends()
    return () => { cancelled = true }
  }, [])

  const weekDays = useMemo(() => {
    const today = new Date()
    const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 6) % 7))
    const labels = ["H", "K", "Sze", "Cs", "P", "Szo", "V"]
    const days = labels.map((label, i) => {
      const day = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)
      const seconds = Math.max(0, weeklyStudySeconds[localDayKey(day)] || 0)
      return { label, seconds, isToday: localDayKey(day) === localDayKey(today) }
    })
    const total = days.reduce((sum, day) => sum + day.seconds, 0)
    const highest = Math.max(60, ...days.map(day => day.seconds))
    return { days: days.map(day => ({ ...day, barHeight: day.seconds > 0 ? 16 + Math.round(day.seconds / highest * 52) : 13 })), totalMinutes: Math.floor(total / 60) }
  }, [weeklyStudySeconds])

  const badges: Badge[] = BADGE_LABELS.map((label, i) => ({
    id: i === 0 ? "streak" : i === 1 ? "complete" : "locked-" + i,
    label,
    // Until achievement rules are added to the product, the two featured badges
    // intentionally use the awarded visual design from the supplied reference.
    earned: i < 2,
    progress: i === 2 ? 12 : i === 3 ? 10 : i === 4 ? 9 : i === 5 ? 6 : 0,
  }))

  const shareProfile = async () => {
    const url = window.location.origin
    const title = name + " · Evölingo"
    const text = "Tanulj velem az Evölingón!"
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url })
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url)
        setShareNotice("Az Evölingo linkje másolva!")
      } else {
        setShareNotice("A megosztás nem érhető el ezen az eszközön.")
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return
      setShareNotice("A megosztás nem sikerült.")
    }
  }

  useEffect(() => {
    if (!allBadgesOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAllBadgesOpen(false)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [allBadgesOpen])

  return <div className="evo-profile-dashboard">
    <header className="evo-profile-topbar">
      <div className="evo-profile-course-anchor">
        <button className="evo-profile-course" type="button" aria-expanded={courseOpen} aria-haspopup="true" onClick={() => setCourseOpen(value => !value)}>
          <img src="https://flagcdn.com/w80/gb.png" alt="Egyesült Királyság zászlaja" width={28} height={28} />
          <span>erasmus</span>
          <ChevronDown size={19} strokeWidth={2.5} aria-hidden="true" />
        </button>
        {courseOpen && <div className="evo-profile-course-menu" role="status"><strong>erasmus</strong><span>Angol tanfolyam · kiválasztva</span></div>}
      </div>
      <button className="evo-profile-settings" type="button" aria-label="Profilbeállítások" onClick={onEdit}><Settings size={24} strokeWidth={2.8} aria-hidden="true" /></button>
    </header>

    <section className="evo-profile-intro" aria-label="Saját profil">
      <div className="evo-profile-identity">
        <h1>{name}</h1>
        <p className="evo-profile-handle">@{handle}</p>
        <p className="evo-profile-joined">Csatlakozott: 2025 október</p>
      </div>
      <div className="evo-profile-avatar-ring" aria-label="Profilkép">
        <span className="evo-profile-avatar-inner">
          {profilePhoto ? <img src={profilePhoto} alt="" /> : <span className="evo-profile-avatar-emoji">{avatar === "book" ? "📚" : avatar === "star" ? "⭐" : "✨"}</span>}
        </span>
      </div>
    </section>

    <div className="evo-profile-actions">
      <button className="evo-profile-edit" type="button" onClick={onEdit}>Profil szerkesztése</button>
      <button className="evo-profile-share" type="button" onClick={() => { void shareProfile() }}><Share2 size={19} strokeWidth={2.2} aria-hidden="true" />Megosztás</button>
    </div>
    {shareNotice && <p className="evo-profile-share-status" role="status">{shareNotice}</p>}

    <section className="evo-profile-stats" aria-label="Profilstatisztikák">
      <button className="evo-profile-stat" type="button" onClick={onStreakSettings} aria-label={streak + " napos sorozat, napi cél beállításai"}>
        <Flame className="evo-stat-flame" size={28} strokeWidth={2.2} fill="currentColor" aria-hidden="true" />
        <strong>{streak}</strong><span>nap sorozat</span>
      </button>
      <div className="evo-profile-stat">
        <Star className="evo-stat-star" size={28} strokeWidth={2.2} fill="currentColor" aria-hidden="true" />
        <strong>{xp.toLocaleString("hu-HU")}</strong><span>pont</span>
      </div>
      <div className="evo-profile-stat">
        <Trophy className="evo-stat-trophy" size={28} strokeWidth={2.2} fill="currentColor" aria-hidden="true" />
        <strong>Arany</strong><span>liga</span>
      </div>
      <button className="evo-profile-stat" type="button" onClick={onFriendsClick} aria-label={friendCount + " barát, barátok megnyitása"}>
        <Users className="evo-stat-friends" size={28} strokeWidth={2.2} fill="currentColor" aria-hidden="true" />
        <strong>{friendCount}</strong><span>barát</span>
      </button>
    </section>

    <section className="evo-profile-badges" aria-labelledby="evo-profile-badges-heading">
      <div className="evo-profile-section-heading">
        <h2 id="evo-profile-badges-heading">Jelvények <span>· 2/12</span></h2>
        <button className="evo-profile-see-all" type="button" onClick={() => setAllBadgesOpen(true)}>Összes <span aria-hidden="true">→</span></button>
      </div>
      <div className="evo-profile-badges-viewport">
        <div className="evo-profile-badges-rail" role="list" aria-label="Megszerezhető jelvények">
          {badges.slice(0, 6).map(badge => <div className="evo-profile-badge" key={badge.id} role="listitem">
            <BadgeIllustration badge={badge} />
            <span className="evo-profile-badge-label">{badge.label}</span>
          </div>)}
        </div>
      </div>
    </section>

    <section className="evo-profile-weekly" aria-labelledby="evo-profile-weekly-heading">
      <div className="evo-profile-weekly-heading">
        <h2 id="evo-profile-weekly-heading">Heti aktivitás</h2>
        <span>{weekDays.totalMinutes} perc ezen a héten</span>
      </div>
      <div className="evo-profile-week-chart" role="img" aria-label={"Heti tanulási idő: " + weekDays.totalMinutes + " perc, hétfőtől vasárnapig"}>
        {weekDays.days.map((day, index) => <div className={"evo-profile-day " + (day.isToday ? "is-today" : "")} key={index}>
          <span className="evo-profile-bar-track"><span className="evo-profile-bar" style={{ height: day.barHeight + "px" }} /></span>
          <span className="evo-profile-day-name">{day.label}</span>
        </div>)}
      </div>
    </section>

    <button className="evo-profile-friends-preview" type="button" onClick={onFriendsClick} aria-label="Barátok megnyitása">
      <span className="evo-profile-friends-avatars" aria-hidden="true">
        {Array.from({ length: 5 }, (_, i) => {
          const friend = friendPreview[i]
          return <span className={"evo-friend-avatar evo-friend-avatar-" + i} key={i}>
            {friend?.avatarImage ? <img src={friend.avatarImage} alt="" /> : friend?.avatar ? <span>{friend.avatar}</span> : <Users size={17} strokeWidth={1.8} />}
          </span>
        })}
      </span>
      <strong>{friendCount} barát</strong>
      <ChevronRight size={22} strokeWidth={2.4} aria-hidden="true" />
    </button>

    {allBadgesOpen && <div className="evo-badge-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setAllBadgesOpen(false) }}>
      <section className="evo-badge-modal" role="dialog" aria-modal="true" aria-labelledby="evo-badge-modal-heading">
        <header><div><h2 id="evo-badge-modal-heading">Összes jelvény</h2><p>2 / 12 jelvény</p></div><button type="button" aria-label="Bezárás" onClick={() => setAllBadgesOpen(false)}><X size={21} /></button></header>
        <div className="evo-badge-modal-grid">{badges.map(badge => <div className="evo-profile-badge" key={badge.id}><BadgeIllustration badge={badge} compact /><span className="evo-profile-badge-label">{badge.label}</span></div>)}</div>
      </section>
    </div>}
  </div>
}
