"use client"

import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react"
import { ArrowRight, Check, CircleAlert, Info } from "lucide-react"

type ButtonVariant = "primary" | "secondary" | "ghost"

type EvoButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  leading?: ReactNode
  trailing?: ReactNode
}

export function EvoButton({
  variant = "primary",
  leading,
  trailing,
  className = "",
  children,
  type = "button",
  ...props
}: EvoButtonProps) {
  const variantClass = variant === "primary" ? "evo-primary-button" : variant === "secondary" ? "evo-secondary-button" : "evo-ghost-button"

  return (
    <button type={type} className={[variantClass, className].filter(Boolean).join(" ")} {...props}>
      {leading ? <span className="evo-button-leading" aria-hidden="true">{leading}</span> : null}
      <span>{children}</span>
      {trailing ? <span className="evo-button-trailing" aria-hidden="true">{trailing}</span> : null}
    </button>
  )
}

export function EvoCard({ className = "", children, ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={["evo-card", className].filter(Boolean).join(" ")} {...props}>{children}</section>
}

export function EvoProgress({
  value,
  max = 100,
  label,
  className = "",
}: {
  value: number
  max?: number
  label: string
  className?: string
}) {
  const safeMax = Number.isFinite(max) && max > 0 ? max : 100
  const safeValue = Number.isFinite(value) ? Math.min(safeMax, Math.max(0, value)) : 0
  const percent = (safeValue / safeMax) * 100

  return (
    <div
      className={["evo-progress", className].filter(Boolean).join(" ")}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={safeMax}
      aria-valuenow={safeValue}
    >
      <span style={{ width: percent + "%" }} />
    </div>
  )
}

export function EvoStatusBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode
  tone?: "neutral" | "success" | "warning"
}) {
  return <span className={"evo-status-badge evo-status-badge-" + tone}>{children}</span>
}

export function EvoEmptyState({
  title,
  description,
  action,
  icon = "info",
}: {
  title: string
  description: string
  action?: ReactNode
  icon?: "info" | "success" | "warning"
}) {
  const Icon = icon === "success" ? Check : icon === "warning" ? CircleAlert : Info
  return (
    <section className="evo-empty-state" aria-label={title}>
      <span className="evo-empty-icon" aria-hidden="true"><Icon size={22} strokeWidth={1.75} /></span>
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </section>
  )
}

export function EvoSectionHeading({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="evo-section-heading">
      <div>
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {action}
    </div>
  )
}

export function EvoMetric({
  label,
  value,
  detail,
}: {
  label: string
  value: ReactNode
  detail?: string
}) {
  return (
    <div className="evo-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <small>{detail}</small> : null}
    </div>
  )
}

export function EvoContinueButton({ onClick, children = "Continue lesson" }: { onClick: () => void; children?: ReactNode }) {
  return <EvoButton onClick={onClick} trailing={<ArrowRight size={19} strokeWidth={1.75} />}>{children}</EvoButton>
}
