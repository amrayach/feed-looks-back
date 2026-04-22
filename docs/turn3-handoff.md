# The Feed Looks Back — Turn 3 Handoff

Cross-session context transfer for Turn 3 close. Read `docs/turn1-handoff.md` for locked architecture and `docs/turn2-handoff.md` for the Turn 2 → Turn 3 correction list; this file is the delta. **Status: Day 1 closed, repo public, CI green.**

---

## 1. What Turn 3 delivered

Turn 3 was the "go from scaffold on disk to a public repo with green CI" turn. No architectural work. Three categories of output:

| Area | Result |
|---|---|
| Install / typecheck / build | pnpm install clean (273 pkgs, 9.6s); typecheck 0 errors after a one-line fix; build 2.0s, 4 chunks, gzip 123 kB for performance chunk. |
| Runtime smoke | Express 8787 + Vite 5173 both serve. `/api/health` 200. `/api/phrase` returns zod-valid `PhraseResponse` for all five maqams (rast/bayati/hijaz/saba/ajam). Cache round-trip demonstrated (first request = `source:mock`, second = `source:cache`). |
| Visual smoke | Headless Chrome via CDP, keypress `4` (Saba): **+63% mean-brightness shift**, hue rotation from warm amber to cool neutral, 99.97% of pixels changed (10% fuzz), HUD populated with live Saba copy. Full pipeline keyboard-mock → `/api/phrase` → HUD+scene mutation verified end-to-end. |
| Git + publish | `main` branch, commit `4696034` (71 files, 7228 insertions), gitleaks pre-commit hook (zero leaks on scan), pushed to `github.com/amrayach/feed-looks-back`. CI `typecheck + build` green in 17s on first run. |

---

## 2. Changes this turn

### Code

- `src/main.ts` — added second triple-slash reference: `/// <reference types="vite-plugin-glsl/ext" />`. Required because `tsconfig.compilerOptions.types` is `["node"]` by policy, and the shader imports (`*.vert`/`*.frag`) need ambient module declarations. The plugin ships them; they just need to be pulled into the compilation. Pattern matches the existing `vite/client` reference on line 1.

### Harness / tooling

- `.git/hooks/pre-commit` — gitleaks hook uses `gitleaks git --staged --redact --exit-code 1`. **Note**: the instruction snippet in Turn 3 specified `gitleaks detect --staged`, which is the pre-8.21 syntax. The hook was updated to the 8.21+ `git` subcommand before the commit landed.

### Docs

- This file (`docs/turn3-handoff.md`).

Nothing in `shared/schemas.ts` changed. Nothing in `src/state/machine.ts` changed. Nothing in `server/anthropic-adapter.ts` changed. Turn 2 corrections remain the authoritative contracts.

---

## 3. End-to-end verification record

All six CLAUDE.md "verification before closing a turn" checks, captured at Turn 3 close.

| Check | Result |
|---|---|
| Enum-drift grep (`label_text`, `emoji`, `narrative_frame`, `json-repair`) | Zero hits in `server/` `src/` `shared/`. The literal hits for `rast_stage0`, `wellness_soft`, `soft_drift` are valid enum members in `shared/schemas.ts` or fixture/default values that reference them. |
| `@/` and `@shared/` path resolution | `pnpm typecheck` passes with zero errors. |
| `copy_fragment` symmetry | Exactly 2 hits in `shared/schemas.ts` (`ShortSemanticOutputSchema` and `LastValidOutputDigestSchema`). |
| State-machine events in callers | `performance.ts:100/105/115/128` dispatches `phrase_boundary` → `response_valid_short` → `response_valid_full` → `smoothing_complete`. `fallback.ts:30` dispatches `response_valid_short` on DEGRADED→LISTENING recovery. |
| `key_pressed` round-trip | Client keyboard-mock sets it, excluded from `phrase_hash` (stable fields), carried through `PhraseInput` to server, logged on live success. Confirmed in server log `idx=1 maqam=saba hash=35ec326a77…`. |
| Harness files | `.claude/CLAUDE.md` + four `.claude/skills/project/*.md` files committed. `.claude/settings.local.json` correctly gitignored. |

---

## 4. What's mocked (replace on Day 2)

