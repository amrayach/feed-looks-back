import { SessionMemorySchema } from '@shared/schemas'
import type { Maqam, SessionMemory } from '@shared/types'

const MAX_HISTORY = 5

export function emptySessionMemory(): SessionMemory {
  return SessionMemorySchema.parse({
    phrase_count: 0,
    maqam_history: [],
    platform_translations: [],
    wrongness_strategies: [],
    escalation_level: 0,
  })
}

export interface PhraseRecord {
  maqam: Maqam
  platform_translation: string
  wrongness_strategy: string
  escalation_target?: number
}

export function recordPhrase(prev: SessionMemory, entry: PhraseRecord): SessionMemory {
  const clampedTarget =
    entry.escalation_target === undefined
      ? prev.escalation_level
      : Math.min(1, Math.max(0, entry.escalation_target))
  const next = {
    phrase_count: prev.phrase_count + 1,
    maqam_history: truncate([...prev.maqam_history, entry.maqam]),
    platform_translations: truncate([...prev.platform_translations, entry.platform_translation]),
    wrongness_strategies: truncate([...prev.wrongness_strategies, entry.wrongness_strategy]),
    escalation_level: Math.max(prev.escalation_level, clampedTarget),
  }
  return SessionMemorySchema.parse(next)
}

function truncate<T>(arr: T[]): T[] {
  return arr.length <= MAX_HISTORY ? arr : arr.slice(arr.length - MAX_HISTORY)
}
