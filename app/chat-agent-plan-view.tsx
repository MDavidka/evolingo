"use client"

import { memo, useState } from "react"
import { Circle, CircleAlert, CircleCheck, CircleDot, Route } from "lucide-react"
import type { AgentPlan } from "./chat-agent-plan"
import {
  Trace, TraceCollapsible, TraceCollapsibleContent, TraceCollapsibleTrigger,
  TraceDescription, TraceIcon, TraceLine, TraceTitle,
} from "@/components/ui/trace"

/** shadcn AI Elements Plan composition. Every state arrives from a server step event. */
function AgentPlanView({ plan }: { plan: AgentPlan }) {
  const [expanded, setExpanded] = useState<boolean | null>(null)
  const completed = plan.steps.filter(step => step.status === "completed").length
  const running = plan.steps.some(step => step.status === "running")
  const errored = plan.steps.some(step => step.status === "error")
  const headerStatus = running ? "running" : errored ? "error" : completed === plan.steps.length ? undefined : "pending"
  const open = expanded ?? (running || (completed === 0 && !errored))

  return <div className="evo-agent-plan" aria-label="Az asszisztens munkaterve">
    <Trace>
      <TraceCollapsible open={open} onOpenChange={setExpanded}>
        <TraceCollapsibleTrigger>
          <TraceLine status={headerStatus}>
            <TraceIcon><Route size={17} strokeWidth={1.8} /></TraceIcon>
            <TraceTitle>{running ? "Terv végrehajtása" : errored ? "Terv részben teljesítve" : "Munkaterv"}</TraceTitle>
            <TraceDescription>{completed} / {plan.steps.length} kész</TraceDescription>
          </TraceLine>
        </TraceCollapsibleTrigger>
        <TraceCollapsibleContent>
          <p className="evo-agent-plan-title">{plan.title}</p>
          <Trace>
            {plan.steps.map(step => <TraceLine key={step.id} status={step.status === "completed" ? undefined : step.status}>
              <TraceIcon>{step.status === "completed" ? <CircleCheck size={16} /> : step.status === "running" ? <CircleDot size={16} /> : step.status === "error" ? <CircleAlert size={16} /> : <Circle size={16} />}</TraceIcon>
              <TraceTitle>{step.title}</TraceTitle>
              <TraceDescription>{step.status === "completed" ? "Kész" : step.status === "running" ? "Folyamatban" : step.status === "error" ? "Sikertelen" : "Várakozik"}</TraceDescription>
            </TraceLine>)}
          </Trace>
        </TraceCollapsibleContent>
      </TraceCollapsible>
    </Trace>
  </div>
}

export default memo(AgentPlanView)
