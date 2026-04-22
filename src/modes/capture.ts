import { CLIENT_CONFIG } from '@/config'
import { start as startPerformance } from '@/modes/performance'

interface CaptureEntry {
  phrase_hash: string
  key_pressed: string | null
  timestamp_iso: string
}

// Capture mode = performance mode + scripted keypress playback.
// Server-side, the runtime_mode=capture refuses outbound API calls and returns
// 404 on cache miss. Client replays the session log in real time, matching the
// original timing between phrases.
export async function start(): Promise<void> {
  await startPerformance()

  try {
    const res = await fetch(`${CLIENT_CONFIG.api_base}/capture-session`)
    if (!res.ok) {
      if (res.status === 404) {
        console.info('[capture] no session log yet; waiting for manual input')
      } else {
        console.warn(`[capture] session fetch failed: ${res.status}`)
      }
      return
    }
    const entries = (await res.json()) as CaptureEntry[]
    if (!Array.isArray(entries) || entries.length === 0) {
      console.info('[capture] empty session log')
      return
    }
    replay(entries)
  } catch (err) {
    console.warn('[capture] session load failed:', err)
  }
}

function replay(entries: CaptureEntry[]): void {
  const keyboardEntries = entries.filter(
    (e): e is CaptureEntry & { key_pressed: string } => typeof e.key_pressed === 'string',
  )
  if (keyboardEntries.length === 0) {
    console.info('[capture] session log has no keyboard events to replay')
    return
  }
  const anchor = Date.parse(keyboardEntries[0].timestamp_iso)
  const target = typeof window !== 'undefined' ? window : globalThis
  for (const entry of keyboardEntries) {
    const delay = Math.max(0, Date.parse(entry.timestamp_iso) - anchor)
    window.setTimeout(() => {
      const evt = new KeyboardEvent('keydown', { key: entry.key_pressed, bubbles: false })
      target.dispatchEvent(evt)
    }, delay)
  }
  console.info(`[capture] replay scheduled for ${keyboardEntries.length} keyboard events`)
}
