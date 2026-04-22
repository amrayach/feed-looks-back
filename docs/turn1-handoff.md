# The Feed Looks Back — Turn 1 Handoff

Handoff document for cross-session context transfer. Read this before touching the codebase. **Status: Turn 1 complete, verified GREEN by Codex audit. Ready for Turn 2.**

---

## 1. Project identity

| | |
|---|---|
| Name | The Feed Looks Back |
| Format | Live performance — guitarist plays Arabic maqam; Claude Opus 4.7 responds once per phrase with structured JSON that mutates a Three.js scene |
| Thesis | Semantic mistranslation engine — culturally situated musical input re-rendered as attention-economy UI. The gap between played and returned is the piece. |
| Hackathon | Built with Claude Opus 4.7 |
| Deadline | Sunday April 26, 2026, 8pm EST |
| Team | Bashar Aldarwish, Amay Ayach |
| Repo | Public, MIT license |
| Judging | Impact 30%, Demo 25%, Opus use 25%, Execution 20% |
| Hardware | AMD Vega integrated (512 MB VRAM) — GPU budget is tight |

**Artistic premise boundary.** Bashar developed the artistic premise and cultural framework *before* the hackathon. All code, prompts, schemas, shaders, and assets are built from scratch during April 21–26, 2026. The public commit history is the build record. The README has the exact compliance paragraph; do not paraphrase it.

---

## 2. Locked architectural decisions — do not re-debate

1. **Local TypeScript owns timing.** One buffered Opus-style request per phrase. No tool-calling on the hot path. Pipelined, not agentic.
2. **JSON only on the per-phrase hot path.** No Opus-authored GLSL or code. Ever (this week).
3. **Pre-compiled shader enum only.** 5 modes × 3 escalation stages = 15 registered `ShaderMaterial` instances. Opus picks from the enum; it cannot invent variants.
4. **Buffered mode on Day 1.** Use `client.messages.create()`. Streaming is deferred to Day 3+.
5. **Capture mode is first-class from Day 1.**
6. **Day 1 uses mock server responses only.** The Anthropic SDK is imported, instantiated, and wrapped in an adapter, but no outbound API calls occur. Gated behind `USE_REAL_API=true`, default `false`.
7. **zod is the authority on validity.** `jsonrepair` runs before zod and may only fix malformed JSON syntax (trailing commas, truncation). Never used to coerce semantically invalid data.
8. **DEGRADED state on parse/validation/SDK failure.** Keep the immediate visual layer animating. Never freeze the scene. Recovery: next successful validated phrase → LISTENING.
9. **All runtime enums live canonically in `shared/schemas.ts`.** Prompt docs mirror them for humans; code never duplicates enums.
10. **Prompt caching required from Day 1 scaffolding.** When the real-API call path is written (gated off), the system array must carry `cache_control: { type: "ephemeral" }` on the final static block; dynamic per-phrase input goes in the `messages` array, uncached.
11. **At most one post-processing pass on Day 1.** GPU budget prevents stacked effects.
12. **Server port 8787** (Express), not 3000 — avoids React dev-tool collisions.

---

## 3. Locked response envelope

Every `/api/phrase` response and every capture-mode replay conforms to:

```ts
type PhraseResponse = {
  short_semantic: ShortSemanticOutput
  full_reinterpretation: FullReinterpretationOutput
  meta: {
    phrase_hash: string
    runtime_mode: "live" | "capture" | "degraded_recovery"
    source: "mock" | "cache" | "anthropic"
    latency_ms: number
    cached: boolean
    timestamp_iso: string
  }
}
```

Source of truth: `shared/schemas.ts` (`PhraseResponseSchema`).

---

## 4. Capture-mode cache semantics

- Cache key: `phrase_hash`. Value: full `PhraseResponse`.
- **Live mode**: successful responses overwrite existing cache entries.
- **Capture mode**: outbound API calls forbidden. Cache miss → controlled DEGRADED with HUD message `"cache miss"`.
- Session log at `docs/capture-session.json`: ordered `{ phrase_hash, key_pressed, timestamp_iso }` for deterministic replay.
- Cache persisted at `docs/capture-cache.json`.
- Both capture files are `.gitignore`d.

