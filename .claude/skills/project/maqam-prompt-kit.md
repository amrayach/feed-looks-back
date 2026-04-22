---
name: maqam-prompt-kit
description: System-prompt scaffolding, session-memory shape, and escalation rules for the per-phrase call
---

The system prefix is assembled from four files in `prompts/`, loaded in fixed order by `server/anthropic-adapter.ts:loadSystemBlocks()`:

1. `system.md` — thesis, identity, and the cultural framing.
2. `mutation-vocabulary.md` — mirror of `shared/schemas.ts` enums in human-readable form (shader variants, label styles, transition intents).
3. `examples.md` — worked examples, one per maqam, showing the intended translation vector.
4. `wrongness-strategies.md` — catalogue of named misreadings (`listicle_flattening`, `wellness_pacification`, etc.).

The final block (`wrongness-strategies.md`) carries `cache_control: { type: "ephemeral" }`. All stable prefix above it is cached on the first warm call. **Reordering these files changes the cached prefix boundary** — do not reorder without intention.

**Session memory shape** (`SessionMemorySchema` in `shared/schemas.ts`):
- `phrase_count: int ≥ 0`
- `maqam_history: string[]` (last 5)
- `platform_translations: string[]` (last 5)
- `wrongness_strategies: string[]` (last 5)
- `escalation_level: float 0..1`

Last-5 rolling is maintained in `src/state/session.ts:recordPhrase()`. No embeddings, no vector store, no summaries. Bounded memory by design.

**Escalation rules.** `escalation_level` is monotonically non-decreasing within a session, enforced by `recordPhrase()`, not by the zod schema. The mock adapter maps level → stage via thresholds (`< 0.33` → stage0, `< 0.66` → stage1, else stage2) in `server/anthropic-adapter.ts:escalationStage()`. The real adapter sees the level in `SessionMemory` and is prompted (via `wrongness-strategies.md`) to escalate the UI register, not the distortion — stage 2 is *louder UI*, not *broken UI*.

**What the model does NOT decide**: raw GLSL, code, tool sequences, or new shader variants. Every output field is either an enum pick or a bounded string. See ADRs 0001 and 0002.
