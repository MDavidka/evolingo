import {z} from 'zod'

export const projectIcons = ['books', 'sliders', 'notes', 'checklist', 'terminal', 'chart', 'code'] as const
export type ProjectIconName = typeof projectIcons[number]
export const projectIconSchema = z.enum(projectIcons)

export const sourcePath = z.string().max(120).regex(/^src\/(?:(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.(?:tsx?|css|json)|app\.ui\.json)$/)
export const sources = z.record(sourcePath, z.string().max(32000)).superRefine((files, ctx) => {
  const paths = Object.keys(files)
  if (paths.length === 0 || paths.length > 32) ctx.addIssue({code: 'custom', message: 'Projects require 1–32 files'})
  if (!files['src/App.tsx']) ctx.addIssue({code: 'custom', message: 'src/App.tsx is required'})
  if (new TextEncoder().encode(JSON.stringify(files)).length > 64000) ctx.addIssue({code: 'custom', message: 'Source snapshot exceeds 64 KB'})
})

export const createProject = z.object({
  name: z.string().trim().min(1).max(48),
  description: z.string().trim().max(240),
  files: sources,
  icon: projectIconSchema.optional(),
}).strict()

export const updateProject = z.object({
  revision: z.string().regex(/^[a-f0-9]{64}$/),
  files: sources,
  summary: z.string().max(240),
}).strict()

export const projectMetaAction = z.discriminatedUnion('action', [
  z.object({action: z.literal('rename'), name: z.string().trim().min(1).max(48), description: z.string().trim().max(240).optional()}).strict(),
  z.object({action: z.literal('icon'), icon: projectIconSchema}).strict(),
  z.object({action: z.literal('pin'), pinned: z.boolean()}).strict(),
  z.object({action: z.literal('share'), targetOwner: z.string().regex(/^[a-f0-9]{8,64}$/), role: z.enum(['viewer', 'editor']).default('viewer')}).strict(),
  z.object({action: z.literal('unshare'), targetOwner: z.string().regex(/^[a-f0-9]{8,64}$/)}).strict(),
  z.object({action: z.literal('duplicate'), name: z.string().trim().min(1).max(48).optional()}).strict(),
  z.object({action: z.literal('launch')}).strict(),
])

export const projectID = z.string().uuid()
export type ProjectInput = z.infer<typeof createProject>
export type ProjectMetaAction = z.infer<typeof projectMetaAction>
