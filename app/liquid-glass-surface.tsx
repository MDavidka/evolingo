"use client"

import { useEffect, useRef, type ReactNode } from "react"

/**
 * @ybouane/liquidglass WebGL surface.
 * The library requires the glass and sampled backdrop to be direct siblings.
 * The CSS fallback remains usable on iOS if WebGL or the CDN is unavailable.
 */
type GlassApi = { destroy(): void }
type GlassConstructor = {
  init(options: {
    root: HTMLElement
    glassElements: HTMLElement[]
  }): Promise<GlassApi>
}

type Props = {
  children: ReactNode
  kind: "rail" | "composer"
  className?: string
  config?: Record<string, number | boolean>
}

export default function LiquidGlassSurface({ children, kind, className = "", config }: Props) {
  const root = useRef<HTMLDivElement>(null)
  const glass = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!root.current || !glass.current) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    let cancelled = false
    let instance: GlassApi | undefined
    const start = async () => {
      try {
        // The official ESM distribution; avoids changing npm lockfile.
        // @ts-ignore External ESM module resolved by browser at runtime.
        const module = await import(/* webpackIgnore: true */ "https://cdn.jsdelivr.net/npm/@ybouane/liquidglass/dist/index.js") as { LiquidGlass: GlassConstructor }
        if (cancelled || !root.current || !glass.current) return
        const result = await module.LiquidGlass.init({
          root: root.current,
          glassElements: [glass.current],
        })
        if (cancelled) result.destroy()
        else instance = result
      } catch (error) {
        // CSS fallback is intentionally left visible.
        console.warn("LiquidGlass unavailable; using frosted fallback", error)
      }
    }
    void start()
    return () => {
      cancelled = true
      instance?.destroy()
    }
  }, [])

  const defaults = kind === "rail"
    ? { blurAmount: 0.24, refraction: 0.65, chromAberration: 0.025, edgeHighlight: 0.10, shadowOpacity: 0.16, cornerRadius: 32, zRadius: 18 }
    : { blurAmount: 0.18, refraction: 0.58, chromAberration: 0.018, edgeHighlight: 0.12, shadowOpacity: 0.12, cornerRadius: 36, zRadius: 20 }

  return (
    <div className={`evo-liquid-root evo-liquid-root--${kind} ${className}`} ref={root}>
      <div className="evo-liquid-scene" aria-hidden="true" />
      <div className="evo-liquid-surface" ref={glass} data-config={JSON.stringify({ ...defaults, ...config, floating: false })}>
        {children}
      </div>
    </div>
  )
}
