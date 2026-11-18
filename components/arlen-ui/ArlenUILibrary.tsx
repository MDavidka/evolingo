'use client'
import React, {useEffect, useMemo, useState} from 'react'
import {
  IconCheck,
  IconChevronDown,
  IconChevronRight,
  IconClock,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlus,
  IconRotateClockwise,
  IconSearch,
  IconStar,
  IconTrash,
  IconUpload,
} from '@tabler/icons-react'
import {
  parseAppManifest,
  type ArlenAppManifest,
  type ArlenUIAction,
  type ArlenUINode,
} from '@/lib/myspace/ui-library'
import './arlen-ui.css'

function renderStateText(text: string | undefined, state: Record<string, unknown>): string {
  if (!text) return ''
  return text.replace(/\{\{([a-zA-Z0-9_.-]+)\}\}/g, (_, key: string) => {
    const val = state[key]
    if (Array.isArray(val)) return String(val.length)
    return val === undefined || val === null ? '0' : String(val)
  })
}

export function ArlenMiniAppRenderer({
  files,
  projectName,
  description,
}: {
  files: Record<string, string>
  projectName: string
  description?: string
}) {
  const manifest: ArlenAppManifest = useMemo(
    () => parseAppManifest(files, projectName, description),
    [files, projectName, description],
  )

  const [state, setState] = useState<Record<string, unknown>>(() => manifest.initialState || {})

  useEffect(() => {
    setState(manifest.initialState || {})
  }, [manifest])

  function runAction(action?: ArlenUIAction) {
    if (!action) return
    setState(prev => {
      switch (action.type) {
        case 'set':
          return {...prev, [action.key]: action.value}
        case 'toggle':
          return {...prev, [action.key]: !prev[action.key]}
        case 'increment': {
          const cur = Number(prev[action.key] ?? 0)
          const next = cur + (action.by ?? 1)
          return {...prev, [action.key]: action.max !== undefined ? Math.min(action.max, next) : next}
        }
        case 'decrement': {
          const cur = Number(prev[action.key] ?? 0)
          const next = cur - (action.by ?? 1)
          return {...prev, [action.key]: action.min !== undefined ? Math.max(action.min, next) : next}
        }
        case 'append': {
          const existing = Array.isArray(prev[action.listKey]) ? (prev[action.listKey] as unknown[]) : []
          const rawVal = action.fromKey ? String(prev[action.fromKey] ?? '').trim() : (action.value || '').trim()
          if (!rawVal && !action.template) return prev
          const item = action.template
            ? {...action.template, id: String(Date.now()), title: rawVal || String(action.template.title || 'Item')}
            : {id: String(Date.now()), title: rawVal, done: false}
          const nextState = {...prev, [action.listKey]: [item, ...existing]}
          if (action.fromKey) nextState[action.fromKey] = ''
          return nextState
        }
        case 'remove': {
          const existing = Array.isArray(prev[action.listKey]) ? (prev[action.listKey] as Array<Record<string, unknown>>) : []
          const filtered = existing.filter((entry, idx) =>
            action.id !== undefined ? entry.id !== action.id : idx !== action.index,
          )
          return {...prev, [action.listKey]: filtered}
        }
        case 'toggleListItem': {
          const existing = Array.isArray(prev[action.listKey]) ? (prev[action.listKey] as Array<Record<string, unknown>>) : []
          const field = action.field || 'done'
          const updated = existing.map((entry, idx) => {
            const match = action.id !== undefined ? entry.id === action.id : idx === action.index
            return match ? {...entry, [field]: !entry[field]} : entry
          })
          return {...prev, [action.listKey]: updated}
        }
        case 'reset':
          return manifest.initialState || {}
        default:
          return prev
      }
    })
  }

  return (
    <div className="arlen-ui-root">
      <div className="arlen-appshell">
        {manifest.nodes.map((node, index) => (
          <ArlenNodeView
            key={node.id || `${node.type}-${index}`}
            node={node}
            state={state}
            setState={setState}
            runAction={runAction}
          />
        ))}
      </div>
    </div>
  )
}

