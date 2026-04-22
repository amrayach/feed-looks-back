import type { Analyser } from './analyser'

// Day 1 stub. Day 2 will detect phrase boundaries by:
//   1. Running onset detection on spectral flux envelope
//   2. Tracking silence gaps > PHRASE_GAP_MS (default 600ms)
//   3. Clamping minimum phrase length to PHRASE_MIN_MS (default 800ms)
//   4. Emitting `onBoundary()` when a gap follows sustained onset activity
//
// For Day 1 the keyboard mock (src/audio/keyboard-mock.ts) replaces this
// entirely, so this stub stays inert until real audio lands on Day 2.

export interface PhraseDetectorDeps {
  analyser: Analyser
  onBoundary: () => void
}

export interface PhraseDetector {
  start(): void
  stop(): void
}

export function createPhraseDetector(_deps: PhraseDetectorDeps): PhraseDetector {
  // TODO (Day 2): implement real phrase detection driving off analyser.sample().
  return {
    start() {},
    stop() {},
  }
}
