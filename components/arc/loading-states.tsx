"use client"

import type { ReactNode } from "react"

export type SkeletonVariant = "card" | "row" | "avatar" | "text"

export function Skeleton({ variant = "text", className = "" }: { variant?: SkeletonVariant; className?: string }) {
  return <span aria-hidden="true" className={`arc-skeleton arc-skeleton-${variant} ${className}`.trim()} />
}

export function SkeletonList({ count = 4, variant = "row" }: { count?: number; variant?: SkeletonVariant }) {
  return <div className="arc-skeleton-list" aria-label="Betöltés" role="status">
    {Array.from({ length: count }, (_, index) => <Skeleton key={index} variant={variant} />)}
  </div>
}

export function EmptyState({ title, description, action, icon }: { title: string; description?: string; action?: ReactNode; icon?: ReactNode }) {
  return <div className="arc-empty-state" role="alert">
    {icon && <span className="arc-empty-state-icon" aria-hidden="true">{icon}</span>}
    <strong>{title}</strong>
    {description && <p>{description}</p>}
    {action && <div className="arc-empty-state-action">{action}</div>}
  </div>
}
