# The Feed Looks Back — Turn 2 Handoff

Cross-session context transfer for Turn 2 close. Read `docs/turn1-handoff.md` first for the locked architecture and shared-contract reference; this file is the delta. **Status: historical Turn 2 handoff. Source tree populated (~35 files).**

> Post-audit note (2026-04-22): after the independent Turn 2 audit, seven follow-up corrections landed before Turn 3: capture boot now sets both server/client runtime-mode env vars; `PhraseInput` now carries `key_pressed` outside the phrase hash; live-mode session logs record actual keys on every successful phrase; the state machine now uses `phrase_boundary → response_valid_short → response_valid_full → smoothing_complete`; every state has a failure edge; the Anthropic tool schema now derives enum values from `shared/schemas.ts`; `jsonrepair` is wired as a syntax-only safety net in the real path; the operating manual now lives at `.claude/CLAUDE.md` with stub project skill files. Treat this file as a historical summary and prefer `docs/turn3-handoff.md` once it exists.

---

## 1. Project identity (unchanged)

The Feed Looks Back — live-performance piece, Arabic maqam → Claude Opus 4.7 JSON mutation → Three.js scene. Deadline 2026-04-26 8pm EST. Hardware: AMD Vega, 512 MB VRAM. See `turn1-handoff.md` §1 for the full identity matrix.

---

## 2. What Turn 2 delivered

Turn 2 was the "all source files land" turn. Delivered in 5 batches:

| Batch | Scope | Files |
|---|---|---|
| 1 | Shared/contract surface (carry-over) | `shared/schemas.ts`, `shared/types.ts` |
| 2 | State + server path | `src/state/machine.ts`, `src/state/session.ts`, `server/anthropic-adapter.ts`, `server/cache.ts`, `server/index.ts`, `src/config.ts` |
| 3 | Audio pipeline + LLM client | `src/audio/analyser.ts`, `src/audio/features.ts`, `src/audio/phrase.ts`, `src/audio/keyboard-mock.ts`, `src/llm/client.ts`, `src/llm/adapter.ts`, `src/llm/fallback.ts`, `src/llm/prompt-context.ts` |
| 4 | Scene + shaders + HUD | `src/scene/renderer.ts`, `src/scene/programs.ts`, `src/scene/mutation.ts`, `src/scene/skeleton.ts`, `src/shaders/skeleton.{vert,frag}`, `src/shaders/saba.{vert,frag}`, `src/shaders/common/noise.glsl`, `src/display/semantic-hud.ts` |
| 5 | Modes, entry, HTML, capture-session wiring | `src/modes/performance.ts`, `src/modes/capture.ts`, `src/main.ts`, `index.html`, server edits exposing `/api/capture-session` |

Plus project-level operating manual: `.claude/CLAUDE.md` (this turn).

Prompts and ADRs landed in parallel: `prompts/{system,examples,mutation-vocabulary,wrongness-strategies}.md`, `docs/adr/0001…0005`, `docs/{architecture,BUDGET,OPUS-USE,demo/storyboard}.md`, `.github/{pull_request_template.md, workflows/ci.yml}`, `scripts/{check-env.sh, record-demo.sh}`.

---

## 3. Source tree (post-Turn 2)

```
.claude/CLAUDE.md                      ← project operating manual (new this turn)
index.html                             ← Vite entry; canvas#scene only
src/
  main.ts                              ← mode dispatcher; dynamic-imports performance/capture
  config.ts                            ← CLIENT_CONFIG (runtime_mode via ?mode or VITE_)
  audio/
    analyser.ts                        ← pitchy + AudioContext wrapper
    features.ts                        ← rms/centroid/flux/onset feature computation
    phrase.ts                          ← phrase segmentation (silence-gated)
    keyboard-mock.ts                   ← keys 1–5 → maqam; dispatches on the bus
  llm/
    client.ts                          ← browser POST /api/phrase with abort/timeout
    adapter.ts                         ← thin alias over client.ts (name symmetry)
    fallback.ts                        ← FallbackController: success/failure → state machine
    prompt-context.ts                  ← buildContext(): assembles PhraseInput from runtime state
  state/
    machine.ts                         ← whitelist state machine; observers, lastFailure
    session.ts                         ← emptySessionMemory, recordPhrase (last-5 rolling)
  scene/
    renderer.ts                        ← createSceneRenderer: canvas + full-screen quad
    programs.ts                        ← ProgramRegistry: 15 ShaderMaterial, palette+stage uniforms
    mutation.ts                        ← UniformMutator: smoothed uniform_patch application
    skeleton.ts                        ← BreathDriver: time + u_breath envelope
  shaders/
    skeleton.{vert,frag}               ← default pair (14/15 variants)
    saba.{vert,frag}                   ← saba_stage0 pair (wellness register)
    common/noise.glsl                  ← shared #include (via vite-plugin-glsl)
  display/
    semantic-hud.ts                    ← DOM HUD; 5 label styles via [data-style]
  modes/
    performance.ts                     ← wires renderer/registry/mutator/breath/hud/machine/fallback
    capture.ts                         ← startPerformance() + scheduled keydown replay
server/
  index.ts                             ← Express; /api/health, /api/phrase, /api/capture-session
  cache.ts                             ← JSON-file phrase cache + capture-session log
  anthropic-adapter.ts                 ← mock + gated real path; prompt caching on final block
prompts/                               ← system.md + vocab + examples + wrongness-strategies
shared/                                ← schemas.ts (zod, source of truth) + types.ts (z.infer)
```

