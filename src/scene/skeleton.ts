import type * as THREE from 'three'

// Breath driver. Pushes u_breath forward at a configurable Hz;
// every shader (skeleton + saba) reads this uniform as a 0..1 phase.
// A single BreathDriver per frame-loop; wired by src/modes/performance.ts.

export class BreathDriver {
  private material: THREE.ShaderMaterial | null = null
  private phase = 0
  private rateHz: number

  constructor(rateHz = 0.18) {
    this.rateHz = rateHz
  }

  setMaterial(mat: THREE.ShaderMaterial | null): void {
    this.material = mat
  }

  setRate(hz: number): void {
    this.rateHz = Math.max(0, hz)
  }

  update(dtMs: number): void {
    if (!this.material) return
    this.phase = (this.phase + (dtMs / 1000) * this.rateHz) % 1
    const u = this.material.uniforms.u_breath
    if (u) u.value = this.phase
    const time = this.material.uniforms.u_time
    if (time && typeof time.value === 'number') time.value += dtMs / 1000
  }

  getPhase(): number {
    return this.phase
  }
}