function CountdownWidget({seconds, variant}: {seconds: number; variant?: string}) {
  const [remaining, setRemaining] = useState(seconds)
  const [running, setRunning] = useState(false)
  useEffect(() => {
    if (!running || remaining <= 0) return
    const timer = setInterval(() => setRemaining(r => Math.max(0, r - 1)), 1000)
    return () => clearInterval(timer)
  }, [running, remaining])

  const mins = String(Math.floor(remaining / 60)).padStart(2, '0')
  const secs = String(remaining % 60).padStart(2, '0')

  return (
    <div className={`arlen-card ${variant === 'pill' ? 'is-outlined' : ''}`}>
      <div className="arlen-row is-between">
        <div className="arlen-row">
          <IconClock size={18} stroke={1.8} />
          <strong style={{fontSize: variant === 'large' ? 28 : 20, fontVariantNumeric: 'tabular-nums'}}>
            {mins}:{secs}
          </strong>
        </div>
        <div className="arlen-row">
          <button type="button" className="arlen-icon-btn" aria-label={running ? 'Pause' : 'Start'} onClick={() => setRunning(r => !r)}>
            {running ? <IconPlayerPause size={17} /> : <IconPlayerPlay size={17} />}
          </button>
          <button type="button" className="arlen-icon-btn is-ghost" aria-label="Reset" onClick={() => { setRunning(false); setRemaining(seconds) }}>
            <IconRotateClockwise size={17} />
          </button>
        </div>
      </div>
    </div>
  )
}

