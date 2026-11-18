"use client"

import { memo, useState } from "react"
import "./chat-agent-plan.css"
import { IconBubble as Bubble, IconChevronDown as ChevronDown, IconTerminal2 as Terminal } from "@tabler/icons-react"
import type { AgentPlan } from "./chat-agent-plan"

/** Backgroundless iOS-style Agent Plan & SSE status composition matching the Working & Verdict Redesign. */
function AgentPlanView({ plan, onSkip }: { plan: AgentPlan; onSkip?: () => void }) {
  const [expanded, setExpanded] = useState<boolean>(true)
  const completedSteps = plan.steps.filter(step => step.status === "completed" && step.id !== "final")
  const runningStep = plan.steps.find(step => step.status === "running")
  const allCompleted = plan.steps.length > 0 && !runningStep

  const completedSummary = completedSteps.length === 0
    ? ""
    : completedSteps.length === 1
      ? completedSteps[0].title
      : `${completedSteps.slice(0, -1).map(s => s.title).join(", ")}, and ${completedSteps[completedSteps.length - 1].title}`

  if (allCompleted) {
    return (
      <div className="evo-agent-plan evo-agent-plan--verdict" aria-label="Az asszisztens munkaterve">
        <button
          type="button"
          className="evo-agent-worked-header"
          aria-expanded={expanded}
          onClick={() => setExpanded(v => !v)}
        >
          <span>worked for 1min</span>
          <ChevronDown
            size={13}
            strokeWidth={1.85}
            className={`evo-agent-chevron ${expanded ? "is-rotated" : ""}`}
            aria-hidden="true"
          />
        </button>
        {expanded && completedSummary && (
          <div className="evo-agent-completed-row">
            <Terminal size={17} strokeWidth={1.75} className="evo-agent-row-icon" aria-hidden="true" />
            <span>{completedSummary}</span>
          </div>
        )}
      </div>
    )
  }

  return <div className="evo-agent-plan" aria-label="Az asszisztens munkaterve">
    <div className="evo-agent-working-label">
      <span className="evo-agent-shimmer">Working</span>
    </div>

    {completedSummary && (
      <div className="evo-agent-completed-row">
        <Terminal size={17} strokeWidth={1.75} className="evo-agent-row-icon" aria-hidden="true" />
        <span>{completedSummary}</span>
      </div>
    )}

    {runningStep && (
      <div className="evo-agent-active-block">
        <div className="evo-agent-header-row">
          <button
            type="button"
            className="evo-agent-disclosure"
            aria-expanded={expanded}
            onClick={() => setExpanded(v => !v)}
          >
            <span className="evo-agent-shimmer">{runningStep.title}</span>
            <ChevronDown
              size={13}
              strokeWidth={1.85}
              className={`evo-agent-chevron ${expanded ? "" : "is-collapsed"}`}
              aria-hidden="true"
            />
          </button>
          {onSkip && (
            <button type="button" className="evo-agent-skip" onClick={onSkip}>
              Skip
            </button>
          )}
        </div>

        {expanded && (
          <div className="evo-agent-subrows">
            <div className="evo-agent-subrow">
              <Bubble size={17} strokeWidth={1.75} className="evo-agent-row-icon" aria-hidden="true" />
              <span>{runningStep.detail || runningStep.title}</span>
            </div>
            {runningStep.subcommands?.map(sub => (
              <div key={sub.id} className="evo-agent-subrow evo-agent-subrow--nested">
                <Terminal size={16} strokeWidth={1.75} className="evo-agent-row-icon" aria-hidden="true" />
                <span className={sub.status === "running" ? "evo-agent-shimmer" : ""}>{sub.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )}
  </div>
}

export default memo(AgentPlanView)
