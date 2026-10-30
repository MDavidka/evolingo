"use client"

import { useEffect, useId, useState } from "react"
import { RotateCcw } from "lucide-react"
import type { StudyCalculatorBlock } from "./schema"

type Values = { dailyMinutes: number; daysPerWeek: number; weeks: number }

const bounds = {
  dailyMinutes: { min: 5, max: 120, step: 5 },
  daysPerWeek: { min: 1, max: 7, step: 1 },
  weeks: { min: 1, max: 12, step: 1 },
} as const

/** Audited multiplication: no model-provided JavaScript or arithmetic expression. */
export function calculateLearningMinutes(values: Values): number {
  return values.dailyMinutes * values.daysPerWeek * values.weeks
}

export default function StudyCalculator({ block, storageKey }: { block: StudyCalculatorBlock; storageKey: string }) {
  const label = useId()
  const initial: Values = {
    dailyMinutes: block.props.dailyMinutes,
    daysPerWeek: block.props.daysPerWeek,
    weeks: block.props.weeks,
  }
  const [values, setValues] = useState<Values>(initial)
  const [announcement, setAnnouncement] = useState("")
  const formatter = new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 1 })
  const totalMinutes = calculateLearningMinutes(values)
  const weeklyMinutes = values.dailyMinutes * values.daysPerWeek
  const resultText = formatter.format(totalMinutes / 60) + " óra"
  const commit = () => setAnnouncement("Összes tanulási idő: " + resultText)

  useEffect(() => {
    setValues(initial)
    try {
      const raw = sessionStorage.getItem(storageKey)
      const saved: unknown = raw ? JSON.parse(raw) : null
      if (!saved || typeof saved !== "object" || Array.isArray(saved)) return
      const entry = saved as Record<string, unknown>
      const next = { ...initial }
      for (const key of Object.keys(bounds) as (keyof Values)[]) {
        const n = entry[key]
        const setting = bounds[key]
        if (typeof n === "number" && Number.isInteger(n) &&
            n >= setting.min && n <= setting.max && n % setting.step === 0) {
          next[key] = n
        }
      }
      setValues(next)
    } catch { /* Session storage is optional. */ }
    // The message id changes when a new generated calculator is opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey])

  const change = (key: keyof Values, value: number) => {
    const next = { ...values, [key]: value }
    setValues(next)
    try { sessionStorage.setItem(storageKey, JSON.stringify(next)) } catch {}
  }
  const reset = () => {
    setValues(initial)
    setAnnouncement("Az alapértékek visszaállítva.")
    try { sessionStorage.removeItem(storageKey) } catch {}
  }

  return <section className="evo-iui-block evo-iui-study-calculator" aria-labelledby={label}>
    <div className="evo-iui-flex-heading"><div>
      <p className="evo-iui-kicker">Tanulásiidő-kalkulátor</p>
      <h3 id={label}>{block.props.title}</h3>
    </div></div>
    <div className="evo-iui-calculator-controls">
      {([
        ["dailyMinutes", "Tanulás naponta", "perc"],
        ["daysPerWeek", "Tanulós napok hetente", "nap"],
        ["weeks", "Hány hétre tervezzünk?", "hét"],
      ] as const).map(([key, title, unit]) => <label key={key} className="evo-iui-calculator-field">
        <span><strong>{title}</strong><output>{formatter.format(values[key])} {unit}</output></span>
        <input type="range" min={bounds[key].min} max={bounds[key].max} step={bounds[key].step}
          value={values[key]} onChange={event => change(key, Number(event.target.value))}
          onPointerUp={commit} onKeyUp={commit} onBlur={commit}
          aria-label={title} aria-valuetext={formatter.format(values[key]) + " " + unit} />
      </label>)}
    </div>
    <div className="evo-iui-calculator-result">
      <small>Teljes tanulási idő</small>
      <strong>{resultText}</strong>
      <p>{values.dailyMinutes} perc × {values.daysPerWeek} nap × {values.weeks} hét = {formatter.format(totalMinutes)} perc</p>
      <span>Hetente: {formatter.format(weeklyMinutes)} perc ({formatter.format(weeklyMinutes / 60)} óra)</span>
    </div>
    <div className="evo-iui-calculator-bottom"><p>Helyben számított becslés, nem rögzített tanulási adat.</p>
      <button type="button" onClick={reset}><RotateCcw size={16} strokeWidth={1.75} /> Visszaállítás</button>
    </div>
    <span className="evo-iui-visually-hidden" role="status" aria-live="polite">{announcement}</span>
  </section>
}
