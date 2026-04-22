import Anthropic from '@anthropic-ai/sdk'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { jsonrepair } from 'jsonrepair'
import {
  LabelStyleEnum,
  MaqamEnum,
  FullReinterpretationOutputSchema,
  PhraseResponseSchema,
  ShaderVariantEnum,
  ShortSemanticOutputSchema,
  TransitionIntentEnum,
} from '@shared/schemas'
import type {
  FullReinterpretationOutput,
  Maqam,
  PhraseInput,
  PhraseResponse,
  ShortSemanticOutput,
} from '@shared/types'

// Authoritative adapter for Claude Opus 4.7.
//
// Two paths — both return PhraseResponse, both are transparent to callers:
//   1. Mock (default): canned per-maqam responses. Zero network calls. Day 1.
//   2. Real (gated USE_REAL_API=true): prompt-cached system prefix +
//      structured output via forced tool_use. Opus 4.7 adaptive thinking,
//      medium effort to stay under the 2s latency budget.
//
// The real path is fully written but NOT executed Day 1. Locked decision #6.
// Prompt caching placement and the tool-use forcing pattern match the
// claude-api skill guidance for Opus 4.7 (no prefills, no sampling params,
// cache_control on the final static system block).

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROMPTS_DIR = join(__dirname, '..', 'prompts')

const MODEL_ID = 'claude-opus-4-7'
const MAX_OUTPUT_TOKENS = 4096

function enumOptions(values: { options: readonly string[] }): string[] {
  return [...values.options]
}

export interface AdapterResult {
  short_semantic: ShortSemanticOutput
  full_reinterpretation: FullReinterpretationOutput
  source: 'mock' | 'anthropic'
  latency_ms: number
}

export interface CallOpusDeps {
  useRealApi: boolean
  apiKey?: string
  now?: () => number
}

export function createAnthropicAdapter(deps: CallOpusDeps) {
  const now = deps.now ?? (() => performance.now())
  let lazyClient: Anthropic | null = null
  let lazySystemBlocks: Promise<SystemTextBlock[]> | null = null

  const getClient = (): Anthropic => {
    if (lazyClient) return lazyClient
    if (!deps.apiKey) throw new Error('ANTHROPIC_API_KEY missing (required when USE_REAL_API=true)')
    lazyClient = new Anthropic({ apiKey: deps.apiKey })
    return lazyClient
  }

  const getSystemBlocks = (): Promise<SystemTextBlock[]> => {
    if (!lazySystemBlocks) lazySystemBlocks = loadSystemBlocks()
    return lazySystemBlocks
  }

  const callOpus = async (input: PhraseInput): Promise<AdapterResult> => {
    const start = now()
    if (!deps.useRealApi) {
      const mocked = buildMockResponse(input)
      return {
        short_semantic: mocked.short_semantic,
        full_reinterpretation: mocked.full_reinterpretation,
        source: 'mock',
        latency_ms: Math.max(0, Math.round(now() - start)),
      }
    }
    const system = await getSystemBlocks()
    const raw = await callRealApi(getClient(), system, input)
    const short_semantic = ShortSemanticOutputSchema.parse(raw.short_semantic)
    const full_reinterpretation = FullReinterpretationOutputSchema.parse(raw.full_reinterpretation)
    return {
      short_semantic,
      full_reinterpretation,
      source: 'anthropic',
      latency_ms: Math.max(0, Math.round(now() - start)),
    }
  }

  return { callOpus }
}

// Top-level convenience: reads env once, exposes a singleton.
let singleton: ReturnType<typeof createAnthropicAdapter> | null = null
export function defaultAdapter() {
  if (!singleton) {
    singleton = createAnthropicAdapter({
      useRealApi: process.env.USE_REAL_API === 'true',
      apiKey: process.env.ANTHROPIC_API_KEY,
    })
  }
  return singleton
}

