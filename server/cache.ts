import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PhraseResponseSchema } from '@shared/schemas'
import type { PhraseResponse } from '@shared/types'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DOCS_DIR = join(__dirname, '..', 'docs')
const CACHE_PATH = join(DOCS_DIR, 'capture-cache.json')
const SESSION_PATH = join(DOCS_DIR, 'capture-session.json')

export interface CaptureSessionEntry {
  phrase_hash: string
  key_pressed: string | null
  timestamp_iso: string
}

export interface PhraseCache {
  get(hash: string): PhraseResponse | null
  set(hash: string, response: PhraseResponse): Promise<void>
  has(hash: string): boolean
  size(): number
  appendSession(entry: CaptureSessionEntry): Promise<void>
  readSessionLog(): Promise<CaptureSessionEntry[] | null>
  load(): Promise<void>
}

export function createPhraseCache(): PhraseCache {
  const cache = new Map<string, PhraseResponse>()
  let loaded = false
  let pendingWrite: Promise<void> = Promise.resolve()

  const load = async () => {
    if (loaded) return
    loaded = true
    try {
      const raw = await readFile(CACHE_PATH, 'utf8')
      const parsed = JSON.parse(raw) as Record<string, unknown>
      for (const [hash, value] of Object.entries(parsed)) {
        const result = PhraseResponseSchema.safeParse(value)
        if (result.success) cache.set(hash, result.data)
      }
      console.error(`[cache] loaded ${cache.size} entries from ${CACHE_PATH}`)
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error(`[cache] failed to load ${CACHE_PATH}:`, err)
      }
    }
  }

  const persist = async () => {
    await mkdir(DOCS_DIR, { recursive: true })
    const snapshot: Record<string, PhraseResponse> = {}
    for (const [hash, value] of cache) snapshot[hash] = value
    await writeFile(CACHE_PATH, JSON.stringify(snapshot, null, 2), 'utf8')
  }

  return {
    get(hash) {
      return cache.get(hash) ?? null
    },
    has(hash) {
      return cache.has(hash)
    },
    size() {
      return cache.size
    },
    async set(hash, response) {
      cache.set(hash, response)
      pendingWrite = pendingWrite.then(persist).catch((err) => {
        console.error('[cache] write failed:', err)
      })
      await pendingWrite
    },
    async appendSession(entry) {
      await mkdir(DOCS_DIR, { recursive: true })
      let existing: CaptureSessionEntry[] = []
      try {
        const raw = await readFile(SESSION_PATH, 'utf8')
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) existing = parsed as CaptureSessionEntry[]
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
      }
      existing.push(entry)
      await writeFile(SESSION_PATH, JSON.stringify(existing, null, 2), 'utf8')
    },
    async readSessionLog() {
      try {
        const raw = await readFile(SESSION_PATH, 'utf8')
        const parsed = JSON.parse(raw)
        return Array.isArray(parsed) ? (parsed as CaptureSessionEntry[]) : null
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null
        throw err
      }
    },
    load,
  }
}
