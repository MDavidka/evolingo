'use client'
import {useCallback, useEffect, useState} from 'react'
import {useRouter, useSearchParams} from 'next/navigation'
import {UIButton, BottomSheet} from '../evo-ui-kit'
import {IconChevronLeft, IconDots, IconPlus, IconChevronDown, IconMicrophone, IconArrowUp} from '@tabler/icons-react'
import {ArlenMiniAppRenderer} from '@/components/arlen-ui/ArlenUILibrary'

function IconBuilderOrb({size = 22, className = ''}: {size?: number; className?: string}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3.6 14.5c4.9 3.7 11.9 3.7 16.8 0" />
    </svg>
  )
}

type Project = {
  id: string
  name: string
  description: string
  icon?: string
  revision: string
  draftVersion: string
  workingVersion: string | null
  accessRole?: 'owner' | 'editor' | 'viewer'
  ownership?: 'created' | 'shared'
  pinned?: boolean
  sharedWith?: {granteeOwner: string; role: string}[]
  updatedAt: string
}

type Version = {
  id: string
  revision: string
  summary: string
  createdAt: string
  status: string
  testStatus: string
}

type ExecutionStep = {
  id: string
  title: string
  status: 'completed' | 'failed'
  detail: string
}

type ExecutionRecord = {
  id: string
  prompt: string
  status: string
  steps: ExecutionStep[]
  verdict: string
  durationSeconds: number
  createdAt: string
}

type Detail = {
  project: Project
  history: Version[]
  current: Version & {files: Record<string, string>}
  executions?: ExecutionRecord[]
}

const starter = {
  'src/App.tsx':
    'import React from "react"\nimport { AppShell, TextField } from "@myspace/ui"\nexport default function App(){ return <AppShell><h1>My app</h1><TextField label="Your idea" /></AppShell> }\n',
}

