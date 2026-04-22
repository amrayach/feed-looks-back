# ADR 0001 — JSON-only on the per-phrase hot path

## Status

Accepted — 2026-04-21

## Context

The live performance has a hard ~2 second latency budget from phrase boundary to visible scene mutation. Inside that window the system must: call Opus, receive a response, validate it, and begin lerping uniforms toward new targets. Each of these stages consumes some of the budget, and any variability in one stage forces conservative budgets on the others.

Two tempting alternatives exist that both cost us predictability:

1. **Model-authored GLSL / JavaScript** — richer visual vocabulary, but a compile or parse failure blacks the scene mid-performance. Shader compilation is not bounded in time, and a single bad byte takes the performance down.
2. **Tool-calling / agentic control of the hot path** — more expressive, but introduces unpredictable loops, retries, and timing variance that eat into the 2 second budget and complicate DEGRADED recovery.

The piece is unforgiving about latency — not because responses need to be instant, but because the perceptual coupling between the guitarist's phrase and the scene's response is the piece. Latency variance breaks that coupling more visibly than consistent slight latency.

## Decision

The per-phrase hot path carries only structured JSON that conforms to `PhraseResponseSchema` from `shared/schemas.ts`. No model-authored code. No model-authored GLSL. No tool-calling loops. One buffered `messages.create()` per phrase, one structured reply, applied.

`jsonrepair` runs before zod for syntax fixes only (trailing commas, truncation). Semantic validity is zod's sole responsibility.

## Consequences

**Accepted:**

- Smaller, faster, more reliable per-phrase responses
- A single validation surface (zod) with one enforcement rule: parse or reject
- DEGRADED state is trivial to define: any non-validating response transitions state, preserves last visual, recovers on the next success
- Prompt caching behaves predictably when the response shape is fixed

**Given up:**

- No model-authored novelty beyond the 15-variant enum
- Visual vocabulary is pre-compiled and fixed at startup — this week
- The artistic range is bounded by the combinatorics of `shader_variant × label_style × transition_intent × uniform_patch`; Opus cannot invent new visual dialects, only remix the scaffolded ones

This constraint is reconsidered after the hackathon.