---

## 4. Runtime flow — one phrase, end-to-end

```
[keyboard 1–5 or capture replay]
  → keyboard-mock handler (window keydown)
    → buildPhraseInput(maqam, key_pressed) via performance.ts closure
      → buildContext: composes PhraseInput from runtime state + session memory
    → bus.dispatch(PHRASE_BOUNDARY_EVENT, input)

[performance.ts phrase-boundary listener]
  → machine.dispatch({type: 'phrase_boundary'})     // IDLE → LISTENING
  → callOpus(input)  (client.ts → POST /api/phrase)
      ├── cache hit  → returns cached PhraseResponse (source='cache')
      ├── capture mode + cache miss → 404 cache_miss → throws PhraseApiError
      └── live       → anthropic-adapter
                         ├── mock (default)      → returns MOCK_BY_MAQAM[maqam]
                         └── real (gated)        → SDK call w/ prompt caching + tool_use
                       → composePhraseResponse(input, result, cached=false, RUNTIME_MODE)
                       → cache.set(phrase_hash, response)
                       → if live: cache.appendSession({phrase_hash, key_pressed, timestamp_iso})

[back in performance.ts]
  ← PhraseResponse validated by PhraseResponseSchema on the wire
  → fallback.handleSuccess(response)               // DEGRADED → LISTENING if was degraded
  → hud.update(response)
  → machine.dispatch({type: 'response_valid_short'})  // LISTENING → MUTATING
  → registry.get(shader_variant) → renderer/mutator/breath rebind on change
  → mutator.applyUniformPatch(uniform_patch)       // smoothed over smoothing_ms
  → machine.dispatch({type: 'response_valid_full'})   // MUTATING → TRANSITIONING
  → lastValidOutputDigest refreshed (shader, label, copy_fragment)
  → sessionMemory = recordPhrase(...)              // escalation monotonic
  → setTimeout(smoothing_complete, smoothing_ms)   // TRANSITIONING → IDLE

[on any failure]
  → fallback.handleFailure(err)                    // dispatch({type:'failure'})
                                                   // → DEGRADED from any state
  → hud.showDegraded("phrase failed — holding last state")
  → scene keeps animating (breath + last uniforms)
  → next successful phrase recovers to LISTENING via fallback.handleSuccess
```

---

## 5. Runtime modes — resolved semantics

| Surface | `live` | `capture` | `degraded_recovery` |
|---|---|---|---|
| Server `/api/phrase` cache miss | Falls through to adapter (mock or real) | **404 `cache_miss`** — outbound forbidden | Same as live |
| Server session-log writes | Append on every successful live phrase | Never appends | Same as live |
| Client keyboard mock | Active | Active (also accepts replayed keydowns on `window`) | Active |
| Client `/api/capture-session` fetch on boot | No | **Yes** — dispatches scheduled `window.keydown` events by ISO timestamp | No |
| Client meta source tag | `cache` \| `mock` \| `anthropic` | `cache` (hit) or thrown DEGRADED (miss) | Same as live |

Mode resolution order (client): URL `?mode=…` → `VITE_RUNTIME_MODE` → default `live`. Server: `RUNTIME_MODE` env only.

---

## 6. Capture loop — how it actually works

1. **Capture during live session**: Whenever a phrase succeeds with `RUNTIME_MODE=live`, `server/cache.ts:appendSession()` logs `{phrase_hash, key_pressed, timestamp_iso}` to `docs/capture-session.json`. The response is also stored in `docs/capture-cache.json` keyed by `phrase_hash`.
2. **Replay during capture session**: Client boots `src/modes/capture.ts`, which starts performance mode (attaching the window keydown listener), fetches `/api/capture-session`, and schedules synthesised `KeyboardEvent('keydown', {key: entry.key_pressed})` on `window` at the original ISO-timestamp deltas.
3. **Replay now consumes real keyboard markers**. `src/modes/capture.ts` filters for entries whose `key_pressed` is a string, then dispatches matching `KeyboardEvent('keydown', {key})` calls on `window`.