---

## 5. Day 1 session memory (bounded)

No embeddings, no summaries, no vector store, no long-context persistence. Just:

- `phrase_count: number`
- `maqam_history: string[]` (last 5)
- `platform_translations: string[]` (last 5)
- `wrongness_strategies: string[]` (last 5)
- `escalation_level: number` (0–1, monotonically non-decreasing within a session — enforced by the state machine, not the schema)

---

## 6. Repository state after Turn 1

### Directory skeleton (15 required dirs, all present)

```
shared/
src/
  state/
  audio/
  scene/
  shaders/common/
  llm/
  display/
  modes/
server/
prompts/
docs/
  adr/
  demo/
.claude/skills/project/
scripts/
.github/workflows/
```

All source directories except `shared/` are empty — source files land in Turn 2.

### Root files (13 total, all verified)

| Path | Purpose |
|---|---|
| `.nvmrc` | Pin Node 22.22.2 |
| `package.json` | pnpm project; `engines.node: ">=22 <23"`; 6 deps + 14 devDeps, all exact-pinned |
| `tsconfig.json` | strict, `moduleResolution: "bundler"`, `@/*` → `src/*`, `@shared/*` → `shared/*` |
| `vite.config.ts` | `vite-plugin-glsl` enabled; proxy `/api/*` → `http://localhost:8787`; aliases mirror tsconfig |
| `.env.example` | `ANTHROPIC_API_KEY=`, `PORT=8787`, `RUNTIME_MODE=live`, `USE_REAL_API=false` |
| `.gitignore` | node_modules, dist, .env, .env.local, .DS_Store, logs/, docs/capture-session.json, docs/capture-cache.json, .code-review-graph/, coverage/ |
| `.editorconfig` | 2-space, LF, UTF-8, trim trailing ws (except `*.md`) |
| `eslint.config.js` | Flat config, `@typescript-eslint` recommended rules only, no stylistic rules |
| `.prettierrc` | `semi: false`, singleQuote, trailingComma `all`, printWidth 100 |
| `.pre-commit-config.yaml` | Single hook: gitleaks v8.21.2 |
| `LICENSE` | MIT, `Copyright (c) 2026 Bashar Aldarwish and Amay Ayach` |
| `README.md` | Hook + quickstart + compliance paragraph (plain prose, no blockquote/bold) + placeholder sections |
| `shared/schemas.ts` | zod schemas (source of truth for all contracts) |
| `shared/types.ts` | `z.infer` re-exports; no manual type definitions |

### Repository is NOT a git repo yet.

`git init` deferred to Turn 3 per spec.

---

## 7. Shared contract field reference

**Source of truth: `shared/schemas.ts`.** This section mirrors that file for quick reference; if they diverge, the code wins.

### Enums (7)

| Export | Values |
|---|---|
| `MaqamEnum` | `rast` \| `bayati` \| `hijaz` \| `saba` \| `ajam` |
| `ShaderVariantEnum` | 15 values: `{maqam}_{stage0\|stage1\|stage2}` for each of the 5 maqams |
| `LabelStyleEnum` | `editorial_luxury` \| `wellness_soft` \| `reward_burst` \| `brand_assurance` \| `relatable_warm` |
| `TransitionIntentEnum` | `hold` \| `soft_drift` \| `regime_shift` |
| `StateEnum` | `IDLE` \| `LISTENING` \| `MUTATING` \| `TRANSITIONING` \| `DEGRADED` |
| `RuntimeModeEnum` | `live` \| `capture` \| `degraded_recovery` |
| `ResponseSourceEnum` | `mock` \| `cache` \| `anthropic` |

### Input-side schemas (6)

