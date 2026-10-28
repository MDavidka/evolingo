import styles from "./profile-primitives.module.css"

export function Separator({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={[styles.separator, className].filter(Boolean).join(" ")} />
}
