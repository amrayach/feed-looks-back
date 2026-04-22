import { CLIENT_CONFIG } from '@/config'
import { createKeyboardMock, PHRASE_BOUNDARY_EVENT } from '@/audio/keyboard-mock'
import { callOpus } from '@/llm/adapter'
import { FallbackController } from '@/llm/fallback'
import { buildContext } from '@/llm/prompt-context'
import { SemanticHud } from '@/display/semantic-hud'
import { UniformMutator } from '@/scene/mutation'
import { ProgramRegistry } from '@/scene/programs'
import { createSceneRenderer } from '@/scene/renderer'
import { BreathDriver } from '@/scene/skeleton'
import { StateMachine } from '@/state/machine'
import { emptySessionMemory, recordPhrase } from '@/state/session'
import type {
  LastValidOutputDigest,
  Maqam,
  PhraseInput,
  SessionMemory,
  ShaderVariant,
} from '@shared/types'

const ESCALATION_STEP = 0.1
const INITIAL_SHADER: ShaderVariant = 'rast_stage0'

export async function start(): Promise<void> {
  const canvas = document.querySelector<HTMLCanvasElement>('canvas#scene')
  if (!canvas) throw new Error('canvas#scene not found in DOM')

  const renderer = createSceneRenderer(canvas)
  const registry = new ProgramRegistry()
  const mutator = new UniformMutator({ defaultSmoothingMs: CLIENT_CONFIG.smoothing_ms })
  const breath = new BreathDriver()
  const hud = new SemanticHud()
  const machine = new StateMachine()
  const fallback = new FallbackController(machine)

  let sessionMemory: SessionMemory = emptySessionMemory()
  let phraseIndex = 0
  const startedAtMs = performance.now()

  let currentShader: ShaderVariant = INITIAL_SHADER
  let lastValidOutputDigest: LastValidOutputDigest = {
    shader_variant: null,
    label_style: null,
    copy_fragment: null,
  }

  const initial = registry.get(currentShader)
  renderer.setMaterial(initial)
  mutator.setMaterial(initial)
  breath.setMaterial(initial)

  renderer.onFrame((dtMs) => {
    breath.update(dtMs)
    mutator.update()
  })

  const bus = new EventTarget()
  bus.addEventListener(PHRASE_BOUNDARY_EVENT, (ev) => {
    const input = (ev as CustomEvent<PhraseInput>).detail
    handlePhrase(input).catch((err) => {
      console.error('[performance] handlePhrase crashed', err)
    })
  })

  const buildInput = async (maqam: Maqam, keyPressed: string): Promise<PhraseInput> => {
    phraseIndex += 1
    const elapsed_sec = (performance.now() - startedAtMs) / 1000
    return buildContext({
      runtime_mode: CLIENT_CONFIG.runtime_mode,
      phrase_index: phraseIndex,
      elapsed_sec,
      state: machine.state,
      audio_features: {
        rms: 0,
        spectral_centroid: 0,
        spectral_flux: 0,
        onset_density: 0,
        duration_sec: 0,
        peak_pitch_hz: null,
        pitch_stability: 0,
      },
      maqam_estimator: {
        primary: maqam,
        confidence: 0.7,
        secondary: null,
      },
      scene_digest: {
        current_shader: currentShader,
        last_label_style: lastValidOutputDigest.label_style,
        label_visible: true,
        active_since_sec: elapsed_sec,
      },
      session_memory: sessionMemory,
      last_valid_output_digest: lastValidOutputDigest,
      key_pressed: keyPressed,
    })
  }

  async function handlePhrase(input: PhraseInput): Promise<void> {
    machine.dispatch({ type: 'phrase_boundary' })
    try {
      const response = await callOpus(input)
      fallback.handleSuccess(response)
      hud.update(response)
      machine.dispatch({ type: 'response_valid_short' })
      const { shader_variant, label_style } = response.full_reinterpretation.ui_patch
      if (shader_variant !== currentShader) {
        currentShader = shader_variant
        const mat = registry.get(shader_variant)
        renderer.setMaterial(mat)
        mutator.setMaterial(mat)
        breath.setMaterial(mat)
      }
      mutator.applyUniformPatch(response.full_reinterpretation.uniform_patch)
      machine.dispatch({ type: 'response_valid_full' })
      lastValidOutputDigest = {
        shader_variant,
        label_style,
        copy_fragment: response.short_semantic.copy_fragment,
      }
      sessionMemory = recordPhrase(sessionMemory, {
        maqam: response.short_semantic.maqam_hypothesis,
        platform_translation: response.short_semantic.platform_translation,
        wrongness_strategy: response.short_semantic.wrongness_strategy,
        escalation_target: Math.min(1, sessionMemory.escalation_level + ESCALATION_STEP),
      })
      window.setTimeout(() => {
        machine.dispatch({ type: 'smoothing_complete' })
      }, CLIENT_CONFIG.smoothing_ms)
    } catch (err) {
      fallback.handleFailure(err)
      hud.showDegraded('phrase failed — holding last state')
    }
  }

  const keyboard = createKeyboardMock({ bus, buildPhraseInput: buildInput })
  keyboard.start()
  renderer.start()

  console.info('[performance] started; keys 1–5 dispatch phrases')
}