---

## 7. Post-audit correction summary

The Turn 2 audit found a small set of drift issues that were corrected before Turn 3:

1. Capture boot now sets both `RUNTIME_MODE=capture` and `VITE_RUNTIME_MODE=capture`.
2. `PhraseInput` now carries `key_pressed`, and the field is deliberately excluded from `phrase_hash`.
3. Live-mode session logs now append `{phrase_hash, key_pressed, timestamp_iso}` on every successful phrase.
4. The state machine now matches the intended four-step cycle with explicit short/full validation events and `smoothing_complete`.
5. The real-path Anthropic tool schema now derives enum values from `shared/schemas.ts`.
6. `jsonrepair` is now wired in the real path as a syntax-only repair pass before zod validation.
7. The operating manual moved to `.claude/CLAUDE.md`, and `.claude/skills/project/` now has baseline project skill notes.

---

## 8. Shader strategy — note for whoever writes next

`ProgramRegistry` eagerly compiles 15 `ShaderMaterial` instances on construction. 14 share the `skeleton.{vert,frag}` pair; `saba_stage0` is the one dedicated variant. Differentiation happens through uniforms:

- **Per-maqam palette** (`u_color_a`, `u_color_b`, `u_accent`) from `PALETTES[maqam]`.
- **Per-stage defaults** (`u_escalation`, `u_distortion`, `u_noise_amp`, `u_noise_scale`, `u_palette_shift`, `u_grain`) from `STAGE_DEFAULTS[stage]`.
- **Per-phrase overrides** ride in `uniform_patch` from the model; `UniformMutator.applyUniformPatch` smooths to targets over `smoothing_ms` (default 400).

Adding a new dedicated shader pair requires updating the `isSabaStage0` selector in `src/scene/programs.ts:72` — the current selector is a hardcoded if/else. A lookup table would be cleaner if we grow beyond 2 pairs. Left as-is to avoid over-engineering.

---

## 9. State machine — wiring confirmation

Transitions live in `src/state/machine.ts:10` as a nested record. Verified paths:

| From | Event | To | Who dispatches |
|---|---|---|---|
| IDLE | `phrase_boundary` | LISTENING | `performance.ts` (per phrase start) |
| IDLE | `failure` | DEGRADED | `fallback.ts` / any caller |
| LISTENING | `response_valid_short` | MUTATING | `performance.ts` (HUD update complete) |
| LISTENING | `failure` | DEGRADED | `fallback.ts` |
| MUTATING | `response_valid_full` | TRANSITIONING | `performance.ts` (uniform patch applied) |
| MUTATING | `failure` | DEGRADED | `fallback.ts` |
| TRANSITIONING | `smoothing_complete` | IDLE | `performance.ts` (delayed setTimeout) |
| TRANSITIONING | `failure` | DEGRADED | `fallback.ts` |
| DEGRADED | `response_valid_short` | LISTENING | `fallback.ts:handleSuccess` |
| DEGRADED | `failure` | DEGRADED | `fallback.ts` |

No transition writes `_state` outside `dispatch()`. No observer calls back into `dispatch()` from inside an observer — observer list is iterated with a fresh snapshot via `for…of`. Unknown event types are no-ops.

---

## 10. Verification record (Turn 2 close)

Ran per the `.claude/CLAUDE.md` verification checklist:

```bash
# Enum drift — zero code references to old names
grep -r "label_text\|narrative_frame\|json-repair" .
# → only .claude/CLAUDE.md (verification list itself) and docs/turn1-handoff.md (audit record)

grep -rn "\bemoji\b" --exclude=.claude/CLAUDE.md --exclude-dir=docs .
# → 0

# copy_fragment cross-reference — exactly two occurrences
grep -n "copy_fragment" shared/schemas.ts
# → 80:  copy_fragment: z.string().nullable(),         (LastValidOutputDigest)
# → 103: copy_fragment: z.string().min(1).max(400),    (ShortSemanticOutput)

# Import resolution audit (via Explore agent)
# → all 17 @/ modules resolve; no dangling @shared/* imports
```

**Typecheck not yet run** — `pnpm install` is deferred to Turn 3 per the Turn 1 plan. The Explore-agent audit of all files returned zero probable type errors, but `tsc --noEmit` is the authoritative check and must pass first thing in Turn 3.

---

## 11. Known caveats (carried forward + new)

**Carried from Turn 1** (still in force):

- `@types/express@5.0.0` on `express@4.21.1` — middleware typing drift possible; pin kept.
- `vite/client` type reference: only `src/main.ts` has `/// <reference types="vite/client" />`. Don't add to tsconfig types.
- `jsonrepair` import form: `import { jsonrepair } from 'jsonrepair'`.
- `capture` npm script is Linux/macOS only (uses inline env vars for both server + client runtime mode).
- AMD Vega 512 MB VRAM is the hard ceiling.
- No git repo yet; graph is empty.

