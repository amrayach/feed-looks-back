# ADR 0002 — Pre-compiled shader enum, 15 variants

## Status

Accepted — 2026-04-21

## Context

The visual mutation surface needs to be rich enough that each of the 5 maqams × 3 escalation stages is visibly distinct (Deliverable 6), but the model cannot be allowed to author or invent shader code — see ADR 0001. We also have a hard GPU constraint: AMD Vega integrated, 512 MB VRAM, which limits how many simultaneously-resident shader programs and how many post-processing passes we can stack.

Two patterns were considered:

1. **Open vocabulary** — model proposes arbitrary shader parameter sets; renderer maps them to uniform names. Rich but enforces soft constraints at runtime; hard to reason about performance.
2. **Closed enum** — a fixed set of pre-compiled `ShaderMaterial` instances, model picks from an enum string. Constrained but hardware-predictable.

## Decision

15 pre-compiled `ShaderMaterial` instances registered at startup, keyed by the `ShaderVariantEnum` in `shared/schemas.ts` (`{maqam}_{stage0|stage1|stage2}`). Opus selects one by name per phrase. The one distinct shader on Day 1 is `saba_stage0`; the other 14 share a parametric skeleton shader with per-variant default uniform values that make them visibly distinct, with `uniform_patch` as the continuous live-mutation channel.

## Consequences

**Accepted:**

- Zero chance of runtime shader compile failure during performance
- Predictable VRAM footprint — 15 programs, one resident at a time
- Visual range is the cross product of (variant × uniform_patch × label_style) — substantial for the performance duration
- A new maqam or stage can be added by committing a new shader file + enum value; the prompt contract is unchanged

**Given up:**

- No runtime shader authoring — this week
- Model cannot invent visual dialects — that's the point
