"use client"

import { useEffect, useId, useState } from "react"
import type { IllustrationBlock, LiveTimeBlock } from "./schema"

const EU_FLAG = "https://upload.wikimedia.org/wikipedia/commons/b/b7/Flag_of_Europe.svg"

export function IllustrationCard({ block }: { block: IllustrationBlock }) {
  const id = useId()
  return <figure className="evo-iui-block evo-iui-illustration" aria-labelledby={id}>
    <div className="evo-iui-illustration-art">
      <img src={EU_FLAG} alt="Az Európai Unió kék zászlaja tizenkét sárga csillaggal" loading="lazy" decoding="async" referrerPolicy="no-referrer" />
    </div>
    <figcaption>
      <p className="evo-iui-kicker">Vizuális magyarázat</p>
      <h3 id={id}>{block.props.title}</h3>
      <p>{block.props.caption}</p>
      <small>Illusztráció: Európa zászlaja · Wikimedia Commons</small>
    </figcaption>
  </figure>
}

function currentTime(timeZone: LiveTimeBlock["props"]["timeZone"]) {
  return {
    time: new Intl.DateTimeFormat("hu-HU", { timeZone, hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).format(new Date()),
    date: new Intl.DateTimeFormat("hu-HU", { timeZone, year: "numeric", month: "long", day: "numeric", weekday: "long" }).format(new Date()),
  }
}

export function LiveTimeCard({ block }: { block: LiveTimeBlock }) {
  const id = useId()
  const [now, setNow] = useState<{ time: string; date: string } | null>(null)
  useEffect(() => {
    const update = () => setNow(currentTime(block.props.timeZone))
    update()
    const timer = window.setInterval(update, 1000)
    return () => window.clearInterval(timer)
  }, [block.props.timeZone])
  return <section className="evo-iui-block evo-iui-live-time" aria-labelledby={id}>
    <p className="evo-iui-kicker">Élő idő</p>
    <h3 id={id}>{block.props.title}</h3>
    <div className="evo-iui-live-time-display" role="timer" aria-live="off">
      <strong>{now?.time ?? "--:--:--"}</strong>
      <span>{block.props.label}</span>
    </div>
    <p>{now?.date ?? "Idő lekérése…"}</p>
    <small>Időzóna: {block.props.timeZone}. Az óra az eszköz ideje alapján frissül.</small>
  </section>
}
