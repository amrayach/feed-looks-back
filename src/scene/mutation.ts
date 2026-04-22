import type * as THREE from 'three'

interface UniformLerp {
  from: number
  to: number
  startMs: number
  durationMs: number
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

export class UniformMutator {
  private material: THREE.ShaderMaterial | null = null
  private readonly lerps = new Map<string, UniformLerp>()
  private locked = false
  private readonly now: () => number
  private readonly defaultSmoothingMs: number

  constructor(opts: { now?: () => number; defaultSmoothingMs?: number } = {}) {
    this.now = opts.now ?? (() => performance.now())
    this.defaultSmoothingMs = opts.defaultSmoothingMs ?? 400
  }

  setMaterial(mat: THREE.ShaderMaterial | null): void {
    if (mat === this.material) return
    this.lerps.clear()
    this.material = mat
  }

  applyUniformPatch(patch: Record<string, number>, smoothingMs?: number): number {
    if (!this.material || this.locked) return 0
    const dur = Math.max(1, smoothingMs ?? this.defaultSmoothingMs)
    const t = this.now()
    let accepted = 0
    for (const [key, target] of Object.entries(patch)) {
      const uniform = this.material.uniforms[key]
      if (!uniform) continue
      if (typeof uniform.value !== 'number') continue
      if (!Number.isFinite(target)) continue
      this.lerps.set(key, {
        from: uniform.value,
        to: target,
        startMs: t,
        durationMs: dur,
      })
      accepted++
    }
    return accepted
  }

  update(): void {
    if (!this.material || this.lerps.size === 0) return
    const t = this.now()
    for (const [key, lerp] of this.lerps) {
      const uniform = this.material.uniforms[key]
      if (!uniform) {
        this.lerps.delete(key)
        continue
      }
      const progress = Math.min(1, (t - lerp.startMs) / lerp.durationMs)
      const eased = easeInOutCubic(progress)
      uniform.value = lerp.from + (lerp.to - lerp.from) * eased
      if (progress >= 1) this.lerps.delete(key)
    }
  }

  isIdle(): boolean {
    return this.lerps.size === 0
  }

  lock(): void {
    this.locked = true
  }

  unlock(): void {
    this.locked = false
  }

  activeCount(): number {
    return this.lerps.size
  }
}
