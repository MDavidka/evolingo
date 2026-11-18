'use client'
import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {UIButton, BottomSheet, UISettingsSwitchRow} from '../evo-ui-kit'
import dynamic from 'next/dynamic'
const SourceProjects = dynamic(() => import('./projects'), {ssr: false})
import {useRouter, useSearchParams} from 'next/navigation'
import {
  IconPlus,
  IconCompass,
  IconNotes,
  IconDots,
  IconArrowLeft,
  IconChevronLeft,
  IconSearch,
  IconX,
  IconTerminal2,
  IconCheck,
} from '@tabler/icons-react'
import './myspace.css'
import NotesRuntime from './runtime'
import {AppIcon} from './app-icon'
import {shortcutIcons} from '@/lib/myspace/shortcuts'
import type {Overview, Installation} from '@/lib/myspace/contracts'

type PersistedProject = {
  id: string
  name: string
  description: string
  icon: string
  revision: string
  draftVersion: string
  workingVersion: string | null
  sdkVersion: string
  status: string
  accessRole: 'owner' | 'editor' | 'viewer'
  ownership: 'created' | 'shared'
  pinned: boolean
  sidebarOrder: number | null
  sharedWith: {granteeOwner: string; role: string}[]
  createdAt: string
  updatedAt: string
  lastOpenedAt: string | null
}

type UnifiedRowItem =
  | {
      kind: 'project'
      key: string
      projectId: string
      title: string
      updatedAt: string
      icon: string
      ownership: 'created' | 'shared'
      accessRole: 'owner' | 'editor' | 'viewer'
      pinned: boolean
      sharedWith: {granteeOwner: string; role: string}[]
    }
  | {
      kind: 'installation'
      key: string
      appId: 'notes' | 'focus-board' | 'api-inspector'
      title: string
      updatedAt: string
      icon: string
      ownership: 'created'
      pinned: boolean
      installation: Installation
    }

function formatRelativeDate(iso: string | undefined | null): string {
  if (!iso) return 'Recently'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Recently'
  const diffSec = Math.round((date.getTime() - Date.now()) / 1000)
  const absSec = Math.abs(diffSec)
  if (absSec < 45) return 'Just now'
  try {
    const rtf = new Intl.RelativeTimeFormat(undefined, {numeric: 'always'})
    if (absSec < 3600) return rtf.format(Math.round(diffSec / 60), 'minute')
    if (absSec < 86400) return rtf.format(Math.round(diffSec / 3600), 'hour')
    if (absSec < 604800) return rtf.format(Math.round(diffSec / 86400), 'day')
    if (absSec < 2629800) return rtf.format(Math.round(diffSec / 604800), 'week')
    if (absSec < 31557600) return rtf.format(Math.round(diffSec / 2629800), 'month')
    return rtf.format(Math.round(diffSec / 31557600), 'year')
  } catch {
    return date.toLocaleDateString()
  }
}

