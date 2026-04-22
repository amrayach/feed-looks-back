import { z } from 'zod'

// ---------- Enums ----------

export const MaqamEnum = z.enum(['rast', 'bayati', 'hijaz', 'saba', 'ajam'])

export const ShaderVariantEnum = z.enum([
  'rast_stage0',
  'rast_stage1',
  'rast_stage2',
  'bayati_stage0',
  'bayati_stage1',
  'bayati_stage2',
  'hijaz_stage0',
  'hijaz_stage1',
  'hijaz_stage2',
  'saba_stage0',
  'saba_stage1',
  'saba_stage2',
  'ajam_stage0',
  'ajam_stage1',
  'ajam_stage2',
])

export const LabelStyleEnum = z.enum([
  'editorial_luxury',
  'wellness_soft',
  'reward_burst',
  'brand_assurance',
  'relatable_warm',
])

export const TransitionIntentEnum = z.enum(['hold', 'soft_drift', 'regime_shift'])

export const StateEnum = z.enum(['IDLE', 'LISTENING', 'MUTATING', 'TRANSITIONING', 'DEGRADED'])

export const RuntimeModeEnum = z.enum(['live', 'capture', 'degraded_recovery'])

export const ResponseSourceEnum = z.enum(['mock', 'cache', 'anthropic'])

// ---------- PhraseInput (server <- client per phrase) ----------

export const AudioFeaturesSchema = z.object({
  rms: z.number(),
  spectral_centroid: z.number(),
  spectral_flux: z.number(),
  onset_density: z.number(),
  duration_sec: z.number().nonnegative(),
  peak_pitch_hz: z.number().nullable(),
  pitch_stability: z.number().min(0).max(1),
})

export const MaqamEstimatorSchema = z.object({
  primary: MaqamEnum,
  confidence: z.number().min(0).max(1),
  secondary: MaqamEnum.nullable(),
})

export const SceneDigestSchema = z.object({
  current_shader: ShaderVariantEnum,
  last_label_style: LabelStyleEnum.nullable(),
  label_visible: z.boolean(),
  active_since_sec: z.number().nonnegative(),
})

// escalation_level is bounded 0..1 and is expected to be monotonically
// non-decreasing across a single session; the state machine enforces the
// monotonic invariant, not this schema.
export const SessionMemorySchema = z.object({
  phrase_count: z.number().int().nonnegative(),
  maqam_history: z.array(z.string()).max(5),
  platform_translations: z.array(z.string()).max(5),
  wrongness_strategies: z.array(z.string()).max(5),
  escalation_level: z.number().min(0).max(1),
})

export const LastValidOutputDigestSchema = z.object({
  shader_variant: ShaderVariantEnum.nullable(),
  label_style: LabelStyleEnum.nullable(),
  copy_fragment: z.string().nullable(),
})

export const PhraseInputSchema = z.object({
  runtime_mode: RuntimeModeEnum,
  phrase_index: z.number().int().nonnegative(),
  elapsed_sec: z.number().nonnegative(),
  state: StateEnum,
  audio_features: AudioFeaturesSchema,
  maqam_estimator: MaqamEstimatorSchema,
  scene_digest: SceneDigestSchema,
  session_memory: SessionMemorySchema,
  last_valid_output_digest: LastValidOutputDigestSchema,
  phrase_hash: z.string().min(1),
  key_pressed: z.string().nullable(),
})

// ---------- Model outputs ----------

export const ShortSemanticOutputSchema = z.object({
  maqam_hypothesis: MaqamEnum,
  confidence: z.number().min(0).max(1),
  platform_translation: z.string().min(1).max(280),
  wrongness_strategy: z.string().min(1).max(280),
  copy_fragment: z.string().min(1).max(400),
})

export const FullReinterpretationOutputSchema = z.object({
  cultural_reading: z.string().min(1).max(600),
  uniform_patch: z.record(z.string(), z.number()),
  ui_patch: z.object({
    shader_variant: ShaderVariantEnum,
    label_style: LabelStyleEnum,
  }),
  transition_intent: TransitionIntentEnum,
})

// ---------- Response envelope ----------

export const PhraseResponseMetaSchema = z.object({
  phrase_hash: z.string().min(1),
  runtime_mode: RuntimeModeEnum,
  source: ResponseSourceEnum,
  latency_ms: z.number().nonnegative(),
  cached: z.boolean(),
  timestamp_iso: z.string(),
})

export const PhraseResponseSchema = z.object({
  short_semantic: ShortSemanticOutputSchema,
  full_reinterpretation: FullReinterpretationOutputSchema,
  meta: PhraseResponseMetaSchema,
})
