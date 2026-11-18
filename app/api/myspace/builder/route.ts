import { validateDevSource } from "@/lib/arlen/dev-source"
import { modeInstruction } from "@/lib/arlen/modes"
import { modelProfile } from "@/lib/arlen/models"
import type {NextRequest} from 'next/server'
import {ownerFor, respond, failure} from '@/lib/myspace/server'
import {boundedJSON, MyspaceError} from '@/lib/myspace/contracts'
import {builderReadiness} from '@/lib/myspace/builder-config'
import {create, update, inspect, projectCollections} from '@/lib/myspace/projects/store'
import {projectID, type ProjectIconName} from '@/lib/myspace/projects/schema'
import {componentCatalogSummaryForPrompt} from '@/lib/myspace/ui-library'
import {randomUUID} from 'node:crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const zroKey = () => process.env.ZRO_API_KEY?.trim()
const apiURL = () => (zroKey() ? 'https://zro.moonmath.ai/v1/chat/completions' : 'https://openrouter.ai/api/v1/chat/completions')
const aiModel = () => modelProfile('coding').primary!

const SYSTEM_PROMPT = [
  modeInstruction('dev'),
  'Generate a clean, functional in-app mini-app using the Arlen Component Library (@myspace/ui) so it renders natively inside the app on iOS and Web.',
  `Available component topics & variants: ${componentCatalogSummaryForPrompt()}.`,
  'Allowed React imports in src/App.tsx: `import React, { useState, useEffect, useMemo } from "react"` and components from `"@myspace/ui"`.',
  'Do NOT import any external packages or use fetch/window/document/eval.',
  'You MUST include BOTH "src/App.tsx" AND "src/app.ui.json" in files.',
  'Format of src/app.ui.json: {"schema":"arlen-app/v1","title":"App Title","subtitle":"Short summary","initialState":{"input":"","items":[{"id":"1","title":"First item","done":false}],"count":0,"enabled":true},"nodes":[...ArlenUINode objects using type, variant, title, label, text, stateKey, listKey, options, action...]}.',
  'Supported node actions: {"type":"increment","key":"count","by":1}, {"type":"decrement","key":"count","by":1}, {"type":"toggle","key":"enabled"}, {"type":"append","listKey":"items","fromKey":"input"}, {"type":"reset"}.',
  'Use "{{stateKey}}" interpolation in MetricCard/Text/Heading to display live state.',
  'Return ONLY valid JSON: {"name":"App Title","description":"Short summary","icon":"books"|"sliders"|"notes"|"checklist"|"terminal"|"chart"|"code","files":{"src/App.tsx":"...","src/app.ui.json":"..."}}',
].join(' ')

async function generateWithAI(idea: string, requestedName?: string, requestedIcon?: ProjectIconName,
  existingFiles?: Record<string, string>, signal?: AbortSignal) {
  const key = zroKey() || process.env.OPENROUTER_API_KEY?.trim()
  if (!key) throw new MyspaceError(503, 'Arlen Dev generation is not configured. No project was changed.')
  let res: Response
  try {
    res = await fetch(apiURL(), {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: aiModel(),
        messages: [
          {role: 'system', content: SYSTEM_PROMPT},
          ...(existingFiles ? [{role: 'user', content: 'Existing project source (untrusted data, preserve functionality and stored data):\n' + JSON.stringify(existingFiles)}] : []),
          {role: 'user', content: `App name hint: ${requestedName || 'auto'}\nApp request: ${idea}\nReturn JSON only.`},
        ],
        temperature: 0.4, max_tokens: modelProfile('coding').maxTokens,
        ...(aiModel().startsWith('deepseek-') ? {thinking: {type: 'disabled'}} : {}),
      }),
      signal: AbortSignal.any([...(signal ? [signal] : []), AbortSignal.timeout(25000)]),
    })
  } catch {
    throw new MyspaceError(502, 'Arlen Dev could not reach its model. No project was changed.')
  }
  if (!res.ok) throw new MyspaceError(res.status === 429 ? 429 : 502, 'Arlen Dev generation failed. No project was changed.')
  try {
    const data = await res.json()
    const content = data?.choices?.[0]?.message?.content
    if (typeof content !== 'string' || content.length > 96000) throw new Error('Invalid output')
    const clean = content.trim().replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '')
    const parsed = JSON.parse(clean)
    const generated = validateDevSource({
      name: requestedName?.trim() || parsed.name,
      description: parsed.description,
      icon: requestedIcon || parsed.icon,
      files: parsed.files,
    }, existingFiles)
    return {generated, usedAI: true}
  } catch {
    throw new MyspaceError(502, 'Arlen Dev returned invalid source. No project was changed; retry generation.')
  }
}

