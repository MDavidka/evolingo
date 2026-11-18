'use client'
import {useEffect, useState} from 'react'
import Link from 'next/link'
import {AppIcon} from './app-icon'
import {usePathname, useSearchParams} from 'next/navigation'
import {IconStack2} from '@tabler/icons-react'
import type {Installation, Overview} from '@/lib/myspace/contracts'

type PinnedProject = {
  id: string
  name: string
  icon?: string
  pinned?: boolean
}

export default function MyspaceLinks({onNavigate}: {onNavigate?: () => void}) {
  const [pins, setPins] = useState<Installation[]>([])
  const [pinnedProjects, setPinnedProjects] = useState<PinnedProject[]>([])
  const pathname = usePathname()
  const search = useSearchParams()

  useEffect(() => {
    let live = true
    const refresh = () => {
      fetch('/api/myspace', {cache: 'no-store'})
        .then(async r => (r.ok ? ((await r.json()) as Overview) : null))
        .then(d => {
          if (live) setPins(d?.installations.filter(a => a.pinned) || [])
        })
        .catch(() => {})
      fetch('/api/myspace/projects?filter=all&limit=50', {cache: 'no-store'})
        .then(async r => (r.ok ? await r.json() : null))
        .then(d => {
          if (live && Array.isArray(d?.projects)) {
            setPinnedProjects(d.projects.filter((p: PinnedProject) => p.pinned))
          }
        })
        .catch(() => {})
    }
    refresh()
    window.addEventListener('myspace:changed', refresh)
    return () => {
      live = false
      window.removeEventListener('myspace:changed', refresh)
    }
  }, [])

  return (
    <section aria-label="My Apps" style={{display: 'grid', gap: 4}}>
      <Link
        href="/myspace"
        onClick={onNavigate}
        aria-current={pathname === '/myspace' && !search.get('app') && !search.get('project') ? 'page' : undefined}
        style={{minHeight: 44, display: 'flex', alignItems: 'center', gap: 14, padding: 12, color: 'inherit', textDecoration: 'none'}}
      >
        <IconStack2 size={22} />
        Myspace
      </Link>
      {pins.map(p => (
        <Link
          key={'app:' + p.appId}
          href={'/myspace?app=' + encodeURIComponent(p.appId)}
          onClick={onNavigate}
          aria-current={search.get('app') === p.appId ? 'page' : undefined}
          style={{minHeight: 44, display: 'flex', alignItems: 'center', gap: 14, padding: 12, color: 'inherit', textDecoration: 'none'}}
        >
          <AppIcon name={p.icon} />
          {p.name || 'Notes'}
        </Link>
      ))}
      {pinnedProjects.map(proj => (
        <Link
          key={'proj:' + proj.id}
          href={'/myspace?project=' + encodeURIComponent(proj.id)}
          onClick={onNavigate}
          aria-current={search.get('project') === proj.id ? 'page' : undefined}
          style={{minHeight: 44, display: 'flex', alignItems: 'center', gap: 14, padding: 12, color: 'inherit', textDecoration: 'none'}}
        >
          <AppIcon name={proj.icon || 'books'} />
          {proj.name}
        </Link>
      ))}
    </section>
  )
}
