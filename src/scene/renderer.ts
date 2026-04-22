import * as THREE from 'three'

export interface SceneRenderer {
  setMaterial(mat: THREE.ShaderMaterial): void
  getMaterial(): THREE.ShaderMaterial | null
  start(): void
  stop(): void
  onFrame(cb: (dtMs: number) => void): () => void
  getSize(): { width: number; height: number }
  dispose(): void
}

export function createSceneRenderer(canvas: HTMLCanvasElement): SceneRenderer {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(0x050505, 1)

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  const scene = new THREE.Scene()
  const geometry = new THREE.PlaneGeometry(2, 2)

  let mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial> | null = null
  const frameCallbacks = new Set<(dtMs: number) => void>()

  const getSize = () => {
    const w = canvas.clientWidth || window.innerWidth
    const h = canvas.clientHeight || window.innerHeight
    return { width: w, height: h }
  }

  const resize = () => {
    const { width, height } = getSize()
    renderer.setSize(width, height, false)
    if (mesh) {
      const mat = mesh.material
      const res = mat.uniforms.u_resolution
      if (res) {
        res.value = new THREE.Vector2(width, height)
      }
    }
  }

  window.addEventListener('resize', resize)
  resize()

  let running = false
  let rafId = 0
  let last = 0

  const tick = (t: number) => {
    if (!running) return
    const dt = last === 0 ? 16 : t - last
    last = t
    for (const cb of frameCallbacks) cb(dt)
    renderer.render(scene, camera)
    rafId = requestAnimationFrame(tick)
  }

  return {
    setMaterial(mat) {
      if (mesh) {
        mesh.material = mat
      } else {
        mesh = new THREE.Mesh(geometry, mat)
        scene.add(mesh)
      }
      resize()
    },
    getMaterial() {
      return mesh?.material ?? null
    },
    start() {
      if (running) return
      running = true
      last = 0
      rafId = requestAnimationFrame(tick)
    },
    stop() {
      running = false
      cancelAnimationFrame(rafId)
    },
    onFrame(cb) {
      frameCallbacks.add(cb)
      return () => {
        frameCallbacks.delete(cb)
      }
    },
    getSize,
    dispose() {
      running = false
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', resize)
      geometry.dispose()
      renderer.dispose()
    },
  }
}
