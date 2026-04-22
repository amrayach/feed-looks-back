import type { State } from '@shared/types'

export type StateEvent =
  | { type: 'phrase_boundary' }
  | { type: 'response_valid_short' }
  | { type: 'response_valid_full' }
  | { type: 'smoothing_complete' }
  | { type: 'failure'; reason: string }

// Spec cycle: IDLE (quiet) -> LISTENING (awaiting response) -> MUTATING (HUD
// applied) -> TRANSITIONING (scene lerping) -> IDLE. Every non-degraded state
// has exactly one forward edge. Every state (including IDLE and DEGRADED) has
// a failure edge; DEGRADED self-loops on failure rather than silently dropping.
// Recovery: DEGRADED + response_valid_short -> LISTENING (earliest moment we
// know a fresh response has come back intact).
const TRANSITIONS: Record<State, Partial<Record<StateEvent['type'], State>>> = {
  IDLE: {
    phrase_boundary: 'LISTENING',
    failure: 'DEGRADED',
  },
  LISTENING: {
    response_valid_short: 'MUTATING',
    failure: 'DEGRADED',
  },
  MUTATING: {
    response_valid_full: 'TRANSITIONING',
    failure: 'DEGRADED',
  },
  TRANSITIONING: {
    smoothing_complete: 'IDLE',
    failure: 'DEGRADED',
  },
  DEGRADED: {
    response_valid_short: 'LISTENING',
    failure: 'DEGRADED',
  },
}

export function nextState(current: State, event: StateEvent): State | null {
  const target = TRANSITIONS[current][event.type]
  return target ?? null
}

export interface StateObserver {
  (to: State, from: State, event: StateEvent): void
}

export class StateMachine {
  private _state: State = 'IDLE'
  private observers = new Set<StateObserver>()
  private _lastFailure: string | null = null

  get state(): State {
    return this._state
  }

  get lastFailure(): string | null {
    return this._lastFailure
  }

  dispatch(event: StateEvent): State {
    const target = nextState(this._state, event)
    if (target === null) return this._state
    const from = this._state
    if (event.type === 'failure') this._lastFailure = event.reason
    if (target === 'LISTENING' && from === 'DEGRADED') this._lastFailure = null
    if (target === from) {
      // DEGRADED + failure self-loop. Notify observers so failure-count logic
      // and HUD messages can refresh, but don't change state.
      for (const obs of this.observers) obs(target, from, event)
      return this._state
    }
    this._state = target
    for (const obs of this.observers) obs(target, from, event)
    return this._state
  }

  subscribe(observer: StateObserver): () => void {
    this.observers.add(observer)
    return () => {
      this.observers.delete(observer)
    }
  }
}