export default function SourceProjects({projectIdProp, onBack}: {projectIdProp?: string; onBack?: () => void}) {
  const router = useRouter()
  const params = useSearchParams()
  const id = projectIdProp || params.get('project')
  const [projects, setProjects] = useState<Project[]>([])
  const [detail, setDetail] = useState<Detail | null>(null)
  const [files, setFiles] = useState<Record<string, string>>({})
  const [path, setPath] = useState('src/App.tsx')
  const [newPath, setNewPath] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [summary, setSummary] = useState('Source edit')
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiWorking, setAiWorking] = useState(false)
  const [aiVerdict, setAiVerdict] = useState<ExecutionRecord | null>(null)
  const [chatMode, setChatMode] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const request = async (url: string, method = 'GET', body?: unknown) => {
    const r = await fetch('/api/myspace/projects' + url, {
      method,
      headers: body ? {'Content-Type': 'application/json'} : undefined,
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    })
    const d = await r.json()
    if (!r.ok) throw Error(d.error)
    return d
  }

  const load = useCallback(async () => {
    try {
      setError('')
      if (id) {
        const d = (await request('/' + id)) as Detail
        setDetail(d)
        setFiles(d.current.files)
        setPath('src/App.tsx')
        if (d.executions?.length) {
          setAiVerdict(d.executions[0])
        }
      } else {
        setDetail(null)
        const d = await request('')
        setProjects(d.projects || [])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load projects')
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  async function run(action: () => Promise<void>) {
    if (busy) return
    setBusy(true)
    setError('')
    setStatus('')
    try {
      await action()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Operation failed')
    } finally {
      setBusy(false)
    }
  }

  async function create() {
    await run(async () => {
      const p = await request('', 'POST', {name, description, files: starter})
      window.dispatchEvent(new Event('myspace:changed'))
      router.push('/myspace?project=' + p.id)
    })
  }

  async function save() {
    if (!detail) return
    await run(async () => {
      await request('/' + detail.project.id, 'PATCH', {revision: detail.project.revision, files, summary})
      await load()
      window.dispatchEvent(new Event('myspace:changed'))
      setStatus('Source revision saved and validated.')
    })
  }

  async function runAiIterate() {
    if (!detail || !aiPrompt.trim() || aiWorking) return
    setAiWorking(true)
    setError('')
    setStatus('')
    try {
      const r = await fetch('/api/myspace/builder', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          projectId: detail.project.id,
          name: detail.project.name,
          idea: aiPrompt.trim(),
        }),
      })
      const d = await r.json()
      if (!r.ok) throw Error(d.error || 'AI Builder failed')
      setAiPrompt('')
      if (d.execution) setAiVerdict(d.execution)
      await load()
      setChatMode(false)
      window.dispatchEvent(new Event('myspace:changed'))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI generation failed')
    } finally {
      setAiWorking(false)
    }
  }

  async function restore(version: Version) {
    if (!detail) return
    await run(async () => {
      const previous = (await request('/' + id + '?version=' + version.id)) as Detail
      await request('/' + id, 'PATCH', {
        revision: detail.project.revision,
        files: previous.current.files,
        summary: 'Restored source version: ' + version.id.slice(0, 8),
      })
      await load()
      setStatus('Draft source restored.')
    })
  }

  const canEdit = detail?.project.accessRole !== 'viewer'
  const isOwner = detail?.project.accessRole === 'owner' || !detail?.project.accessRole

  if (detail) {
    const appSource = files['src/App.tsx'] || ''
    const h1Match = appSource.match(/<h1>([^<{]+)<\/h1>/)
    const inAppHeadline = (h1Match && h1Match[1].trim()) || detail.project.description || 'Here is an app'

    return (
      <section className="myspace-inapp-flow">
        <header className="myspace-inapp-header">
          <button
            type="button"
            className="myspace-circle-btn"
            aria-label={chatMode ? 'Back to app' : 'Back to My Space'}
            onClick={() => {
              if (chatMode && !aiWorking) setChatMode(false)
              else if (onBack) onBack()
              else router.push('/myspace')
            }}
          >
            <IconChevronLeft size={21} stroke={1.9} />
          </button>

          <h2 className="myspace-inapp-title">{detail.project.name}</h2>

          {aiWorking ? (
            <button
              type="button"
              className="myspace-circle-btn"
              aria-label="Project options"
              onClick={() => setConfirmDelete(true)}
            >
              <IconDots size={20} stroke={1.9} />
            </button>
          ) : (
            <button
              type="button"
              className="myspace-circle-btn"
              aria-label={chatMode ? 'View app' : 'Edit app with AI'}
              onClick={() => setChatMode(prev => !prev)}
            >
              <IconBuilderOrb size={21} />
            </button>
          )}
        </header>

        {error && <p className="myspace-alert" role="alert">{error}</p>}

        {aiWorking ? (
          <div className="myspace-inapp-creating" role="status" aria-live="polite">
            <IconBuilderOrb size={46} className="myspace-creating-orb" />
            <strong>Creating your app</strong>
            <small>{detail.project.name}/src/App.tsx</small>
          </div>
        ) : chatMode ? (
          <div className="myspace-inapp-chat">
            <div className="myspace-inapp-chat-body">
              {aiVerdict && (
                <div className="myspace-agent-verdict-body">
                  <small style={{color: '#8e8e93'}}>Worked for {aiVerdict.durationSeconds || 1}s</small>
                  <p style={{color: '#202127', margin: '6px 0 0'}}>{aiVerdict.verdict}</p>
                </div>
              )}
            </div>
            {canEdit && (
              <div className="myspace-inapp-composer-dock">
                <div className="myspace-inapp-composer">
                  <button type="button" className="myspace-composer-icon" aria-label="Project actions" onClick={() => setConfirmDelete(true)}>
                    <IconPlus size={20} stroke={1.9} />
                  </button>
                  <input
                    type="text"
                    placeholder="Írj egy üzenetet…"
                    aria-label="App builder prompt"
                    value={aiPrompt}
                    maxLength={1000}
                    onChange={e => setAiPrompt(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        void runAiIterate()
                      }
                    }}
                  />
                  <span className="myspace-composer-mode">
                    Tutor <IconChevronDown size={13} stroke={2} />
                  </span>
                  <button
                    type="button"
                    className={`myspace-composer-send ${aiPrompt.trim() ? 'is-ready' : ''}`}
                    aria-label={aiPrompt.trim() ? 'Send' : 'Voice'}
                    onClick={() => void runAiIterate()}
                  >
                    {aiPrompt.trim() ? <IconArrowUp size={18} stroke={2.1} /> : <IconMicrophone size={19} stroke={1.85} />}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="myspace-inapp-preview">
            <ArlenMiniAppRenderer
              files={files}
              projectName={detail.project.name}
              description={detail.project.description}
            />
          </div>
        )}

        {confirmDelete && isOwner && (
          <BottomSheet title="Delete this project?" onClose={() => setConfirmDelete(false)}>
            <p>
              This permanently deletes its source drafts, execution logs, sharing grants, and version history.
            </p>
            <UIButton
              variant="danger"
              fullWidth
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await request('/' + id, 'DELETE', {confirm: true})
                  setConfirmDelete(false)
                  window.dispatchEvent(new Event('myspace:changed'))
                  if (onBack) onBack()
                  else router.push('/myspace')
                })
              }
            >
              Delete project and source
            </UIButton>
          </BottomSheet>
        )}
      </section>
    )
  }

  return (
    <section className="myspace-project">
      <h2>Your creations</h2>
      <p>Manage source projects and versions here.</p>
      {error && <p role="alert">{error}</p>}
      {projects.map(p => (
        <article className="myspace-app" key={p.id}>
          <UIButton variant="secondary" onClick={() => router.push('/myspace?project=' + p.id)}>
            {p.name}
          </UIButton>
        </article>
      ))}
      <h3>Start a source project</h3>
      <label>
        Project name
        <input aria-label="Project name" maxLength={48} value={name} onChange={e => setName(e.target.value)} />
      </label>
      <label>
        Description
        <textarea
          aria-label="Project description"
          maxLength={240}
          value={description}
          onChange={e => setDescription(e.target.value)}
        />
      </label>
      <UIButton disabled={busy || !name.trim()} onClick={create}>
        Create source project
      </UIButton>
    </section>
  )
}
