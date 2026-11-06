"use client"
import type { ButtonHTMLAttributes, ReactNode } from "react"
import "./tokens.css"

export type UIButtonVariant = "primary" | "secondary" | "tertiary" | "ghost" | "danger" | "glass"
export type UIButtonSize = "standard" | "compact" | "icon"

export type UIButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  variant?: UIButtonVariant
  size?: UIButtonSize
  fullWidth?: boolean
  children: ReactNode
}

export function UIButton({
  variant = "primary",
  size = "standard",
  fullWidth = false,
  type = "button",
  className = "",
  children,
  ...buttonProps
}: UIButtonProps) {
  return (
    <button
      type={type}
      className={[
        "evo-ui-button",
        "evo-ui-button--" + variant,
        size !== "standard" ? "evo-ui-button--" + size : "",
        fullWidth ? "evo-ui-button--full" : "",
        className,
      ].filter(Boolean).join(" ")}
      {...buttonProps}
    >{children}</button>
  )
}