**New in Turn 2**:

- **SDK type augmentation** in `server/anthropic-adapter.ts:236–239` declares `thinking` and `output_config` on top of `Anthropic.MessageCreateParamsNonStreaming`. The SDK accepts these at runtime but doesn't ship typings for them in 0.32.1. Drop the augmentation when we bump the SDK.
- **Capture-session loop is now wired end-to-end** — the original audit gap is resolved; see §6 and §7 above.
- **No fallback shader pair for `saba_stage1`/`saba_stage2`** — they use `skeleton.{vert,frag}` per the `isSabaStage0` selector. This is deliberate; the saba aesthetic dominates stage 0 (the wellness register), and stages 1–2 escalate away from that into the generic mutator visual.
- **Keyboard mock dispatches on `window`**, not on the `bus` directly. `capture.ts` dispatches synthesised KeyboardEvents on `window` for the same reason. If a future change moves mock input off `window`, the capture replay target must move with it.

---

## 12. Skill activations in Turn 2

| Skill | Purpose |
|---|---|
| `superpowers:using-superpowers` | Session start (mandatory) |
| `claude-api` | Before writing `server/anthropic-adapter.ts` real path (prompt caching + tool_use + adaptive thinking) |
| `threejs-fundamentals` | Before writing renderer/programs/shaders |
| `superpowers:verification-before-completion` | Turn 2 close (enum drift grep + schema symmetry + import audit) |

`claude-md-management` was listed in the Turn 1 handoff but is not installed in this environment — `.claude/CLAUDE.md` was written directly.

---

## 13. What Turn 3 is expected to do

Per the original plan:

1. `pnpm install` — first time. Expect some ESM/CJS fuss with pitchy, three, or the SDK. The `superpowers:systematic-debugging` skill handles this.
2. `pnpm typecheck` — first authoritative TS pass. Likely surface: the express@4 vs `@types/express@5` middleware drift. Escape valve: downgrade `@types/express` to `4.17.x` or annotate middleware params.
3. `pnpm build` — vite production build; may surface shader include resolution via `vite-plugin-glsl`.
4. `pnpm dev` — boot server + client; smoke-test keys 1–5 each, observe shader + HUD change.
5. `git init` + initial commit with the public compliance paragraph intact.
6. `.github/workflows/ci.yml` already exists — verify it runs on the first push.
7. Build the code-review-graph: `build_or_update_graph_tool` after the commit. The graph will then auto-update on subsequent edits.
8. Close `docs/turn3-handoff.md` mirroring this file.

Turn 3 should invoke: `superpowers:systematic-debugging`, `superpowers:verification-before-completion`.

---

## 14. File count deltas

| Category | Turn 1 close | Turn 2 close | Δ |
|---|---|---|---|
| `shared/*.ts` | 2 | 2 | 0 |
| `src/**/*.ts` | 0 | 19 | +19 |
| `src/shaders/*.{vert,frag,glsl}` | 0 | 5 | +5 |
| `server/*.ts` | 0 | 3 | +3 |
| `prompts/*.md` | 0 | 4 | +4 |
| `docs/**/*.md` | 1 | 11 | +10 |
| `scripts/*.sh` | 0 | 2 | +2 |
| `index.html` | 0 | 1 | +1 |
| `.claude/CLAUDE.md` + skill notes | 0 | 5 | +5 |
| `.github/**` | 0 | 2 | +2 |
| **Total net-new files** | | | **+47** |

Turn 2 scope estimated ~35 source files in the Turn 1 handoff; actual landed is 47 including docs/prompts/scripts. The extras are supporting material (ADRs, prompt docs, budget, storyboard, CI pipeline) — not scope creep, they enable Turn 3.

---

## 15. Paste-ready prompt for Turn 3

```
Read docs/turn2-handoff.md for the Turn 2 close state. Then execute Turn 3:

1. Invoke superpowers:systematic-debugging for install/build/runtime friction.
2. pnpm install → pnpm typecheck → pnpm build → pnpm dev smoke test.
3. git init; initial commit per the rules in `.claude/CLAUDE.md`.
4. Verify .github/workflows/ci.yml runs on push.
5. Build the code-review-graph (build_or_update_graph_tool).
6. Invoke superpowers:verification-before-completion; close with docs/turn3-handoff.md.

Follow `.claude/CLAUDE.md` for conventions. Do not re-debate locked decisions §2 of turn1-handoff. Flag any caveat from turn2-handoff §11 that actually bites.
```

---

*End of Turn 2 handoff.*
