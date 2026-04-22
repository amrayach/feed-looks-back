import { PhraseInputSchema } from '@shared/schemas'
import type {
  AudioFeatures,
  LastValidOutputDigest,
  MaqamEstimator,
  PhraseInput,
  RuntimeMode,
  SceneDigest,
  SessionMemory,
  State,
} from '@shared/types'

// Pure, deterministic. No Date.now(), no random, no I/O.
// phrase_hash = sha256(stableFields) — identical content -> identical hash,
// which is what makes capture-mode replay work.
// `elapsed_sec`, `state`, and `key_pressed` are intentionally excluded from the hash:
//   - elapsed_sec is frame-noisy (changes whenever buildContext runs)
//   - state is a transient machine field, orthogonal to phrase content
//   - key_pressed is an input-device detail; replay should hash the phrase content,
//     not the physical trigger key that produced it
// Session memory IS included because it's a pure function of phrase history,
// so deterministic under replay.

export interface BuildContextArgs {
  runtime_mode: RuntimeMode
  phrase_index: number
  elapsed_sec: number
  state: State
  audio_features: AudioFeatures
  maqam_estimator: MaqamEstimator
  scene_digest: SceneDigest
  session_memory: SessionMemory
  last_valid_output_digest: LastValidOutputDigest
  key_pressed: string | null
}

type StableFields = Omit<BuildContextArgs, 'elapsed_sec' | 'state' | 'key_pressed'>

export async function buildContext(args: BuildContextArgs): Promise<PhraseInput> {
  const stable: StableFields = {
    runtime_mode: args.runtime_mode,
    phrase_index: args.phrase_index,
    audio_features: args.audio_features,
    maqam_estimator: args.maqam_estimator,
    scene_digest: args.scene_digest,
    session_memory: args.session_memory,
    last_valid_output_digest: args.last_valid_output_digest,
  }
  const phrase_hash = await sha256Hex(stableJsonStringify(stable))
  return PhraseInputSchema.parse({
    runtime_mode: args.runtime_mode,
    phrase_index: args.phrase_index,
    elapsed_sec: args.elapsed_sec,
    state: args.state,
    audio_features: args.audio_features,
    maqam_estimator: args.maqam_estimator,
    scene_digest: args.scene_digest,
    session_memory: args.session_memory,
    last_valid_output_digest: args.last_valid_output_digest,
    key_pressed: args.key_pressed,
    phrase_hash,
  })
}

export function stableJsonStringify(value: unknown): string {
  if (value === null) return 'null'
  if (typeof value === 'number') return Number.isFinite(value) ? JSON.stringify(value) : 'null'
  if (typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableJsonStringify).join(',')}]`
  const obj = value as Record<string, unknown>
  const keys = Object.keys(obj).sort()
  const parts = keys.map((k) => `${JSON.stringify(k)}:${stableJsonStringify(obj[k])}`)
  return `{${parts.join(',')}}`
}

export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const subtle =
    (globalThis.crypto as Crypto | undefined)?.subtle ??
    (() => {
      throw new Error('Web Crypto unavailable; phrase_hash cannot be computed')
    })()
  const buf = await subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
