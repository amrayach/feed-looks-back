import type { AudioFeatures } from '@shared/types'

// Day 1 stub. Day 2 will wire:
//   navigator.mediaDevices.getUserMedia({ audio: true }) -> AudioContext ->
//   AnalyserNode (FFT size 2048, smoothingTimeConstant 0.3) + a MediaStreamAudioSourceNode.
//   Sample float time-domain buffers once per animation frame; pass to src/audio/features.ts.
//
// The interface below is the contract the rest of the pipeline expects.
// Do not change its shape without also updating src/audio/phrase.ts and
// src/modes/performance.ts.

export interface Analyser {
  start(): Promise<void>
  stop(): void
  sample(): AudioFeatures
  isRunning(): boolean
}

export function createAnalyser(): Analyser {
  let running = false
  return {
    async start() {
      // TODO (Day 2): request mic, construct AudioContext + AnalyserNode.
      running = true
    },
    stop() {
      running = false
    },
    sample() {
      // TODO (Day 2): read live buffer + run feature extraction.
      return ZERO_FEATURES
    },
    isRunning() {
      return running
    },
  }
}

const ZERO_FEATURES: AudioFeatures = Object.freeze({
  rms: 0,
  spectral_centroid: 0,
  spectral_flux: 0,
  onset_density: 0,
  duration_sec: 0,
  peak_pitch_hz: null,
  pitch_stability: 0,
})
