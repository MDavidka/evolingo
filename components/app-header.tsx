import type { ReactNode } from "react"

type AppHeaderProps = {
  variant: "main" | "task"
  left?: ReactNode
  center?: ReactNode
  right?: ReactNode
  className?: string
  children?: ReactNode
}

/** Shared 56px header geometry for primary navigation and focused learning tasks. */
export function AppHeader({ variant, left, center, right, className = "", children }: AppHeaderProps) {
  return <header className={`app-header app-header--${variant} ${className}`}>
    <div className="app-header__side app-header__side--left">{left}</div>
    <div className="app-header__center">{center ?? children}</div>
    <div className="app-header__side app-header__side--right">{right}</div>
  </header>
}
