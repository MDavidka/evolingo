"use client"

import type { ReactNode } from "react"
import { ChevronRight, type LucideIcon } from "lucide-react"
import "./settings.css"

/**
 * Borderless, monochrome settings primitives.
 * No route or persistence assumptions; the calling screen owns the actions.
 */
export function UISettingsGroup({
  title, children, className = "",
}: { title: string; children: ReactNode; className?: string }) {
  return <section className={["evo-ui-settings-group", className].filter(Boolean).join(" ")} aria-label={title}>
    <h2 className="evo-ui-settings-group__heading">{title}</h2>
    <div className="evo-ui-settings-group__rows">{children}</div>
  </section>
}

export type UISettingsRowProps = {
  icon: LucideIcon
  title: string
  description?: string
  value?: string
  trailing?: ReactNode
  onClick?: () => void
  disabled?: boolean
  destructive?: boolean
  showChevron?: boolean
  className?: string
}

export function UISettingsRow({
  icon: Icon, title, description, value, trailing, onClick,
  disabled = false, destructive = false, showChevron = true, className = "",
}: UISettingsRowProps) {
  const classNames = [
    "evo-ui-settings-row",
    destructive ? "evo-ui-settings-row--destructive" : "",
    disabled ? "evo-ui-settings-row--disabled" : "",
    className,
  ].filter(Boolean).join(" ")
  const inner = <>
    <Icon size={20} strokeWidth={1.75} className="evo-ui-settings-row__icon" aria-hidden="true" />
    <span className="evo-ui-settings-row__copy">
      <strong>{title}</strong>
      {description && <small>{description}</small>}
    </span>
    {value && <span className="evo-ui-settings-row__value">{value}</span>}
    {trailing}
    {onClick && showChevron && <ChevronRight size={17} strokeWidth={1.8} className="evo-ui-settings-row__chevron" aria-hidden="true" />}
  </>
  if (onClick) {
    return <button type="button" className={classNames} onClick={onClick} disabled={disabled}>{inner}</button>
  }
  return <div className={classNames} aria-disabled={disabled ? "true" : undefined}>{inner}</div>
}

/** Switch with monochrome track and a 44px minimum interactive target. */
export function UISwitch({
  checked, onChange, label, disabled = false, pending = false,
}: {
  checked: boolean
  onChange: (nextValue: boolean) => void
  label: string
  disabled?: boolean
  pending?: boolean
}) {
  return <button
    type="button"
    className="evo-ui-switch"
    role="switch"
    aria-label={label}
    aria-checked={checked}
    aria-busy={pending}
    disabled={disabled || pending}
    onClick={() => onChange(!checked)}
  ><span className="evo-ui-switch__track"><span className="evo-ui-switch__thumb" /></span></button>
}

export function UISettingsSwitchRow({
  icon: Icon, title, description, checked, onChange, disabled = false, pending = false,
}: {
  icon: LucideIcon
  title: string
  description?: string
  checked: boolean
  onChange: (nextValue: boolean) => void
  disabled?: boolean
  pending?: boolean
}) {
  return <div className="evo-ui-settings-row evo-ui-settings-row--switch">
    <Icon size={20} strokeWidth={1.75} className="evo-ui-settings-row__icon" aria-hidden="true" />
    <span className="evo-ui-settings-row__copy">
      <strong>{title}</strong>
      {description && <small>{description}</small>}
    </span>
    <UISwitch label={title} checked={checked} onChange={onChange} disabled={disabled} pending={pending} />
  </div>
}
