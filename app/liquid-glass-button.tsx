"use client"

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react"
import { LoaderCircle, type LucideIcon } from "lucide-react"

type Variant = "primary" | "secondary"
type Size = "standard" | "compact" | "icon"
export type LiquidGlassButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  children?: ReactNode
  icon?: LucideIcon
  trailingIcon?: LucideIcon
  variant?: Variant
  size?: Size
  loading?: boolean
}

export const LiquidGlassButton = forwardRef<HTMLButtonElement, LiquidGlassButtonProps>(
  function LiquidGlassButton({ children, icon: Icon, trailingIcon: TrailingIcon, variant = "secondary", size = "standard", loading = false, disabled, className = "", type = "button", ...props }, ref) {
    return <button
      {...props}
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`evo-liquid-button evo-liquid-button--${variant} evo-liquid-button--${size} ${className}`.trim()}
    >
      <span className="evo-liquid-button__content">
        {Icon && <Icon size={20} strokeWidth={1.75} aria-hidden="true" />}
        {children && <span className="evo-liquid-button__label">{children}</span>}
        {TrailingIcon && <TrailingIcon size={20} strokeWidth={1.75} aria-hidden="true" />}
      </span>
      {loading && <span className="evo-liquid-button__loader" aria-hidden="true"><LoaderCircle size={20} strokeWidth={1.75} /></span>}
    </button>
  }
)

export type LiquidGlassIconButtonProps = Omit<LiquidGlassButtonProps, "children" | "size" | "trailingIcon"> & { "aria-label": string; size?: "icon" | "compact" }
export const LiquidGlassIconButton = forwardRef<HTMLButtonElement, LiquidGlassIconButtonProps>(
  function LiquidGlassIconButton({ size = "icon", ...props }, ref) {
    return <LiquidGlassButton {...props} ref={ref} size={size} />
  }
)