export default function Myspace() {
  const router = useRouter()
  const params = useSearchParams()
  const view = params.get('view') || 'home'
  const activeProjectId = params.get('project')
  const rawApp = params.get('app') || params.get('detail')
  const selectedId = (['notes', 'focus-board', 'api-inspector'].includes(rawApp || '')
    ? rawApp
    : 'notes') as 'notes' | 'focus-board' | 'api-inspector'

  const [data, set] = useState<Overview | null>(null)
  const [projects, setProjects] = useState<PersistedProject[]>([])
  const [nextCursor, setNextCursor] = useState<number | null>(null)
  const [shareCode, setShareCode] = useState('')
  const [initialLoading, setInitialLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [step, setStep] = useState(0)

  // Filter & debounced search
  const [filterTab, setFilterTab] = useState<'all' | 'created' | 'shared'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const searchAbortRef = useRef<AbortController | null>(null)

  // Bottom sheets
  const [createSheetOpen, setCreateSheetOpen] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createIdea, setCreateIdea] = useState('')
  const [createIcon, setCreateIcon] = useState<'books' | 'sliders' | 'notes' | 'checklist' | 'terminal' | 'chart' | 'code'>('books')
  const [creatingWithAI, setCreatingWithAI] = useState(false)
  const [createError, setCreateError] = useState('')

  const [discoverSheetOpen, setDiscoverSheetOpen] = useState(false)
  const [discoverQuery, setDiscoverQuery] = useState('')

  const [settings, setSettings] = useState(false)
  const [settingsName, setSettingsName] = useState('')
  const [consent, setConsent] = useState<'notes' | 'focus-board' | 'api-inspector' | null>(null)

  // Project overflow sheet state
  const [activeProjectMenu, setActiveProjectMenu] = useState<PersistedProject | null>(null)
  const [projectRenameValue, setProjectRenameValue] = useState('')
  const [projectShareTarget, setProjectShareTarget] = useState('')
  const [projectShareRole, setProjectShareRole] = useState<'viewer' | 'editor'>('viewer')
  const [confirmProjectDelete, setConfirmProjectDelete] = useState(false)

  // Debounce search query (240ms)
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim())
    }, 240)
    return () => clearTimeout(t)
  }, [searchQuery])

  const loadProjects = useCallback(
    async (opts?: {appendCursor?: number; signal?: AbortSignal}) => {
      const qs = new URLSearchParams()
      qs.set('filter', filterTab)
      if (debouncedQuery) qs.set('q', debouncedQuery)
      if (opts?.appendCursor) qs.set('cursor', String(opts.appendCursor))
      qs.set('limit', '20')
      const r = await fetch('/api/myspace/projects?' + qs.toString(), {
        cache: 'no-store',
        signal: opts?.signal,
      })
      const d = await r.json()
      if (!r.ok) throw Error(d.error || 'Unable to load projects')
      if (opts?.appendCursor) {
        setProjects(prev => {
          const seen = new Set(prev.map(p => p.id))
          const extra = (d.projects as PersistedProject[]).filter(p => !seen.has(p.id))
          return [...prev, ...extra]
        })
      } else {
        setProjects(d.projects || [])
      }
      setNextCursor(d.nextCursor ?? null)
      if (d.shareCode) setShareCode(d.shareCode)
    },
    [filterTab, debouncedQuery]
  )

  const loadOverview = useCallback(async () => {
    const r = await fetch('/api/myspace', {cache: 'no-store'})
    const d = await r.json()
    if (!r.ok) throw Error(d.error || 'Unable to load Myspace')
    set(d)
  }, [])

  const loadAll = useCallback(async () => {
    try {
      setError('')
      await loadOverview()
      await loadProjects()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setInitialLoading(false)
    }
  }, [loadOverview, loadProjects])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  // Re-run server search when filterTab or debouncedQuery changes
  useEffect(() => {
    if (initialLoading) return
    searchAbortRef.current?.abort()
    const controller = new AbortController()
    searchAbortRef.current = controller
    setSearching(true)
    loadProjects({signal: controller.signal})
      .catch(e => {
        if (e?.name !== 'AbortError') setError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => {
        if (!controller.signal.aborted) setSearching(false)
      })
    return () => controller.abort()
  }, [filterTab, debouncedQuery, initialLoading, loadProjects])

  useEffect(() => {
    setOpen(['notes', 'focus-board', 'api-inspector'].includes(params.get('app') || ''))
    if (params.get('view') === 'create') setCreateSheetOpen(true)
    if (params.get('view') === 'discover') setDiscoverSheetOpen(true)
  }, [params])

  const installed = data?.installations?.find(a => a.appId === selectedId)

  useEffect(() => {
    if (settings) setSettingsName(installed?.name || '')
  }, [settings, installed?.name])

  useEffect(() => {
    if (activeProjectMenu) {
      setProjectRenameValue(activeProjectMenu.name)
      setConfirmProjectDelete(false)
    }
  }, [activeProjectMenu])

  async function mutate(action: string, value?: unknown, appId = selectedId) {
    setBusy(true)
    try {
      const r = await fetch('/api/myspace', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          action,
          appId,
          ...(['install', 'approve-update'].includes(action)
            ? {consent: true}
            : value === undefined
              ? {}
              : {value}),
        }),
      })
      if (!r.ok) throw Error((await r.json()).error)
      await loadOverview()
      window.dispatchEvent(new Event('myspace:changed'))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function mutateProjectMeta(projectId: string, payload: Record<string, unknown>) {
    setBusy(true)
    try {
      const r = await fetch('/api/myspace/projects/' + projectId, {
        method: 'PATCH',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload),
      })
      const d = await r.json()
      if (!r.ok) throw Error(d.error || 'Project update failed')
      await loadProjects()
      window.dispatchEvent(new Event('myspace:changed'))
      return d
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      throw e
    } finally {
      setBusy(false)
    }
  }

  async function handleCreateWithAI() {
    if (creatingWithAI) return
    const cleanIdea = createIdea.trim() || createName.trim()
    if (!cleanIdea) {
      setCreateError('Please enter an app idea or project name.')
      return
    }
    setCreatingWithAI(true)
    setCreateError('')
    try {
      const r = await fetch('/api/myspace/builder', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          name: createName.trim() || undefined,
          idea: cleanIdea,
          icon: createIcon,
        }),
      })
      const d = await r.json()
      if (!r.ok) throw Error(d.error || 'Could not create project')
      setCreateName('')
      setCreateIdea('')
      setCreateSheetOpen(false)
      await loadProjects()
      window.dispatchEvent(new Event('myspace:changed'))
      if (d?.project?.id) {
        router.push('/myspace?project=' + d.project.id)
      }
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Creation failed')
    } finally {
      setCreatingWithAI(false)
    }
  }

  // Combine real persisted projects + real installed catalog apps matching filter & search
  const unifiedRows = useMemo<UnifiedRowItem[]>(() => {
    const items: UnifiedRowItem[] = []

    for (const p of projects) {
      items.push({
        kind: 'project',
        key: 'proj:' + p.id,
        projectId: p.id,
        title: p.name,
        updatedAt: p.updatedAt || p.createdAt,
        icon: p.icon || 'books',
        ownership: p.ownership,
        accessRole: p.accessRole,
        pinned: p.pinned,
        sharedWith: p.sharedWith || [],
      })
    }

    if (filterTab !== 'shared' && data?.installations?.length) {
      const q = debouncedQuery.toLowerCase()
      for (const app of data.installations) {
        const title = app.name || data.catalog.find(c => c.id === app.appId)?.name || app.appId
        if (q && !title.toLowerCase().includes(q) && !app.appId.toLowerCase().includes(q)) {
          continue
        }
        items.push({
          kind: 'installation',
          key: 'app:' + app.appId,
          appId: app.appId,
          title,
          updatedAt: app.updatedAt || app.lastOpenedAt || app.createdAt,
          icon: app.icon || app.appId,
          ownership: 'created',
          pinned: app.pinned,
          installation: app,
        })
      }
    }

    return items
  }, [projects, data?.installations, data?.catalog, filterTab, debouncedQuery])

  const filteredCatalog = useMemo(() => {
    const list = data?.catalog || []
    const q = discoverQuery.trim().toLowerCase()
    if (!q) return list
    return list.filter(
      item =>
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q)
    )
  }, [data?.catalog, discoverQuery])

  return (
    <div className="myspace-page">
      {!activeProjectId && (
      <header className="myspace-topbar">
        <button
          type="button"
          className="myspace-circle-btn"
          aria-label="Back"
          onClick={() => {
            if (open || activeProjectId || view !== 'home') {
              router.push('/myspace')
            } else {
              router.push('/chat')
            }
          }}
        >
          <IconChevronLeft size={21} stroke={1.9} />
        </button>
        <button
          type="button"
          className="myspace-circle-btn"
          aria-label="Create app"
          onClick={() => {
            setCreateError('')
            setCreateSheetOpen(true)
          }}
        >
          <IconPlus size={21} stroke={1.9} />
        </button>
      </header>
      )}

      <section className="myspace-container">
        {error && (
          <div className="myspace-alert" role="alert">
            <span>{error}</span>
            <UIButton variant="secondary" size="compact" onClick={() => void loadAll()}>
              Retry
            </UIButton>
          </div>
        )}

        {activeProjectId ? (
          <SourceProjects
            projectIdProp={activeProjectId}
            onBack={() => {
              void loadProjects()
              router.push('/myspace')
            }}
          />
        ) : open && installed ? (
          <section className="myspace-workspace">
            <div className="myspace-workspace-title">
              <UIButton size="icon" variant="ghost" aria-label="Back to Myspace" onClick={() => router.push('/myspace')}>
                <IconArrowLeft size={20} />
              </UIButton>
              <h2>{installed.name || 'Notes'}</h2>
              <UIButton size="icon" variant="ghost" aria-label="App settings" onClick={() => setSettings(true)}>
                <IconDots size={20} />
              </UIButton>
            </div>
            {installed.artifactIntegrity ? (
              <NotesRuntime
                integrity={installed.artifactIntegrity!}
                appId={installed.appId}
                key={installed.appId}
                value={installed.data}
                granted={installed.storageGranted === true}
                onSave={async value => {
                  const r = await fetch('/api/myspace', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({action: 'save', appId: selectedId, value}),
                  })
                  if (!r.ok) throw Error((await r.json()).error)
                  await loadOverview()
                }}
              />
            ) : (
              <div className="myspace-empty">
                <p>This legacy installation needs an explicit runtime approval. Your app data is preserved.</p>
                <UIButton disabled={busy} onClick={() => mutate('approve-update')}>
                  Approve current runtime
                </UIButton>
              </div>
            )}
          </section>
        ) : view === 'creations' ? (
          <SourceProjects onBack={() => router.push('/myspace')} />
        ) : (
          <>
            <div className="myspace-actions">
              <button
                type="button"
                onClick={() => {
                  setCreateError('')
                  setCreateSheetOpen(true)
                }}
              >
                <IconPlus size={20} stroke={1.85} className="myspace-action-icon" />
                <strong>Create app</strong>
                <span>Build with AI</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setDiscoverQuery('')
                  setDiscoverSheetOpen(true)
                }}
              >
                <IconCompass size={21} stroke={1.85} className="myspace-action-icon" />
                <strong>Discover</strong>
                <span>Explore tools</span>
              </button>
            </div>

            <nav className="myspace-filter-pills" aria-label="Filter projects">
              {(
                [
                  ['all', 'All'],
                  ['created', 'Created by you'],
                  ['shared', 'Shared with you'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={`myspace-filter-pill ${filterTab === key ? 'is-active' : ''}`}
                  aria-pressed={filterTab === key}
                  onClick={() => setFilterTab(key)}
                >
                  {label}
                </button>
              ))}
            </nav>

            {initialLoading ? (
              <p className="myspace-loading-state" role="status" aria-live="polite">
                Loading projects…
              </p>
            ) : unifiedRows.length === 0 ? (
              <div className="myspace-empty">
                {debouncedQuery ? (
                  <>
                    <p>No projects match “{debouncedQuery}”.</p>
                    <UIButton variant="secondary" onClick={() => setSearchQuery('')}>
                      Clear search
                    </UIButton>
                  </>
                ) : filterTab === 'shared' ? (
                  <>
                    <p>No projects have been shared with you yet.</p>
                    {shareCode && <small>Your share code: {shareCode}</small>}
                  </>
                ) : (
                  <>
                    <p>You don’t have any projects in My Space yet.</p>
                    <div style={{display: 'flex', gap: 10, justifyContent: 'center', marginTop: 12, flexWrap: 'wrap'}}>
                      <UIButton onClick={() => setCreateSheetOpen(true)}>Create app</UIButton>
                      <UIButton variant="secondary" onClick={() => setDiscoverSheetOpen(true)}>
                        Discover tools
                      </UIButton>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="myspace-project-list" aria-busy={searching}>
                {unifiedRows.map(row => (
                  <article className="myspace-app" key={row.key}>
                    <div className="myspace-app-icon-tile" aria-hidden="true">
                      <AppIcon name={row.icon} size={23} />
                    </div>
                    <button
                      type="button"
                      className="myspace-app-name"
                      onClick={() => {
                        if (row.kind === 'project') {
                          void mutateProjectMeta(row.projectId, {action: 'launch'}).catch(() => {})
                          router.push('/myspace?project=' + encodeURIComponent(row.projectId))
                        } else {
                          void mutate('launch', undefined, row.appId)
                          router.push('/myspace?app=' + encodeURIComponent(row.appId))
                        }
                      }}
                    >
                      <strong>{row.title}</strong>
                      <small>{formatRelativeDate(row.updatedAt)}</small>
                    </button>
                    <button
                      type="button"
                      className="myspace-app-dots"
                      aria-label={`${row.title} options`}
                      onClick={() => {
                        if (row.kind === 'project') {
                          const target = projects.find(p => p.id === row.projectId)
                          if (target) setActiveProjectMenu(target)
                        } else {
                          router.push('/myspace?view=apps&detail=' + row.appId)
                          setSettings(true)
                        }
                      }}
                    >
                      <IconDots size={19} stroke={1.85} />
                    </button>
                  </article>
                ))}

                {nextCursor !== null && (
                  <div style={{paddingTop: 12}}>
                    <UIButton
                      variant="secondary"
                      fullWidth
                      disabled={searching}
                      onClick={() => void loadProjects({appendCursor: nextCursor})}
                    >
                      Load more projects
                    </UIButton>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Create App Bottom Sheet (Build with AI) */}
        {createSheetOpen && (
          <BottomSheet
            title="Create app"
            onClose={() => {
              if (!creatingWithAI) {
                setCreateSheetOpen(false)
                if (view === 'create') router.push('/myspace')
              }
            }}
          >
            <div className="myspace-settings">
              <p>
                Describe what you want to build. The AI Builder creates a real persisted project using approved{' '}
                <code>@myspace/ui</code> components and opens its workspace.
              </p>
              {createError && <p role="alert" style={{color: '#c63b3b'}}>{createError}</p>}
              <label>
                Project name (optional)
                <input
                  placeholder="e.g. Study Companion"
                  maxLength={48}
                  disabled={creatingWithAI}
                  value={createName}
                  onChange={e => setCreateName(e.target.value)}
                />
              </label>
              <label>
                What should your app do?
                <textarea
                  className="myspace-sheet-textarea"
                  placeholder="Describe features, fields, or workflows to build with AI…"
                  maxLength={1000}
                  rows={3}
                  disabled={creatingWithAI}
                  value={createIdea}
                  onChange={e => setCreateIdea(e.target.value)}
                />
              </label>
              <label>
                Project icon
                <select
                  aria-label="Project icon"
                  disabled={creatingWithAI}
                  value={createIcon}
                  onChange={e => setCreateIcon(e.target.value as any)}
                >
                  <option value="books">Books / Connector</option>
                  <option value="sliders">Sliders / Controls</option>
                  <option value="notes">Notes</option>
                  <option value="checklist">Checklist</option>
                  <option value="terminal">Terminal</option>
                  <option value="chart">Chart</option>
                  <option value="code">Code</option>
                </select>
              </label>

              {creatingWithAI && (
                <div className="myspace-agent-working" role="status" aria-live="polite">
                  <span className="myspace-shimmer-text">Working</span>
                  <div className="myspace-agent-step">
                    <IconTerminal2 size={16} />
                    <span>Generating src/App.tsx and validating project schema…</span>
                  </div>
                </div>
              )}

              <UIButton
                fullWidth
                disabled={creatingWithAI || (!createIdea.trim() && !createName.trim())}
                onClick={handleCreateWithAI}
              >
                {creatingWithAI ? 'Building project…' : 'Create & open workspace'}
              </UIButton>

              {data?.builder && !data.builder.available && (
                <small style={{color: '#8e8e93', display: 'block'}}>
                  Note: {data.builder.reason}
                </small>
              )}
            </div>
          </BottomSheet>
        )}

        {/* Discover Bottom Sheet (Explore tools) */}
        {discoverSheetOpen && (
          <BottomSheet
            title="Discover"
            onClose={() => {
              setDiscoverSheetOpen(false)
              if (view === 'discover') router.push('/myspace')
            }}
          >
            <div className="myspace-settings">
              <p>Explore verified tools with isolated per-app storage and explicit permission controls.</p>
              <label>
                Search catalog
                <input
                  type="search"
                  placeholder="Filter tools by name or capability…"
                  value={discoverQuery}
                  onChange={e => setDiscoverQuery(e.target.value)}
                />
              </label>
              {filteredCatalog.length === 0 ? (
                <p>No tools match “{discoverQuery}”.</p>
              ) : (
                filteredCatalog.map(app => {
                  const isInstalled = data?.installations.some(a => a.appId === app.id)
                  return (
                    <article className="myspace-discover" key={app.id}>
                      <div className="myspace-app-icon-tile">
                        <AppIcon name={app.id} size={23} />
                      </div>
                      <div>
                        <h3>{app.name}</h3>
                        <p>{app.description}</p>
                        <small>
                          Version {app.version} · Permissions: {app.permissions.join(', ')}
                        </small>
                      </div>
                      {isInstalled ? (
                        <UIButton
                          variant="secondary"
                          onClick={() => {
                            setDiscoverSheetOpen(false)
                            void mutate('launch', undefined, app.id as 'notes' | 'focus-board' | 'api-inspector')
                            router.push('/myspace?app=' + app.id)
                          }}
                        >
                          Open {app.name}
                        </UIButton>
                      ) : (
                        <UIButton
                          disabled={busy}
                          onClick={() => {
                            setDiscoverSheetOpen(false)
                            setConsent(app.id as 'notes' | 'focus-board' | 'api-inspector')
                          }}
                        >
                          Add to My Space
                        </UIButton>
                      )}
                    </article>
                  )
                })
              )}
            </div>
          </BottomSheet>
        )}

        {/* Project Options Bottom Sheet (Rename, Share, Pin to Sidebar, Duplicate, Delete) */}
        {activeProjectMenu && (
          <BottomSheet title={activeProjectMenu.name} onClose={() => setActiveProjectMenu(null)}>
            <div className="myspace-settings">
              <UIButton
                fullWidth
                onClick={() => {
                  const pid = activeProjectMenu.id
                  setActiveProjectMenu(null)
                  router.push('/myspace?project=' + encodeURIComponent(pid))
                }}
              >
                Open workspace
              </UIButton>

              {activeProjectMenu.accessRole !== 'viewer' && (
                <>
                  <label>
                    Rename project
                    <input
                      maxLength={48}
                      value={projectRenameValue}
                      onChange={e => setProjectRenameValue(e.target.value)}
                    />
                  </label>
                  <UIButton
                    fullWidth
                    variant="secondary"
                    disabled={
                      busy ||
                      !projectRenameValue.trim() ||
                      projectRenameValue.trim() === activeProjectMenu.name
                    }
                    onClick={async () => {
                      await mutateProjectMeta(activeProjectMenu.id, {
                        action: 'rename',
                        name: projectRenameValue.trim(),
                      })
                      setActiveProjectMenu(prev =>
                        prev ? {...prev, name: projectRenameValue.trim()} : null
                      )
                    }}
                  >
                    Save name
                  </UIButton>

                  <label>
                    Icon
                    <select
                      aria-label="Project icon"
                      value={activeProjectMenu.icon || 'books'}
                      onChange={async e => {
                        const nextIcon = e.target.value
                        await mutateProjectMeta(activeProjectMenu.id, {
                          action: 'icon',
                          icon: nextIcon,
                        })
                        setActiveProjectMenu(prev => (prev ? {...prev, icon: nextIcon} : null))
                      }}
                    >
                      <option value="books">Books</option>
                      <option value="sliders">Sliders</option>
                      <option value="notes">Notes</option>
                      <option value="checklist">Checklist</option>
                      <option value="terminal">Terminal</option>
                      <option value="chart">Chart</option>
                      <option value="code">Code</option>
                    </select>
                  </label>
                </>
              )}

              <UIButton
                fullWidth
                variant="secondary"
                disabled={busy}
                onClick={async () => {
                  const nextPinned = !activeProjectMenu.pinned
                  await mutateProjectMeta(activeProjectMenu.id, {
                    action: 'pin',
                    pinned: nextPinned,
                  })
                  setActiveProjectMenu(prev => (prev ? {...prev, pinned: nextPinned} : null))
                }}
              >
                {activeProjectMenu.pinned ? 'Remove sidebar shortcut' : 'Add to sidebar'}
              </UIButton>

              <UIButton
                fullWidth
                variant="secondary"
                disabled={busy}
                onClick={async () => {
                  const dup = await mutateProjectMeta(activeProjectMenu.id, {action: 'duplicate'})
                  setActiveProjectMenu(null)
                  if (dup?.id) router.push('/myspace?project=' + encodeURIComponent(dup.id))
                }}
              >
                Duplicate project
              </UIButton>

              {activeProjectMenu.accessRole === 'owner' && (
                <div>
                  <h3>Share project</h3>
                  {shareCode && <p>Your share code: <code>{shareCode}</code></p>}
                  <label>
                    Recipient share code or owner hash
                    <input
                      placeholder="e.g. a1b2c3d4e5f6"
                      value={projectShareTarget}
                      onChange={e => setProjectShareTarget(e.target.value)}
                    />
                  </label>
                  <label>
                    Access role
                    <select
                      value={projectShareRole}
                      onChange={e => setProjectShareRole(e.target.value as 'viewer' | 'editor')}
                    >
                      <option value="viewer">Viewer (read-only)</option>
                      <option value="editor">Editor (can edit source)</option>
                    </select>
                  </label>
                  <UIButton
                    fullWidth
                    variant="secondary"
                    disabled={busy || !/^[a-f0-9]{8,64}$/i.test(projectShareTarget.trim())}
                    onClick={async () => {
                      const target = projectShareTarget.trim().toLowerCase()
                      await mutateProjectMeta(activeProjectMenu.id, {
                        action: 'share',
                        targetOwner: target,
                        role: projectShareRole,
                      })
                      setProjectShareTarget('')
                      setActiveProjectMenu(null)
                    }}
                  >
                    Grant access
                  </UIButton>

                  {activeProjectMenu.sharedWith?.length > 0 && (
                    <div style={{marginTop: 10}}>
                      <small>Shared with:</small>
                      {activeProjectMenu.sharedWith.map(grant => (
                        <div
                          key={grant.granteeOwner}
                          style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingTop: 6}}
                        >
                          <span>
                            <code>{grant.granteeOwner.slice(0, 12)}</code> ({grant.role})
                          </span>
                          <UIButton
                            variant="tertiary"
                            size="compact"
                            disabled={busy}
                            onClick={async () => {
                              await mutateProjectMeta(activeProjectMenu.id, {
                                action: 'unshare',
                                targetOwner: grant.granteeOwner,
                              })
                              setActiveProjectMenu(null)
                            }}
                          >
                            Revoke
                          </UIButton>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeProjectMenu.accessRole === 'owner' && (
                <>
                  {!confirmProjectDelete ? (
                    <UIButton
                      variant="danger"
                      fullWidth
                      disabled={busy}
                      onClick={() => setConfirmProjectDelete(true)}
                    >
                      Delete project
                    </UIButton>
                  ) : (
                    <div style={{display: 'grid', gap: 8}}>
                      <p>Confirm permanent deletion of “{activeProjectMenu.name}”?</p>
                      <UIButton
                        variant="danger"
                        fullWidth
                        disabled={busy}
                        onClick={async () => {
                          setBusy(true)
                          try {
                            const r = await fetch('/api/myspace/projects/' + activeProjectMenu.id, {
                              method: 'DELETE',
                              headers: {'Content-Type': 'application/json'},
                              body: JSON.stringify({confirm: true}),
                            })
                            if (!r.ok) throw Error((await r.json()).error)
                            setActiveProjectMenu(null)
                            await loadProjects()
                            window.dispatchEvent(new Event('myspace:changed'))
                          } catch (e) {
                            setError(e instanceof Error ? e.message : String(e))
                          } finally {
                            setBusy(false)
                          }
                        }}
                      >
                        Confirm delete
                      </UIButton>
                      <UIButton variant="tertiary" fullWidth onClick={() => setConfirmProjectDelete(false)}>
                        Cancel
                      </UIButton>
                    </div>
                  )}
                </>
              )}
            </div>
          </BottomSheet>
        )}

        {consent && (
          <BottomSheet
            title={'Install ' + (data?.catalog.find(a => a.id === consent)?.name || 'app')}
            onClose={() => setConsent(null)}
          >
            <p>
              This app requests isolated storage to save its data for this guest device. It cannot read other apps or make network requests.
            </p>
            {consent === 'api-inspector' && (
              <p>
                Network access is disabled initially. Review the approved domains and enable it separately in app settings.
              </p>
            )}
            <p>Uninstalling deletes saved notes. You can revoke storage access in app settings.</p>
            <UIButton
              fullWidth
              disabled={busy}
              onClick={async () => {
                await mutate('install', undefined, consent)
                setConsent(null)
              }}
            >
              Allow storage & install
            </UIButton>
            <UIButton fullWidth variant="tertiary" onClick={() => setConsent(null)}>
              Cancel
            </UIButton>
          </BottomSheet>
        )}

        {settings && installed && (
          <BottomSheet title={(installed.name || 'App') + ' settings'} onClose={() => setSettings(false)}>
            <div className="myspace-settings">
              <label>
                App name
                <input maxLength={48} value={settingsName} onChange={e => setSettingsName(e.target.value)} />
              </label>
              <UIButton
                fullWidth
                variant="secondary"
                disabled={busy || !settingsName.trim() || settingsName === installed.name}
                onClick={() => mutate('rename', settingsName)}
              >
                Save app name
              </UIButton>
              {installed.artifactUpdateAvailable && (
                <div>
                  <p>A reviewed runtime update is available. Updating keeps your app data and permission settings.</p>
                  <UIButton fullWidth disabled={busy} onClick={() => mutate('approve-update')}>
                    Update app runtime
                  </UIButton>
                </div>
              )}
              {!!installed.runtimeHistory?.length && (
                <div>
                  <h3>Previously approved runtimes</h3>
                  <p>Restoring code keeps current app data. An older version may not understand newer data formats.</p>
                  {installed.runtimeHistory.map(version => (
                    <UIButton
                      key={version.integrity}
                      variant="secondary"
                      fullWidth
                      disabled={busy}
                      onClick={() => mutate('restore-runtime', version.integrity)}
                    >
                      Restore {version.version} · {version.integrity.slice(0, 8)}
                    </UIButton>
                  ))}
                </div>
              )}
              <label>
                Shortcut icon
                <select
                  aria-label="Shortcut icon"
                  value={
                    installed.icon === 'focus-board'
                      ? 'checklist'
                      : installed.icon === 'api-inspector'
                        ? 'code'
                        : installed.icon || 'notes'
                  }
                  onChange={e => mutate('icon', e.target.value)}
                >
                  {shortcutIcons.map(icon => (
                    <option key={icon} value={icon}>
                      {icon}
                    </option>
                  ))}
                </select>
              </label>
              <UISettingsSwitchRow
                icon={IconNotes}
                title="Allow app storage"
                description="Save data only within this app installation"
                checked={installed.storageGranted === true}
                pending={busy}
                onChange={value => {
                  setOpen(false)
                  void mutate('permission', value)
                }}
              />
              {selectedId === 'api-inspector' && (
                <UISettingsSwitchRow
                  icon={IconCompass}
                  title="Approved network access"
                  description={
                    'Allow HTTPS requests to: ' +
                    (data?.networkDomains || []).join(', ') +
                    '. No private targets or credentials.'
                  }
                  checked={installed.networkGranted === true}
                  pending={busy}
                  onChange={value => mutate('network-permission', value)}
                />
              )}
              <UIButton disabled={busy} variant="secondary" onClick={() => mutate('pin', !installed.pinned)}>
                {installed.pinned ? 'Remove from sidebar' : 'Add to sidebar'}
              </UIButton>
              {installed.pinned && (
                <div>
                  <UIButton
                    disabled={
                      busy || data?.installations.filter(a => a.pinned).findIndex(a => a.appId === selectedId) === 0
                    }
                    variant="tertiary"
                    onClick={() => {
                      const ids = (data?.installations || []).filter(a => a.pinned).map(a => a.appId)
                      const i = ids.indexOf(selectedId)
                      if (i > 0) {
                        ;[ids[i - 1], ids[i]] = [ids[i], ids[i - 1]]
                        void mutate('reorder', ids)
                      }
                    }}
                  >
                    Move shortcut up
                  </UIButton>
                  <UIButton
                    disabled={busy || data?.installations.filter(a => a.pinned).at(-1)?.appId === selectedId}
                    variant="tertiary"
                    onClick={() => {
                      const ids = (data?.installations || []).filter(a => a.pinned).map(a => a.appId)
                      const i = ids.indexOf(selectedId)
                      if (i >= 0 && i < ids.length - 1) {
                        ;[ids[i], ids[i + 1]] = [ids[i + 1], ids[i]]
                        void mutate('reorder', ids)
                      }
                    }}
                  >
                    Move shortcut down
                  </UIButton>
                </div>
              )}
              <p>Revoking storage stops reads and writes. Saved notes remain until uninstall.</p>
              <UIButton
                variant="danger"
                disabled={busy}
                onClick={() => {
                  setOpen(false)
                  setSettings(false)
                  void mutate('uninstall')
                }}
              >
                Uninstall and delete app data
              </UIButton>
            </div>
          </BottomSheet>
        )}

        {data && !data.onboarded && (
          <BottomSheet
            title={['Welcome to Myspace', 'Build with AI', 'Apps and permissions'][step]}
            onClose={() => {
              void mutate('onboarding', true)
            }}
          >
            <p>
              {
                [
                  'Create useful little apps for everything you do. Start with Notes or explore the catalog.',
                  'Describe an application in ordinary language. The AI builder creates validated source projects in your workspace.',
                  'Apps run in an isolated frame. You approve app storage before installation and can revoke it in app settings.',
                ][step]
              }
            </p>
            {step > 0 && <UIButton onClick={() => setStep(step - 1)}>Back</UIButton>}
            <UIButton onClick={() => (step < 2 ? setStep(step + 1) : void mutate('onboarding', true))}>
              {step < 2 ? 'Continue' : 'Explore apps'}
            </UIButton>
            <UIButton variant="tertiary" onClick={() => mutate('onboarding', true)}>
              Skip
            </UIButton>
          </BottomSheet>
        )}
      </section>

      {!open && !activeProjectId && view !== 'creations' && (
        <div className="myspace-search-dock">
          <label className="myspace-search-pill">
            <IconSearch size={19} stroke={1.85} className="myspace-search-icon" aria-hidden="true" />
            <input
              type="search"
              placeholder="Search projects"
              aria-label="Search projects"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="myspace-search-clear"
                aria-label="Clear search"
                onClick={() => setSearchQuery('')}
              >
                <IconX size={16} />
              </button>
            )}
          </label>
        </div>
      )}
    </div>
  )
}
