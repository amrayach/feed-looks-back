import { MaqamEnum } from '@shared/schemas'
import type { Maqam, PhraseInput } from '@shared/types'

export const PHRASE_BOUNDARY_EVENT = 'phrase:boundary'

export type PhraseBoundaryEvent = CustomEvent<PhraseInput>

const KEY_TO_MAQAM: Record<string, Maqam> = {
  '1': 'rast',
  '2': 'bayati',
  '3': 'hijaz',
  '4': 'saba',
  '5': 'ajam',
}

export interface KeyboardMockDeps {
  bus: EventTarget
  buildPhraseInput: (maqam: Maqam, keyPressed: string) => Promise<PhraseInput>
  target?: EventTarget
}

export interface KeyboardMock {
  start(): void
  stop(): void
  isRunning(): boolean
}

export function createKeyboardMock(deps: KeyboardMockDeps): KeyboardMock {
  const target = deps.target ?? (typeof window !== 'undefined' ? window : undefined)
  if (!target) {
    throw new Error('keyboard-mock requires a browser window or explicit target')
  }
  let running = false

  const handler = (ev: Event) => {
    if (!running) return
    const k = ev as KeyboardEvent
    if (k.defaultPrevented || k.repeat) return
    const mapped = KEY_TO_MAQAM[k.key]
    if (!mapped) return
    const parsed = MaqamEnum.safeParse(mapped)
    if (!parsed.success) return
    void deps
      .buildPhraseInput(parsed.data, k.key)
      .then((input) => {
        deps.bus.dispatchEvent(
          new CustomEvent<PhraseInput>(PHRASE_BOUNDARY_EVENT, { detail: input }),
        )
      })
      .catch((err) => {
        console.error('[keyboard-mock] buildPhraseInput failed', err)
      })
  }

  return {
    start() {
      if (running) return
      running = true
      target.addEventListener('keydown', handler)
    },
    stop() {
      if (!running) return
      running = false
      target.removeEventListener('keydown', handler)
    },
    isRunning() {
      return running
    },
  }
}
