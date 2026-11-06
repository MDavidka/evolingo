"use client"

import { useState } from "react"
import {
  AlertCircle, ArrowUp, AudioLines, BookOpen, BrainCircuit, CalendarDays,
  ChartNoAxesColumn, Check, CheckCircle2, ChevronDown, ChevronRight, Circle,
  Clock3, Code2, Copy, FileText, Globe, Image, ListChecks, LoaderCircle,
  Mic, MicOff, MoreHorizontal, Paperclip, Plus, RefreshCw, Search,
  ShieldCheck, SlidersHorizontal, Sparkles, Square, Table2, ThumbsDown,
  ThumbsUp, Volume2, Wrench, X, type LucideIcon,
} from "lucide-react"
import "./evolingo-ai-components-demo.css"

type Group = "All" | "Messages" | "Composer" | "Agent" | "Tools" | "Rich content" | "Voice"
type ComposerState = "Idle" | "Typing" | "Attachment" | "Recording" | "Streaming" | "Disabled"
type Approval = "pending" | "approved" | "rejected"

const groups: Group[] = ["All", "Messages", "Composer", "Agent", "Tools", "Rich content", "Voice"]
const composerStates: ComposerState[] = ["Idle", "Typing", "Attachment", "Recording", "Streaming", "Disabled"]

const activity: { label: string; Icon: LucideIcon; state: "done" | "working" | "error" }[] = [
  { label: "Read lesson outline", Icon: FileText, state: "done" },
  { label: "Search study resources", Icon: Search, state: "done" },
  { label: "Prepare recommendations", Icon: Sparkles, state: "working" },
]

function Heading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <header className="evo-ai-showcase__heading">
    <span className="evo-ai-showcase__eyebrow">{eyebrow}</span>
    <h3>{title}</h3>
    <p>{description}</p>
  </header>
}

function ActionLabel({ Icon, label }: { Icon: LucideIcon; label: string }) {
  return <span className="evo-ai-showcase__action-icon" title={label} aria-label={label}><Icon size={17} strokeWidth={1.7} aria-hidden="true" /></span>
}

function Section({ id, children }: { id: string; children: React.ReactNode }) {
  return <section className="evo-ai-showcase__section" id={id}>{children}</section>
}

