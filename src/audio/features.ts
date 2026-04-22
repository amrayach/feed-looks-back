import type { AudioFeatures } from '@shared/types'

// Day 1 stub. Day 2 will compute:
//   rms = sqrt(mean(frame^2))
//   spectral_centroid = sum(bin * mag) / sum(mag) over FFT bins
//   spectral_flux = sum(max(0, mag_t - mag_{t-1}))
//   onset_density = peaks/second from flux envelope
//   duration_sec = frames.length * hopSize / sampleRate
//   peak_pitch_hz via pitchy (YIN); null if unvoiced (clarity < 0.9)
//   pitch_stability = 1 - (std(pitch_frames) / mean(pitch_frames)), clamped 0..1
//
// Inputs in Day 2 will be an array of Float32Array frames at sampleRate.
// This stub returns zeros so the rest of the pipeline can run end-to-end
// against the keyboard mock in src/audio/keyboard-mock.ts.

export interface RawFrameWindow {
  frames: Float32Array[]
  sampleRate: number
}

export function extractFeatures(_window: RawFrameWindow): AudioFeatures {
  // TODO (Day 2): implement real extraction.
  return {
    rms: 0,
    spectral_centroid: 0,
    spectral_flux: 0,
    onset_density: 0,
    duration_sec: 0,
    peak_pitch_hz: null,
    pitch_stability: 0,
  }
}
