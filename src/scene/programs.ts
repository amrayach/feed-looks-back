import * as THREE from 'three'
import { ShaderVariantEnum } from '@shared/schemas'
import type { Maqam, ShaderVariant } from '@shared/types'
import skeletonVert from '@/shaders/skeleton.vert'
import skeletonFrag from '@/shaders/skeleton.frag'
import sabaVert from '@/shaders/saba.vert'
import sabaFrag from '@/shaders/saba.frag'

interface StageDefaults {
  escalation: number
  distortion: number
  noise_amp: number
  noise_scale: number
  palette_shift: number
  grain: number
}

interface Palette {
  a: string
  b: string
  accent: string
}

// 5 maqam palettes. Pairs with brief section 04 visual direction.
//   rast    — warm amber/gold/cream, confident and steady
//   bayati  — muted rose/mauve/blush, tender ache
//   hijaz   — charcoal blue-gray with copper accent, distance and heat
//   saba    — sage + lavender wellness pastels (calmest)
//   ajam    — cobalt + saffron, bright pop/reward timbre
const PALETTES: Record<Maqam, Palette> = {
  rast: { a: '#3b2a1a', b: '#c69759', accent: '#f6d08b' },
  bayati: { a: '#2a1a27', b: '#9c6f84', accent: '#e0b3c2' },
  hijaz: { a: '#14161f', b: '#4a5570', accent: '#d97a3a' },
  saba: { a: '#c8d0bb', b: '#a59bb8', accent: '#e4dcc9' },
  ajam: { a: '#1a2c4e', b: '#6495c9', accent: '#ffd45e' },
}

// 3 escalation stages. Stage 2 ≠ "broken", it's "louder UI."
const STAGE_DEFAULTS: readonly StageDefaults[] = [
  { escalation: 0.0, distortion: 0.02, noise_amp: 0.4, noise_scale: 2.0, palette_shift: 0.0, grain: 0.15 },
  { escalation: 0.35, distortion: 0.12, noise_amp: 0.6, noise_scale: 3.5, palette_shift: 0.1, grain: 0.25 },
  { escalation: 0.7, distortion: 0.25, noise_amp: 0.9, noise_scale: 5.0, palette_shift: 0.25, grain: 0.4 },
]

function parseVariant(v: ShaderVariant): { maqam: Maqam; stage: 0 | 1 | 2 } {
  const [m, s] = v.split('_')
  const stage = s === 'stage2' ? 2 : s === 'stage1' ? 1 : 0
  return { maqam: m as Maqam, stage }
}

function buildUniforms(variant: ShaderVariant): Record<string, THREE.IUniform> {
  const { maqam, stage } = parseVariant(variant)
  const palette = PALETTES[maqam]
  const defaults = STAGE_DEFAULTS[stage]
  return {
    u_time: { value: 0 },
    u_breath: { value: 0 },
    u_escalation: { value: defaults.escalation },
    u_color_a: { value: new THREE.Color(palette.a) },
    u_color_b: { value: new THREE.Color(palette.b) },
    u_accent: { value: new THREE.Color(palette.accent) },
    u_noise_scale: { value: defaults.noise_scale },
    u_noise_amp: { value: defaults.noise_amp },
    u_distortion: { value: defaults.distortion },
    u_palette_shift: { value: defaults.palette_shift },
    u_grain: { value: defaults.grain },
    u_resolution: { value: new THREE.Vector2(1, 1) },
  }
}

function buildMaterial(variant: ShaderVariant): THREE.ShaderMaterial {
  const isSabaStage0 = variant === 'saba_stage0'
  return new THREE.ShaderMaterial({
    vertexShader: isSabaStage0 ? sabaVert : skeletonVert,
    fragmentShader: isSabaStage0 ? sabaFrag : skeletonFrag,
    uniforms: buildUniforms(variant),
  })
}

export class ProgramRegistry {
  private cache: Map<ShaderVariant, THREE.ShaderMaterial> = new Map()

  constructor() {
    for (const variant of ShaderVariantEnum.options) {
      this.cache.set(variant, buildMaterial(variant))
    }
  }

  get(variant: ShaderVariant): THREE.ShaderMaterial {
    const m = this.cache.get(variant)
    if (!m) {
      throw new Error(`unregistered shader variant: ${variant}`)
    }
    return m
  }

  list(): ShaderVariant[] {
    return [...this.cache.keys()]
  }

  dispose(): void {
    for (const m of this.cache.values()) m.dispose()
    this.cache.clear()
  }
}

export function getProgram(registry: ProgramRegistry, variant: ShaderVariant): THREE.ShaderMaterial {
  return registry.get(variant)
}