`AudioFeaturesSchema`:
- `rms: number`
- `spectral_centroid: number`
- `spectral_flux: number`
- `onset_density: number`
- `duration_sec: number` (nonnegative)
- `peak_pitch_hz: number | null`
- `pitch_stability: number` (0..1)

`MaqamEstimatorSchema`:
- `primary: Maqam`
- `confidence: number` (0..1)
- `secondary: Maqam | null`

`SceneDigestSchema`:
- `current_shader: ShaderVariant`
- `last_label_style: LabelStyle | null`
- `label_visible: boolean`
- `active_since_sec: number` (nonnegative)

`SessionMemorySchema`:
- `phrase_count: number` (int, nonnegative)
- `maqam_history: string[]` (max 5)
- `platform_translations: string[]` (max 5)
- `wrongness_strategies: string[]` (max 5)
- `escalation_level: number` (0..1)

`LastValidOutputDigestSchema` (corrected during Turn 1 drift fix):
- `shader_variant: ShaderVariant | null`
- `label_style: LabelStyle | null`
- `copy_fragment: string | null`

`PhraseInputSchema`:
- `runtime_mode: RuntimeMode`
- `phrase_index: number` (int, nonnegative)
- `elapsed_sec: number` (nonnegative)
- `state: State`
- `audio_features: AudioFeatures`
- `maqam_estimator: MaqamEstimator`
- `scene_digest: SceneDigest`
- `session_memory: SessionMemory`
- `last_valid_output_digest: LastValidOutputDigest`
- `phrase_hash: string` (min length 1)

### Output schemas (2) — post-correction shape

`ShortSemanticOutputSchema`:
- `maqam_hypothesis: Maqam`
- `confidence: number` (0..1)
- `platform_translation: string` (1..280)
- `wrongness_strategy: string` (1..280)
- `copy_fragment: string` (1..400)

`FullReinterpretationOutputSchema`:
- `cultural_reading: string` (1..600)
- `uniform_patch: Record<string, number>` (open map — Three.js silently ignores unknown uniforms; failing-open is intentional)
- `ui_patch: { shader_variant: ShaderVariant; label_style: LabelStyle }`
- `transition_intent: TransitionIntent`

### Response envelope (2)

`PhraseResponseMetaSchema`:
- `phrase_hash: string` (min 1)
- `runtime_mode: RuntimeMode`
- `source: ResponseSource`
- `latency_ms: number` (nonnegative)
- `cached: boolean`
- `timestamp_iso: string`

`PhraseResponseSchema`:
- `short_semantic: ShortSemanticOutput`
- `full_reinterpretation: FullReinterpretationOutput`
- `meta: PhraseResponseMeta`

### Name symmetry to preserve

`copy_fragment` is the single HUD-text field name in both `ShortSemanticOutputSchema` (the output) and `LastValidOutputDigestSchema` (the digest that summarizes it). This lets the server snapshot the prior valid output with a direct copy, no rename. Do not introduce a second name for this field.

---

## 8. Dependency pins

All versions are exact (no `^`/`~`). Rationale: Vite 5 not 6 (plugin ecosystem stability); Three 0.169 exact (breaking changes between minors); zod 3.x (4.x would break); SDK pinned exact (prompt caching API semantics can shift).

### Dependencies

| Package | Version |
|---|---|
| `@anthropic-ai/sdk` | `0.32.1` |
| `express` | `4.21.1` |
| `jsonrepair` | `3.8.0` |
| `pitchy` | `4.1.0` |
| `three` | `0.169.0` |
| `zod` | `3.23.8` |

### DevDependencies

| Package | Version |
|---|---|
| `@types/express` | `5.0.0` |
| `@types/node` | `22.9.0` |
| `@types/three` | `0.169.0` |
| `@typescript-eslint/eslint-plugin` | `8.12.2` |
| `@typescript-eslint/parser` | `8.12.2` |
| `concurrently` | `9.0.1` |
| `dotenv` | `16.4.5` |
| `eslint` | `9.13.0` |
| `prettier` | `3.3.3` |
| `tsx` | `4.19.2` |
| `tweakpane` | `4.0.5` |
| `typescript` | `5.6.3` |
| `vite` | `5.4.10` |
| `vite-plugin-glsl` | `1.3.0` |