export async function callOpus(input: PhraseInput): Promise<AdapterResult> {
  return defaultAdapter().callOpus(input)
}

// Rebuilds a full PhraseResponse from an adapter result + meta.
// Server-owned: the adapter doesn't know phrase_hash/cached; the HTTP layer does.
export function composePhraseResponse(
  input: PhraseInput,
  result: AdapterResult,
  cached: boolean,
  runtime_mode: PhraseInput['runtime_mode'],
): PhraseResponse {
  return PhraseResponseSchema.parse({
    short_semantic: result.short_semantic,
    full_reinterpretation: result.full_reinterpretation,
    meta: {
      phrase_hash: input.phrase_hash,
      runtime_mode,
      source: result.source,
      latency_ms: result.latency_ms,
      cached,
      timestamp_iso: new Date().toISOString(),
    },
  })
}

// ---------- Real path: SDK call ----------

interface SystemTextBlock {
  type: 'text'
  text: string
  cache_control?: { type: 'ephemeral' }
}

async function loadSystemBlocks(): Promise<SystemTextBlock[]> {
  const [system, vocab, examples, wrongness] = await Promise.all([
    readFile(join(PROMPTS_DIR, 'system.md'), 'utf8'),
    readFile(join(PROMPTS_DIR, 'mutation-vocabulary.md'), 'utf8'),
    readFile(join(PROMPTS_DIR, 'examples.md'), 'utf8'),
    readFile(join(PROMPTS_DIR, 'wrongness-strategies.md'), 'utf8'),
  ])
  return [
    { type: 'text', text: system },
    { type: 'text', text: vocab },
    { type: 'text', text: examples },
    // Final static block carries cache_control per prompt-caching best practice.
    // All stable prefix above it will be cached on first call; per-phrase input
    // rides in `messages` and is never cached (deliberately uncached hot path).
    { type: 'text', text: wrongness, cache_control: { type: 'ephemeral' } },
  ]
}

const PHRASE_RESPONSE_TOOL = {
  name: 'emit_phrase_response',
  description:
    'Emit the per-phrase response as a single structured object. Must populate short_semantic and full_reinterpretation in full. The host will zod-validate and reject any response missing fields, violating enums, or out of length bounds.',
  input_schema: {
    type: 'object' as const,
    additionalProperties: false,
    properties: {
      short_semantic: {
        type: 'object',
        additionalProperties: false,
        properties: {
          maqam_hypothesis: { type: 'string', enum: enumOptions(MaqamEnum) },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          platform_translation: { type: 'string', minLength: 1, maxLength: 280 },
          wrongness_strategy: { type: 'string', minLength: 1, maxLength: 280 },
          copy_fragment: { type: 'string', minLength: 1, maxLength: 400 },
        },
        required: [
          'maqam_hypothesis',
          'confidence',
          'platform_translation',
          'wrongness_strategy',
          'copy_fragment',
        ],
      },
      full_reinterpretation: {
        type: 'object',
        additionalProperties: false,
        properties: {
          cultural_reading: { type: 'string', minLength: 1, maxLength: 600 },
          uniform_patch: {
            type: 'object',
            description:
              'Map of shader uniform names (e.g. u_distortion, u_escalation, u_noise_amp) to numeric targets. Unknown keys are silently ignored by the renderer; failing-open is intentional.',
            additionalProperties: { type: 'number' },
          },
          ui_patch: {
            type: 'object',
            additionalProperties: false,
            properties: {
              shader_variant: {
                type: 'string',
                enum: enumOptions(ShaderVariantEnum),
              },
              label_style: {
                type: 'string',
                enum: enumOptions(LabelStyleEnum),
              },
            },
            required: ['shader_variant', 'label_style'],
          },
          transition_intent: {
            type: 'string',
            enum: enumOptions(TransitionIntentEnum),
          },
        },
        required: ['cultural_reading', 'uniform_patch', 'ui_patch', 'transition_intent'],
      },
    },
    required: ['short_semantic', 'full_reinterpretation'],
  },
}

