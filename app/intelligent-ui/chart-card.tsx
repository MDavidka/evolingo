"use client"
import { useEffect, useId, useMemo, useState } from "react"
import { BarChart3, ChartNoAxesCombined, ChartPie } from "lucide-react"
import type { ChartCardBlock } from "./schema"

/** Accessible, responsive native SVG chart; model data is validated upstream. */
export default function ChartCard({ block, storageKey }: { block: ChartCardBlock; storageKey: string }) {
  const labelId = useId()
  const [selected, setSelected] = useState(0)
  const points = block.props.points
  const total = points.reduce((sum, point) => sum + point.value, 0)
  const max = Math.max(1, ...points.map(point => point.value))
  const selectedPoint = points[Math.min(selected, points.length - 1)]
  const nf = useMemo(() => new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 2 }), [])
  const unit = block.props.unit ? " " + block.props.unit : ""
  const width = 320
  const height = 170
  const bottom = 143
  const track = 127
  const gap = width / points.length
  const valueY = (value: number) => bottom - (value / max) * track
  const pointX = (index: number) => gap * (index + 0.5)
  const ariaDescription = points.map(point => point.label + ": " + nf.format(point.value) + unit).join("; ")

  useEffect(() => {
    try {
      const stored = Number(sessionStorage.getItem(storageKey))
      if (Number.isInteger(stored) && stored >= 0 && stored < points.length) setSelected(stored)
    } catch {}
  }, [storageKey, points.length])
  const choose = (index: number) => {
    setSelected(index)
    try { sessionStorage.setItem(storageKey, String(index)) } catch {}
  }
  const linePoints = points.map((point, index) => pointX(index) + "," + valueY(point.value)).join(" ")
  const radius = 60
  const circumference = 2 * Math.PI * radius
  let consumed = 0
  const colors = ["#637d9d", "#8ba2b8", "#b4c2d1", "#d2dae3", "#7d899d", "#9eabb9", "#bcc9d6", "#dae0e8"]

  return <section className="evo-iui-block evo-visual-chart" aria-labelledby={labelId}>
    <div className="evo-iui-flex-heading">
      <div><p className="evo-iui-kicker">Adatvizualizáció</p><h3 id={labelId}>{block.props.title}</h3></div>
      <span className="evo-visual-chart-kind" aria-hidden="true">
        {block.props.chartType === "bar" ? <BarChart3 size={20} /> :
          block.props.chartType === "line" ? <ChartNoAxesCombined size={20} /> : <ChartPie size={20} />}
      </span>
    </div>
    <div className="evo-visual-chart-source">
      {block.props.source === "example" ? "Szemléltető adatok" : "Rögzített leckehaladás"}
    </div>

    {block.props.chartType === "donut" ?
      <svg className="evo-visual-chart-svg evo-visual-chart-donut" viewBox="0 0 320 180" role="img" aria-label={block.props.title + ": " + ariaDescription}>
        <g transform="translate(160 88) rotate(-90)">
          <circle r={radius} fill="none" stroke="#eceef1" strokeWidth="24" />
          {total > 0 && points.map((point, index) => {
            const segment = (point.value / total) * circumference
            const offset = consumed
            consumed += segment
            return <circle key={index} r={radius} fill="none" stroke={colors[index]} strokeWidth={selected === index ? 27 : 23}
              strokeDasharray={segment + " " + (circumference - segment)} strokeDashoffset={-offset} strokeLinecap="butt" />
          })}
        </g>
        <text x="160" y="87" textAnchor="middle" fontSize="21" fontWeight="650" fill="#202127">{total ? nf.format(selectedPoint.value / total * 100) + "%" : "0%"}</text>
        <text x="160" y="108" textAnchor="middle" fontSize="11" fill="#8e8e93">{selectedPoint.label.slice(0, 23)}</text>
      </svg> :
      <svg className="evo-visual-chart-svg" viewBox={"0 0 " + width + " " + height} role="img" aria-label={block.props.title + ": " + ariaDescription}>
        {[0, 0.5, 1].map((ratio, index) => <line key={index} x1="8" x2="312" y1={bottom - ratio * track} y2={bottom - ratio * track} stroke="#e8eaf0" strokeDasharray={ratio === 0 ? undefined : "3 4"} />)}
        {block.props.chartType === "bar" ? points.map((point, index) => {
          const w = Math.min(31, gap * 0.57)
          const x = pointX(index) - w / 2
          const y = valueY(point.value)
          return <rect key={index} x={x} y={y} rx="6" width={w} height={Math.max(0, bottom - y)}
            fill={selected === index ? "#536f94" : "#a9b7ca"} />
        }) : <>
          <polyline points={linePoints} fill="none" stroke="#748aa7" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
          {points.map((point, index) => <circle key={index} cx={pointX(index)} cy={valueY(point.value)}
            r={selected === index ? 6 : 4} fill={selected === index ? "#536f94" : "#fff"} stroke="#7086a4" strokeWidth="2" />)}
        </>}
        {points.map((point, index) => <text key={index} x={pointX(index)} y="164" textAnchor="middle" fontSize="10" fill="#697485">{point.label.slice(0, Math.max(3, Math.floor(gap / 9)))}</text>)}
      </svg>
    }

    <div className="evo-visual-chart-selection" role="group" aria-label="Adatpont kiválasztása">
      {points.map((point, index) => <button type="button" key={index} aria-pressed={selected === index}
        className={selected === index ? "is-active" : ""} onClick={() => choose(index)}>
        {point.label}
      </button>)}
    </div>
    <p className="evo-visual-chart-value" role="status"><strong>{selectedPoint.label}</strong><span>{nf.format(selectedPoint.value)}{unit}</span></p>
    <details className="evo-visual-chart-data"><summary>Adatok megtekintése</summary>
      <ul>{points.map((point, index) => <li key={index}><span>{point.label}</span><strong>{nf.format(point.value)}{unit}</strong></li>)}</ul>
    </details>
  </section>
}