| Surface | Current | Day 2 target |
|---|---|---|
| Phrase trigger | `src/audio/keyboard-mock.ts` — window `keydown` on digits 1–5 maps to maqam. | `src/audio/phrase.ts` + `src/audio/analyser.ts` — real audio pipeline emits `PHRASE_BOUNDARY_EVENT` with computed `AudioFeatures` from Web Audio API. Keyboard mock stays as a fallback for headless testing. |
| LLM response | `server/anthropic-adapter.ts:MOCK_BY_MAQAM` — 5 hand-crafted responses, one per maqam, returned on any cache miss when `USE_REAL_API=false`. | `callRealApi()` path (already implemented with tool-forced output + jsonrepair + prompt caching) activated via `USE_REAL_API=true` + `ANTHROPIC_API_KEY` in `.env`. |
| Maqam estimator | Keyboard mock sets `maqam_estimator.primary` directly from key. | `src/audio/features.ts` + pitchy → compute pitch centroid → coarse maqam classifier with confidence. Not required to be accurate; "wrongness" is part of the artwork. |
| Shaders | `src/shaders/skeleton.{vert,frag}` is the universal program driven by uniforms for 14 of 15 variants; `src/shaders/saba.{vert,frag}` is the sole dedicated pair. Selection logic in `src/scene/programs.ts:72`. | No change planned. Locked decision #3. |

---

## 5. What's stub

| File / area | Status | Owner |
|---|---|---|
| `src/audio/analyser.ts` | Module exists with type signatures; Web Audio API wiring to be verified Day 2. | Bashar |
| `src/audio/features.ts` | RMS/centroid/flux/pitch — pitchy integration verified; maqam heuristic pending. | Bashar |
| `src/audio/phrase.ts` | Phrase-boundary detector (silence gap threshold) — skeleton present, thresholds untuned. | Bashar |
| `src/shaders/*` escalation uniforms | Uniform names and defaults land via `src/scene/mutation.ts`; stage-2 "loud" aesthetics are intentionally broad, will be tuned after first live play-through. | Amay |
| `prompts/examples.md` | Placeholder few-shot set per maqam. Will be replaced after first real-API dry run on Day 2. | Amay |
| `scripts/record-demo.sh` | Uses ffmpeg + Xorg screen capture. Works on Linux; not tested on other platforms (Bashar uses macOS — separate path with `screencapture` needed or `pnpm capture` + OBS). | Amay / Bashar |

---

## 6. Known issues / deprecations

- **CI action runtimes deprecating**: GitHub surfaced a warning that `actions/checkout@v4`, `actions/setup-node@v4`, `pnpm/action-setup@v4` run on Node 20, to be removed September 2026. Non-blocking for Sunday's deadline. Pinning to the current majors is correct; revisit post-performance.
- **`@types/express@5.0.0` vs `express@4.21.1`**: the semantic drift noted in `docs/turn1-handoff.md` did not surface at typecheck. If it appears on Day 2 (e.g. middleware signature divergence), downgrade `@types/express` to `4.17.x` — this is a typecheck-only concern, the Express runtime is unchanged.
- **`gitleaks git --staged` syntax**: the pre-commit hook assumes gitleaks 8.21+. If contributors on older gitleaks run into "unknown command" errors, point them at the `.pre-commit-config.yaml` pin.
- **Headless WebGL**: any future headless smoke tests of the scene must set `--use-gl=swiftshader --enable-unsafe-swiftshader` and not `--disable-gpu`. AMD Vega iGPU in headless mode cannot create a WebGL context without the software renderer.
- **`docs/capture-cache.json` / `docs/capture-session.json`**: gitignored; populated by the Turn 3 smoke test with 5 `smoke-*` hash entries plus one real SHA-256 entry. Harmless leftover; will be overwritten by the first real `pnpm capture` run on Day 2.

---

## 7. Day 2 entry points

Work in this order (dependencies matter):

1. **Audio pipeline sanity check** (Bashar): open `localhost:5173` with `pnpm dev`, permit microphone, verify `src/audio/analyser.ts` produces `AudioFeatures` on real guitar input and `src/audio/phrase.ts` emits `PHRASE_BOUNDARY_EVENT` on phrase end. Keyboard mock should still work when mic is absent.
2. **Real-API dry run** (Amay): set `USE_REAL_API=true` + `ANTHROPIC_API_KEY` in `.env`, hit `/api/phrase` once per maqam, confirm prompt cache HIT on the second call per maqam (watch for `cache_read_input_tokens` in `[phrase]` log). This exercises Correction 5 (enum dedup) and Correction 6 (jsonrepair) for the first time.
3. **Shader stage-2 tune** (Amay): run capture mode against the real-API-generated cache, step through each maqam's stage-2 uniforms, adjust `src/scene/mutation.ts:STAGE_DEFAULTS` so "louder" is visibly distinct from stage-1 but not broken/unreadable.
4. **First end-to-end rehearsal** (both): guitarist in one corner, screen in the other, 15-minute uninterrupted play, watch for DEGRADED transitions, measure phrase→screen lag with a stopwatch. Target <1.5s.

---

## 8. Repo coordinates

| Item | Value |
|---|---|
| URL | https://github.com/amrayach/feed-looks-back |
| Default branch | `main` |
| Initial commit | `4696034b43e6679556c69a804ce6174a9481a36e` |
| CI run | https://github.com/amrayach/feed-looks-back/actions/runs/24755524424 |
| License | MIT (file + package.json metadata) |
| Visibility | public |
