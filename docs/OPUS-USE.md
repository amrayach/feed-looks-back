# How we use Claude Opus 4.7

One-page summary for judge evaluation. Intentionally concise.

## What Opus decides per phrase

Each phrase the guitarist plays (or each keyboard mock press, Day 1) yields exactly one structured response from `claude-opus-4-7`:

| Field | Enum or shape | Role |
|---|---|---|
| `maqam_hypothesis` | 5-way enum | The model's reading of which mode was played |
| `confidence` | float 0–1 | Self-reported certainty (intentionally sometimes miscalibrated — the piece) |
| `platform_translation` | ≤ 280 chars | The feed's misreading of the phrase, one sentence |
| `wrongness_strategy` | ≤ 280 chars | The move being made (listicle_flattening, wellness_pacification, …) |
| `copy_fragment` | ≤ 400 chars | The HUD-visible copy delivered in attention-economy voice |
| `cultural_reading` | ≤ 600 chars | The thing the feed is specifically missing about this mode |
| `uniform_patch` | numeric map | 3–6 scalar uniform targets the scene lerps toward over 400 ms |
| `shader_variant` | 15-way enum | One of 15 pre-compiled `ShaderMaterial` instances |
| `label_style` | 5-way enum | HUD typography + palette regime |
| `transition_intent` | 3-way enum | hold / soft_drift / regime_shift — the intended perceptual shape of this mutation |

The model does **not** author GLSL or code on the hot path. The real path does use one forced tool call (`emit_phrase_response`) as a structured-output mechanism, but not an agentic loop. Every payload field is either an enum pick or a bounded string. See ADR 0001 and ADR 0002 for why.

## JSON contract (authoritative)

`shared/schemas.ts` — zod schemas. Every response is validated before reaching the scene; schema failures transition the runtime to DEGRADED while the animation keeps running on the last valid uniforms. `jsonrepair` may fix malformed syntax, never semantics.

## What's prompt-cached

The system prefix carries a `cache_control: { type: "ephemeral" }` marker on its final static block. The cached prefix contains: artistic thesis, the mutation vocabulary mirror, worked examples, and wrongness strategies. Per-phrase input rides in the `messages` array, uncached. On a warm cache, only the user turn and the structured response are billed at full price.

## Per-demo cost and latency target

- Target latency: ≤ 2 s from phrase boundary to visible scene mutation.
- Thinking: `thinking: { type: "adaptive" }`, `output_config: { effort: "medium" }`.
- Expected cache hit ratio: ≥ 80 % after the first warm phrase.
- Per-phrase cost on warm cache: **≈ $0.02** (see `docs/BUDGET.md` for the breakdown).

## Fallback behavior

Validation failure, SDK error, network timeout, or cache miss in capture mode → the state machine transitions `* → DEGRADED`. The scene keeps animating on its last valid uniforms; the HUD shows a non-judgemental "holding" message. The next successful validated phrase transitions `DEGRADED → LISTENING`. The piece does not freeze.