// Local type augmentation for SDK fields that may not be typed in 0.32.1.
// Opus 4.7 supports `thinking: adaptive` + `output_config.effort`; SDK runtime
// accepts both. Once we bump the SDK we can drop this.
type OpenMessageCreateParams = Anthropic.MessageCreateParamsNonStreaming & {
  thinking?: { type: 'adaptive' } | { type: 'disabled' }
  output_config?: { effort?: 'low' | 'medium' | 'high' | 'xhigh' | 'max' }
}

async function callRealApi(
  client: Anthropic,
  system: SystemTextBlock[],
  input: PhraseInput,
): Promise<{ short_semantic: unknown; full_reinterpretation: unknown }> {
  const userTurn = `PHRASE_INPUT:\n${JSON.stringify(input, null, 2)}\n\nCall emit_phrase_response with the mutation for this phrase. Pick exactly one shader_variant from the enum and one label_style from the enum. Populate uniform_patch with 3–6 numeric scalar targets. Keep copy within bounds. The wrongness_strategy must be intentional — this is the piece.`

  const params: OpenMessageCreateParams = {
    model: MODEL_ID,
    max_tokens: MAX_OUTPUT_TOKENS,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'medium' },
    system: system as unknown as Anthropic.TextBlockParam[],
    tools: [PHRASE_RESPONSE_TOOL as unknown as Anthropic.Tool],
    tool_choice: { type: 'tool', name: 'emit_phrase_response' },
    messages: [{ role: 'user', content: userTurn }],
  }

  const response = await client.messages.create(
    params as Anthropic.MessageCreateParamsNonStreaming,
  )

  const block = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use' && b.name === 'emit_phrase_response',
  )
  if (!block) {
    throw new Error('anthropic response missing emit_phrase_response tool_use block')
  }
  const payload = block.input as { short_semantic?: unknown; full_reinterpretation?: unknown }
  const serialized = JSON.stringify(payload)
  const repaired = jsonrepair(serialized)
  const parsed = JSON.parse(repaired) as {
    short_semantic?: unknown
    full_reinterpretation?: unknown
  }
  return {
    short_semantic: parsed.short_semantic,
    full_reinterpretation: parsed.full_reinterpretation,
  }
}

// ---------- Mock path ----------

function buildMockResponse(input: PhraseInput): {
  short_semantic: ShortSemanticOutput
  full_reinterpretation: FullReinterpretationOutput
} {
  const maqam = input.maqam_estimator.primary
  const stage = escalationStage(input.session_memory.escalation_level)
  const base = MOCK_BY_MAQAM[maqam]
  const variant = `${maqam}_stage${stage}` as const
  return {
    short_semantic: {
      ...base.short_semantic,
      maqam_hypothesis: maqam,
      confidence: Math.max(base.short_semantic.confidence, input.maqam_estimator.confidence),
    },
    full_reinterpretation: {
      ...base.full_reinterpretation,
      ui_patch: {
        shader_variant: variant,
        label_style: base.full_reinterpretation.ui_patch.label_style,
      },
    },
  }
}

function escalationStage(level: number): 0 | 1 | 2 {
  if (level >= 0.66) return 2
  if (level >= 0.33) return 1
  return 0
}

type MockEntry = {
  short_semantic: ShortSemanticOutput
  full_reinterpretation: FullReinterpretationOutput
}