---

## 9. npm scripts (verbatim)

| Script | Command |
|---|---|
| `dev` | `concurrently -n server,client -c green,cyan "pnpm:dev:server" "pnpm:dev:client"` |
| `dev:server` | `tsx watch server/index.ts` |
| `dev:client` | `vite` |
| `capture` | `RUNTIME_MODE=capture concurrently -n server,client "pnpm:dev:server" "pnpm:dev:client"` |
| `build` | `tsc --noEmit && vite build` |
| `typecheck` | `tsc --noEmit` |
| `lint` | `eslint . --ext .ts,.tsx` |
| `format` | `prettier --write .` |

---

## 10. Corrections applied during Turn 1

Codex audit of the initial scaffold flagged three blocking issues plus one cosmetic, then approved a fifth follow-on drift fix. All five applied and verified.

| # | Location | Before | After |
|---|---|---|---|
| 1 | `shared/schemas.ts` `ShortSemanticOutputSchema` | `{label_text, label_style, emoji}` (invented) | `{maqam_hypothesis, confidence, platform_translation, wrongness_strategy, copy_fragment}` (spec) |
| 2 | `shared/schemas.ts` `FullReinterpretationOutputSchema` | `{shader_variant, transition_intent, platform_translation, wrongness_strategy, narrative_frame}` | `{cultural_reading, uniform_patch, ui_patch: {shader_variant, label_style}, transition_intent}` |
| 3 | `package.json` | `"json-repair": "3.8.0"` (non-existent package) | `"jsonrepair": "3.8.0"` |
| 4 | `README.md` heading + compliance paragraph | `## What's built during the hackathon` + `> **What this repo is.** …` | `## What this repo is` + plain-prose paragraph (verbatim match required) |
| 4b | `README.md` architecture bullet | `` `json-repair` `` | `` `jsonrepair` `` (downstream of correction 3) |
| 5 | `shared/schemas.ts` `LastValidOutputDigestSchema` | `{shader_variant, label_text, label_style}` | `{shader_variant, label_style, copy_fragment}` (drift removal after corrections 1+2) |

Final greps: `label_text`, `emoji`, `narrative_frame`, `json-repair` all return zero repo-wide. `jsonrepair` appears once (`package.json:25`). `copy_fragment` appears twice (the digest and the output), which is the intended cross-reference.

---

## 11. Known caveats flagged for Turn 2

