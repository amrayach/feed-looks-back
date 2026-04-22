import { z } from 'zod'
import { RuntimeModeEnum } from '@shared/schemas'
import type { RuntimeMode } from '@shared/types'

const ClientConfigSchema = z.object({
  runtime_mode: RuntimeModeEnum,
  api_base: z.string().min(1),
  smoothing_ms: z.number().int().positive(),
})

export type ClientConfig = z.infer<typeof ClientConfigSchema>

function readQueryMode(): RuntimeMode | null {
  if (typeof window === 'undefined') return null
  const raw = new URLSearchParams(window.location.search).get('mode')
  if (!raw) return null
  const parsed = RuntimeModeEnum.safeParse(raw)
  return parsed.success ? parsed.data : null
}

function readEnvMode(): RuntimeMode | null {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
  const raw = env?.VITE_RUNTIME_MODE
  if (!raw) return null
  const parsed = RuntimeModeEnum.safeParse(raw)
  return parsed.success ? parsed.data : null
}

export const CLIENT_CONFIG: ClientConfig = ClientConfigSchema.parse({
  runtime_mode: readQueryMode() ?? readEnvMode() ?? 'live',
  api_base: '/api',
  smoothing_ms: 400,
})