function ArlenNodeView({
  node,
  state,
  setState,
  runAction,
}: {
  node: ArlenUINode
  state: Record<string, unknown>
  setState: React.Dispatch<React.SetStateAction<Record<string, unknown>>>
  runAction: (a?: ArlenUIAction) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const v = node.variant || 'default'
  const label = renderStateText(node.label, state)
  const title = renderStateText(node.title, state)
  const subtitle = renderStateText(node.subtitle, state)
  const text = renderStateText(node.text, state)

  const renderChildren = () =>
    (node.children || []).map((child, i) => (
      <ArlenNodeView
        key={child.id || `${child.type}-${i}`}
        node={child}
        state={state}
        setState={setState}
        runAction={runAction}
      />
    ))

  switch (node.type) {
    case 'AppShell':
    case 'Container':
    case 'ScrollArea':
      return <div className="arlen-stack">{renderChildren()}</div>
    case 'Stack':
      return <div className={`arlen-stack is-${v}`}>{renderChildren()}</div>
    case 'Row':
    case 'ActionGroup':
      return <div className={`arlen-row is-${v}`}>{renderChildren()}</div>
    case 'Grid':
    case 'SplitPanel':
      return <div className={`arlen-grid is-${v}`}>{renderChildren()}</div>
    case 'Section':
      return (
        <section className={`arlen-section is-${v}`}>
          {title && <h4 className="arlen-section-title">{title}</h4>}
          {renderChildren()}
        </section>
      )
    case 'Divider':
      return <hr className={`arlen-divider is-${v}`} />
    case 'Spacer':
      return <div style={{height: v === 'lg' ? 24 : v === 'sm' ? 6 : 12}} />

    case 'Heading':
      if (v === 'h2') return <h2 className="arlen-h2">{text || title}</h2>
      if (v === 'h3') return <h3 className="arlen-h3">{text || title}</h3>
      return <h1 className="arlen-h1">{text || title}</h1>
    case 'Text':
    case 'MarkdownBlock':
      return <p className={`arlen-text is-${v}`}>{text || title}</p>

    case 'Button':
    case 'FloatingActionButton':
      return (
        <button
          type="button"
          className={`arlen-btn is-${v === 'default' ? 'primary' : v}`}
          onClick={() => runAction(node.action)}
        >
          {label || title || 'Continue'}
        </button>
      )
    case 'IconButton':
      return (
        <button type="button" className={`arlen-icon-btn is-${v}`} aria-label={label || 'Action'} onClick={() => runAction(node.action)}>
          <IconPlus size={18} />
        </button>
      )
    case 'SegmentedControl':
    case 'TabBar': {
      const opts = node.options || ['Overview', 'Details']
      const active = String(node.stateKey ? (state[node.stateKey] ?? opts[0]) : opts[0])
      return (
        <div className="arlen-segmented" role="tablist">
          {opts.map(opt => (
            <button
              key={opt}
              type="button"
              role="tab"
              aria-selected={active === opt}
              className={active === opt ? 'is-active' : ''}
              onClick={() => node.stateKey && setState(s => ({...s, [node.stateKey!]: opt}))}
            >
              {opt}
            </button>
          ))}
        </div>
      )
    }
    case 'ChipButton': {
      const active = node.stateKey ? Boolean(state[node.stateKey]) : v === 'selected'
      return (
        <button
          type="button"
          className={`arlen-chip ${active ? 'is-selected' : ''}`}
          onClick={() => {
            if (node.stateKey) setState(s => ({...s, [node.stateKey!]: !s[node.stateKey!]}))
            runAction(node.action)
          }}
        >
          {label || title}
        </button>
      )
    }

    case 'TextField':
    case 'PasswordField':
    case 'DatePicker':
    case 'TimePicker':
    case 'OTPInput':
    case 'TagInput': {
      const key = node.stateKey || 'input'
      const val = String(state[key] ?? node.value ?? '')
      const inputType = node.type === 'PasswordField' ? 'password' : node.type === 'DatePicker' ? 'date' : node.type === 'TimePicker' ? 'time' : 'text'
      return (
        <label className="arlen-field">
          {label && <span className="arlen-field-label">{label}</span>}
          <input
            type={inputType}
            className={`arlen-input is-${v}`}
            value={val}
            placeholder={node.placeholder || 'Type here…'}
            onChange={e => setState(s => ({...s, [key]: e.target.value}))}
          />
        </label>
      )
    }
    case 'TextArea': {
      const key = node.stateKey || 'notes'
      const val = String(state[key] ?? node.value ?? '')
      return (
        <label className="arlen-field">
          {label && <span className="arlen-field-label">{label}</span>}
          <textarea
            className={`arlen-textarea is-${v}`}
            value={val}
            placeholder={node.placeholder || 'Write details…'}
            onChange={e => setState(s => ({...s, [key]: e.target.value}))}
          />
        </label>
      )
    }
    case 'SearchField': {
      const key = node.stateKey || 'query'
      const val = String(state[key] ?? '')
      return (
        <div className="arlen-search-wrap">
          <IconSearch size={17} color="#8e8e93" />
          <input
            type="search"
            value={val}
            placeholder={node.placeholder || label || 'Search…'}
            onChange={e => setState(s => ({...s, [key]: e.target.value}))}
          />
        </div>
      )
    }
    case 'NumberStepper': {
      const key = node.stateKey || 'count'
      const val = Number(state[key] ?? node.value ?? 0)
      return (
        <div className="arlen-row is-between">
          {label && <span className="arlen-text">{label}</span>}
          <div className="arlen-stepper">
            <button type="button" onClick={() => setState(s => ({...s, [key]: Math.max(node.min ?? 0, val - (node.step ?? 1))}))}>−</button>
            <span>{val}</span>
            <button type="button" onClick={() => setState(s => ({...s, [key]: Math.min(node.max ?? 999, val + (node.step ?? 1))}))}>+</button>
          </div>
        </div>
      )
    }
    case 'Select': {
      const key = node.stateKey || 'select'
      const opts = node.options || ['Option A', 'Option B']
      const val = String(state[key] ?? opts[0])
      return (
        <label className="arlen-field">
          {label && <span className="arlen-field-label">{label}</span>}
          <select className="arlen-select" value={val} onChange={e => setState(s => ({...s, [key]: e.target.value}))}>
            {opts.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </label>
      )
    }
    case 'Toggle': {
      const key = node.stateKey || 'enabled'
      const on = Boolean(state[key] ?? node.value)
      return (
        <div className="arlen-toggle-row" onClick={() => setState(s => ({...s, [key]: !on}))}>
          <span className="arlen-text">{label || title}</span>
          <button type="button" role="switch" aria-checked={on} className={`arlen-switch ${on ? 'is-on' : ''}`}>
            <span className="arlen-switch-thumb" />
          </button>
        </div>
      )
    }
    case 'Checkbox': {
      const key = node.stateKey || 'checked'
      const checked = Boolean(state[key] ?? node.value)
      return (
        <label className={`arlen-checkbox-row ${v === 'card' ? 'is-card' : ''}`}>
          <input type="checkbox" checked={checked} onChange={e => setState(s => ({...s, [key]: e.target.checked}))} />
          <span className="arlen-text">{label || title}</span>
        </label>
      )
    }
    case 'RadioGroup': {
      const key = node.stateKey || 'choice'
      const opts = node.options || ['First', 'Second']
      const val = String(state[key] ?? opts[0])
      return (
        <div className="arlen-stack is-tight">
          {label && <span className="arlen-field-label">{label}</span>}
          {opts.map(opt => (
            <label key={opt} className="arlen-checkbox-row">
              <input type="radio" name={key} checked={val === opt} onChange={() => setState(s => ({...s, [key]: opt}))} />
              <span className="arlen-text">{opt}</span>
            </label>
          ))}
        </div>
      )
    }
    case 'Slider': {
      const key = node.stateKey || 'slider'
      const val = Number(state[key] ?? node.value ?? 50)
      return (
        <div className="arlen-slider-wrap">
          <div className="arlen-row is-between">
            <span className="arlen-field-label">{label || 'Value'}</span>
            <span className="arlen-text is-caption">{val}</span>
          </div>
          <input
            type="range"
            min={node.min ?? 0}
            max={node.max ?? 100}
            step={node.step ?? 1}
            value={val}
            onChange={e => setState(s => ({...s, [key]: Number(e.target.value)}))}
          />
        </div>
      )
    }
    case 'RatingInput': {
      const key = node.stateKey || 'rating'
      const val = Number(state[key] ?? 4)
      return (
        <div className="arlen-row">
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n} type="button" className="arlen-icon-btn is-ghost" onClick={() => setState(s => ({...s, [key]: n}))}>
              <IconStar size={19} fill={n <= val ? '#202127' : 'none'} />
            </button>
          ))}
        </div>
      )
    }
    case 'FileDropzone':
      return (
        <div className="arlen-card is-outlined" style={{borderStyle: 'dashed', alignItems: 'center', padding: 20}}>
          <IconUpload size={20} color="#8e8e93" />
          <span className="arlen-text is-muted">{label || 'Tap to select file'}</span>
        </div>
      )

    case 'Card':
    case 'InfoCard':
    case 'ActionCard':
    case 'MediaCard':
    case 'ModalSheet':
    case 'ConfirmDialog':
      return (
        <div className={`arlen-card is-${v}`}>
          {title && <h3 className="arlen-h3">{title}</h3>}
          {subtitle && <p className="arlen-text is-muted">{subtitle}</p>}
          {renderChildren()}
        </div>
      )
    case 'ExpandableCard':
    case 'Accordion':
      return (
        <div className="arlen-card is-outlined">
          <div className="arlen-row is-between" style={{cursor: 'pointer'}} onClick={() => setExpanded(e => !e)}>
            <strong className="arlen-h3">{title || label || 'Details'}</strong>
            {expanded ? <IconChevronDown size={18} /> : <IconChevronRight size={18} />}
          </div>
          {expanded && <div className="arlen-stack is-tight">{text && <p className="arlen-text is-muted">{text}</p>}{renderChildren()}</div>}
        </div>
      )
    case 'MetricCard':
    case 'StatTile':
      return (
        <div className="arlen-metric-card">
          <span className="arlen-metric-label">{label || title}</span>
          <strong className="arlen-metric-value">{text || renderStateText(String(node.value ?? '0'), state)}</strong>
          {subtitle && <span className="arlen-text is-caption">{subtitle}</span>}
        </div>
      )
    case 'BannerCard':
      return (
        <div className={`arlen-banner is-${v}`}>
          <div className="arlen-stack is-tight">
            {title && <strong style={{fontSize: 15}}>{title}</strong>}
            {subtitle && <span style={{fontSize: 13, opacity: 0.8}}>{subtitle}</span>}
          </div>
          {node.badge && <span className="arlen-badge">{node.badge}</span>}
        </div>
      )

    case 'ProfileHeader': {
      const initials = (title || 'A').split(/\s+/).slice(0, 2).map(s => s[0]?.toUpperCase() || '').join('')
      return (
        <div className={`arlen-profile-header is-${v}`}>
          <div className="arlen-avatar is-lg">{initials}</div>
          <div className="arlen-stack is-tight">
            <h2 className="arlen-h2">{title || 'Arlen Member'}</h2>
            {subtitle && <p className="arlen-text is-muted">{subtitle}</p>}
          </div>
          {node.badge && <span className="arlen-badge is-accent">{node.badge}</span>}
        </div>
      )
    }
    case 'Avatar':
      return <div className={`arlen-avatar is-${v}`}>{(title || label || 'A').slice(0, 2).toUpperCase()}</div>
    case 'AvatarGroup':
      return (
        <div className="arlen-row">
          {(node.options || ['AL', 'MK', 'SR']).map((init, i) => (
            <div key={i} className="arlen-avatar is-sm" style={{marginLeft: i > 0 ? -10 : 0}}>{init}</div>
          ))}
        </div>
      )
    case 'UserRow':
      return (
        <div className="arlen-list-item">
          <div className="arlen-row">
            <div className="arlen-avatar is-sm">{(title || 'U').slice(0, 2).toUpperCase()}</div>
            <div className="arlen-stack is-tight">
              <strong style={{fontSize: 14.5}}>{title}</strong>
              {subtitle && <span className="arlen-text is-caption">{subtitle}</span>}
            </div>
          </div>
          {node.badge && <span className="arlen-badge">{node.badge}</span>}
        </div>
      )
    case 'ProfileStats':
      return (
        <div className="arlen-profile-stats">
          {(node.items || [{title: '12', subtitle: 'Apps'}, {title: '48', subtitle: 'Runs'}, {title: '99%', subtitle: 'Uptime'}]).map((it, i) => (
            <div key={i} className="arlen-stack is-tight">
              <strong style={{fontSize: 17}}>{renderStateText(it.title, state)}</strong>
              <span className="arlen-text is-caption">{it.subtitle}</span>
            </div>
          ))}
        </div>
      )
    case 'AccountBadge':
      return <span className="arlen-badge is-accent">{label || title || 'Verified'}</span>

    case 'TopBar':
      return (
        <div className="arlen-row is-between">
          <h2 className="arlen-h2">{title}</h2>
          {node.badge && <span className="arlen-badge">{node.badge}</span>}
        </div>
      )
    case 'Breadcrumb':
      return <div className="arlen-text is-caption">{(node.options || ['Home', 'App']).join(' / ')}</div>
    case 'Pagination':
    case 'StepIndicator':
      return (
        <div className="arlen-row is-center">
          {(node.options || ['1', '2', '3']).map((s, i) => (
            <span key={i} className={`arlen-badge ${i === 0 ? 'is-accent' : ''}`}>{s}</span>
          ))}
        </div>
      )
    case 'SidebarNav':
      return <div className="arlen-stack is-tight">{renderChildren()}</div>

    case 'ListItem': {
      // Dynamic list binding if listKey is provided
      if (node.listKey) {
        const list = Array.isArray(state[node.listKey]) ? (state[node.listKey] as Array<Record<string, unknown>>) : []
        if (list.length === 0) {
          return <div className="arlen-card"><span className="arlen-text is-muted">No items yet</span></div>
        }
        return (
          <div className="arlen-stack is-tight">
            {list.map((entry, idx) => {
              const done = Boolean(entry.done)
              return (
                <div key={String(entry.id || idx)} className="arlen-list-item">
                  <div className="arlen-row" style={{cursor: 'pointer'}} onClick={() => runAction({type: 'toggleListItem', listKey: node.listKey!, index: idx})}>
                    <span className="arlen-icon-btn is-square" style={{width: 28, height: 28, background: done ? '#202127' : '#fff', color: done ? '#fff' : '#8e8e93'}}>
                      {done && <IconCheck size={14} />}
                    </span>
                    <span className="arlen-text" style={{textDecoration: done ? 'line-through' : 'none', opacity: done ? 0.55 : 1}}>
                      {String(entry.title || '')}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="arlen-icon-btn is-ghost"
                    style={{width: 32, height: 32}}
                    aria-label="Delete"
                    onClick={() => runAction({type: 'remove', listKey: node.listKey!, index: idx})}
                  >
                    <IconTrash size={15} color="#8e8e93" />
                  </button>
                </div>
              )
            })}
          </div>
        )
      }
      return (
        <div className="arlen-list-item">
          <div className="arlen-stack is-tight">
            <strong style={{fontSize: 15}}>{title || label}</strong>
            {subtitle && <span className="arlen-text is-caption">{subtitle}</span>}
          </div>
          {node.badge ? <span className="arlen-badge">{node.badge}</span> : <IconChevronRight size={17} color="#aeaeb2" />}
        </div>
      )
    }
    case 'KeyValueRow':
      return (
        <div className="arlen-row is-between" style={{padding: '6px 0', borderBottom: '1px solid #f0f0f2'}}>
          <span className="arlen-text is-muted">{label || title}</span>
          <strong style={{fontSize: 14.5}}>{text || renderStateText(String(node.value ?? ''), state)}</strong>
        </div>
      )
    case 'Badge':
    case 'Tag':
    case 'Pill':
      return <span className={`arlen-badge is-${v}`}>{text || label || title}</span>
    case 'Timeline':
      return (
        <div className="arlen-stack is-tight">
          {(node.items || []).map((it, i) => (
            <div key={i} className="arlen-list-item">
              <div className="arlen-stack is-tight">
                <strong style={{fontSize: 14}}>{it.title}</strong>
                {it.subtitle && <span className="arlen-text is-caption">{it.subtitle}</span>}
              </div>
              {it.value && <span className="arlen-text is-caption">{it.value}</span>}
            </div>
          ))}
        </div>
      )
    case 'Table':
      return (
        <div className="arlen-card is-outlined" style={{padding: 0, overflow: 'hidden'}}>
          {(node.rows || []).map((row, i) => (
            <div key={i} className="arlen-row is-between" style={{padding: '10px 14px', borderBottom: '1px solid #f0f0f2'}}>
              {Object.values(row).map((cell, j) => (
                <span key={j} className="arlen-text" style={{fontSize: 13.5}}>{String(cell)}</span>
              ))}
            </div>
          ))}
        </div>
      )
    case 'SparklineBar': {
      const nums = node.data || [35, 60, 45, 80, 65, 95, 70]
      const peak = Math.max(1, ...nums)
      return (
        <div className="arlen-card">
          {title && <span className="arlen-field-label">{title}</span>}
          <div className="arlen-sparkline">
            {nums.map((n, i) => (
              <div key={i} className="arlen-sparkline-bar" style={{height: `${Math.max(12, Math.round((n / peak) * 100))}%`}} />
            ))}
          </div>
        </div>
      )
    }
    case 'CalendarStrip':
      return (
        <div className="arlen-row is-between">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <span key={i} className={`arlen-badge ${i === 4 ? 'is-accent' : ''}`} style={{width: 34, height: 34, justifyContent: 'center'}}>{d}</span>
          ))}
        </div>
      )

    case 'Alert':
    case 'Toast':
      return <div className={`arlen-alert is-${v}`}>{text || title || label}</div>
    case 'LoadingIndicator':
    case 'Skeleton':
      return <div className="arlen-card"><span className="arlen-text is-muted">{text || 'Loading…'}</span></div>
    case 'ProgressBar': {
      const pct = node.stateKey ? Number(state[node.stateKey] ?? node.progress ?? 0) : (node.progress ?? 60)
      const clamped = Math.max(0, Math.min(100, pct))
      return (
        <div className="arlen-stack is-tight">
          {label && (
            <div className="arlen-row is-between">
              <span className="arlen-field-label">{label}</span>
              <span className="arlen-text is-caption">{clamped}%</span>
            </div>
          )}
          <div className="arlen-progress-track">
            <div className="arlen-progress-fill" style={{width: `${clamped}%`}} />
          </div>
        </div>
      )
    }
    case 'EmptyState':
    case 'ErrorState':
      return (
        <div className="arlen-card is-outlined" style={{alignItems: 'center', textAlign: 'center', padding: 24}}>
          <strong className="arlen-h3">{title || 'Nothing here'}</strong>
          {text && <p className="arlen-text is-muted">{text}</p>}
        </div>
      )

    case 'CodeBlock':
    case 'JSONViewer':
      return <pre className={`arlen-codeblock is-${v}`}>{text}</pre>
    case 'StatusIndicator':
      return <span className={`arlen-status-dot is-${v}`}>{text || label || 'Ready'}</span>
    case 'CountdownTimer':
      return <CountdownWidget seconds={Number(node.value ?? 300)} variant={v} />
    case 'AudioPlayerBar':
      return (
        <div className="arlen-list-item">
          <span className="arlen-text">{title || 'Audio track'}</span>
          <IconPlayerPlay size={18} />
        </div>
      )
    default:
      return (
        <div className="arlen-card">
          {title && <strong className="arlen-h3">{title}</strong>}
          {text && <p className="arlen-text is-muted">{text}</p>}
          {renderChildren()}
        </div>
      )
  }
}
