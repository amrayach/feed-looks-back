import { PhraseInputSchema, PhraseResponseSchema } from '@shared/schemas'
import type { PhraseInput, PhraseResponse } from '@shared/types'
import { CLIENT_CONFIG } from '@/config'

export class PhraseApiError extends Error {
  readonly status?: number
  readonly detail?: unknown
  constructor(message: string, status?: number, detail?: unknown) {
    super(message)
    this.name = 'PhraseApiError'
    this.status = status
    this.detail = detail
  }
}

export interface CallOpusOptions {
  signal?: AbortSignal
  timeoutMs?: number
}

export async function callOpus(
  input: PhraseInput,
  options: CallOpusOptions = {},
): Promise<PhraseResponse> {
  const validInput = PhraseInputSchema.parse(input)
  const controller = new AbortController()
  const timeoutMs = options.timeoutMs ?? 3500
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  if (options.signal) {
    if (options.signal.aborted) controller.abort()
    else options.signal.addEventListener('abort', () => controller.abort(), { once: true })
  }

  try {
    const res = await fetch(`${CLIENT_CONFIG.api_base}/phrase`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(validInput),
      signal: controller.signal,
    })
    if (!res.ok) {
      const detail = await safeJson(res)
      throw new PhraseApiError(
        `POST /api/phrase failed: ${res.status} ${res.statusText}`,
        res.status,
        detail,
      )
    }
    const raw = await res.json()
    return PhraseResponseSchema.parse(raw)
  } catch (err) {
    if (err instanceof PhraseApiError) throw err
    if (err instanceof Error && err.name === 'AbortError') {
      throw new PhraseApiError(`phrase request aborted (>${timeoutMs}ms)`)
    }
    throw new PhraseApiError(err instanceof Error ? err.message : String(err))
  } finally {
    clearTimeout(timer)
  }
}

async function safeJson(res: Response): Promise<unknown> {
  try {
    return await res.json()
  } catch {
    return null
  }
}

export async function getHealth(): Promise<{ runtime_mode: string; status: string }> {
  const res = await fetch(`${CLIENT_CONFIG.api_base}/health`)
  if (!res.ok) throw new PhraseApiError(`GET /api/health failed: ${res.status}`, res.status)
  return (await res.json()) as { runtime_mode: string; status: string }
}
