import type { z } from 'zod'
import type {
  MaqamEnum,
  ShaderVariantEnum,
  LabelStyleEnum,
  TransitionIntentEnum,
  StateEnum,
  RuntimeModeEnum,
  ResponseSourceEnum,
  AudioFeaturesSchema,
  MaqamEstimatorSchema,
  SceneDigestSchema,
  SessionMemorySchema,
  LastValidOutputDigestSchema,
  PhraseInputSchema,
  ShortSemanticOutputSchema,
  FullReinterpretationOutputSchema,
  PhraseResponseMetaSchema,
  PhraseResponseSchema,
} from './schemas'

export type Maqam = z.infer<typeof MaqamEnum>
export type ShaderVariant = z.infer<typeof ShaderVariantEnum>
export type LabelStyle = z.infer<typeof LabelStyleEnum>
export type TransitionIntent = z.infer<typeof TransitionIntentEnum>
export type State = z.infer<typeof StateEnum>
export type RuntimeMode = z.infer<typeof RuntimeModeEnum>
export type ResponseSource = z.infer<typeof ResponseSourceEnum>

export type AudioFeatures = z.infer<typeof AudioFeaturesSchema>
export type MaqamEstimator = z.infer<typeof MaqamEstimatorSchema>
export type SceneDigest = z.infer<typeof SceneDigestSchema>
export type SessionMemory = z.infer<typeof SessionMemorySchema>
export type LastValidOutputDigest = z.infer<typeof LastValidOutputDigestSchema>
export type PhraseInput = z.infer<typeof PhraseInputSchema>

export type ShortSemanticOutput = z.infer<typeof ShortSemanticOutputSchema>
export type FullReinterpretationOutput = z.infer<typeof FullReinterpretationOutputSchema>
export type PhraseResponseMeta = z.infer<typeof PhraseResponseMetaSchema>
export type PhraseResponse = z.infer<typeof PhraseResponseSchema>
