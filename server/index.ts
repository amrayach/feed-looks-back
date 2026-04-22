import express, { type NextFunction, type Request, type Response } from 'express'
import 'dotenv/config'
import { PhraseInputSchema, RuntimeModeEnum } from '@shared/schemas'
import type { PhraseInput, PhraseResponse, RuntimeMode } from '@shared/types'
import { callOpus, composePhraseResponse } from './anthropic-adapter'
import { createPhraseCache } from './cache'

const PORT = Number.parseInt(process.env.PORT ?? '8787', 10)
const RAW_RUNTIME_MODE = process.env.RUNTIME_MODE ?? 'live'
const runtimeModeParsed = RuntimeModeEnum.safeParse(RAW_RUNTIME_MODE)
if (!runtimeModeParsed.success) {
  console.error(`[server] invalid RUNTIME_MODE=${RAW_RUNTIME_MODE}`)
  process.exit(1)
}
const RUNTIME_MODE: RuntimeMode = runtimeModeParsed.data
const USE_REAL_API = process.env.USE_REAL_API === 'true'

async function main() {
  const app = express()
  app.use(express.json({ limit: '256kb' }))

  const cache = createPhraseCache()
  await cache.load()

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      runtime_mode: RUNTIME_MODE,
      use_real_api: USE_REAL_API,
      cache_size: cache.size(),
    })
  })

  app.get('/api/capture-session', async (_req, res, next) => {
    try {
      const log = await cache.readSessionLog()
      if (log === null) {
        res.status(404).json({ error: 'no_session_log' })
        return
      }
      res.json(log)
    } catch (err) {
      next(err)
    }
  })

  app.post('/api/phrase', async (req, res, next) => {
    const startedAt = Date.now()
    const inputResult = PhraseInputSchema.safeParse(req.body)
    if (!inputResult.success) {
      res.status(400).json({
        error: 'invalid_phrase_input',
        issues: inputResult.error.issues,
      })
      return
    }
    const input: PhraseInput = inputResult.data

    try {
      const cached = cache.get(input.phrase_hash)
      if (cached) {
        const response: PhraseResponse = {
          ...cached,
          meta: {
            ...cached.meta,
            runtime_mode: RUNTIME_MODE,
            source: 'cache',
            cached: true,
            latency_ms: 0,
            timestamp_iso: new Date().toISOString(),
          },
        }
        logPhrase(input, response, startedAt, 'cache_hit')
        res.json(response)
        return
      }

      if (RUNTIME_MODE === 'capture') {
        res.status(404).json({
          error: 'cache_miss',
          detail: 'capture mode serves from cache only; outbound API calls forbidden',
          phrase_hash: input.phrase_hash,
        })
        logPhrase(input, null, startedAt, 'capture_miss')
        return
      }

      const adapterStart = Date.now()
      const result = await callOpus(input)
      const adapterEnd = Date.now()
      const response = composePhraseResponse(input, result, false, RUNTIME_MODE)
      await cache.set(input.phrase_hash, response)
      if (RUNTIME_MODE === 'live') {
        await cache.appendSession({
          phrase_hash: input.phrase_hash,
          key_pressed: input.key_pressed,
          timestamp_iso: new Date().toISOString(),
        })
      }
      logPhrase(input, response, startedAt, `served ${result.source} ${adapterEnd - adapterStart}ms`)
      res.json(response)
    } catch (err) {
      next(err)
    }
  })

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[server] error:', err)
    res.status(500).json({
      error: 'phrase_adapter_failure',
      detail: err instanceof Error ? err.message : String(err),
    })
  })

  app.listen(PORT, () => {
    console.error(
      `[server] listening on http://localhost:${PORT} (mode=${RUNTIME_MODE}, real_api=${USE_REAL_API})`,
    )
  })
}

function logPhrase(
  input: PhraseInput,
  response: PhraseResponse | null,
  startedAt: number,
  tag: string,
) {
  const total = Date.now() - startedAt
  const shader = response?.full_reinterpretation.ui_patch.shader_variant ?? '-'
  const label = response?.full_reinterpretation.ui_patch.label_style ?? '-'
  console.error(
    `[phrase] idx=${input.phrase_index} maqam=${input.maqam_estimator.primary} ` +
      `hash=${input.phrase_hash.slice(0, 10)} shader=${shader} label=${label} ` +
      `total=${total}ms (${tag})`,
  )
}

main().catch((err) => {
  console.error('[server] fatal:', err)
  process.exit(1)
})