export default function AIComponentsShowcase() {
  const [group, setGroup] = useState<Group>("All")
  const [composer, setComposer] = useState<ComposerState>("Idle")
  const [toolsOpen, setToolsOpen] = useState(false)
  const [approval, setApproval] = useState<Approval>("pending")
  const show = (name: Group) => group === "All" || group === name

  return (
    <div className="evo-ai-showcase">
      <header className="evo-ai-showcase__intro">
        <div className="evo-ai-showcase__eyebrow">AI COMPONENT LIBRARY</div>
        <div className="evo-ai-showcase__intro-row">
          <h2>Chat & agent UI</h2>
          <span className="evo-ai-showcase__intro-icon"><Sparkles size={19} strokeWidth={1.7} aria-hidden="true" /></span>
        </div>
        <p>Minimal ChatGPT iOS-inspired specimens for conversations, tools, long-running plans, and rich answers. All examples use demo data.</p>
      </header>

      <div className="evo-ai-showcase__filters" role="group" aria-label="AI component category">
        {groups.map((item) => <button key={item} type="button" aria-pressed={group === item} onClick={() => setGroup(item)}>{item}</button>)}
      </div>

      {show("Messages") && <Section id="evo-ai-messages">
        <Heading eyebrow="01 / MESSAGES" title="Conversation" description="Borderless assistant output, quiet user bubbles and compact feedback controls." />
        <div className="evo-ai-showcase__conversation">
          <div className="evo-ai-showcase__user-row">
            <div className="evo-ai-showcase__user-message">Explain the Present Perfect with an example.</div>
          </div>
          <div className="evo-ai-showcase__assistant">
            <p>The <strong>Present Perfect</strong> connects past actions with the present.</p>
            <p>For example, <em>“I have finished my homework.”</em></p>
            <div className="evo-ai-showcase__action-row">
              <ActionLabel Icon={Copy} label="Copy" />
              <ActionLabel Icon={ThumbsUp} label="Helpful" />
              <ActionLabel Icon={ThumbsDown} label="Not helpful" />
              <ActionLabel Icon={RefreshCw} label="Retry" />
              <ActionLabel Icon={Volume2} label="Read aloud" />
            </div>
          </div>
        </div>
        <div className="evo-ai-showcase__variants">
          <div><span className="evo-ai-showcase__variant-title"><LoaderCircle size={15} /> Streaming</span><p>Preparing your explanation<span className="evo-ai-showcase__cursor" /></p></div>
          <div><span className="evo-ai-showcase__variant-title"><AlertCircle size={15} /> Error</span><p>Response unavailable. <span className="evo-ai-showcase__inline-action">Retry</span></p></div>
          <div><span className="evo-ai-showcase__variant-title"><Square size={15} /> Interrupted</span><p>Stopped generating. Your conversation is saved.</p></div>
        </div>
      </Section>}

      {show("Composer") && <Section id="evo-ai-composer">
        <Heading eyebrow="02 / COMPOSER" title="Message composer" description="Native-feeling multiline composer with selectable demonstration states." />
        <div className="evo-ai-showcase__state-choices" role="group" aria-label="Composer preview state">
          {composerStates.map((state) => <button type="button" key={state} aria-pressed={composer === state} onClick={() => setComposer(state)}>{state}</button>)}
        </div>
        <div className={"evo-ai-showcase__composer" + (composer === "Disabled" ? " evo-ai-showcase__composer--disabled" : "")}>
          {composer === "Attachment" && <div className="evo-ai-showcase__attachment"><FileText size={17} /><span>lesson-notes.pdf</span><X size={14} className="evo-ai-showcase__muted" /></div>}
          {composer === "Recording" ? (
            <div className="evo-ai-showcase__recording"><span className="evo-ai-showcase__recording-dot" /><AudioLines size={19} /> Listening… <small>00:12</small></div>
          ) : (
            <div className="evo-ai-showcase__composer-placeholder">
              {composer === "Typing" ? "Explain the difference between past tenses|" : composer === "Streaming" ? "Generating response…" : "Ask anything"}
            </div>
          )}
          <div className="evo-ai-showcase__composer-toolbar">
            <div><span><Plus size={21} /></span><span><SlidersHorizontal size={19} /></span></div>
            <div><span><Mic size={20} /></span><span className="evo-ai-showcase__composer-send">{composer === "Streaming" ? <Square size={15} fill="white" /> : <ArrowUp size={20} />}</span></div>
          </div>
        </div>
        <div className="evo-ai-showcase__spec-line">44px+ tap targets · 24px corner radius · keyboard-safe bottom placement · send/stop state</div>
      </Section>}

      {show("Agent") && <Section id="evo-ai-agent">
        <Heading eyebrow="03 / AGENT" title="Task planning" description="Compact progress, explicit checkpoints and approval decisions that stay inside the conversation." />
        <div className="evo-ai-showcase__plan">
          <div className="evo-ai-showcase__plan-head"><span><ListChecks size={19} strokeWidth={1.8} /> <strong>Task plan</strong></span><small>2 of 4 complete</small></div>
          <div className="evo-ai-showcase__progress"><span style={{ width: "50%" }} /></div>
          {[
            { title: "Inspect current lesson", state: "done" },
            { title: "Review reference materials", state: "done" },
            { title: "Draft the new component", state: "running" },
            { title: "Verify and summarize", state: "waiting" },
          ].map((step) => (
            <div className="evo-ai-showcase__plan-step" key={step.title}>
              {step.state === "done" ? <CheckCircle2 size={18} /> : step.state === "running" ? <LoaderCircle size={18} /> : <Circle size={18} />}
              <span className={step.state === "waiting" ? "evo-ai-showcase__muted" : ""}>{step.title}</span>
            </div>
          ))}
        </div>

        <div className="evo-ai-showcase__approval">
          <div className="evo-ai-showcase__approval-head"><ShieldCheck size={20} strokeWidth={1.8} /><div><strong>Approval required</strong><p>Apply proposed component changes?</p></div></div>
          {approval === "pending" ? (
            <div className="evo-ai-showcase__approval-actions">
              <button type="button" onClick={() => setApproval("approved")}>Approve preview</button>
              <button type="button" onClick={() => setApproval("rejected")}>Reject</button>
            </div>
          ) : (
            <div className="evo-ai-showcase__approval-result"><CheckCircle2 size={16} /> {approval === "approved" ? "Approved (demo only)" : "Rejected (demo only)"} <button type="button" onClick={() => setApproval("pending")}>Reset</button></div>
          )}
        </div>
        <div className="evo-ai-showcase__background-task">
          <Clock3 size={20} strokeWidth={1.8} />
          <div><strong>Long-running task</strong><small>Researching learning resources · In progress</small></div>
          <ChevronRight size={17} className="evo-ai-showcase__muted" />
        </div>
      </Section>}

      {show("Tools") && <Section id="evo-ai-tools">
        <Heading eyebrow="04 / TOOLS" title="Tool activity" description="Show relevant execution summaries without exposing private reasoning." />
        <div className="evo-ai-showcase__tool-summary">
          <button type="button" className="evo-ai-showcase__tool-toggle" aria-expanded={toolsOpen} onClick={() => setToolsOpen(!toolsOpen)}>
            <LoaderCircle size={18} strokeWidth={1.8} />
            <span>Working on your request</span>
            <ChevronDown size={17} className={toolsOpen ? "evo-ai-showcase__chevron--open" : ""} />
          </button>
          {toolsOpen && <div className="evo-ai-showcase__tool-steps">
            {activity.map(({ label, Icon, state }) => (
              <div key={label}><Icon size={16} strokeWidth={1.7} /><span>{label}</span>{state === "done" ? <Check size={15} /> : <LoaderCircle size={15} />}</div>
            ))}
          </div>}
        </div>
        <div className="evo-ai-showcase__tool-variants">
          <div><CheckCircle2 size={18} /><span>Web search completed</span><small>3 results</small></div>
          <div><Wrench size={18} /><span>Analyzing files</span><small>Running</small></div>
          <div><AlertCircle size={18} /><span>Tool unavailable</span><small>Error</small></div>
        </div>
      </Section>}

      {show("Rich content") && <Section id="evo-ai-rich">
        <Heading eyebrow="05 / CONTENT" title="Rich responses" description="Structured content should live inline, with responsive layouts and very little chrome." />
        <div className="evo-ai-showcase__rich-grid">
          <article className="evo-ai-showcase__rich-card">
            <div className="evo-ai-showcase__rich-title"><ChartNoAxesColumn size={18} /><strong>Learning activity</strong><MoreHorizontal size={18} /></div>
            <div className="evo-ai-showcase__metric">24.5h <span>+12.8%</span></div>
            <div className="evo-ai-showcase__bars">
              {[27, 41, 34, 58, 44, 70, 54].map((height, i) => <span key={i} style={{ height: height + "px", background: i === 5 ? "#202124" : "#D1D1D6" }} />)}
            </div>
            <small>Example data · Weekly hours</small>
          </article>

          <article className="evo-ai-showcase__rich-card">
            <div className="evo-ai-showcase__rich-title"><FileText size={18} /><strong>Generated document</strong></div>
            <div className="evo-ai-showcase__file-preview"><FileText size={22} /><div><strong>Study-guide.pdf</strong><small>PDF · 128 KB</small></div><ChevronRight size={16} /></div>
            <small>File and attachment preview</small>
          </article>

          <article className="evo-ai-showcase__rich-card">
            <div className="evo-ai-showcase__rich-title"><Table2 size={18} /><strong>Comparison table</strong></div>
            <div className="evo-ai-showcase__table-scroll">
              <table><thead><tr><th>Skill</th><th>Before</th><th>Now</th></tr></thead><tbody><tr><td>Grammar</td><td>61%</td><td>82%</td></tr><tr><td>Vocabulary</td><td>70%</td><td>89%</td></tr></tbody></table>
            </div>
            <small>Readable without overflow</small>
          </article>

          <article className="evo-ai-showcase__rich-card">
            <div className="evo-ai-showcase__rich-title"><Code2 size={18} /><strong>Code response</strong><Copy size={16} /></div>
            <pre><code>{'const lesson = {\n  level: "B2",\n  complete: true\n}'}</code></pre>
            <small>Monospace with copy affordance</small>
          </article>

          <article className="evo-ai-showcase__rich-card">
            <div className="evo-ai-showcase__rich-title"><Globe size={18} /><strong>Sources</strong></div>
            <div className="evo-ai-showcase__source"><Globe size={18} /><div><strong>Apple Developer</strong><small>developer.apple.com</small></div><ChevronRight size={16} /></div>
            <div className="evo-ai-showcase__source"><BookOpen size={18} /><div><strong>Accessibility guidance</strong><small>w3.org</small></div><ChevronRight size={16} /></div>
            <small>Example citation references</small>
          </article>

          <article className="evo-ai-showcase__rich-card">
            <div className="evo-ai-showcase__rich-title"><BookOpen size={18} /><strong>Interactive learning</strong></div>
            <p className="evo-ai-showcase__quiz-question">Which sentence uses Present Perfect?</p>
            <div className="evo-ai-showcase__quiz-option">A · I went home yesterday.</div>
            <div className="evo-ai-showcase__quiz-option evo-ai-showcase__quiz-option--selected"><Check size={15} /> B · I have finished my work.</div>
            <small>Quiz / flashcard response type</small>
          </article>
        </div>
        <div className="evo-ai-showcase__rich-types">
          {[
            { Icon: Image, label: "Images" }, { Icon: CalendarDays, label: "Timelines" },
            { Icon: ChartNoAxesColumn, label: "Charts" }, { Icon: FileText, label: "Documents" },
          ].map(({ Icon, label }) => <span key={label}><Icon size={17} /> {label}</span>)}
        </div>
      </Section>}

      {show("Voice") && <Section id="evo-ai-voice">
        <Heading eyebrow="06 / VOICE" title="Voice & multimodal" description="A calm voice preview, waveform, attachments and playback states." />
        <div className="evo-ai-showcase__voice">
          <div className="evo-ai-showcase__voice-title"><AudioLines size={19} /><strong>Voice conversation</strong><MoreHorizontal size={19} /></div>
          <div className="evo-ai-showcase__waveform" aria-label="Decorative audio waveform">
            {Array.from({ length: 39 }, (_, i) => {
              const height = 7 + Math.abs(Math.sin(i * 1.35) * Math.cos(i * .21)) * 30
              return <span key={i} style={{ height: height + "px", backgroundColor: i % 5 === 0 ? "#202124" : "#A1A1A6" }} />
            })}
          </div>
          <div className="evo-ai-showcase__voice-controls">
            <span><MicOff size={21} /></span><span><X size={21} /></span>
          </div>
        </div>
        <div className="evo-ai-showcase__multimodal">
          {[
            { Icon: Image, label: "Image input" }, { Icon: Paperclip, label: "File input" },
            { Icon: Mic, label: "Transcription" }, { Icon: Volume2, label: "Playback" },
          ].map(({ Icon, label }) => <div key={label}><Icon size={17} strokeWidth={1.75} /> <span>{label}</span></div>)}
        </div>
      </Section>}

      <div className="evo-ai-showcase__footer">
        <span><Check size={15} /> Apple Neutral · 20px icons · 1.75px stroke</span>
        <p>UI specimens only. These previews do not send messages, run tools, process audio, change files, schedule tasks, or grant real approvals.</p>
      </div>
    </div>
  )
}
