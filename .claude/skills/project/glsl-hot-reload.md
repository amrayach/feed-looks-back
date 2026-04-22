---
name: glsl-hot-reload
description: vite-plugin-glsl conventions, the pre-compile rule, uniform naming, and hot-reload semantics
---

Shaders live in `src/shaders/`. Two pairs land at Turn 2: `skeleton.{vert,frag}` (default for 14/15 variants) and `saba.{vert,frag}` (only `saba_stage0`). Shared chunks live in `src/shaders/common/*.glsl` and are `#include`-able via the plugin.

**Pre-compile rule.** All 15 `ShaderMaterial` instances are constructed eagerly in `src/scene/programs.ts:ProgramRegistry` at app boot. This is locked architecture decision #3 — Opus picks from an enum, it cannot invent variants. Do not lazy-construct.

**Uniform naming.** All uniforms are `u_snake_case`. The canonical set (Day 1):
- `u_time` (seconds, monotonically increasing)
- `u_breath` (0..1 phase, driven by `BreathDriver` in `src/scene/skeleton.ts`)
- `u_escalation` (0..1, stage default + model override)
- `u_color_a`, `u_color_b`, `u_accent` (Three.js `Color`)
- `u_noise_scale`, `u_noise_amp`, `u_distortion`, `u_palette_shift`, `u_grain` (scalars)
- `u_resolution` (`Vector2`)

Unknown keys in `uniform_patch` are silently ignored by Three.js. This is intentional (failing-open for drift) — do not whitelist.

**Hot reload.** `vite-plugin-glsl` transforms `.vert`/`.frag`/`.glsl` at import time. HMR is on; editing a shader file reloads the module without a full page refresh, but the `ProgramRegistry` cache is stale on HMR — for now, refresh the page after shader edits. A future improvement would be to subscribe to `import.meta.hot.accept` and rebuild the registry.

**Do not** embed GLSL in TS string literals — the plugin only transforms files. Do not author shaders via Opus — locked decision #2.
