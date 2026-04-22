import type { PhraseResponse } from '@shared/types'
import type { StateMachine } from '@/state/machine'

export interface FallbackSnapshot {
  lastValid: PhraseResponse | null
  failureCount: number
  lastError: string | null
}

// Central failure handler. On error: dispatch machine into DEGRADED,
// preserve last valid response for the HUD to keep animating.
// On next success: clear error + return machine to LISTENING via
// the response_valid_short event (the machine's DEGRADED -> LISTENING transition).
export class FallbackController {
  private readonly machine: StateMachine
  private last: PhraseResponse | null = null
  private failures = 0
  private lastError: string | null = null

  constructor(machine: StateMachine) {
    this.machine = machine
  }

  handleSuccess(response: PhraseResponse): FallbackSnapshot {
    this.last = response
    const wasDegraded = this.machine.state === 'DEGRADED'
    this.failures = 0
    this.lastError = null
    if (wasDegraded) {
      this.machine.dispatch({ type: 'response_valid_short' })
    }
    return this.snapshot()
  }

  handleFailure(err: unknown): FallbackSnapshot {
    this.failures += 1
    this.lastError = err instanceof Error ? err.message : String(err)
    this.machine.dispatch({ type: 'failure', reason: this.lastError })
    return this.snapshot()
  }

  snapshot(): FallbackSnapshot {
    return {
      lastValid: this.last,
      failureCount: this.failures,
      lastError: this.lastError,
    }
  }
}