- **`@types/express@5.0.0` paired with `express@4.21.1`** — type package is for Express 5; runtime is Express 4. Pin kept per spec "do not re-debate." May produce typecheck noise on middleware once `server/index.ts` lands. Escape valves if it bites: downgrade `@types/express` to `4.17.x`, or add per-middleware type annotations.
- **`vite/client` types deferred.** Not added to `tsconfig.types` (would break typecheck if vite isn't installed, and pollutes server typecheck). Add `/// <reference types="vite/client" />` to the single client entry file when it's written.
- **`jsonrepair` import form**: `import { jsonrepair } from 'jsonrepair'`. Default export is named after the package.
- **tsx path resolution**: tsx 4.x respects tsconfig paths by default. If the server's `import ... from '@shared/schemas'` fails to resolve at dev-watch time, the `--tsconfig tsconfig.json` flag is the knob.
- **Windows incompatibility**: the `capture` script uses inline `RUNTIME_MODE=capture`, which needs `cross-env` on Windows. Linux dev only for now per hackathon setup.
- **AMD Vega 512 MB VRAM** is the hard constraint on shader + post-processing complexity. Max one post-processing pass; prefer uniform-driven mutations over geometry swaps.
- **No git repo yet.** `git init` deferred to Turn 3; code-review-graph will have full visibility after that.
- **Knowledge graph state**: at Turn 1 close, check `list_graph_stats_tool` — the hook may auto-update on file writes. If stale, `build_or_update_graph_tool` seeds it from the 2 TS files now present.

---

## 12. Skill policy for this project (established Turn 1)

**Skip for setup/structural turns** — already-locked architecture makes these skills ceremony:
- `superpowers:brainstorming`
- `superpowers:writing-plans`
- `superpowers:test-driven-development`
- `superpowers:using-git-worktrees`
- `superpowers:subagent-driven-development`
- `claude-mem:make-plan`
- `threejs-fundamentals` (deferred to shader work on Day 2)

**Invoke when relevant**:
- `claude-api` — fires the moment the Anthropic SDK gets imported anywhere (Turn 2 adapter). Ensures prompt caching is wired from line one.
- `claude-md-management` — Turn 2 CLAUDE.md work.
- `superpowers:verification-before-completion` — gates each turn close.
- `superpowers:systematic-debugging` — Turn 3 install/build issues.

**Always announce skill activations explicitly**: `Using [skill] to [purpose]`.

**Turn 1 activations**: `superpowers:verification-before-completion` (twice — once after initial scaffold, once after corrections). No other skills were activated.

---

## 13. What Turn 2 is expected to contain

Per the user's earlier framing, Turn 2 is where source files land (~35 files). Expected scope areas based on directory skeleton and locked decisions:

- `server/index.ts` + middleware + `/api/phrase` route + mock responder
- `src/llm/` — Anthropic SDK adapter (gated, unused Day 1), prompt builder, validator (zod + jsonrepair), cache layer
- `src/state/` — state machine (IDLE/LISTENING/MUTATING/TRANSITIONING/DEGRADED)
- `src/audio/` — pitchy integration, feature extraction, phrase detection
- `src/scene/` — Three.js scene setup, 15 `ShaderMaterial` instances, transition controller
- `src/shaders/` — 5 shader pair files (vertex + fragment) + `common/` shared chunks
- `src/display/` — HUD label renderer, tweakpane debug, style variants
- `src/modes/` — live mode, capture mode, degraded handlers
- `prompts/` — system prompt(s), few-shot examples, docs mirroring `shared/schemas.ts` enums
- `CLAUDE.md` — project-level instructions for Claude Code
- `scripts/` — dev utilities (phrase-hash generator, cache inspector)
- `index.html` + `src/main.ts` — Vite entry

Expected Turn 2 skill activations: `claude-api` (first SDK import), `claude-md-management` (CLAUDE.md creation), `superpowers:verification-before-completion` (turn gate).

Turn 3 scope (per spec): `pnpm install`, `git init`, CI workflow, first smoke test, graph build. Expected skills: `superpowers:systematic-debugging` (for install/build issues).

---

## 14. Verification commands run at Turn 1 close

```bash
# JSON parse
node -e "JSON.parse(require('fs').readFileSync('package.json','utf8'))"
node -e "JSON.parse(require('fs').readFileSync('tsconfig.json','utf8'))"
node -e "JSON.parse(require('fs').readFileSync('.prettierrc','utf8'))"

# YAML parse + hook check
python3 -c "import yaml; d=yaml.safe_load(open('.pre-commit-config.yaml')); assert d['repos'][0]['hooks'][0]['id']=='gitleaks'"

# pin check
node -e "const p=require('./package.json'); console.log(p.dependencies.jsonrepair); console.log('json-repair' in p.dependencies)"
# → 3.8.0
# → false

# zero-reference grep
# label_text: 0
# emoji (word): 0
# narrative_frame: 0
# json-repair: 0

# positive-reference grep
# jsonrepair: 1 (package.json:25)
# copy_fragment: 2 (schemas.ts:80, schemas.ts:103)
```

All green.

---

## 15. Codex audit verdict

> **GREEN after LastValidOutputDigestSchema drift fix applied.** Approved the four original corrections plus the drift removal. Repository structure is correct; shared-contract work is complete; ready for Turn 2.

---

*End of handoff.*