const MOCK_BY_MAQAM: Record<Maqam, MockEntry> = {
  rast: {
    short_semantic: {
      maqam_hypothesis: 'rast',
      confidence: 0.82,
      platform_translation: '7 signs you are finally aligned with your Monday.',
      wrongness_strategy: 'listicle_flattening',
      copy_fragment: 'Confidence, structured for the feed. Swipe to begin.',
    },
    full_reinterpretation: {
      cultural_reading:
        'Rast carries the composure of daylight — the piece renders that composure as a numbered listicle, smoothing moral grain into scannable optimism.',
      uniform_patch: {
        u_escalation: 0.08,
        u_distortion: 0.04,
        u_noise_amp: 0.42,
        u_palette_shift: 0.04,
      },
      ui_patch: { shader_variant: 'rast_stage0', label_style: 'editorial_luxury' },
      transition_intent: 'soft_drift',
    },
  },
  bayati: {
    short_semantic: {
      maqam_hypothesis: 'bayati',
      confidence: 0.78,
      platform_translation: 'Tender tracks for when you need to feel understood.',
      wrongness_strategy: 'spotify_mood_tag',
      copy_fragment: 'Bayati • Late Night Feelings • Updated weekly',
    },
    full_reinterpretation: {
      cultural_reading:
        'Bayati’s ache is modal, not moody; the mistranslation flattens communal grief into a recommendation-algorithm playlist, private and monetizable.',
      uniform_patch: {
        u_escalation: 0.12,
        u_distortion: 0.06,
        u_noise_amp: 0.38,
        u_palette_shift: -0.06,
      },
      ui_patch: { shader_variant: 'bayati_stage0', label_style: 'relatable_warm' },
      transition_intent: 'soft_drift',
    },
  },
  hijaz: {
    short_semantic: {
      maqam_hypothesis: 'hijaz',
      confidence: 0.86,
      platform_translation: 'The desert aesthetic is back. Shop the drop.',
      wrongness_strategy: 'aesthetic_commerce',
      copy_fragment: 'Hijaz-coded outerwear. Limited run. Ships in 3 days.',
    },
    full_reinterpretation: {
      cultural_reading:
        'Hijaz holds distance and longing; the feed extracts its palette, strips the modal grammar, and returns it as a fashion-drop collectible.',
      uniform_patch: {
        u_escalation: 0.28,
        u_distortion: 0.14,
        u_noise_amp: 0.62,
        u_palette_shift: 0.18,
      },
      ui_patch: { shader_variant: 'hijaz_stage0', label_style: 'brand_assurance' },
      transition_intent: 'regime_shift',
    },
  },
  saba: {
    short_semantic: {
      maqam_hypothesis: 'saba',
      confidence: 0.74,
      platform_translation: 'A calming meditation for your anxious Tuesday evening.',
      wrongness_strategy: 'wellness_pacification',
      copy_fragment: 'Breathe in for 4. Hold. Exhale for 6. You are safe here.',
    },
    full_reinterpretation: {
      cultural_reading:
        'Saba names grief explicitly and ritualizes it. The mistranslation routes that grief into a wellness app, converting lament into a self-soothing exercise.',
      uniform_patch: {
        u_escalation: 0.06,
        u_distortion: 0.02,
        u_noise_amp: 0.28,
        u_palette_shift: -0.1,
      },
      ui_patch: { shader_variant: 'saba_stage0', label_style: 'wellness_soft' },
      transition_intent: 'hold',
    },
  },
  ajam: {
    short_semantic: {
      maqam_hypothesis: 'ajam',
      confidence: 0.81,
      platform_translation: 'This song unlocked a reward. Keep the streak going.',
      wrongness_strategy: 'reward_loop',
      copy_fragment: '+1 streak. +10 coins. Tap to claim your next track.',
    },
    full_reinterpretation: {
      cultural_reading:
        'Ajam is celebratory but not transactional; rewriting it as a reward loop converts warmth into operant conditioning, dopamine on a schedule.',
      uniform_patch: {
        u_escalation: 0.35,
        u_distortion: 0.18,
        u_noise_amp: 0.7,
        u_palette_shift: 0.25,
      },
      ui_patch: { shader_variant: 'ajam_stage0', label_style: 'reward_burst' },
      transition_intent: 'regime_shift',
    },
  },
}
