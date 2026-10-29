"use client"

/**
 * Evölingo's compact, segmented interaction sound palette.
 *
 * Each semantic action is a tiny original Web Audio cue rather than a long
 * melody or one universal click. If you later add reviewed Pixabay clips,
 * their licensed files can replace individual cues without changing callers.
 */
export type UiSound =
  | "welcome" | "tab" | "tap" | "select" | "swipe" | "flip"
  | "open" | "correct" | "wrong" | "complete" | "chest"
  | "notification" | "unlock"

type Segment = { frequency: number; duration: number; delay: number; volume: number; waveform?: OscillatorType }
const soundPalette: Record<UiSound, readonly Segment[]> = {
  tab: [{ frequency: 520, duration: .045, delay: 0, volume: .012 }],
  tap: [{ frequency: 430, duration: .034, delay: 0, volume: .008 }],
  select: [{ frequency: 580, duration: .05, delay: 0, volume: .012 }],
  swipe: [{ frequency: 480, duration: .04, delay: 0, volume: .01 }, { frequency: 630, duration: .045, delay: .045, volume: .009 }],
  flip: [{ frequency: 310, duration: .06, delay: 0, volume: .009, waveform: "triangle" }, { frequency: 520, duration: .05, delay: .055, volume: .01 }],
  open: [{ frequency: 450, duration: .06, delay: 0, volume: .013 }, { frequency: 660, duration: .07, delay: .075, volume: .014 }],
  correct: [{ frequency: 740, duration: .09, delay: 0, volume: .021 }, { frequency: 988, duration: .105, delay: .085, volume: .018 }],
  wrong: [{ frequency: 260, duration: .085, delay: 0, volume: .015, waveform: "triangle" }, { frequency: 220, duration: .12, delay: .085, volume: .011, waveform: "triangle" }],
  complete: [{ frequency: 523, duration: .09, delay: 0, volume: .018 }, { frequency: 659, duration: .09, delay: .10, volume: .018 }, { frequency: 784, duration: .14, delay: .20, volume: .02 }],
  chest: [{ frequency: 390, duration: .10, delay: 0, volume: .016, waveform: "triangle" }, { frequency: 520, duration: .12, delay: .11, volume: .017 }, { frequency: 740, duration: .15, delay: .22, volume: .02 }],
  notification: [{ frequency: 620, duration: .09, delay: 0, volume: .012 }, { frequency: 820, duration: .12, delay: .11, volume: .012 }],
  welcome: [{ frequency: 660, duration: .11, delay: 0, volume: .012 }, { frequency: 880, duration: .13, delay: .13, volume: .012 }],
  unlock: [{ frequency: 590, duration: .07, delay: 0, volume: .014 }, { frequency: 790, duration: .10, delay: .09, volume: .014 }],
}

// Optional, locally hosted Pixabay sample pack. The files are NOT bundled
// until individually downloaded and their source/license reviewed. The app
// defaults to the procedural clips below, which work offline.
const pixabaySampleFiles: Partial<Record<UiSound, string>> = {
  tab: "/sounds/tab.mp3",
  select: "/sounds/select.mp3",
  open: "/sounds/open.mp3",
  correct: "/sounds/correct.mp3",
  complete: "/sounds/complete.mp3",
  notification: "/sounds/notification.mp3",
}
const useSamplePack = process.env.NEXT_PUBLIC_EVO_PIXABAY_SOUND_PACK === "1"
let context: AudioContext | null = null
let lastSound = ""
let lastPlayedAt = 0

export function playUiSound(kind: UiSound): void {
  if (typeof window === "undefined") return
  try {
    if (window.localStorage.getItem("evolingo.sound.enabled") === "false") return
    const now = performance.now()
    // Prevent duplicate sounds from touch/click or nested event handlers.
    if (lastSound === kind && now - lastPlayedAt < 85) return
    lastSound = kind
    lastPlayedAt = now
    const sample = useSamplePack ? pixabaySampleFiles[kind] : undefined
    if (sample) {
      const audio = new Audio(sample)
      audio.volume = .22
      void audio.play().catch(() => {
        // Missing or blocked samples should not produce audible errors.
      })
      return
    }
    const AudioCtor = window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtor) return
    if (!context || context.state === "closed") context = new AudioCtor()
    if (context.state === "suspended") {
      // Safari resumes Web Audio from the first actual tap. Schedule the cue
      // now so that first tap is not silent, but never queue an autoplay chime.
      if (kind === "welcome") return
      void context.resume().catch(() => {})
    }

    const base = context.currentTime + .005
    for (const segment of soundPalette[kind]) {
      const start = base + segment.delay
      const end = start + segment.duration
      const osc = context.createOscillator()
      const gain = context.createGain()
      osc.type = segment.waveform ?? "sine"
      osc.frequency.setValueAtTime(segment.frequency, start)
      gain.gain.setValueAtTime(.0001, start)
      gain.gain.exponentialRampToValueAtTime(segment.volume, start + .008)
      gain.gain.exponentialRampToValueAtTime(.0001, end)
      osc.connect(gain)
      gain.connect(context.destination)
      osc.start(start)
      osc.stop(end + .02)
    }
  } catch {
    // Audio is optional and must never interrupt studying.
  }
}