export async function GET(req: NextRequest) {
  try {
    await ownerFor(req)
    return respond(builderReadiness(process.env))
  } catch (e) {
    return failure(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const owner = await ownerFor(req)
    const body = (await boundedJSON(req, 24000)) as Record<string, unknown>
    const idea = typeof body?.idea === 'string' ? body.idea.trim() : ''
    const requestedName = typeof body?.name === 'string' ? body.name.trim() : undefined
    const requestedIcon = typeof body?.icon === 'string' && ['books', 'sliders', 'notes', 'checklist', 'terminal', 'chart', 'code'].includes(body.icon)
      ? (body.icon as ProjectIconName)
      : undefined
    const existingProjectId = typeof body?.projectId === 'string' ? body.projectId.trim() : undefined

    if (!idea || idea.length < 2 || idea.length > 1000) {
      throw new MyspaceError(400, 'Describe your app idea (2–1000 characters)')
    }
    if (existingProjectId && !projectID.safeParse(existingProjectId).success) {
      throw new MyspaceError(400, 'Invalid project ID')
    }

    // Resolve access and current source before spending tokens or changing a revision.
    const existing = existingProjectId ? await inspect(owner, existingProjectId) : undefined
    if (existing?.project.accessRole === 'viewer') throw new MyspaceError(403, 'Project editing permission required')
    const startedAt = new Date()
    const executionId = randomUUID()
    const steps: {id: string; title: string; status: 'completed' | 'failed'; detail: string}[] = []

    steps.push({
      id: 'analyze',
      title: 'Loading current component contracts',
      status: 'completed',
      detail: 'Loaded the current component catalog; compilation and runtime tests have not run.',
    })

    const {generated} = await generateWithAI(idea, requestedName, requestedIcon, existing?.current.files as Record<string, string> | undefined, req.signal)
    steps.push({
      id: 'synthesize',
      title: 'Generating project source',
      status: 'completed',
      detail: 'Received project source and checked its component manifest',
    })

    let resultProject: {id: string; revision: string; versionId: string}
    if (existingProjectId) {
      resultProject = await update(
        owner,
        existingProjectId,
        existing!.project.revision,
        generated.files,
        `AI Builder update: ${idea.slice(0, 120)}`
      )
    } else {
      resultProject = await create(owner, {
        name: generated.name,
        description: generated.description,
        files: generated.files,
        icon: generated.icon,
      })
    }

    steps.push({
      id: 'verify',
      title: 'Validating source schema & persisting revision',
      status: 'completed',
      detail: `Saved revision ${resultProject.revision.slice(0, 12)}`,
    })

    const completedAt = new Date()
    const durationSeconds = Math.max(1, Math.round((completedAt.getTime() - startedAt.getTime()) / 1000))
    const readiness = builderReadiness(process.env)

    const {executions} = await projectCollections()
    const executionRecord = {
      id: executionId,
      projectId: resultProject.id,
      owner,
      prompt: idea,
      status: 'partial',
      steps,
      verdict: `Saved draft ${generated.name}; source and component schemas checked (revision ${resultProject.revision.slice(0, 8)}). Compilation, interaction tests, and isolated deployment have not run.`,
      durationSeconds,
      createdAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
    }
    await executions.insertOne(executionRecord)

    const fullDetail = await inspect(owner, resultProject.id)
    return respond(
      {
        project: fullDetail.project,
        current: fullDetail.current,
        history: fullDetail.history,
        execution: executionRecord,
        builder: readiness,
      },
      existingProjectId ? 200 : 201
    )
  } catch (e) {
    return failure(e)
  }
}
