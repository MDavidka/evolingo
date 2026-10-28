"use client"

/** Local shadcn-style, white-theme button primitive for the Evölingo profile. */
import { forwardRef, type ButtonHTMLAttributes } from "react"
import styles from "./profile-primitives.module.css"

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "secondary" | "outline" | "ghost"
  size?: "default" | "sm" | "icon"
}
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "default", size = "default", className = "", type = "button", ...props }, ref) =>
    <button
      ref={ref}
      type={type}
      className={[styles.button, styles[variant], styles[size], className].filter(Boolean).join(" ")}
      {...props}
    />
)
Button.displayName = "Button"
