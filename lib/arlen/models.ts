import type { ArlenMode, ModelProfile } from './modes.ts'
import { modes } from './modes.ts'

type Env = Record<string, string | undefined>
const value = (env: Env, key: string) => env[key]?.trim() || undefined

/** Configuration only: this does not assert a provider/model is healthy or available. */
export function modelProfile(profile: ModelProfile, env: Env = process.env) {
  const legacy = value(env, 'EVO_AI_MODEL') || (value(env, 'ZRO_API_KEY') ? 'deepseek-v4.1-flash' : 'nvidia/nemotron-3.5-super-vl:free')
  const defaultModel = profile === 'fast'
    ? value(env, 'EVO_AI_FAST_MODEL') || (value(env, 'ZRO_API_KEY') ? 'deepseek-v4-flash-0731' : legacy)
    : legacy
  const key = `ARLEN_MODEL_${profile.toUpperCase()}`
  const primary = value(env, key) || (profile === 'embeddings' ? undefined : defaultModel)
  const fallbacks = (value(env, `${key}_FALLBACKS`) || '').split(',').map(s => s.trim()).filter(Boolean)
  const rawBudget = Number(value(env, `${key}_MAX_TOKENS`))
  const maxTokens = Number.isSafeInteger(rawBudget) && rawBudget >= 128 && rawBudget <= 32000
    ? rawBudget : profile === 'fast' ? 1200 : 2400
  return { profile, primary, candidates: [...new Set([primary, ...fallbacks].filter((s): s is string => !!s))], maxTokens }
}

export function profileFor(mode: ArlenMode, options: { vision?: boolean; complex?: boolean } = {}): ModelProfile {
  if (options.vision) return 'vision'
  if (mode === 'chat' && options.complex) return 'balanced'
  return modes[mode].profile
}

export function coworkModel(env: Env = process.env): string {
  return value(env, 'ARLEN_COWORK_MODEL') || (value(env, 'ZRO_API_KEY') ? 'zro/deepseek-v4-flash-0731' : 'opencode/big-pickle')
}

/** Fail closed for unknown tools. Workspace reads are preauthorized; mutations require approval. */
export function coworkPermissions(planOnly: boolean) {
  const rules: { action: string; resource: string; effect: 'allow' | 'ask' | 'deny' }[] = [
    { action: '*', resource: '*', effect: planOnly ? 'deny' : 'ask' },
  ]
  for (const action of ['read', 'glob', 'grep', 'list']) rules.push({ action, resource: '*', effect: 'allow' })
  return rules
}
